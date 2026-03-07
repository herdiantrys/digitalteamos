import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../../lib/auth';
import { notFound } from 'next/navigation';
import ContentViewer from '../../../../components/content-management/ContentViewer';
import CreateContentModal from '../../../../components/content-management/CreateContentModal';
import ImportExportPanel from '../../../../components/content-management/ImportExportPanel';
import DatabaseHeader from './DatabaseHeader';

const prisma = new PrismaClient();

export default async function DatabasePage({ params }: { params: { id: string } }) {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const { id: databaseId } = await params;

    // Load the database record
    const database = await prisma.database.findFirst({
        where: { id: databaseId, workspaceId: user.activeWorkspaceId },
    });
    if (!database) notFound();

    // Load content scoped to this database
    const contents = await prisma.content.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        select: {
            id: true,
            title: true,
            caption: true,
            mediaUrl: true,
            customFields: true,
            orderIdx: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Load properties scoped to this database
    const properties = await prisma.propertyDefinition.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { order: 'asc' },
    });

    const users = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, photo: true },
    });

    // Load views scoped to this database
    let views = await prisma.contentView.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { order: 'asc' },
    });

    // Create a default view if none exist
    if (views.length === 0) {
        const defaultView = await prisma.contentView.create({
            data: {
                name: 'Table View',
                layout: 'table',
                order: 0,
                workspaceId: user.activeWorkspaceId,
                databaseId,
            },
        });
        views = [defaultView];
    }

    const userOptionsRaw = JSON.stringify(users.map(u => ({
        id: u.id,
        name: u.name,
        photo: u.photo
    })));

    return (
        <div className="page-container fade-in" data-turbo="cache-bust" style={{ maxWidth: '100%', padding: '24px 40px' }}>
            <DatabaseHeader
                database={database as any}
                currentUser={user}
                properties={properties}
                userOptionsRaw={userOptionsRaw}
            />

            <ContentViewer
                contents={contents}
                properties={properties}
                userOptionsRaw={userOptionsRaw}
                initialViews={views}
                currentUser={user}
                database={database}
            />
        </div>
    );
}
