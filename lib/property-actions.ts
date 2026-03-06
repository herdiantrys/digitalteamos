'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAuth } from './auth';

const prisma = new PrismaClient();

export async function createPropertyDefinition(formData: FormData) {
    const user = await requireAdmin();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const optionsRaw = formData.get('options') as string;
    const databaseId = formData.get('databaseId') as string | null;

    let options = null;
    if ((type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS') && optionsRaw) {
        // Expect comma-separated values, map them to JSON array
        options = JSON.stringify(optionsRaw.split(',').map(s => s.trim()).filter(s => s.length > 0));
    }

    await prisma.propertyDefinition.create({
        data: {
            name,
            type,
            options,
            workspaceId: user.activeWorkspaceId,
            databaseId: databaseId || null
        }
    });

    revalidatePath('/settings');
    revalidatePath('/content');
    if (databaseId) {
        revalidatePath(`/databases/${databaseId}`);
    }
}

export async function updatePropertyDefinition(id: string, name: string, type: string, optionsRaw: string | null, icon?: string | null) {
    await requireAdmin();

    // Accept optionsRaw as a pre-built JSON array string (e.g. '["A","B"]') or null.
    // Only store options for selectable types; clear it for other types.
    const options = (type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS')
        ? (optionsRaw || null)
        : null;

    const updated = await (prisma.propertyDefinition as any).update({
        where: { id },
        data: { name, type, options, icon }
    });

    revalidatePath('/settings');
    revalidatePath('/content');
    revalidatePath('/databases');
    if (updated.databaseId) {
        revalidatePath(`/databases/${updated.databaseId}`);
    }
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

export async function duplicatePropertyDefinition(id: string) {
    const user = await requireAdmin();

    const original = await prisma.propertyDefinition.findUnique({
        where: { id }
    });

    if (!original) throw new Error('Property not found');

    const newProp = await (prisma.propertyDefinition as any).create({
        data: {
            name: `${original.name} (Copy)`,
            type: original.type,
            options: original.options,
            icon: (original as any).icon,
            colorConfig: original.colorConfig,
            workspaceId: user.activeWorkspaceId!,
            databaseId: original.databaseId,
            order: (original.order ?? 0) + 1
        }
    });

    revalidatePath('/settings');
    revalidatePath('/content');
    if (newProp.databaseId) {
        revalidatePath(`/databases/${newProp.databaseId}`);
    }
    return newProp;
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

export async function addPropertyOptions(propertyId: string, newOptions: string[]) {
    await requireAuth(); // Regular users should be able to create tags

    const prop = await prisma.propertyDefinition.findUnique({ where: { id: propertyId } });
    if (!prop) return;

    if (prop.type !== 'SELECT' && prop.type !== 'MULTI_SELECT' && prop.type !== 'STATUS') return;

    let options: string[] = [];
    try { options = prop.options ? JSON.parse(prop.options) : []; } catch { }

    let changed = false;
    for (const opt of newOptions) {
        if (!options.includes(opt)) {
            options.push(opt);
            changed = true;
        }
    }

    if (changed) {
        await prisma.propertyDefinition.update({
            where: { id: propertyId },
            data: { options: JSON.stringify(options) }
        });
        revalidatePath('/settings');
        revalidatePath('/content');
    }
}
