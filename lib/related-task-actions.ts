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
            relatedItems: {
                some: { id: contentId }
            },
            workspaceId: user.activeWorkspaceId
        },
        include: {
            assignees: { select: { id: true, name: true, photo: true } },
            relatedItems: {
                include: {
                    database: true
                }
            }
        },
        orderBy: { dueDate: 'asc' }
    });

    return tasks;
}
