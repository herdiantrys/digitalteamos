'use client';

import { useState, useTransition } from 'react';
import { addUserToWorkspace, removeUserFromWorkspace } from '../../../lib/admin-actions';
import { Building2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

type Workspace = { id: string; name: string };
type User = {
    id: string;
    name: string;
    email: string;
    role: string;
    photo: string | null;
    workspaceIds: string[];
};

function UserWorkspaceRow({
    user,
    allWorkspaces,
}: {
    user: User;
    allWorkspaces: Workspace[];
}) {
    const [expanded, setExpanded] = useState(false);
    const [memberOf, setMemberOf] = useState<string[]>(user.workspaceIds);
    const [isPending, startTransition] = useTransition();
    const [loadingWsId, setLoadingWsId] = useState<string | null>(null);

    const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    const hue = Math.abs(user.name.charCodeAt(0) * 7 + (user.name.charCodeAt(1) || 0) * 13) % 360;
    const isMember = (wsId: string) => memberOf.includes(wsId);

    const toggle = (wsId: string) => {
        setLoadingWsId(wsId);
        const currently = isMember(wsId);
        // Optimistic
        setMemberOf(prev => currently ? prev.filter(id => id !== wsId) : [...prev, wsId]);

        startTransition(async () => {
            try {
                if (currently) {
                    await removeUserFromWorkspace(user.id, wsId);
                } else {
                    await addUserToWorkspace(user.id, wsId);
                }
            } catch (err: any) {
                // Rollback
                setMemberOf(prev => currently ? [...prev, wsId] : prev.filter(id => id !== wsId));
                alert(err.message || 'Operation failed');
            } finally {
                setLoadingWsId(null);
            }
        });
    };

    return (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 10, overflow: 'hidden' }}>
            {/* User Header Row */}
            <div
                onClick={() => setExpanded(x => !x)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    background: expanded ? 'var(--hover-bg)' : 'var(--sidebar-bg)',
                    transition: 'background 0.15s',
                }}
            >
                {/* Avatar */}
                <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `hsl(${hue}, 55%, 22%)`, border: `2px solid hsl(${hue}, 65%, 45%)`,
                    fontSize: 12, fontWeight: 700, color: `hsl(${hue}, 80%, 80%)`
                }}>
                    {user.photo
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                        {user.email}
                    </div>
                </div>

                {/* Workspace count badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'rgba(46,170,220,0.12)', padding: '4px 10px', borderRadius: 20,
                        fontSize: 11, fontWeight: 700, color: '#2eaadc', border: '1px solid rgba(46,170,220,0.25)'
                    }}>
                        <Building2 size={12} />
                        {memberOf.length} workspace{memberOf.length !== 1 ? 's' : ''}
                    </div>
                    {expanded ? <ChevronUp size={16} color="var(--text-secondary)" /> : <ChevronDown size={16} color="var(--text-secondary)" />}
                </div>
            </div>

            {/* Workspace Checkboxes Panel */}
            {expanded && (
                <div style={{
                    padding: '12px 16px', borderTop: '1px solid var(--border-color)',
                    background: 'var(--bg-color)', display: 'flex', flexDirection: 'column', gap: 8
                }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                        Workspace Access
                    </div>
                    {allWorkspaces.map(ws => {
                        const active = isMember(ws.id);
                        const loading = loadingWsId === ws.id && isPending;
                        return (
                            <button
                                key={ws.id}
                                onClick={() => toggle(ws.id)}
                                disabled={isPending}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                                    background: active ? 'rgba(46,170,220,0.08)' : 'var(--sidebar-bg)',
                                    cursor: isPending ? 'wait' : 'pointer', textAlign: 'left',
                                    transition: 'all 0.15s', width: '100%',
                                    borderColor: active ? 'rgba(46,170,220,0.4)' : 'var(--border-color)'
                                }}
                            >
                                {/* Checkbox Indicator */}
                                <div style={{
                                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: active ? '#2eaadc' : 'transparent',
                                    border: active ? '2px solid #2eaadc' : '2px solid var(--border-color)',
                                    transition: 'all 0.15s'
                                }}>
                                    {active && <Check size={11} color="white" strokeWidth={3} />}
                                </div>
                                <Building2 size={14} color={active ? '#2eaadc' : 'var(--text-secondary)'} />
                                <span style={{
                                    flex: 1, fontSize: 13, fontWeight: 500,
                                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)'
                                }}>
                                    {ws.name}
                                </span>
                                {loading && (
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Saving…</span>
                                )}
                                {!loading && active && (
                                    <X size={13} color="rgba(46,170,220,0.6)" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function WorkspaceMembersPanel({
    users,
    allWorkspaces,
}: {
    users: User[];
    allWorkspaces: Workspace[];
}) {
    const [search, setSearch] = useState('');

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Search bar */}
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search members…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '9px 12px 9px 36px',
                        border: '1px solid var(--border-color)', borderRadius: 8,
                        background: 'var(--sidebar-bg)', color: 'var(--text-primary)',
                        fontSize: 13, outline: 'none', boxSizing: 'border-box'
                    }}
                />
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }}>🔍</span>
            </div>

            {/* User Rows */}
            {filteredUsers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                    No members found.
                </div>
            ) : (
                filteredUsers.map(user => (
                    <UserWorkspaceRow
                        key={user.id}
                        user={user}
                        allWorkspaces={allWorkspaces}
                    />
                ))
            )}
        </div>
    );
}
