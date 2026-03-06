'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function createUser(formData: FormData) {
    const admin = await requireAdmin();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const passwordRaw = formData.get('password') as string;
    const role = formData.get('role') as string || 'STAFF';

    const password = await bcrypt.hash(passwordRaw, 10);

    const newUser = await prisma.user.create({
        data: { name, email, password, role }
    });

    // Auto-add the new user to the admin's active workspace so they share team data
    if ((admin as any).activeWorkspaceId) {
        await prisma.workspaceMember.create({
            data: {
                workspaceId: (admin as any).activeWorkspaceId,
                userId: newUser.id,
                role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
            }
        }).catch(() => { /* ignore if already exists */ });
    }

    revalidatePath('/settings');
}

export async function updateUserStatus(userId: string, isBanned: boolean) {
    await requireAdmin();

    await prisma.user.update({
        where: { id: userId },
        data: { isBanned }
    });

    revalidatePath('/settings');
}

export async function toggleUserActive(userId: string, isActive: boolean) {
    await requireAdmin();

    await prisma.user.update({
        where: { id: userId },
        data: { isActive }
    });

    revalidatePath('/settings');
}

export async function deleteUser(userId: string) {
    await requireAdmin();

    await prisma.user.delete({
        where: { id: userId }
    });

    revalidatePath('/settings');
}

export async function updateUser(formData: FormData) {
    await requireAdmin();

    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const photo = (formData.get('photo') as string) || null;
    const birthdateRaw = formData.get('birthdate') as string;
    const newPassword = formData.get('newPassword') as string;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = { name, email, role, photo };

    if (birthdateRaw) {
        data.birthdate = new Date(birthdateRaw);
    }

    if (newPassword) {
        data.password = await bcrypt.hash(newPassword, 10);
    }

    await prisma.user.update({
        where: { id },
        data
    });

    revalidatePath('/settings');
}

export async function addUserToWorkspace(userId: string, workspaceId: string) {
    await requireAdmin();

    await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        create: { workspaceId, userId, role: 'MEMBER' },
        update: {}
    });

    revalidatePath('/settings');
}

export async function removeUserFromWorkspace(userId: string, workspaceId: string) {
    await requireAdmin();

    // Ensure the user is not the only member in this workspace
    const memberCount = await prisma.workspaceMember.count({ where: { workspaceId } });
    if (memberCount <= 1) throw new Error('Cannot remove the last member from a workspace.');

    await prisma.workspaceMember.delete({
        where: { workspaceId_userId: { workspaceId, userId } }
    }).catch(() => { /* ignore if not member */ });

    // If this was the user's active workspace, switch to another
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { activeWorkspaceId: true } });
    if (user?.activeWorkspaceId === workspaceId) {
        const newMembership = await prisma.workspaceMember.findFirst({
            where: { userId, workspaceId: { not: workspaceId } }
        });
        await prisma.user.update({
            where: { id: userId },
            data: { activeWorkspaceId: newMembership?.workspaceId ?? null }
        });
    }

    revalidatePath('/settings');
}

export async function getUserWorkspaceAccess(userId: string) {
    await requireAdmin();

    const memberships = await prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: { select: { id: true, name: true } } }
    });

    return memberships.map(m => m.workspace);
}
