'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function createUser(formData: FormData) {
    await requireAdmin();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const passwordRaw = formData.get('password') as string;
    const role = formData.get('role') as string || 'STAFF';

    const password = await bcrypt.hash(passwordRaw, 10);

    await prisma.user.create({
        data: { name, email, password, role }
    });

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
