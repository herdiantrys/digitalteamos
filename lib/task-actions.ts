'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function createTask(formData: FormData) {
    const user = await requireAuth();

    const title = formData.get('title') as string;
    if (!title?.trim()) throw new Error('Task title is required');

    const description = formData.get('description') as string | null;
    const priority = (formData.get('priority') as string) || 'MEDIUM';
    const assigneeId = formData.get('assigneeId') as string | null;
    const relatedItemId = formData.get('relatedItemId') as string | null;
    const content = formData.get('content') as string | null;

    // Convert dueDate from YYYY-MM-DD input to ISO Date
    const dueDateStr = formData.get('dueDate') as string | null;
    let dueDate: Date | null = null;
    if (dueDateStr) {
        dueDate = new Date(dueDateStr);
        // Ensure valid date
        if (isNaN(dueDate.getTime())) dueDate = null;
    }

    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const task = await prisma.task.create({
        data: {
            title,
            description,
            priority,
            dueDate,
            assigneeId: assigneeId || null,
            relatedItemId: relatedItemId || null,
            content,
            creatorId: user.id,
            workspaceId: user.activeWorkspaceId,
            status: 'TODO'
        }
    });

    revalidatePath('/tasks');
    return task;
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && task.assigneeId !== user.id) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus }
    });

    revalidatePath('/tasks');
}

export async function updateTaskDueDate(taskId: string, dueDate: Date | null) {
    const { task, user } = await validateTaskAccess(taskId);

    if (user.role !== 'ADMIN' && task.assigneeId !== user.id) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { dueDate }
    });

    revalidatePath('/tasks');
}

export async function validateTaskAccess(taskId: string) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const task = await prisma.task.findUnique({
        where: { id: taskId }
    });

    if (!task || task.workspaceId !== user.activeWorkspaceId) {
        throw new Error('Task not found or access denied');
    }

    return { task, user };
}

export async function deleteTask(taskId: string) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && task.assigneeId !== user.id) {
        throw new Error('Unauthorized: You can only delete tasks assigned to you.');
    }

    await prisma.task.delete({
        where: { id: taskId }
    });

    revalidatePath('/tasks');
}

export async function updateTask(taskId: string, formData: FormData) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && task.assigneeId !== user.id) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    const title = formData.get('title') as string;
    if (!title?.trim()) throw new Error('Task title is required');

    const description = formData.get('description') as string | null;
    const priority = (formData.get('priority') as string) || 'MEDIUM';
    const status = (formData.get('status') as string) || 'TODO';
    const assigneeId = formData.get('assigneeId') as string | null;
    const relatedItemId = formData.get('relatedItemId') as string | null;
    const content = formData.get('content') as string | null;

    const dueDateStr = formData.get('dueDate') as string | null;
    let dueDate: Date | null = null;
    if (dueDateStr) {
        dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) dueDate = null;
    }

    await prisma.task.update({
        where: { id: taskId },
        data: {
            title,
            description,
            priority,
            status,
            dueDate,
            assigneeId: assigneeId || null,
            relatedItemId: relatedItemId || null,
            content,
        }
    });

    revalidatePath('/tasks');
}
