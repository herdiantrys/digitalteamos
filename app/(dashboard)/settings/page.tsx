import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import { createUser, updateUserStatus, deleteUser, toggleUserActive } from '../../../lib/admin-actions';

import { UserRow } from './SettingsClient';
import WorkspaceSettingsClient from './WorkspaceSettingsClient';
import WorkspaceMembersPanel from './WorkspaceMembersPanel';
import { Settings, Shield, Users, UserPlus, LayoutGrid } from 'lucide-react';

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

    // For workspace access management: get all staff users with their workspace memberships
    const staffUsers = isAdmin ? await prisma.user.findMany({
        where: { role: 'STAFF' },
        orderBy: { name: 'asc' },
        include: {
            workspaceMembers: {
                where: {
                    workspaceId: { in: adminWorkspaces.map(w => w.id) }
                },
                select: { workspaceId: true }
            }
        }
    }) : [];

    const staffUsersForPanel = staffUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        photo: u.photo,
        workspaceIds: u.workspaceMembers.map(m => m.workspaceId)
    }));

    return (
        <div className="page-container fade-in" style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 80px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, rgba(46,170,220,0.2), rgba(46,170,220,0.05))', border: '1px solid rgba(46,170,220,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)' }}>
                    <Settings size={28} color="#2eaadc" />
                </div>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Workspace Settings</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>Manage your team, permissions, and workspace configurations.</p>
                </div>
            </div>

            {!isAdmin ? (
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, textAlign: 'center', background: 'var(--sidebar-bg)' }}>
                    <Shield size={48} color="var(--border-color)" style={{ marginBottom: 20 }} />
                    <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Access Restricted</h2>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>You are logged in as <strong>{currentUser.name}</strong>. Only administrators have permission to manage team settings and access controls.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>

                    {/* --- TEAM MANAGEMENT SECTION --- */}
                    <section>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ padding: 8, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}><Users size={20} color="#10b981" /></div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Team Members</h2>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, marginTop: 2 }}>Add and manage users across your organization.</p>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) 2fr', gap: 24, alignItems: 'start' }}>
                            {/* Add User Form */}
                            <div style={{ background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                                    <UserPlus size={18} color="var(--text-primary)" />
                                    <h3 style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Invite Member</h3>
                                </div>
                                <form action={createUser} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label style={labelStyle}>Full Name</label>
                                        <input name="name" placeholder="E.g. Jane Doe" required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Email Address</label>
                                        <input name="email" type="email" placeholder="jane@company.com" required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Temporary Password</label>
                                        <input name="password" type="password" placeholder="••••••••" required style={inputStyle} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>System Role</label>
                                        <div style={{ position: 'relative' }}>
                                            <select name="role" style={{ ...inputStyle, appearance: 'none', paddingRight: 32 }}>
                                                <option value="STAFF">Staff (Creator)</option>
                                                <option value="ADMIN">Admin (Manager)</option>
                                            </select>
                                            <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }}>▼</div>
                                        </div>
                                    </div>
                                    <button type="submit" style={{ ...btnStyle, marginTop: 8 }}>
                                        <UserPlus size={16} /> Create Account
                                    </button>
                                </form>
                            </div>

                            {/* User List with Edit */}
                            <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: '8px 8px 24px', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
                                <div style={{ padding: '16px 16px 20px' }}>
                                    <h3 style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>Active Roster</h3>
                                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, margin: 0 }}>{users.length} registered member{users.length !== 1 && 's'}</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 8px' }}>
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
                                                    <button type="submit" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: u.isBanned ? 'rgba(82, 196, 26, 0.15)' : 'rgba(250, 173, 20, 0.15)', color: u.isBanned ? '#52c41a' : '#faad14', border: 'none', transition: 'all 0.2s' }} className="hover-scale">
                                                        {u.isBanned ? 'Unban' : 'Ban'}
                                                    </button>
                                                </form>
                                            }
                                            activeAction={
                                                <form action={async () => {
                                                    'use server';
                                                    await toggleUserActive(u.id, !u.isActive);
                                                }}>
                                                    <button type="submit" title={u.isActive ? 'Deactivate user (hide from person selectors)' : 'Activate user (show in person selectors)'} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: u.isActive ? 'rgba(46, 204, 113, 0.15)' : 'rgba(148, 163, 184, 0.12)', color: u.isActive ? '#2ecc71' : 'var(--text-secondary)', border: 'none', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        {u.isActive ? '● Active' : '○ Inactive'}
                                                    </button>
                                                </form>
                                            }
                                            deleteAction={
                                                <form action={async () => {
                                                    'use server';
                                                    await deleteUser(u.id);
                                                }}>
                                                    <button type="submit" style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, borderRadius: 6, cursor: 'pointer', background: 'transparent', color: '#ff4d4f', border: '1px solid rgba(255, 77, 79, 0.3)', transition: 'all 0.2s' }} className="hover-bg-danger">
                                                        Remove
                                                    </button>
                                                </form>
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* --- WORKSPACE ACCESS SECTION --- */}
                    <section style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 32, borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                            <div style={{ padding: 10, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 10 }}><Shield size={24} color="#8b5cf6" /></div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Staff Workspace Access</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
                                    Control detailed access rights for Staff members across all active workspaces. Changes are saved automatically and applied immediately.
                                </p>
                            </div>
                        </div>
                        <div style={{ padding: 32, background: 'var(--bg-color)' }}>
                            {staffUsersForPanel.length === 0 ? (
                                <div style={{ padding: 40, textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 12 }}>
                                    <div style={{ width: 48, height: 48, borderRadius: 24, background: 'var(--sidebar-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Users size={20} color="var(--text-secondary)" /></div>
                                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>No Staff Members</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 300, margin: '0 auto' }}>Invite new members with the Staff role above to manage their access here.</p>
                                </div>
                            ) : (
                                <WorkspaceMembersPanel
                                    users={staffUsersForPanel}
                                    allWorkspaces={adminWorkspaces.map(w => ({ id: w.id, name: w.name }))}
                                />
                            )}
                        </div>
                    </section>

                    {/* --- WORKSPACES MANAGEMENT SECTION --- */}
                    <section style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: 32, borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                            <div style={{ padding: 10, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 10 }}><LayoutGrid size={24} color="#f59e0b" /></div>
                            <div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Workspace Configurations</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, marginTop: 6, maxWidth: 600, lineHeight: 1.5 }}>
                                    Manage the overarching workspaces you are part of. Deleting a workspace invokes an automatic user migration if another workspace exists.
                                </p>
                            </div>
                        </div>
                        <div style={{ padding: 32, background: 'var(--bg-color)' }}>
                            <WorkspaceSettingsClient
                                workspaces={adminWorkspaces}
                                activeWorkspaceId={currentUser.activeWorkspaceId as string}
                            />
                        </div>
                    </section>

                </div>
            )}

            <style>{`
                .hover-scale:hover { transform: scale(1.03); }
                .hover-bg-danger:hover { background: rgba(255, 77, 79, 0.1) !important; color: #ff4d4f !important; }
            `}</style>
        </div>
    );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text-secondary)' };

// Shared styles for the form
const inputStyle: React.CSSProperties = {
    padding: '12px 14px',
    border: '1px solid var(--border-color)',
    borderRadius: 8,
    background: 'var(--bg-color)',
    width: '100%',
    color: 'var(--text-primary)',
    fontSize: 14,
    transition: 'border-color 0.2s, box-shadow 0.2s'
};

const btnStyle: React.CSSProperties = {
    padding: '12px 20px',
    background: 'var(--accent-color)',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background 0.2s, transform 0.1s',
    boxShadow: '0 4px 12px rgba(46,170,220,0.25)'
};

