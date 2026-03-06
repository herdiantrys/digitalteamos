'use client';

import { useState, useRef } from 'react';
import { updateUser } from '../../../lib/admin-actions';

// ─────────────────────────────────────────────
// User Edit Modal — Premium Two-Panel Design
// ─────────────────────────────────────────────
function EditUserModal({ user, onClose }: { user: any; onClose: () => void }) {
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState<string>(user.photo || '');
    const formRef = useRef<HTMLFormElement>(null);

    const birthdateValue = user.birthdate
        ? new Date(user.birthdate).toISOString().substring(0, 10)
        : '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;
        setIsSaving(true);
        try {
            await updateUser(new FormData(formRef.current));
            setSaveSuccess(true);
            setTimeout(() => onClose(), 800);
        } finally {
            setIsSaving(false);
        }
    };

    // Generate avatar initials and a deterministic accent color from the name
    const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const hue = Math.abs(user.name.charCodeAt(0) * 7 + (user.name.charCodeAt(1) || 0) * 13) % 360;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            animation: 'fadeIn 0.15s ease'
        }}>
            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
                .em-input {
                    width: 100%; padding: 10px 12px;
                    border: 1px solid var(--border-color); border-radius: 8px;
                    background: var(--sidebar-bg); color: var(--text-primary);
                    font-size: 13px; outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                }
                .em-input:focus {
                    border-color: rgba(255,255,255,0.35);
                    box-shadow: 0 0 0 3px rgba(255,255,255,0.06);
                }
                .em-section-title {
                    font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
                    text-transform: uppercase; color: var(--text-secondary);
                    padding-bottom: 8px; margin-bottom: 12px;
                    border-bottom: 1px solid var(--border-color);
                }
            `}</style>

            {/* Blurred Backdrop */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)' }} />

            {/* Modal Shell */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: 700, maxWidth: '100%', maxHeight: '90vh',
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 18,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideUp 0.22s ease',
                boxShadow: '0 40px 80px rgba(0,0,0,0.55)'
            }}>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>Edit Team Member</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Update profile, access, and security settings</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-color)', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✕</button>
                </div>

                {/* Modal Body */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

                    {/* ← Left: Avatar / Identity Panel */}
                    <div style={{
                        width: 210, flexShrink: 0,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 14, padding: '32px 20px',
                        background: `linear-gradient(160deg, hsl(${hue}, 55%, 10%), var(--bg-color))`,
                        borderRight: '1px solid var(--border-color)'
                    }}>
                        {/* Live avatar preview */}
                        <div style={{
                            width: 90, height: 90, borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: `hsl(${hue}, 60%, 18%)`,
                            border: `3px solid hsl(${hue}, 70%, 50%)`,
                            boxShadow: `0 0 0 5px hsl(${hue}, 70%, 50%, 0.15)`,
                            fontSize: 28, fontWeight: 700,
                            color: `hsl(${hue}, 80%, 80%)`
                        }}>
                            {previewPhoto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={previewPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setPreviewPhoto('')} />
                            ) : initials}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{user.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3, wordBreak: 'break-all' }}>{user.email}</div>
                        </div>

                        {/* Role badge */}
                        <div style={{ padding: '5px 14px', borderRadius: 20, background: `hsl(${hue}, 55%, 18%)`, border: `1px solid hsl(${hue}, 60%, 35%)`, fontSize: 11, fontWeight: 700, color: `hsl(${hue}, 80%, 75%)`, letterSpacing: '0.05em' }}>
                            {user.role}
                        </div>

                        {user.isBanned && (
                            <div style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(255,77,79,0.12)', border: '1px solid rgba(255,77,79,0.3)', fontSize: 11, fontWeight: 700, color: '#ff4d4f' }}>
                                BANNED
                            </div>
                        )}
                    </div>

                    {/* → Right: Form */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
                        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <input type="hidden" name="id" value={user.id} />

                            {/* Photo Section */}
                            <div>
                                <div className="em-section-title">🖼 Profile Photo</div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Image URL</label>
                                <input
                                    name="photo"
                                    type="url"
                                    placeholder="https://example.com/photo.jpg"
                                    defaultValue={user.photo || ''}
                                    onChange={e => setPreviewPhoto(e.target.value)}
                                    className="em-input"
                                />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 6 }}>Avatar preview updates live on the left panel.</div>
                            </div>

                            {/* Basic Info Section */}
                            <div>
                                <div className="em-section-title">👤 Basic Information</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Full Name</label>
                                        <input name="name" required defaultValue={user.name} className="em-input" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email Address</label>
                                        <input name="email" type="email" required defaultValue={user.email} className="em-input" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Role</label>
                                        <select name="role" defaultValue={user.role} className="em-input">
                                            <option value="STAFF">Staff (Creator)</option>
                                            <option value="ADMIN">Admin (Manager)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Date of Birth</label>
                                        <input name="birthdate" type="date" defaultValue={birthdateValue} className="em-input" style={{ padding: '9px 12px' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Security Section */}
                            <div>
                                <div className="em-section-title">🔒 Security</div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                                    New Password <span style={{ opacity: 0.55 }}>(leave blank to keep current)</span>
                                </label>
                                <input name="newPassword" type="password" placeholder="••••••••" className="em-input" />
                            </div>

                            {/* Footer Actions */}
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                                <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13 }}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving || saveSuccess}
                                    style={{
                                        padding: '10px 28px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                        background: saveSuccess ? '#27ae60' : `hsl(${hue}, 70%, 55%)`,
                                        color: '#fff', fontSize: 13, fontWeight: 700,
                                        opacity: isSaving ? 0.75 : 1,
                                        transition: 'background 0.3s, opacity 0.2s',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    {saveSuccess ? '✓  Saved!' : isSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────
// User Row with Edit Button
// ─────────────────────────────────────────────
export function UserRow({ user, currentUserId, banAction, activeAction, deleteAction }: {
    user: any;
    currentUserId: string;
    banAction: React.ReactNode;
    activeAction?: React.ReactNode;
    deleteAction: React.ReactNode;
}) {
    const [isEditing, setIsEditing] = useState(false);

    return (
        <>
            {isEditing && <EditUserModal user={user} onClose={() => setIsEditing(false)} />}

            <div className="user-row-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--bg-color)', borderRadius: 12, border: '1px solid var(--border-color)', gap: 16, transition: 'all 0.2s' }}>
                <style>{`
                    .user-row-hover:hover { 
                        background: var(--sidebar-bg) !important; 
                        border-color: rgba(255,255,255,0.1) !important; 
                    }
                `}</style>
                {/* Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--border-color)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, opacity: user.isActive === false ? 0.5 : 1 }}>
                        {user.photo
                            // eslint-disable-next-line @next/next/no-img-element
                            ? <img src={user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : '👤'
                        }
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {user.name} {user.id === currentUserId && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>(You)</span>}
                            {user.isActive === false && <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'rgba(148,163,184,0.15)', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>INACTIVE</span>}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {user.email} • {user.role}
                            {user.birthdate && ` • Born: ${new Date(user.birthdate).toLocaleDateString('id-ID')}`}
                        </div>
                        {user.isBanned && <span style={{ fontSize: 11, color: '#ff4d4f', background: 'rgba(255,77,79,0.1)', padding: '2px 6px', borderRadius: 4, marginTop: 4, display: 'inline-block' }}>BANNED</span>}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => setIsEditing(true)} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Edit</button>
                    {user.id !== currentUserId && (
                        <>
                            {activeAction}
                            {banAction}
                            {deleteAction}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}




// Shared styles
const inputStyle: React.CSSProperties = {
    padding: '10px 12px',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    background: 'var(--bg-color)',
    width: '100%',
    color: 'var(--text-primary)',
    fontSize: 13,
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    marginBottom: 6,
    color: 'var(--text-secondary)',
};
