'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';
import { recordContentHistory } from './history-actions';

const prisma = new PrismaClient();

export async function getContentById(id: string) {
    await requireAuth();
    return await prisma.content.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            caption: true,
            mediaUrl: true,
            customFields: true,
            orderIdx: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: true,
        }
    });
}

export async function createContent(formData: FormData) {
    const user = await requireAuth();

    const title = formData.get('title') as string;
    const caption = (formData.get('caption') as string) || null;

    // Extract all dynamic properties (anything prefixed with 'prop_')
    const customFields: Record<string, any> = {};
    const keys = Array.from(formData.keys());
    for (const key of keys) {
        if (key.startsWith('prop_')) {
            const propId = key.replace('prop_', '');
            const values = formData.getAll(key) as string[];

            // remove empty strings
            const validValues = values.filter(v => v !== '');
            if (validValues.length > 0) {
                // If it's a MULTI_SELECT, values.length could be > 1. Just join them.
                customFields[propId] = validValues.length > 1 ? validValues.join(', ') : validValues[0];
            }
        }
    }

    await prisma.content.create({
        data: {
            title,
            caption,
            customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
            authorId: user.id
        }
    });

    revalidatePath('/content');
}

export async function updateContentField(contentId: string, customFieldsJson: string) {
    await requireAuth();

    await prisma.content.update({
        where: { id: contentId },
        data: { customFields: customFieldsJson }
    });

    revalidatePath('/content');
}


export async function updateSingleContentField(contentId: string, propId: string, value: any) {
    const user = await requireAuth();

    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { title: true, caption: true, customFields: true }
    });
    if (!content) return;

    // Save history snapshot BEFORE the change
    const oldFields = content.customFields ? JSON.parse(content.customFields) : {};
    const oldVal = oldFields[propId] ?? '(empty)';
    const newVal = value || '(empty)';
    await recordContentHistory(
        contentId,
        content,
        `Changed field: ${propId.slice(0, 8)}… · "${oldVal}" → "${newVal}"`,
        user.name ?? user.email
    );

    const currentFields = { ...oldFields };
    if (value === null || value === '') {
        delete currentFields[propId];
    } else {
        currentFields[propId] = value;
    }

    await prisma.content.update({
        where: { id: contentId },
        data: { customFields: JSON.stringify(currentFields) }
    });

    revalidatePath('/content');
}

export async function deleteContent({ id }: { id: string }) {
    const user = await requireAuth();

    if (user.role !== 'ADMIN') {
        const content = await prisma.content.findUnique({
            where: { id },
            select: { authorId: true }
        });
        if (content && content.authorId !== user.id) {
            throw new Error('Unauthorized: You can only delete your own content.');
        }
    }

    await prisma.content.delete({
        where: { id }
    });

    revalidatePath('/content');
}

// ── Bulk actions ──────────────────────────────────────────────────────────────
export async function bulkDeleteContent(ids: string[]) {
    const user = await requireAuth();
    if (!ids.length) return;

    if (user.role === 'ADMIN') {
        await prisma.content.deleteMany({ where: { id: { in: ids } } });
    } else {
        // Staff can only delete their own
        await prisma.content.deleteMany({
            where: {
                id: { in: ids },
                authorId: user.id
            }
        });
    }
    revalidatePath('/content');
}

export async function updateContentMain(id: string, data: { title?: string; caption?: string }) {
    const user = await requireAuth();

    // Snapshot before change
    const current = await prisma.content.findUnique({
        where: { id },
        select: { title: true, caption: true, customFields: true }
    });
    if (current) {
        const parts: string[] = [];
        if (data.title && data.title !== current.title) parts.push(`Title: "${current.title}" → "${data.title}"`);
        if (data.caption !== undefined && data.caption !== current.caption) parts.push('Caption updated');
        if (parts.length > 0) {
            await recordContentHistory(id, current, parts.join(', '), user.name ?? user.email);
        }
    }

    const updated = await prisma.content.update({
        where: { id },
        data: {
            title: data.title,
            caption: data.caption
        }
    });
    revalidatePath('/content');
    revalidatePath(`/content/${id}`);
    return updated;
}


export async function updateMultipleContentOrder(updates: { id: string, orderIdx: number }[]) {
    await requireAuth();

    await prisma.$transaction(
        updates.map(u => prisma.content.update({
            where: { id: u.id },
            // @ts-ignore - Field added to DB but client generation locked by running server
            data: { orderIdx: u.orderIdx }
        }))
    );

    revalidatePath('/content');
}

export async function bulkUpdateContentProperty(ids: string[], propId: string, value: any) {
    const user = await requireAuth();
    if (!ids.length) return;

    // Snapshot current state for all items to record history
    const items = await prisma.content.findMany({
        where: { id: { in: ids } },
        select: { id: true, title: true, caption: true, customFields: true, authorId: true }
    });

    const results = [];
    for (const item of items) {
        // Staff check (optional: only allow updating own content if not ADMIN)
        // However, usually bulk edit is for items you have permission for.
        // Let's enforce that Staff can only update their own content.
        if (user.role !== 'ADMIN' && item.authorId !== user.id) {
            continue; // Skip items they don't own
        }

        const currentFields = item.customFields ? JSON.parse(item.customFields) : {};
        const oldVal = currentFields[propId] ?? '(empty)';
        const newVal = value || '(empty)';

        // Record history
        await recordContentHistory(
            item.id,
            item,
            `Bulk Edit field ${propId.slice(0, 8)}: "${oldVal}" → "${newVal}"`,
            user.name ?? user.email
        );

        const updatedFields = { ...currentFields };
        if (value === null || value === '') {
            delete updatedFields[propId];
        } else {
            updatedFields[propId] = value;
        }

        results.push(
            prisma.content.update({
                where: { id: item.id },
                data: { customFields: JSON.stringify(updatedFields) }
            })
        );
    }

    if (results.length > 0) {
        await prisma.$transaction(results);
    }

    revalidatePath('/content');
}
