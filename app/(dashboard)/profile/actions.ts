'use server';

import { requireAuth } from '../../../lib/auth';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function updateProfile(formData: FormData) {
    const user = await requireAuth();

    const email = formData.get('email') as string;
    const bio = formData.get('bio') as string;
    const photoUrl = formData.get('photoUrl') as string;

    if (!email) {
        throw new Error('Email is required');
    }

    try {
        await prisma.user.update({
            where: { id: user.id },
            data: {
                email,
                bio: bio || null,
                photo: photoUrl || null,
            }
        });

        revalidatePath('/profile');
        revalidatePath('/', 'layout'); // Revalidate global layout for sidebar changes
        return { success: true };
    } catch (error) {
        console.error('Failed to update profile:', error);
        throw new Error('Failed to update profile');
    }
}
