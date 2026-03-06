'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../lib/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getDatabaseViews(databaseId: string) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');
    return prisma.contentView.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { order: 'asc' }
    });
}

export async function createDatabaseView(databaseId: string, data: { name: string; layout: string; order: number }) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can create views.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const view = await prisma.contentView.create({
        data: {
            name: data.name,
            layout: data.layout,
            order: data.order,
            workspaceId: user.activeWorkspaceId,
            databaseId,
        }
    });
    revalidatePath(`/databases/${databaseId}`);
    return view;
}

export async function updateDatabaseView(id: string, databaseId: string, data: Partial<{
    name: string;
    layout: string;
    propertyVisibility: string | null;
    filter: string | null;
    sort: string | null;
    groupBy: string | null;
    layoutConfig: string | null;
}>) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can update views.');

    const view = await prisma.contentView.update({
        where: { id },
        data
    });
    revalidatePath(`/databases/${databaseId}`);
    return view;
}

export async function deleteDatabaseView(id: string, databaseId: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can delete views.');

    await prisma.contentView.deleteMany({ where: { id } });
    revalidatePath(`/databases/${databaseId}`);
}

export async function updateDatabaseViewOrder(updates: { id: string; order: number }[], databaseId: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can reorder views.');

    await prisma.$transaction(
        updates.map(u => prisma.contentView.update({
            where: { id: u.id },
            data: { order: u.order }
        }))
    );
    revalidatePath(`/databases/${databaseId}`);
}
