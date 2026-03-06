'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

export async function getDatabases() {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    return prisma.database.findMany({
        where: { workspaceId: user.activeWorkspaceId },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getDatabase(id: string) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const db = await prisma.database.findFirst({
        where: { id, workspaceId: user.activeWorkspaceId },
    });
    if (!db) throw new Error('Database not found');
    return db;
}

export async function createDatabase(name: string, icon?: string, description?: string, iconColor?: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can create databases.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const db = await prisma.database.create({
        data: {
            name,
            icon: icon || 'Database',
            iconColor: iconColor || 'var(--accent-primary)',
            description: description || null,
            workspaceId: user.activeWorkspaceId,
        },
    });

    // Create a default "Table View" for this new database
    await prisma.contentView.create({
        data: {
            name: 'Table View',
            layout: 'table',
            order: 0,
            workspaceId: user.activeWorkspaceId,
            databaseId: db.id,
        },
    });

    revalidatePath('/databases');
    revalidatePath('/');
    return db;
}

export async function updateDatabase(id: string, data: { name?: string; icon?: string; description?: string; iconColor?: string; contentHeaderTemplate?: string; contentFooterTemplate?: string }) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can update databases.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const db = await prisma.database.update({
        where: { id },
        data,
    });

    revalidatePath('/databases');
    revalidatePath(`/databases/${id}`);
    return db;
}

export async function deleteDatabase(id: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can delete databases.');

    await prisma.database.delete({ where: { id } });

    revalidatePath('/databases');
    revalidatePath('/');
}
