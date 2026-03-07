import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import KanbanBoardClient from './KanbanBoardClient';

const prisma = new PrismaClient();

export default async function TasksPage() {
    const user = await requireAuth();
    if (!user.activeWorkspaceId) throw new Error('No active workspace');
    const workspaceId: string = user.activeWorkspaceId;

    // Fetch active workspace users for assignment
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, photo: true, isActive: true } } }
    });
    const workspaceUsers = members.filter(m => m.user.isActive).map(m => m.user);

    // Fetch Content/Database items for relation
    // For now we just fetch everything, but in a massive workspace this should be a search endpoint.
    const relations = await prisma.content.findMany({
        where: { workspaceId },
        select: { id: true, title: true, databaseId: true, database: { select: { name: true, icon: true, iconColor: true } } },
        orderBy: { createdAt: 'desc' }
    });

    const tasks = await prisma.task.findMany({
        where: { workspaceId },
        include: {
            assignees: { select: { id: true, name: true, photo: true } },
            creator: { select: { id: true, name: true, photo: true } },
            relatedItems: { select: { id: true, title: true, database: { select: { name: true, icon: true, iconColor: true } } } }
        },
        orderBy: { updatedAt: 'desc' }
    });

    const todoCount = tasks.filter(t => t.status === 'TODO').length;
    const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const doneCount = tasks.filter(t => t.status === 'DONE').length;

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 32px 16px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Premium Page Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(139, 92, 246, 0.06))', border: '1px solid rgba(139, 92, 246, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Tasks</h1>
                        <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>📋 {todoCount} to do</span>
                            <span style={{ color: '#3498db' }}>⚡ {inProgressCount} in progress</span>
                            <span style={{ color: '#2ecc71' }}>✓ {doneCount} done</span>
                        </div>
                    </div>
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
