'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from './auth';

const prisma = new PrismaClient();

export async function createPropertyDefinition(formData: FormData) {
    await requireAdmin();

    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const optionsRaw = formData.get('options') as string;

    let options = null;
    if ((type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS') && optionsRaw) {
        // Expect comma-separated values, map them to JSON array
        options = JSON.stringify(optionsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0));
    }

    await prisma.propertyDefinition.create({
        data: { name, type, options }
    });

    revalidatePath('/settings');
}

export async function updatePropertyDefinition(id: string, name: string, type: string, optionsRaw: string | null) {
    await requireAdmin();

    let options = null;
    if ((type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS') && optionsRaw) {
        options = JSON.stringify(optionsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0));
    }

    await prisma.propertyDefinition.update({
        where: { id },
        data: { name, type, options }
    });

    revalidatePath('/settings');
}

export async function deletePropertyDefinition(id: string) {
    await requireAdmin();

    // deleteMany is safe: silently succeeds if the record no longer exists
    await prisma.propertyDefinition.deleteMany({
        where: { id }
    });

    revalidatePath('/settings');
    revalidatePath('/content');
}


export async function reorderProperties(orderedIds: string[]) {
    await requireAdmin();

    // Safety check: only update properties that still exist
    const existing = await prisma.propertyDefinition.findMany({
        where: { id: { in: orderedIds } },
        select: { id: true }
    });
    const validIds = orderedIds.filter(id => existing.some(e => e.id === id));

    // Update each property's order index based on position in the array
    await Promise.all(
        validIds.map((id, index) =>
            prisma.propertyDefinition.update({
                where: { id },
                data: { order: index }
            })
        )
    );

    revalidatePath('/settings');
}

export async function updatePropertyColorConfig(id: string, colorConfig: string) {
    await requireAdmin();

    await prisma.propertyDefinition.update({
        where: { id },
        data: { colorConfig }
    });

    revalidatePath('/settings');
    revalidatePath('/content');
}
