'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Radio, Clapperboard, Timer, FolderOpen, Settings } from 'lucide-react';

export default function Sidebar({ userName = 'User', userRole = 'STAFF' }: { userName?: string, userRole?: string }) {
    const pathname = usePathname();

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Feed', path: '/feed', icon: <Radio size={18} /> },
        { name: 'Content Management', path: '/content', icon: <Clapperboard size={18} /> },
        { name: 'Tasks', path: '/tasks', icon: <Timer size={18} /> },
        { name: 'Projects', path: '/projects', icon: <FolderOpen size={18} /> },
    ];

    // Only add Team Settings for admins
    if (userRole === 'ADMIN') {
        navItems.push({ name: 'Team Settings', path: '/settings', icon: <Settings size={18} /> });
    }

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))', borderRadius: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 'bold' }}>
                    D
                </div>
                DigitalTeam OS
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
            </div>

            {/* Premium User Profile Badge */}
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
        </aside>
    );
}
