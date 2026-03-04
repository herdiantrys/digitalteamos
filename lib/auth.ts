'use server';

import { cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { redirect } from 'next/navigation';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
        redirect('/?error=Email+and+password+are+required');
    }

    const user = await prisma.user.findUnique({
        where: { email },
    });

    if (!user) {
        redirect('/?error=Invalid+credentials');
    }

    if (user.isBanned) {
        redirect('/?error=Account+banned');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
        redirect('/?error=Invalid+credentials');
    }

    const cookieStore = await cookies();
    cookieStore.set('currentUser', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    redirect('/dashboard'); // Redirect to dashboard after login
}

export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('currentUser');
    redirect('/');
}

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const userId = cookieStore.get('currentUser')?.value;

    if (!userId) return null;

    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    return user;
}

export async function requireAuth() {
    const user = await getCurrentUser();
    if (!user || user.isBanned) {
        redirect('/');
    }
    return user;
}

export async function requireAdmin() {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
        redirect('/dashboard');
    }
    return user;
}
