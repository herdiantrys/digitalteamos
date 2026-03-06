'use client';

import { logout } from '../lib/auth';
import { useTransition, useState, useEffect, useRef } from 'react';
import { LogOut, Loader2, User, Settings as SettingsIcon, ChevronDown } from 'lucide-react';

export default function Topbar({ userName, userPhoto }: { userName: string, userPhoto?: string | null }) {
    const [isPending, startTransition] = useTransition();

    // UI States
    const [openPopover, setOpenPopover] = useState<'profile' | null>(null);

    const profileRef = useRef<HTMLDivElement>(null);

    const handleLogout = () => {
        startTransition(async () => {
            await logout();
        });
    };

    // Close popovers when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (openPopover === 'profile' && profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setOpenPopover(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openPopover]);

    // Determine a greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    // Derive initials for fallback avatar
    const initials = userName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            padding: '16px 40px',
            background: 'var(--bg-color)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            backgroundColor: 'rgba(255, 255, 255, 0.85)' // Light theme topbar
        }}>
            <style>{`
                .premium-profile-btn {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 4px 8px 4px 4px;
                    border-radius: 30px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }
                .premium-profile-btn:hover, .premium-profile-btn.active {
                    background: rgba(0, 0, 0, 0.04);
                    border-color: rgba(0, 0, 0, 0.08);
                }
                .premium-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--accent-color), #2b5876);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 13px;
                    overflow: hidden;
                    border: 2px solid transparent;
                    transition: border-color 0.2s ease;
                }
                .premium-profile-btn:hover .premium-avatar, .premium-profile-btn.active .premium-avatar {
                    border-color: rgba(0,0,0,0.1);
                }
                .premium-popover {
                    position: absolute;
                    top: calc(100% + 12px);
                    right: 0;
                    background: rgba(255, 255, 255, 0.96);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(0, 0, 0, 0.08);
                    border-radius: 16px;
                    box-shadow: 0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6) inset;
                    z-index: 1000;
                    overflow: hidden;
                    animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    transform-origin: top right;
                }
                @keyframes popoverFadeIn {
                    from { opacity: 0; transform: scale(0.96) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .popover-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 16px;
                    font-size: 13px;
                    color: var(--text-primary);
                    background: transparent;
                    border: none;
                    width: 100%;
                    text-align: left;
                    cursor: pointer;
                    transition: background 0.15s;
                }
                .popover-item:hover {
                    background: rgba(0, 0, 0, 0.04);
                }
                .popover-item.danger {
                    color: #ff4d4f;
                }
                .popover-item.danger:hover {
                    background: rgba(255, 77, 79, 0.08);
                }
            `}</style>

            {/* Left side: Greeting */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.02em', marginBottom: 2 }}>
                    {greeting},
                </span>
                <strong style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {userName}
                </strong>
            </div>

            {/* Right side: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* User Profile */}
                <div style={{ position: 'relative' }} ref={profileRef}>
                    <div
                        className={`premium-profile-btn ${openPopover === 'profile' ? 'active' : ''}`}
                        onClick={() => setOpenPopover(openPopover === 'profile' ? null : 'profile')}
                    >
                        <div className="premium-avatar">
                            {userPhoto ? (
                                <img src={userPhoto} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                initials
                            )}
                        </div>
                        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: openPopover === 'profile' ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }} />
                    </div>

                    {openPopover === 'profile' && (
                        <div className="premium-popover" style={{ width: 260, right: 0 }}>
                            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 14, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02), transparent)' }}>
                                <div className="premium-avatar" style={{ width: 48, height: 48, fontSize: 18 }}>
                                    {userPhoto ? (
                                        <img src={userPhoto} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{userName}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', marginTop: 2 }}>Premium Plan</div>
                                </div>
                            </div>

                            <div style={{ padding: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                <button className="popover-item" style={{ borderRadius: 8 }}>
                                    <User size={16} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                                    Profile Overview
                                </button>
                                <button className="popover-item" style={{ borderRadius: 8 }}>
                                    <SettingsIcon size={16} style={{ color: 'var(--text-secondary)', opacity: 0.8 }} />
                                    Account Settings
                                </button>
                            </div>

                            <div style={{ padding: '8px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                <button
                                    className="popover-item danger"
                                    style={{ borderRadius: 8 }}
                                    onClick={handleLogout}
                                    disabled={isPending}
                                >
                                    {isPending ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                                    {isPending ? 'Logging out...' : 'Log out'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
