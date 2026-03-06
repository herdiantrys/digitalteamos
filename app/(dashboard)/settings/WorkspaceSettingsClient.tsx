'use client';

import { useState } from 'react';
import { updateWorkspace, deleteWorkspace } from '../../../lib/workspace-actions';
import { Edit2, Save, X, Trash2, AlertTriangle } from 'lucide-react';

export default function WorkspaceSettingsClient({
    workspaces,
    activeWorkspaceId
}: {
    workspaces: any[];
    activeWorkspaceId: string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workspaces.map(workspace => (
                <WorkspaceRow
                    key={workspace.id}
                    workspace={workspace}
                    isActive={workspace.id === activeWorkspaceId}
                />
            ))}
        </div>
    );
}

function WorkspaceRow({ workspace, isActive }: { workspace: any, isActive: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(workspace.name);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || name === workspace.name) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            await updateWorkspace(workspace.id, name);
            setIsEditing(false);
        } catch (error: any) {
            alert(error.message);
            setName(workspace.name); // revert on failure
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteWorkspace(workspace.id);
        } catch (error: any) {
            alert(error.message);
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
        // If successful, the component will unmount as Next.js revalidates the page
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px',
            background: isActive ? 'var(--sidebar-bg)' : 'var(--bg-color)',
            border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
            borderRadius: 8,
            gap: 12,
            position: 'relative',
            overflow: 'hidden'
        }}>
            {isActive && (
                <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
                    background: 'var(--accent-color)'
                }} />
            )}

            <div style={{ flex: 1 }}>
                {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSave();
                                if (e.key === 'Escape') {
                                    setName(workspace.name);
                                    setIsEditing(false);
                                }
                            }}
                            className="em-input"
                            style={{ padding: '6px 10px', width: '100%', maxWidth: 300, background: 'var(--bg-color)', border: '1px solid var(--accent-color)', borderRadius: 4, outline: 'none', color: 'var(--text-primary)', fontSize: 14 }}
                            disabled={isSaving}
                        />
                        <button onClick={handleSave} disabled={isSaving || !name.trim()} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#2ecc71', padding: 4 }}>
                            {isSaving ? <span className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(46, 204, 113, 0.3)', borderTopColor: '#2ecc71', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span> : <Save size={16} />}
                        </button>
                        <button onClick={() => { setName(workspace.name); setIsEditing(false); }} disabled={isSaving} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}>
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{workspace.name}</span>
                        {isActive && <span style={{ fontSize: 10, background: 'var(--accent-color)', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>ACTIVE</span>}
                    </div>
                )}

                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                    Created: {new Date(workspace.createdAt).toLocaleDateString()}
                </div>
            </div>

            {/* Actions */}
            {!isEditing && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {showDeleteConfirm ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255, 77, 79, 0.1)', padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(255, 77, 79, 0.2)' }}>
                            <AlertTriangle size={14} color="#ff4d4f" />
                            <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 500 }}>Delete this workspace?</span>
                            <button onClick={handleDelete} disabled={isDeleting} style={{ marginLeft: 8, padding: '4px 8px', fontSize: 11, background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 500, cursor: isDeleting ? 'not-allowed' : 'pointer' }}>
                                {isDeleting ? 'Deleting...' : 'Confirm'}
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)} style={{ padding: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 4 }} className="hover-bg">
                                <Edit2 size={16} />
                            </button>
                            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: 6, background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', borderRadius: 4, opacity: 0.8 }} className="hover-bg-danger">
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            )}
            <style>{`
                .hover-bg:hover { background: rgba(255,255,255,0.05) !important; color: var(--text-primary) !important; }
                .hover-bg-danger:hover { background: rgba(255,77,79,0.1) !important; opacity: 1 !important; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
