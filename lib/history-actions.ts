'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

// ── Record a history snapshot ─────────────────────────────────────────────────
export async function recordContentHistory(
    contentId: string,
    snapshot: { title: string; caption?: string | null; customFields?: string | null },
    changeDesc: string,
    changedBy?: string,
    changedById?: string
) {
    await (prisma as any).contentHistory.create({
        data: {
            contentId,
            snapshot: JSON.stringify(snapshot),
            changeDesc,
            changedBy: changedBy ?? null,
            changedById: changedById ?? null
        }
    });
    // Keep max 50 versions per content — prune oldest
    const all = await (prisma as any).contentHistory.findMany({
        where: { contentId },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
    });
    if (all.length > 50) {
        const toDelete = all.slice(50).map((h: any) => h.id);
        await (prisma as any).contentHistory.deleteMany({ where: { id: { in: toDelete } } });
    }
}

// ── Fetch history list ────────────────────────────────────────────────────────
export async function getContentHistory(contentId: string) {
    await requireAuth();
    return (prisma as any).contentHistory.findMany({
        where: { contentId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

// ── Restore to a specific history entry ──────────────────────────────────────
export async function restoreContentHistory(historyId: string) {
    const user = await requireAuth();

    const entry = await (prisma as any).contentHistory.findUnique({
        where: { id: historyId }
    });
    if (!entry) throw new Error('History entry not found');

    const snap = JSON.parse(entry.snapshot) as {
        title: string;
        caption?: string | null;
        customFields?: string | null;
    };

    // Before restoring, save a snapshot of the current state so it can be undone
    const current = await prisma.content.findUnique({
        where: { id: entry.contentId },
        select: { title: true, caption: true, customFields: true }
    });
    if (current) {
        await recordContentHistory(
            entry.contentId,
            current,
            `Before restore to version from ${new Date(entry.createdAt).toLocaleString()}`,
            user.name ?? user.email,
            user.id
        );
    }

    // Perform the restore
    await prisma.content.update({
        where: { id: entry.contentId },
        data: {
            title: snap.title,
            caption: snap.caption ?? null,
            customFields: snap.customFields ?? null
        }
    });

    await recordContentHistory(
        entry.contentId,
        snap,
        `Restored to version from ${new Date(entry.createdAt).toLocaleString()}`,
        user.name ?? user.email,
        user.id
    );

    revalidatePath('/content');
    return entry.id;
}

// ── Record a task history snapshot ──────────────────────────────────────────
export async function recordTaskHistory(
    taskId: string,
    snapshot: any,
    changeDesc: string,
    changedBy?: string,
    changedById?: string
) {
    await (prisma as any).taskHistory.create({
        data: {
            taskId,
            snapshot: JSON.stringify(snapshot),
            changeDesc,
            changedBy: changedBy ?? null,
            changedById: changedById ?? null
        }
    });

    // Prune old history entries
    const all = await (prisma as any).taskHistory.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' },
        select: { id: true }
    });

    if (all.length > 50) {
        const toDelete = all.slice(50).map((h: any) => h.id);
        await (prisma as any).taskHistory.deleteMany({ where: { id: { in: toDelete } } });
    }
}
