import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import DatabaseIcon from '../../../components/DatabaseIcon';

const prisma = new PrismaClient();

export default async function DashboardPage() {
    const user = await requireAuth();
    const anyUser = user as any;

    if (!anyUser.activeWorkspaceId) redirect('/dashboard');
    const workspaceId: string = anyUser.activeWorkspaceId;
    const userId: string = user.id;

    // ── Parallel Data Fetching ────────────────────────────────────────
    const [
        totalContent,
        totalUsers,
        totalDatabases,
        recentContentRaw,
        myTasksRaw,
        taskCountByStatus,
        totalTasks,
        recentContentHistory,
        recentTaskHistory,
        topContributors,
    ] = await Promise.all([
        prisma.content.count({ where: { workspaceId } }),
        prisma.workspaceMember.count({ where: { workspaceId } }),
        prisma.database.count({ where: { workspaceId } }),
        prisma.content.findMany({
            where: { workspaceId },
            take: 6,
            orderBy: { updatedAt: 'desc' },
            include: {
                author: { select: { id: true, name: true, photo: true } },
                database: { select: { id: true, name: true, icon: true, iconColor: true } },
            }
        }),
        prisma.task.findMany({
            where: { workspaceId, assignees: { some: { id: userId } }, status: { not: 'DONE' } },
            take: 5,
            orderBy: { updatedAt: 'desc' },
            select: { id: true, title: true, status: true, priority: true, dueDate: true }
        }),
        prisma.task.groupBy({
            by: ['status'],
            where: { workspaceId },
            _count: { status: true }
        }),
        prisma.task.count({ where: { workspaceId } }),
        prisma.contentHistory.findMany({
            where: { content: { workspaceId } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                content: {
                    select: {
                        id: true,
                        title: true,
                        database: { select: { icon: true, iconColor: true } }
                    }
                }
            }
        }),
        prisma.taskHistory.findMany({
            where: { task: { workspaceId } },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { task: { select: { id: true, title: true } } }
        }),
        prisma.content.groupBy({
            by: ['authorId'],
            where: { workspaceId, authorId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 3,
        }),
    ]);

    // Build unified activity feed
    const activityFeed = [
        ...recentContentHistory.map((h: any) => ({
            id: h.id,
            type: 'content' as const,
            title: h.content.title,
            desc: h.changeDesc || 'Konten diperbarui',
            by: h.changedBy || 'Unknown',
            at: h.createdAt,
            linkId: h.content.id,
            icon: h.content.database?.icon,
            iconColor: h.content.database?.iconColor,
        })),
        ...recentTaskHistory.map((h: any) => ({
            id: h.id,
            type: 'task' as const,
            title: h.task.title,
            desc: h.changeDesc || 'Task diperbarui',
            by: h.changedBy || 'Unknown',
            at: h.createdAt,
            linkId: h.task.id,
        })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 8);

    // Task stats
    const taskDone = taskCountByStatus.find((s: any) => s.status === 'DONE')?._count?.status || 0;
    const taskTodo = taskCountByStatus.find((s: any) => s.status === 'TODO')?._count?.status || 0;
    const taskInProgress = taskCountByStatus.find((s: any) => s.status === 'IN_PROGRESS')?._count?.status || 0;
    const taskCanceled = taskCountByStatus.find((s: any) => s.status === 'CANCELED')?._count?.status || 0;
    const taskCompletionRatio = totalTasks > 0 ? Math.round((taskDone / totalTasks) * 100) : 0;

    // Fetch top contributor names
    const contributorIds = topContributors.map((c: any) => c.authorId).filter(Boolean) as string[];
    const contributorUsers = contributorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: contributorIds } },
            select: { id: true, name: true, photo: true }
        })
        : [];

    const myTasksTotal = await prisma.task.count({
        where: { workspaceId, assignees: { some: { id: userId } } }
    });
    const myTasksDone = await prisma.task.count({
        where: { workspaceId, assignees: { some: { id: userId } }, status: 'DONE' }
    });
    const myTasksRatio = myTasksTotal > 0 ? Math.round((myTasksDone / myTasksTotal) * 100) : 0;

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? 'Selamat Pagi' : currentHour < 17 ? 'Selamat Siang' : 'Selamat Malam';

    return (
        <div className="fade-in" style={{ padding: '0 32px 60px' }}>

            {/* ── HERO HEADER ─────────────────────────────────────────────── */}
            <div style={{
                marginBottom: 32,
                padding: '32px 36px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, hsl(210,100%,62%) 0%, hsl(260,80%,65%) 50%, hsl(310,70%,60%) 100%)',
                position: 'relative',
                overflow: 'hidden',
                color: 'white',
            }}>
                {/* Decorative blobs */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: -60, right: 120, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 20, right: 200, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, marginBottom: 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                            {greeting}, {user.name.split(' ')[0]}! 👋
                        </h1>
                        <p style={{ fontSize: 14, opacity: 0.85, maxWidth: 480 }}>
                            Berikut ringkasan aktivitas workspace Anda hari ini. Semangat bekerja!
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <QuickActionBtn href="/tasks" icon="✅" label="My Tasks" light />
                        <QuickActionBtn href="/feed" icon="📡" label="Activity Feed" />
                        <QuickActionBtn href="/analytics" icon="📊" label="Analytics" />
                    </div>
                </div>
            </div>

            {/* ── METRIC CARDS ─────────────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 28 }}>
                <MetricCard
                    title="Total Konten"
                    value={totalContent}
                    subtitle="Item di workspace"
                    icon="📝"
                    color="hsl(210, 100%, 62%)"
                    link="/databases"
                    trend={`${totalContent} total`}
                />
                <MetricCard
                    title="Total Tasks"
                    value={totalTasks}
                    subtitle={`${taskDone} selesai · ${taskInProgress} progres`}
                    icon="✅"
                    color="hsl(150, 70%, 45%)"
                    link="/tasks"
                    trend={`${taskCompletionRatio}% selesai`}
                />
                <MetricCard
                    title="Anggota Tim"
                    value={totalUsers}
                    subtitle="Aktif di workspace"
                    icon="👥"
                    color="hsl(30, 90%, 55%)"
                    link="/settings"
                    trend="tim aktif"
                />
                <MetricCard
                    title="Databases"
                    value={totalDatabases}
                    subtitle="Database tersedia"
                    icon="🗃️"
                    color="hsl(270, 70%, 60%)"
                    link="/databases"
                    trend="database"
                />
            </div>

            {/* ── TASK OVERVIEW BANNER ──────────────────────────────────────── */}
            {myTasksTotal > 0 && (
                <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ fontWeight: 600, fontSize: 15 }}>Task Saya</div>
                            <Link href="/tasks" style={{ fontSize: 12, color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500 }}>
                                Lihat Semua →
                            </Link>
                        </div>
                        <div style={{ height: 8, borderRadius: 999, background: 'var(--border-color)', overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, hsl(150,70%,45%), hsl(210,100%,62%))', width: `${myTasksRatio}%`, transition: 'width 1s ease' }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {myTasksDone} dari {myTasksTotal} task selesai ({myTasksRatio}%)
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <StatPill label="Belum Mulai" value={myTasksRaw.filter((t: any) => t.status === 'TODO').length} color="hsl(40,90%,55%)" />
                        <StatPill label="Sedang Dikerjakan" value={myTasksRaw.filter((t: any) => t.status === 'IN_PROGRESS').length} color="hsl(210,100%,62%)" />
                    </div>
                </div>
            )}

            {/* ── WORKSPACE TASK STATS BAR ──────────────────────────────────── */}
            {totalTasks > 0 && (
                <div className="glass-card" style={{ padding: '16px 24px', marginBottom: 28 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>Status Task Workspace</div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{totalTasks} total tasks</div>
                    </div>
                    <div style={{ display: 'flex', height: 10, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
                        {taskTodo > 0 && <div style={{ flex: taskTodo, background: 'hsl(40,90%,55%)', borderRadius: '999px 0 0 999px', minWidth: 4 }} title={`Todo: ${taskTodo}`} />}
                        {taskInProgress > 0 && <div style={{ flex: taskInProgress, background: 'hsl(210,100%,62%)', minWidth: 4 }} title={`In Progress: ${taskInProgress}`} />}
                        {taskDone > 0 && <div style={{ flex: taskDone, background: 'hsl(150,70%,45%)', minWidth: 4 }} title={`Done: ${taskDone}`} />}
                        {taskCanceled > 0 && <div style={{ flex: taskCanceled, background: 'var(--border-color)', borderRadius: '0 999px 999px 0', minWidth: 4 }} title={`Canceled: ${taskCanceled}`} />}
                    </div>
                    <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                        <LegendDot color="hsl(40,90%,55%)" label={`Todo (${taskTodo})`} />
                        <LegendDot color="hsl(210,100%,62%)" label={`In Progress (${taskInProgress})`} />
                        <LegendDot color="hsl(150,70%,45%)" label={`Done (${taskDone})`} />
                        {taskCanceled > 0 && <LegendDot color="var(--text-secondary)" label={`Canceled (${taskCanceled})`} />}
                    </div>
                </div>
            )}

            {/* ── MAIN 2-COLUMN GRID ───────────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>

                {/* Recent Content */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Konten Terbaru</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Diperbarui baru-baru ini</p>
                        </div>
                        <Link href="/databases" style={{ fontSize: 12, color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500, padding: '4px 10px', border: '1px solid var(--accent-color)', borderRadius: 20, opacity: 0.8, transition: 'opacity 0.2s' }}>
                            Lihat Semua
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {recentContentRaw.length === 0 ? (
                            <EmptyState icon="📝" text="Belum ada konten" />
                        ) : recentContentRaw.map((c: any, idx: number) => (
                            <div key={c.id} style={{
                                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px',
                                borderBottom: idx < recentContentRaw.length - 1 ? '1px solid var(--border-color)' : 'none',
                                transition: 'background 0.15s',
                            }} className="content-row-hover">
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: c.database?.iconColor ? `${c.database.iconColor}20` : 'var(--sidebar-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <DatabaseIcon
                                        icon={c.database?.icon}
                                        color={c.database?.iconColor}
                                        size={20}
                                        fallback="📄"
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{c.title}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {c.database && (
                                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, background: 'var(--sidebar-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', fontWeight: 500 }}>
                                                {c.database.name}
                                            </span>
                                        )}
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {relativeTime(c.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0, textAlign: 'right' }}>
                                    <MiniAvatar name={c.author?.name} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Aktivitas Terbaru</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Riwayat perubahan tim</p>
                        </div>
                        <Link href="/feed" style={{ fontSize: 12, color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500, padding: '4px 10px', border: '1px solid var(--accent-color)', borderRadius: 20, opacity: 0.8 }}>
                            Full Feed
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                        {activityFeed.length === 0 ? (
                            <EmptyState icon="📡" text="Belum ada aktivitas" />
                        ) : activityFeed.map((a, idx) => (
                            <div key={a.id} style={{ display: 'flex', gap: 14, padding: '10px 24px', position: 'relative' }}>
                                {/* Timeline line */}
                                {idx < activityFeed.length - 1 && (
                                    <div style={{ position: 'absolute', left: 36, top: 30, bottom: 0, width: 1, background: 'var(--border-color)' }} />
                                )}
                                <div style={{
                                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                    background: a.type === 'content' ? (a.iconColor ? `${a.iconColor}20` : 'hsl(210,100%,62%)20') : 'hsl(150,70%,45%)20',
                                    border: `2px solid ${a.type === 'content' ? (a.iconColor || 'hsl(210,100%,62%)') : 'hsl(150,70%,45%)'}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    zIndex: 1,
                                }}>
                                    {a.type === 'content' ? (
                                        <DatabaseIcon
                                            icon={a.icon}
                                            color={a.iconColor}
                                            size={14}
                                            fallback="📝"
                                        />
                                    ) : '✅'}
                                </div>
                                <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                                        {a.title}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {a.desc}
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>
                                        oleh <strong>{a.by}</strong> · {relativeTime(a.at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── MY TASKS LIST ────────────────────────────────────────────── */}
            {myTasksRaw.length > 0 && (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 28 }}>
                    <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Task Saya yang Belum Selesai</h3>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Prioritas pekerjaan Anda</p>
                        </div>
                        <Link href="/tasks" style={{ fontSize: 12, color: 'var(--accent-color)', textDecoration: 'none', fontWeight: 500, padding: '4px 10px', border: '1px solid var(--accent-color)', borderRadius: 20 }}>
                            Lihat Semua
                        </Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {myTasksRaw.map((task: any, idx: number) => (
                            <div key={task.id} style={{
                                display: 'flex', alignItems: 'center', gap: 14, padding: '13px 24px',
                                borderBottom: idx < myTasksRaw.length - 1 ? '1px solid var(--border-color)' : 'none',
                                transition: 'background 0.15s',
                            }} className="content-row-hover">
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                    background: task.priority === 'HIGH' ? '#f87171' : task.priority === 'LOW' ? '#60a5fa' : '#fb923c',
                                    boxShadow: `0 0 6px ${task.priority === 'HIGH' ? '#f8717160' : task.priority === 'LOW' ? '#60a5fa60' : '#fb923c60'}`
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {task.title}
                                    </div>
                                </div>
                                <TaskStatusBadge status={task.status} />
                                <PriorityBadge priority={task.priority} />
                                {task.dueDate && (
                                    <div style={{ fontSize: 11, color: isPastDue(task.dueDate) ? '#f87171' : 'var(--text-secondary)', flexShrink: 0, fontWeight: isPastDue(task.dueDate) ? 600 : 400 }}>
                                        {isPastDue(task.dueDate) ? '⚠️ ' : ''}{formatDate(task.dueDate)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── TOP CONTRIBUTORS ─────────────────────────────────────────── */}
            {contributorUsers.length > 0 && (
                <div className="glass-card" style={{ padding: '20px 24px' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Top Kontributor</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>Anggota tim dengan konten terbanyak</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {topContributors.map((c: any, i: number) => {
                            const u = contributorUsers.find((u: any) => u.id === c.authorId);
                            if (!u) return null;
                            return (
                                <div key={c.authorId} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                                    borderRadius: 12, background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
                                    flex: 1, minWidth: 160,
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: '50%',
                                            background: `linear-gradient(135deg, ${['hsl(210,100%,62%)', 'hsl(150,70%,45%)', 'hsl(270,70%,60%)'][i % 3]}, ${['hsl(260,80%,65%)', 'hsl(210,100%,62%)', 'hsl(310,70%,60%)'][i % 3]})`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: 16,
                                        }}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{
                                            position: 'absolute', bottom: -2, right: -2, width: 18, height: 18,
                                            borderRadius: '50%', background: ['#ffd700', '#c0c0c0', '#cd7f32'][i],
                                            border: '2px solid var(--glass-bg)', fontSize: 10,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                                        }}>
                                            {i + 1}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c._count.id} konten</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function relativeTime(date: Date | string): string {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'baru saja';
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function isPastDue(date: Date | string): boolean {
    return new Date(date) < new Date();
}

// ── Helper Components ────────────────────────────────────────────────────────

function MetricCard({ title, value, subtitle, icon, color, link, trend }: {
    title: string; value: number; subtitle: string; icon: string; color: string; link: string; trend: string;
}) {
    return (
        <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
                padding: '20px 22px',
                borderRadius: 16,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(16px)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }} className="metric-card-hover">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
                    <div style={{
                        width: 38, height: 38, borderRadius: 11,
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19,
                    }}>
                        {icon}
                    </div>
                </div>
                <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>{subtitle}</div>
                <div style={{ fontSize: 11, padding: '3px 8px', borderRadius: 999, background: `color-mix(in srgb, ${color} 12%, transparent)`, color, display: 'inline-block', fontWeight: 600 }}>
                    {trend}
                </div>
                <div style={{ position: 'absolute', bottom: -24, right: -24, width: 100, height: 100, background: color, filter: 'blur(48px)', opacity: 0.12, borderRadius: '50%', pointerEvents: 'none' }} />
            </div>
        </Link>
    );
}

function QuickActionBtn({ href, icon, label, light }: { href: string; icon: string; label: string; light?: boolean }) {
    return (
        <Link href={href} style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 999,
            background: light ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.15)',
            color: light ? '#1a1a2e' : 'white',
            textDecoration: 'none', fontSize: 13, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.3)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s',
        }}>
            <span style={{ fontSize: 15 }}>{icon}</span> {label}
        </Link>
    );
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
            borderRadius: 10, background: `color-mix(in srgb, ${color} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80` }} />
            <div>
                <div style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
            </div>
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
        </div>
    );
}

function MiniAvatar({ name }: { name?: string }) {
    if (!name) return null;
    return (
        <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-color), hsl(260,80%,65%))',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, flexShrink: 0,
        }}>
            {name.charAt(0).toUpperCase()}
        </div>
    );
}

function TaskStatusBadge({ status }: { status: string }) {
    const map: Record<string, { bg: string; color: string; label: string }> = {
        TODO: { bg: 'hsl(40,90%,55%)15', color: 'hsl(40,90%,45%)', label: 'Todo' },
        IN_PROGRESS: { bg: 'hsl(210,100%,62%)15', color: 'hsl(210,100%,50%)', label: 'Progress' },
        DONE: { bg: 'hsl(150,70%,45%)15', color: 'hsl(150,70%,38%)', label: 'Done' },
        CANCELED: { bg: 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)', label: 'Canceled' },
    };
    const s = map[status] || map.TODO;
    return (
        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: s.bg, color: s.color, fontWeight: 600, flexShrink: 0 }}>
            {s.label}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const map: Record<string, { icon: string; color: string }> = {
        HIGH: { icon: '🔴', color: '#f87171' },
        MEDIUM: { icon: '🟠', color: '#fb923c' },
        LOW: { icon: '🔵', color: '#60a5fa' },
    };
    const p = map[priority] || map.MEDIUM;
    return (
        <span style={{ fontSize: 11, color: p.color, flexShrink: 0, fontWeight: 600 }}>
            {p.icon} {priority}
        </span>
    );
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
            {text}
        </div>
    );
}
