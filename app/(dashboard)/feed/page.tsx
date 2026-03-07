import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import Link from 'next/link';
import DatabaseIcon from '../../../components/DatabaseIcon';

const prisma = new PrismaClient();

interface FeedItem {
    id: string;
    type: 'content' | 'task';
    action: 'created' | 'updated';
    title: string;
    changeDesc: string | null;
    userName: string;
    userPhoto: string | null;
    date: Date;
    link: string;
    color: string;
    typeColor: string;
    extra: Record<string, any>;
}

export default async function FeedPage() {
    const currentUser = await requireAuth();
    const workspaceId = currentUser.activeWorkspaceId;
    if (!workspaceId) throw new Error('No active workspace');

    // ── Parallel Fetch ───────────────────────────────────────────────────────
    const [contents, tasks, allMembers] = await Promise.all([
        prisma.content.findMany({
            where: { workspaceId },
            orderBy: { updatedAt: 'desc' },
            take: 40,
            include: {
                author: { select: { id: true, name: true, photo: true } },
                database: { select: { id: true, name: true, icon: true, iconColor: true } },
                history: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { changedByUser: { select: { id: true, name: true, photo: true } } } as any
                } as any
            }
        }),
        prisma.task.findMany({
            where: { workspaceId },
            orderBy: { updatedAt: 'desc' },
            take: 40,
            include: {
                creator: { select: { id: true, name: true, photo: true } },
                assignees: { select: { id: true, name: true, photo: true } },
                history: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    include: { changedByUser: { select: { id: true, name: true, photo: true } } } as any
                } as any
            }
        }),
        prisma.workspaceMember.findMany({
            where: { workspaceId },
            include: { user: { select: { id: true, name: true, photo: true } } },
            take: 50,
        }),
    ]);

    // ── Build unified feed ───────────────────────────────────────────────────
    const feedItems: FeedItem[] = [];
    const contentsAny = contents as any[];
    const tasksAny = tasks as any[];

    contentsAny.forEach(c => {
        const isNew = Math.abs(c.updatedAt.getTime() - c.createdAt.getTime()) < 10000;
        const lastHistory = c.history?.[0];
        const userName = isNew || !lastHistory
            ? (c.author?.name || 'Someone')
            : (lastHistory.changedByUser?.name || lastHistory.changedBy || c.author?.name || 'Someone');
        const userPhoto = isNew || !lastHistory
            ? c.author?.photo
            : (lastHistory.changedByUser?.photo ?? (lastHistory.changedBy ? null : c.author?.photo));

        feedItems.push({
            id: `content-${c.id}-${c.updatedAt.getTime()}`,
            type: 'content',
            action: isNew ? 'created' : 'updated',
            title: c.title,
            changeDesc: lastHistory?.changeDesc || null,
            userName,
            userPhoto: userPhoto || null,
            date: c.updatedAt,
            link: `/databases/${c.databaseId || ''}`,
            color: c.database?.iconColor || 'hsl(210,100%,62%)',
            typeColor: 'hsl(210,100%,62%)',
            extra: {
                dbName: c.database?.name,
                dbIcon: c.database?.icon,
                dbIconColor: c.database?.iconColor,
            }
        });
    });

    tasksAny.forEach(t => {
        const isNew = Math.abs(t.updatedAt.getTime() - t.createdAt.getTime()) < 10000;
        const lastHistory = t.history?.[0];
        const userName = isNew || !lastHistory
            ? (t.creator?.name || 'Someone')
            : (lastHistory.changedByUser?.name || lastHistory.changedBy || t.creator?.name || 'Someone');
        const userPhoto = isNew || !lastHistory
            ? t.creator?.photo
            : (lastHistory.changedByUser?.photo ?? (lastHistory.changedBy ? null : t.creator?.photo));

        feedItems.push({
            id: `task-${t.id}-${t.updatedAt.getTime()}`,
            type: 'task',
            action: isNew ? 'created' : 'updated',
            title: t.title,
            changeDesc: lastHistory?.changeDesc || null,
            userName,
            userPhoto: userPhoto || null,
            date: t.updatedAt,
            link: `/tasks`,
            color: 'hsl(150,65%,45%)',
            typeColor: 'hsl(150,65%,45%)',
            extra: {
                status: t.status,
                priority: t.priority,
                assignees: t.assignees,
            }
        });
    });

    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());
    const topItems = feedItems.slice(0, 60);

    // ── Group by date ────────────────────────────────────────────────────────
    const grouped = groupByDate(topItems);

    // ── Summary Stats ────────────────────────────────────────────────────────
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayItems = topItems.filter(i => i.date >= today);
    const todayContent = todayItems.filter(i => i.type === 'content').length;
    const todayTasks = todayItems.filter(i => i.type === 'task').length;

    // Member activity map (unique usernames this week)
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weekItems = topItems.filter(i => i.date >= weekAgo);
    const activeUsers = [...new Set(weekItems.map(i => i.userName))];

    return (
        <div className="fade-in" style={{ padding: '0 32px 60px', maxWidth: 900, margin: '0 auto' }}>
            <style>{`
                .feed-row:hover { background: rgba(55,53,47,0.025); }
                [data-theme='dark'] .feed-row:hover { background: rgba(255,255,255,0.02); }
                .feed-avatar { transition: transform 0.2s ease; }
                .feed-row:hover .feed-avatar { transform: scale(1.08); }
                .feed-link:hover { color: var(--accent-color) !important; }
                .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
                .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.08) !important; }
                .member-chip { transition: transform 0.15s; }
                .member-chip:hover { transform: scale(1.05); }
            `}</style>

            {/* ── PAGE HEADER ─────────────────────────────────────────── */}
            <div style={{ marginBottom: 32, paddingTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 13,
                                background: 'linear-gradient(135deg, hsl(210,100%,62%), hsl(260,80%,65%))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 6px 20px rgba(46,170,220,0.3)',
                            }}>
                                <span style={{ fontSize: 22 }}>📡</span>
                            </div>
                            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Activity Feed</h1>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
                            Semua aktivitas workspace dalam satu tampilan — konten, task, dan perubahan tim.
                        </p>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '7px 14px', borderRadius: 20, border: '1px solid var(--border-color)', fontWeight: 500 }}>
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* ── STAT CARDS ROW ──────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                <StatCard
                    icon="📝"
                    label="Konten Hari Ini"
                    value={todayContent}
                    color="hsl(210,100%,62%)"
                    sub={`${topItems.filter(i => i.type === 'content').length} total dalam feed`}
                />
                <StatCard
                    icon="✅"
                    label="Task Hari Ini"
                    value={todayTasks}
                    color="hsl(150,65%,45%)"
                    sub={`${topItems.filter(i => i.type === 'task').length} total dalam feed`}
                />
                <StatCard
                    icon="⚡"
                    label="Aktif Minggu Ini"
                    value={activeUsers.length}
                    color="hsl(30,90%,55%)"
                    sub="anggota tim aktif"
                />
                <StatCard
                    icon="🕒"
                    label="Total Aktivitas"
                    value={topItems.length}
                    color="hsl(270,70%,60%)"
                    sub="item dalam feed ini"
                />
            </div>

            {/* ── ACTIVE MEMBERS THIS WEEK ─────────────────────────── */}
            {activeUsers.length > 0 && (
                <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                        Aktif minggu ini
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {activeUsers.slice(0, 10).map(name => {
                            const member = allMembers.find((m: any) => m.user.name === name);
                            return (
                                <div key={name} className="member-chip" style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '4px 10px 4px 4px', borderRadius: 999,
                                    background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
                                    fontSize: 12, fontWeight: 500,
                                }}>
                                    <SmallAvatar name={name} photo={(member as any)?.user?.photo} size={22} />
                                    {name}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── GROUPED FEED ────────────────────────────────────────── */}
            {topItems.length === 0 ? (
                <div className="glass-card" style={{ padding: 80, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
                    <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>Belum ada aktivitas</h3>
                    <p style={{ fontSize: 14 }}>Aktivitas seperti membuat konten atau memperbarui task akan muncul di sini.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {grouped.map(({ label, items }) => (
                        <div key={label}>
                            {/* Date Group Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginTop: 20 }}>
                                <div style={{
                                    fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
                                    textTransform: 'uppercase', color: 'var(--text-secondary)',
                                    background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
                                    padding: '4px 10px', borderRadius: 999, flexShrink: 0,
                                }}>
                                    {label}
                                </div>
                                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                    {items.length} item
                                </div>
                            </div>

                            {/* Feed Cards */}
                            <div style={{
                                borderRadius: 16, overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                background: 'var(--glass-bg)',
                                backdropFilter: 'blur(12px)',
                            }}>
                                {items.map((item, idx) => (
                                    <FeedRow
                                        key={item.id}
                                        item={item}
                                        isLast={idx === items.length - 1}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Feed Row Component ─────────────────────────────────────────────────────

function FeedRow({ item, isLast }: { item: FeedItem; isLast: boolean }) {
    const isRecent = (Date.now() - item.date.getTime()) < 24 * 60 * 60 * 1000;
    const isJustNow = (Date.now() - item.date.getTime()) < 60 * 60 * 1000;

    return (
        <div className="feed-row" style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 20px',
            borderBottom: isLast ? 'none' : '1px solid var(--border-color)',
            transition: 'background 0.15s',
            position: 'relative',
        }}>
            {/* Type Icon */}
            <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: `color-mix(in srgb, ${item.typeColor} 14%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${item.typeColor} 25%, transparent)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {item.type === 'content' ? (
                    <DatabaseIcon
                        icon={item.extra.dbIcon}
                        color={item.extra.dbIconColor}
                        size={17}
                        fallback="📄"
                    />
                ) : '✅'}
            </div>

            {/* Main content */}
            <div style={{ flex: 1, minWidth: 0 }}>
                {/* Top row: type badge + action + NEW tag */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                    <TypeBadge type={item.type} color={item.typeColor} dbName={item.extra.dbName} />
                    {item.type === 'task' && item.extra.status && (
                        <StatusPill status={item.extra.status} />
                    )}
                    {item.type === 'task' && item.extra.priority && item.extra.priority !== 'MEDIUM' && (
                        <PriorityPill priority={item.extra.priority} />
                    )}
                    {isJustNow && (
                        <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 999,
                            background: 'linear-gradient(135deg, #ff4d4f, #ff7875)',
                            color: 'white', letterSpacing: '0.06em', textTransform: 'uppercase',
                            boxShadow: '0 0 8px rgba(255,77,79,0.4)',
                        }}>
                            BARU
                        </span>
                    )}
                </div>

                {/* Title */}
                <Link href={item.link} style={{ textDecoration: 'none' }}>
                    <div className="feed-link" style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                        lineHeight: 1.4, letterSpacing: '-0.01em', marginBottom: 4,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        maxWidth: '100%', transition: 'color 0.15s',
                    }}>
                        {item.action === 'created' ? '✨ ' : '✏️ '}{item.title}
                    </div>
                </Link>

                {/* Change description */}
                {item.changeDesc && (
                    <div style={{
                        fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6,
                        background: 'var(--sidebar-bg)', padding: '3px 8px',
                        borderRadius: 6, display: 'inline-block', fontStyle: 'italic',
                        maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                        {item.changeDesc}
                    </div>
                )}

                {/* Bottom meta row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <SmallAvatar name={item.userName} photo={item.userPhoto} size={20} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{item.userName}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.action === 'created' ? 'menambahkan' : 'memperbarui'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>·</span>
                    <span style={{ fontSize: 12, color: isRecent ? item.typeColor : 'var(--text-secondary)', fontWeight: isRecent ? 600 : 400 }}>
                        {relativeTime(item.date)}
                    </span>
                    {item.type === 'task' && item.extra.assignees?.length > 0 && (
                        <>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>·</span>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                {item.extra.assignees.slice(0, 3).map((a: any, i: number) => (
                                    <div key={a.id} title={a.name} style={{
                                        width: 18, height: 18, borderRadius: '50%',
                                        background: 'linear-gradient(135deg, var(--accent-color), hsl(260,80%,65%))',
                                        border: '1.5px solid var(--glass-bg)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 8, fontWeight: 700, color: 'white',
                                        marginLeft: i > 0 ? -5 : 0, zIndex: 3 - i, position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        {a.photo
                                            ? <img src={a.photo} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : a.name.charAt(0).toUpperCase()
                                        }
                                    </div>
                                ))}
                                {item.extra.assignees.length > 3 && (
                                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginLeft: 4 }}>+{item.extra.assignees.length - 3}</span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Timestamp right column */}
            <div style={{
                fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0,
                textAlign: 'right', minWidth: 60, paddingTop: 2, lineHeight: 1.4,
            }}>
                {new Date(item.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    );
}

// ── Small Components ───────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub }: { icon: string; label: string; value: number; color: string; sub: string }) {
    return (
        <div className="glass-card stat-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</div>
                <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: `color-mix(in srgb, ${color} 15%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
                }}>{icon}</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 4 }}>{value}</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{sub}</div>
            <div style={{ position: 'absolute', bottom: -20, right: -20, width: 80, height: 80, background: color, filter: 'blur(40px)', opacity: 0.12, borderRadius: '50%', pointerEvents: 'none' }} />
        </div>
    );
}

function SmallAvatar({ name, photo, size = 24 }: { name: string; photo?: string | null; size?: number }) {
    return (
        <div className="feed-avatar" style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
            background: 'linear-gradient(135deg, var(--accent-color), hsl(260,80%,65%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.floor(size * 0.45), fontWeight: 700, color: 'white',
        }}>
            {photo
                ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : name.charAt(0).toUpperCase()
            }
        </div>
    );
}

function TypeBadge({ type, color, dbName }: { type: string; color: string; dbName?: string }) {
    const label = type === 'content' ? (dbName || 'Konten') : 'Task';
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            color, textTransform: 'uppercase', letterSpacing: '0.04em',
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        }}>
            {label}
        </span>
    );
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, { label: string; color: string }> = {
        TODO: { label: 'Todo', color: 'hsl(40,90%,50%)' },
        IN_PROGRESS: { label: 'Progress', color: 'hsl(210,100%,55%)' },
        DONE: { label: 'Done', color: 'hsl(150,65%,45%)' },
        CANCELED: { label: 'Canceled', color: 'var(--text-secondary)' },
    };
    const s = map[status] || map.TODO;
    return (
        <span style={{
            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 999,
            background: `color-mix(in srgb, ${s.color} 10%, transparent)`,
            color: s.color, border: `1px solid color-mix(in srgb, ${s.color} 18%, transparent)`,
        }}>
            {s.label}
        </span>
    );
}

function PriorityPill({ priority }: { priority: string }) {
    const map: Record<string, { label: string; color: string; icon: string }> = {
        HIGH: { label: 'High', color: '#f87171', icon: '↑' },
        LOW: { label: 'Low', color: '#60a5fa', icon: '↓' },
    };
    const p = map[priority];
    if (!p) return null;
    return (
        <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999,
            background: `color-mix(in srgb, ${p.color} 12%, transparent)`,
            color: p.color,
        }}>
            {p.icon} {p.label}
        </span>
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(date: Date): string {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} menit lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function groupByDate(items: FeedItem[]): { label: string; items: FeedItem[] }[] {
    const groups: Record<string, FeedItem[]> = {};
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    for (const item of items) {
        const d = new Date(item.date);
        d.setHours(0, 0, 0, 0);

        let label: string;
        if (d.getTime() === today.getTime()) {
            label = 'Hari Ini';
        } else if (d.getTime() === yesterday.getTime()) {
            label = 'Kemarin';
        } else {
            const diffDays = Math.floor((today.getTime() - d.getTime()) / 86400000);
            if (diffDays <= 6) {
                label = d.toLocaleDateString('id-ID', { weekday: 'long' });
            } else {
                label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            }
        }

        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
    }

    return Object.entries(groups).map(([label, items]) => ({ label, items }));
}
