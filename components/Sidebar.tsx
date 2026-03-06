'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition, useRef, useEffect } from 'react';
import { LayoutDashboard, Radio, Clapperboard, FolderOpen, Settings, ChevronDown, Plus, Check, Database, Users, CheckSquare } from 'lucide-react';
import { switchWorkspace, createWorkspace } from '../lib/workspace-actions';
import LucideIcon from './LucideIcon';

export default function Sidebar({
    userName = 'User',
    userRole = 'STAFF',
    workspaces = [],
    activeWorkspaceId = null,
    databases = [],
}: {
    userName?: string,
    userRole?: string,
    workspaces?: any[],
    activeWorkspaceId?: string | null,
    databases?: { id: string; name: string; icon: string | null; iconColor: string | null }[],
}) {
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [showNewDbModal, setShowNewDbModal] = useState(false);

    // Workspace Switcher State
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (isSwitcherOpen && switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
                setIsSwitcherOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSwitcherOpen]);

    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    const activeWorkspaceName = activeWorkspace?.name || 'Loading Workspace...';
    const activeWorkspaceInitials = activeWorkspaceName.substring(0, 2).toUpperCase();

    const handleSwitchWorkspace = (id: string) => {
        if (id !== activeWorkspaceId) {
            startTransition(async () => {
                await switchWorkspace(id);
                setIsSwitcherOpen(false);
            });
        }
    };

    const handleCreateWorkspace = () => {
        const name = prompt('New Workspace Name:');
        if (name && name.trim()) {
            startTransition(async () => {
                await createWorkspace(name.trim());
                setIsSwitcherOpen(false);
            });
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Feed', path: '/feed', icon: <Radio size={18} /> },
        { name: 'Tasks', path: '/tasks', icon: <CheckSquare size={18} /> },
    ];

    if (userRole === 'ADMIN') {
        navItems.push({ name: 'Settings', path: '/settings', icon: <Settings size={18} /> });
    }

    const isAdmin = userRole === 'ADMIN';

    return (
        <aside className="sidebar">
            {/* Workspace Header */}
            <div className="sidebar-header" ref={switcherRef} style={{ position: 'relative', padding: '16px 12px 24px 12px' }}>
                {isAdmin ? (
                    // ADMIN: full workspace switcher
                    <div
                        onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, transition: 'background 0.2s', margin: '-6px -8px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(55, 53, 47, 0.04)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))', borderRadius: 6, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
                            {activeWorkspace?.logo ? <LucideIcon name={activeWorkspace.logo} size={14} /> : activeWorkspaceInitials}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14 }}>
                            {activeWorkspaceName}
                        </div>
                        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: isSwitcherOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </div>
                ) : (
                    // STAFF: static workspace name only (no switching)
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px' }}>
                        <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))', borderRadius: 6, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
                            {activeWorkspace?.logo ? <LucideIcon name={activeWorkspace.logo} size={14} /> : activeWorkspaceInitials}
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{activeWorkspaceName}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Users size={10} /> Team Workspace
                            </div>
                        </div>
                    </div>
                )}

                {/* Admin-only: workspace switcher dropdown */}
                {isAdmin && isSwitcherOpen && (
                    <div className="topbar-popover" style={{ top: 'calc(100% - 16px)', left: 12, right: 12, width: 'auto', minWidth: 260 }}>
                        <div style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                            Workspaces
                        </div>
                        <div style={{ padding: '8px 0', maxHeight: 300, overflowY: 'auto' }}>
                            {workspaces.map(w => (
                                <div
                                    key={w.id}
                                    className="topbar-popover-item"
                                    style={{ justifyContent: 'space-between' }}
                                    onClick={() => handleSwitchWorkspace(w.id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                                        <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))', borderRadius: 4, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>
                                            {w.logo ? <LucideIcon name={w.logo} size={12} /> : w.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{w.name}</span>
                                    </div>
                                    {w.id === activeWorkspaceId && <Check size={14} color="var(--accent-color)" />}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
                            <div className="topbar-popover-item" onClick={handleCreateWorkspace}>
                                <Plus size={16} color="var(--text-secondary)" />
                                Create workspace
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="sidebar-nav">
                {navItems.map(item => {
                    const isActive = pathname === item.path;
                    return (
                        <Link
                            key={item.path}
                            href={item.path}
                            className={`nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}

                {/* ── Databases Section ── */}
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px 6px' }}>
                        <Link
                            href="/databases"
                            style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--text-secondary)', textDecoration: 'none', textTransform: 'uppercase' }}
                        >
                            Databases
                        </Link>
                        {userRole === 'ADMIN' && (
                            <Link
                                href="/databases?new=1"
                                title="New Database"
                                style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: 2, borderRadius: 4 }}
                                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                            >
                                <Plus size={14} />
                            </Link>
                        )}
                    </div>

                    {databases.length === 0 ? (
                        <Link
                            href="/databases"
                            className={`nav-item ${pathname === '/databases' ? 'active' : ''}`}
                            style={{ fontSize: 13, gap: 8, color: 'var(--text-secondary)' }}
                        >
                            <Database size={16} />
                            All Databases
                        </Link>
                    ) : (
                        databases.map(db => {
                            const isActive = pathname === `/databases/${db.id}`;
                            return (
                                <Link
                                    key={db.id}
                                    href={`/databases/${db.id}`}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    style={{ fontSize: 13, gap: 8 }}
                                >
                                    <LucideIcon
                                        name={db.icon || 'Database'}
                                        size={16}
                                        style={{ color: db.iconColor || 'inherit', opacity: db.iconColor ? 1 : 0.8 }}
                                    />
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{db.name}</span>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* User Profile Badge */}
            <Link href="/profile" style={{ textDecoration: 'none' }}>
                <div className="user-profile-badge">
                    <div className="avatar">
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {userName}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            LAN Mode Active
                        </span>
                    </div>
                </div>
            </Link>
        </aside >
    );
}
