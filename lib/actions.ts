'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();


export async function searchContent(query: string) {
    await requireAuth();
    if (!query) return [];

    return await prisma.content.findMany({
        where: {
            title: { contains: query }
        },
        select: { id: true, title: true },
        take: 10
    });
}

export async function getUserOptions() {
    await requireAuth();
    return await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, photo: true, email: true },
        orderBy: { name: 'asc' }
    });
}
