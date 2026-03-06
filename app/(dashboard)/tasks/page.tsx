import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import KanbanBoardClient from './KanbanBoardClient';

const prisma = new PrismaClient();

export default async function TasksPage() {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');
    const workspaceId: string = user.activeWorkspaceId;

    // Fetch all workspace users for assignment
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, photo: true } } }
    });
    const workspaceUsers = members.map(m => m.user);

    // Fetch Content/Database items for relation
    // For now we just fetch everything, but in a massive workspace this should be a search endpoint.
    const relations = await prisma.content.findMany({
        where: { workspaceId },
        select: { id: true, title: true, database: { select: { name: true, icon: true } } },
        orderBy: { createdAt: 'desc' }
    });

    const tasks = await prisma.task.findMany({
        where: { workspaceId },
        include: {
            assignee: { select: { id: true, name: true, photo: true } },
            creator: { select: { id: true, name: true, photo: true } },
            relatedItem: { select: { id: true, title: true, database: { select: { name: true, icon: true } } } }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 40px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexShrink: 0 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tasks</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>Manage and assign tasks across your workspace</p>
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <KanbanBoardClient
                    tasks={tasks}
                    users={workspaceUsers}
                    relations={relations}
                    currentUser={user as any}
                />
            </div>
        </div>
    );
}
