'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

export async function getRelatedTasks(contentId: string) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    // Make sure user has access (implicitly handled if workspaceId matches)
    const tasks = await prisma.task.findMany({
        where: {
            relatedItemId: contentId,
            workspaceId: user.activeWorkspaceId
        },
        include: {
            assignee: { select: { id: true, name: true, photo: true } }
        },
        orderBy: { dueDate: 'asc' }
    });

    return tasks;
}
