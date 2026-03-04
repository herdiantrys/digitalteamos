'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

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
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: true,
            tasks: {
                include: { assignee: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

export async function createContent(formData: FormData) {
    const user = await requireAuth();

    const title = formData.get('title') as string;

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
    await requireAuth();

    const content = await prisma.content.findUnique({
        where: { id: contentId },
        select: { customFields: true }
    });
    if (!content) return;

    const currentFields = content.customFields ? JSON.parse(content.customFields) : {};

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
    await requireAuth();

    await prisma.content.delete({
        where: { id }
    });

    revalidatePath('/content');
}

// ── Bulk actions ──────────────────────────────────────────────────────────────
export async function bulkDeleteContent(ids: string[]) {
    await requireAuth();
    if (!ids.length) return;

    await prisma.content.deleteMany({ where: { id: { in: ids } } });
    revalidatePath('/content');
}

export async function updateContentMain(id: string, data: { title?: string; caption?: string }) {
    await requireAuth();
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

