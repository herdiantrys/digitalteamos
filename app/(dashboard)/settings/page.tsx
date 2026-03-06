import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import { createUser, updateUserStatus, deleteUser } from '../../../lib/admin-actions';
import { UserRow } from './SettingsClient';
import WorkspaceSettingsClient from './WorkspaceSettingsClient';

const prisma = new PrismaClient();

export default async function SettingsPage() {
    const currentUser = await requireAuth();
    const isAdmin = currentUser.role === 'ADMIN';

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' }
    });

    if (!currentUser.activeWorkspaceId) throw new Error('No active workspace');



    const adminWorkspaces = isAdmin ? await prisma.workspace.findMany({
        where: {
            members: { some: { userId: currentUser.id } }
        },
        orderBy: { createdAt: 'asc' }
    }) : [];

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 40px' }}>
            <h1 className="page-title">Team Settings</h1>

            {isAdmin ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 32 }}>
                    {/* Add User Form */}
                    <div className="glass-card" style={{ height: 'fit-content' }}>
                        <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Add Team Member</h3>
                        <form action={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <input name="name" placeholder="Full Name" required style={inputStyle} />
                            <input name="email" type="email" placeholder="Email Address" required style={inputStyle} />
                            <input name="password" type="password" placeholder="Temporary Password" required style={inputStyle} />
                            <select name="role" style={inputStyle}>
                                <option value="STAFF">Staff (Creator)</option>
                                <option value="ADMIN">Admin (Manager)</option>
                            </select>
                            <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Create User</button>
                        </form>
                    </div>

                    {/* User List with Edit */}
                    <div className="glass-card">
                        <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Manage Members</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {users.map(u => (
                                <UserRow
                                    key={u.id}
                                    user={u}
                                    currentUserId={currentUser.id}
                                    banAction={
                                        <form action={async () => {
                                            'use server';
                                            await updateUserStatus(u.id, !u.isBanned);
                                        }}>
                                            <button type="submit" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', background: u.isBanned ? '#52c41a' : '#faad14', color: '#fff', border: 'none' }}>
                                                {u.isBanned ? 'Unban' : 'Ban'}
                                            </button>
                                        </form>
                                    }
                                    deleteAction={
                                        <form action={async () => {
                                            'use server';
                                            await deleteUser(u.id);
                                        }}>
                                            <button type="submit" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#ff4d4f', border: '1px solid #ff4d4f' }}>
                                                Delete
                                            </button>
                                        </form>
                                    }
                                />
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="glass-card">
                    <p style={{ color: 'var(--text-secondary)' }}>You are logged in as <strong>{currentUser.name}</strong>. Only administrators can manage team access.</p>
                </div>
            )}

            {isAdmin && (
                <>
                    <h2 className="page-title" style={{ marginTop: 48, fontSize: 20 }}>Workspaces</h2>
                    <div className="glass-card" style={{ marginBottom: 48 }}>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 13 }}>
                            Manage the workspaces you are part of. Deleting a workspace will automatically migrate users to another workspace if available.
                        </p>
                        <WorkspaceSettingsClient
                            workspaces={adminWorkspaces}
                            activeWorkspaceId={currentUser.activeWorkspaceId as string}
                        />
                    </div>


                </>
            )}

        </div>
    );
}

const inputStyle = {
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    background: 'var(--bg-color)',
    width: '100%'
};
