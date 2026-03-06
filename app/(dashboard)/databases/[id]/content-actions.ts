'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../lib/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function createDatabaseContent(
    databaseId: string,
    title: string,
    caption?: string,
    customFields?: Record<string, any>
) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    await prisma.content.create({
        data: {
            title,
            caption: caption || null,
            customFields: customFields && Object.keys(customFields).length > 0
                ? JSON.stringify(customFields)
                : null,
            authorId: user.id,
            workspaceId: user.activeWorkspaceId,
            databaseId,
        }
    });

    revalidatePath(`/databases/${databaseId}`);
}

export async function createDatabaseProperty(
    databaseId: string,
    name: string,
    type: string,
    options?: string
) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can add properties.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const maxOrderResult = await prisma.propertyDefinition.aggregate({
        where: { databaseId },
        _max: { order: true }
    });
    const nextOrder = (maxOrderResult._max.order ?? 0) + 1;

    const prop = await prisma.propertyDefinition.create({
        data: {
            name,
            type,
            options: options || null,
            order: nextOrder,
            workspaceId: user.activeWorkspaceId,
            databaseId,
        }
    });

    revalidatePath(`/databases/${databaseId}`);
    return prop;
}
