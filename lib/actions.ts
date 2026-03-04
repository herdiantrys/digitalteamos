'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

export async function createTask(data: {
    title: string;
    content?: string;
    status: string;
    assigneeId?: string;
    contentId?: string;
    dueDate?: string;
}) {
    await requireAuth();

    const task = await prisma.task.create({
        data: {
            title: data.title,
            content: data.content || null,
            status: data.status || 'TODO',
            assigneeId: data.assigneeId || null,
            contentId: data.contentId || null,
            dueDate: data.dueDate ? new Date(data.dueDate) : null
        }
    });

    revalidatePath('/tasks');
    if (data.contentId) revalidatePath(`/content/${data.contentId}`);
    return task;
}

export async function updateTask(id: string, data: {
    title?: string;
    content?: string;
    status?: string;
    assigneeId?: string;
    contentId?: string;
    dueDate?: string;
}) {
    await requireAuth();

    const updateData: any = { ...data };
    if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const task = await prisma.task.update({
        where: { id },
        data: updateData
    });

    revalidatePath('/tasks');
    if (task.contentId) revalidatePath(`/content/${task.contentId}`);
    return task;
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
    await requireAuth();

    const task = await prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus }
    });

    revalidatePath('/tasks');
    if (task.contentId) revalidatePath(`/content/${task.contentId}`);
}

export async function deleteTask(taskId: string) {
    await requireAuth();
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { contentId: true } });
    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath('/tasks');
    if (task?.contentId) revalidatePath(`/content/${task.contentId}`);
}

export async function getTasks() {
    const user = await requireAuth();
    const where: any = {};
    if (user.role === 'STAFF') {
        where.assigneeId = user.id;
    }
    return await prisma.task.findMany({
        where,
        include: {
            assignee: { select: { id: true, name: true } },
            linkedContent: { select: { id: true, title: true } }
        },
        orderBy: { dueDate: 'asc' }
    });
}

export async function getDailyTasks() {
    const user = await requireAuth();

    // For "Today", we look for tasks created today or with a dueDate of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const where: any = {
        OR: [
            { createdAt: { gte: startOfToday, lte: endOfToday } },
            { dueDate: { gte: startOfToday, lte: endOfToday } }
        ]
    };

    // If STAFF, only show their own tasks
    if (user.role === 'STAFF') {
        where.assigneeId = user.id;
    }

    return await prisma.task.findMany({
        where,
        include: {
            assignee: { select: { id: true, name: true } },
            linkedContent: { select: { id: true, title: true } }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

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
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });
}
