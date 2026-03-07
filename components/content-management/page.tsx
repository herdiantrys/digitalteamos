import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../lib/auth';
import { createContent } from '../../lib/content-actions';
import BadgeDropdown from './BadgeDropdown';
import ContentViewer from './ContentViewer';
import ImportExportPanel from './ImportExportPanel';
import CreateContentModal from './CreateContentModal';

const prisma = new PrismaClient();

export default async function ContentPage() {
    const user = await requireAuth();

    const contents = await prisma.content.findMany({
        select: {
            id: true,
            title: true,
            caption: true,
            mediaUrl: true,
            customFields: true,
            // @ts-ignore
            orderIdx: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { order: 'asc' }
    });

    const users = await prisma.user.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    // Fetch Views
    let views = await prisma.contentView.findMany({
        orderBy: { order: 'asc' }
    });

    // Create a default view if none exist
    if (views.length === 0) {
        const defaultView = await prisma.contentView.create({
            data: {
                name: 'Table View',
                layout: 'table',
                order: 0
            }
        });
        views = [defaultView];
    }

    const userOptionsRaw = JSON.stringify(users.map(u => u.name));

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Content Management</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <CreateContentModal properties={properties} userOptionsRaw={userOptionsRaw} />
                    <ImportExportPanel userRole={user.role} />
                </div>
            </div>

            <ContentViewer
                contents={contents}
                properties={properties}
                userOptionsRaw={userOptionsRaw}
                initialViews={views}
                currentUser={user}
            />

        </div>
    );
}
