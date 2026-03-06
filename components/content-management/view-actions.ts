'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../lib/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function getContentViews() {
    await requireAuth();
    return prisma.contentView.findMany({
        orderBy: { order: 'asc' }
    });
}

export async function createContentView(data: { name: string; layout: string; order: number; databaseId: string }) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can create views.');

    const view = await prisma.contentView.create({
        data: {
            name: data.name,
            layout: data.layout,
            order: data.order,
            databaseId: data.databaseId,
        }
    });
    revalidatePath('/content');
    return view;
}

export async function updateContentView(id: string, data: Partial<{
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
    revalidatePath('/content');
    return view;
}

export async function deleteContentView(id: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can delete views.');

    const view = await prisma.contentView.delete({ where: { id } });
    revalidatePath('/content');
}

export async function updateContentViewOrder(updates: { id: string; order: number }[]) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can reorder views.');

    await prisma.$transaction(
        updates.map(u => prisma.contentView.update({
            where: { id: u.id },
            data: { order: u.order }
        }))
    );
    revalidatePath('/content');
}
