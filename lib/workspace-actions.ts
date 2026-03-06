'use server';

import { PrismaClient } from '@prisma/client';
import { requireAuth } from './auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function createWorkspace(name: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can create workspaces.');

    const workspace = await prisma.workspace.create({
        data: {
            name,
            members: {
                create: {
                    userId: user.id,
                    role: 'ADMIN',
                }
            }
        }
    });

    // Automatically set the new workspace as the active one
    await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspace.id }
    });

    revalidatePath('/', 'layout');
    return workspace;
}

export async function updateWorkspace(workspaceId: string, name: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can update workspaces.');

    // Verify user is a member of this workspace
    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (!member) throw new Error('You are not a member of this workspace.');

    await prisma.workspace.update({
        where: { id: workspaceId },
        data: { name: name.trim() }
    });

    revalidatePath('/', 'layout');
}

export async function deleteWorkspace(workspaceId: string) {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can delete workspaces.');

    // Verify user is a member of this workspace
    const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } }
    });
    if (!member) throw new Error('You are not a member of this workspace.');

    // Find another workspace to migrate members to (so nobody is left workspaceless)
    const fallback = await prisma.workspace.findFirst({
        where: { id: { not: workspaceId } },
        orderBy: { createdAt: 'asc' }
    });

    // Update activeWorkspaceId for all users currently on this workspace
    if (fallback) {
        await prisma.user.updateMany({
            where: { activeWorkspaceId: workspaceId },
            data: { activeWorkspaceId: fallback.id }
        });
        // Ensure those users are members of the fallback workspace
        const membersToMigrate = await prisma.workspaceMember.findMany({
            where: { workspaceId }
        });
        // Sequential upsert to avoid connection pool exhaustion
        for (const m of membersToMigrate) {
            await prisma.workspaceMember.upsert({
                where: { workspaceId_userId: { workspaceId: fallback.id, userId: m.userId } },
                create: { workspaceId: fallback.id, userId: m.userId, role: 'MEMBER' },
                update: {}
            });
        }
    } else {
        // No fallback — just null out activeWorkspaceId
        await prisma.user.updateMany({
            where: { activeWorkspaceId: workspaceId },
            data: { activeWorkspaceId: null }
        });
    }

    // Delete the workspace (cascades members via schema)
    await prisma.workspace.delete({ where: { id: workspaceId } });

    revalidatePath('/', 'layout');
    revalidatePath('/settings');
}

export async function switchWorkspace(workspaceId: string) {
    const user = await requireAuth();

    // Verify the user is a member of the workspace
    const member = await prisma.workspaceMember.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: user.id
            }
        }
    });

    if (!member) {
        throw new Error('You do not have access to this workspace.');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { activeWorkspaceId: workspaceId }
    });

    revalidatePath('/', 'layout');
}

export async function getUserWorkspaces() {
    const user = await requireAuth();

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: {
            workspace: true
        },
        orderBy: {
            workspace: {
                name: 'asc'
            }
        }
    });

    return memberships.map(m => m.workspace);
}
