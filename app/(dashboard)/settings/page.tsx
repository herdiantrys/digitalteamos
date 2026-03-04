import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import { createUser, updateUserStatus, deleteUser } from '../../../lib/admin-actions';
import { createPropertyDefinition } from '../../../lib/property-actions';
import SettingsClient, { UserRow } from './SettingsClient';

const prisma = new PrismaClient();

export default async function SettingsPage() {
    const currentUser = await requireAuth();
    const isAdmin = currentUser.role === 'ADMIN';

    const users = await prisma.user.findMany({
        orderBy: { createdAt: 'asc' }
    });

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { order: 'asc' }
    });

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
                    <h2 className="page-title" style={{ marginTop: 48, fontSize: 20 }}>Content Schema Editor</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 32 }}>
                        {/* Add Property Form */}
                        <div className="glass-card" style={{ height: 'fit-content' }}>
                            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Add Content Property</h3>
                            <form action={createPropertyDefinition} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <input name="name" placeholder="Property Name (e.g., Campaign, Priority)" required style={inputStyle} />
                                <select name="type" required style={inputStyle}>
                                    <option value="TEXT">Text</option>
                                    <option value="NUMBER">Number</option>
                                    <option value="SELECT">Select</option>
                                    <option value="MULTI_SELECT">Multi-select</option>
                                    <option value="DATE">Date</option>
                                    <option value="PERSON">Person</option>
                                    <option value="CHECKBOX">Checkbox</option>
                                    <option value="URL">URL</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="PHONE">Phone</option>
                                    <option value="STATUS">Status</option>
                                </select>
                                <input name="options" placeholder="Comma separated options (for Select types)" style={inputStyle} />
                                <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>Add Property</button>
                            </form>
                        </div>

                        {/* Draggable Properties List */}
                        <div className="glass-card">
                            <SettingsClient properties={properties} />
                        </div>
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
