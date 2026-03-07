'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { revalidatePath } from 'next/cache';
import { recordTaskHistory } from './history-actions';

const prisma = new PrismaClient();

export async function createTask(formData: FormData) {
    const user = await requireAuth();

    const title = formData.get('title') as string;
    if (!title?.trim()) throw new Error('Task title is required');

    const description = formData.get('description') as string | null;
    const priority = (formData.get('priority') as string) || 'MEDIUM';
    const assigneeIdsString = formData.get('assigneeIds') as string | null;
    const assigneeIds = assigneeIdsString ? JSON.parse(assigneeIdsString) : [];
    const relatedItemIdsString = formData.get('relatedItemIds') as string | null;
    const relatedItemIds = relatedItemIdsString ? JSON.parse(relatedItemIdsString) : [];
    const content = formData.get('content') as string | null;

    // Convert dates from YYYY-MM-DD input to ISO Date
    const startDateStr = formData.get('startDate') as string | null;
    const dueDateStr = formData.get('dueDate') as string | null;

    let startDate: Date | null = null;
    if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) startDate = null;
    }

    let dueDate: Date | null = null;
    if (dueDateStr) {
        dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) dueDate = null;
    }

    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const task = await prisma.task.create({
        data: {
            title,
            description,
            priority,
            startDate,
            dueDate,
            assignees: {
                connect: assigneeIds.map((id: string) => ({ id }))
            },
            relatedItems: {
                connect: relatedItemIds.map((id: string) => ({ id }))
            },
            content,
            creatorId: user.id,
            workspaceId: user.activeWorkspaceId,
            status: 'TODO'
        },
        include: {
            assignees: true,
            relatedItems: true
        }
    });

    await recordTaskHistory(
        task.id,
        task,
        `Created task: ${title}`,
        user.name || user.email,
        user.id
    );

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
    return task;
}

// ... existing status/date update functions ...

export async function updateTaskStatus(taskId: string, newStatus: string) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && !task.assignees.some(a => a.id === user.id)) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { status: newStatus }
    });

    await recordTaskHistory(
        taskId,
        { status: newStatus },
        `Changed status to ${newStatus}`,
        user.name || user.email,
        user.id
    );

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
}

export async function updateTaskDueDate(taskId: string, dueDate: Date | null) {
    const { task, user } = await validateTaskAccess(taskId);

    if (user.role !== 'ADMIN' && !task.assignees.some(a => a.id === user.id)) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { dueDate }
    });

    await recordTaskHistory(
        taskId,
        { dueDate },
        `Changed due date to ${dueDate ? dueDate.toLocaleDateString() : 'None'}`,
        user.name || user.email,
        user.id
    );

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
}

export async function updateTaskDates(taskId: string, startDate: Date | null, dueDate: Date | null) {
    const { task, user } = await validateTaskAccess(taskId);

    if (user.role !== 'ADMIN' && !task.assignees.some(a => a.id === user.id)) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    await prisma.task.update({
        where: { id: taskId },
        data: { startDate, dueDate }
    });

    await recordTaskHistory(
        taskId,
        { startDate, dueDate },
        `Updated task dates`,
        user.name || user.email,
        user.id
    );

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
}

export async function validateTaskAccess(taskId: string) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const task = await prisma.task.findUnique({
        where: { id: taskId },
        include: {
            assignees: true,
            relatedItems: {
                include: {
                    database: true
                }
            }
        }
    });

    if (!task || task.workspaceId !== user.activeWorkspaceId) {
        throw new Error('Task not found or access denied');
    }

    return { task, user };
}

export async function deleteTask(taskId: string) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && !task.assignees.some((a: any) => a.id === user.id)) {
        throw new Error('Unauthorized: You can only delete tasks assigned to you.');
    }

    await prisma.task.delete({
        where: { id: taskId }
    });

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
}

export async function updateTask(taskId: string, formData: FormData) {
    const { task, user } = await validateTaskAccess(taskId);

    // Permission check: Admin or Assignee
    if (user.role !== 'ADMIN' && !task.assignees.some(a => a.id === user.id)) {
        throw new Error('Unauthorized: You can only update tasks assigned to you.');
    }

    const title = formData.get('title') as string;
    if (!title?.trim()) throw new Error('Task title is required');

    const description = formData.get('description') as string | null;
    const priority = (formData.get('priority') as string) || 'MEDIUM';
    const status = (formData.get('status') as string) || 'TODO';
    const assigneeIdsString = formData.get('assigneeIds') as string | null;
    const assigneeIds = assigneeIdsString ? JSON.parse(assigneeIdsString) : [];
    const relatedItemIdsString = formData.get('relatedItemIds') as string | null;
    const relatedItemIds = relatedItemIdsString ? JSON.parse(relatedItemIdsString) : [];
    const content = formData.get('content') as string | null;

    const startDateStr = formData.get('startDate') as string | null;
    const dueDateStr = formData.get('dueDate') as string | null;

    let startDate: Date | null = null;
    if (startDateStr) {
        startDate = new Date(startDateStr);
        if (isNaN(startDate.getTime())) startDate = null;
    }

    let dueDate: Date | null = null;
    if (dueDateStr) {
        dueDate = new Date(dueDateStr);
        if (isNaN(dueDate.getTime())) dueDate = null;
    }

    const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
            title,
            description,
            priority,
            status,
            startDate,
            dueDate,
            assignees: {
                set: assigneeIds.map((id: string) => ({ id }))
            },
            relatedItems: {
                set: relatedItemIds.map((id: string) => ({ id }))
            },
            content,
        },
        include: {
            assignees: true,
            relatedItems: true
        }
    });

    await recordTaskHistory(
        taskId,
        updatedTask,
        `Updated task details`,
        user.name || user.email,
        user.id
    );

    revalidatePath('/tasks');
    revalidatePath('/dashboard');
}
