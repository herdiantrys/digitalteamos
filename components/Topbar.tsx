'use client';

import { logout } from '../lib/auth';
import { useTransition } from 'react';
import { Search, Bell, LogOut, Loader2 } from 'lucide-react';

export default function Topbar({ userName }: { userName: string }) {
    const [isPending, startTransition] = useTransition();

    const handleLogout = () => {
        startTransition(async () => {
            await logout();
        });
    };

    // Determine a greeting based on time (optional simple touch)
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="topbar-wrapper">
            <div className="topbar-glass">
                <div className="greeting-text">
                    <span style={{ color: 'var(--text-secondary)' }}>{greeting},</span> <strong style={{ fontWeight: 600 }}>{userName}</strong>
                </div>

                <div className="topbar-actions">
                    {/* Placeholder Icons for a premium feel */}
                    <button className="icon-button" title="Search (Coming soon)">
                        <Search size={18} />
                    </button>
                    <button className="icon-button" title="Notifications (Coming soon)">
                        <Bell size={18} />
                    </button>

                    <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 8px' }}></div>

                    <button
                        onClick={handleLogout}
                        className="logout-btn"
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />} Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
