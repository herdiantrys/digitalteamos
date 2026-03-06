import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../../../lib/auth';
import AnalyticsClient from './AnalyticsClient';
import { BarChart2 } from 'lucide-react';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOf(unit: 'day' | 'week' | 'month' | 'year', ref: Date = new Date()): Date {
    const d = new Date(ref);
    if (unit === 'day') { d.setHours(0, 0, 0, 0); return d; }
    if (unit === 'week') {
        const day = d.getDay(); // 0=Sun
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    if (unit === 'month') { d.setDate(1); d.setHours(0, 0, 0, 0); return d; }
    d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d;
}

function label(d: Date, fmt: 'hour' | 'dayShort' | 'weekNum' | 'monthShort') {
    if (fmt === 'hour') return `${d.getHours().toString().padStart(2, '0')}:00`;
    if (fmt === 'dayShort') return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
    if (fmt === 'weekNum') return `Wk ${Math.ceil(d.getDate() / 7)}`;
    return d.toLocaleDateString('id-ID', { month: 'short' });
}

async function buildPeriodBuckets(
    workspaceId: string,
    from: Date, to: Date,
    buckets: { start: Date; end: Date; label: string }[]
) {
    const results = await Promise.all(buckets.map(async b => {
        const [contentCreated, tasksDone, tasksTotal] = await Promise.all([
            prisma.content.count({ where: { workspaceId, createdAt: { gte: b.start, lt: b.end } } }),
            prisma.task.count({ where: { workspaceId, status: 'DONE', updatedAt: { gte: b.start, lt: b.end } } }),
            prisma.task.count({ where: { workspaceId, createdAt: { gte: b.start, lt: b.end } } }),
        ]);
        return { label: b.label, contentCreated, tasksDone, tasksTotal };
    }));
    return results;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default async function AnalyticsPage() {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') {
        return (
            <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <BarChart2 size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                    <p>Analytics is available for administrators only.</p>
                </div>
            </div>
        );
    }

    const workspaceId = (user as any).activeWorkspaceId as string;
    if (!workspaceId) throw new Error('No active workspace');

    const now = new Date();

    // ── DAY: buckets by hour (0–23) ───────────────────────────────────────────
    const dayStart = startOf('day', now);
    const dayBuckets = Array.from({ length: 24 }, (_, h) => {
        const start = new Date(dayStart); start.setHours(h);
        const end = new Date(start); end.setHours(h + 1);
        return { start, end, label: label(start, 'hour') };
    });

    // ── WEEK: buckets by day (Mon–Sun) ─────────────────────────────────────
    const weekStart = startOf('week', now);
    const weekBuckets = Array.from({ length: 7 }, (_, i) => {
        const start = new Date(weekStart); start.setDate(weekStart.getDate() + i);
        const end = new Date(start); end.setDate(start.getDate() + 1);
        return { start, end, label: label(start, 'dayShort') };
    });

    // ── MONTH: buckets by week (wk 1–5) ───────────────────────────────────
    const monthStart = startOf('month', now);
    const nextMonthStart = new Date(monthStart); nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);
    const monthBuckets: { start: Date; end: Date; label: string }[] = [];
    let cur = new Date(monthStart);
    let wk = 1;
    while (cur < nextMonthStart && wk <= 5) {
        const start = new Date(cur);
        const end = new Date(cur); end.setDate(end.getDate() + 7);
        if (end > nextMonthStart) end.setTime(nextMonthStart.getTime());
        monthBuckets.push({ start, end, label: `Week ${wk}` });
        cur.setDate(cur.getDate() + 7);
        wk++;
    }

    // ── YEAR: buckets by month (Jan–Dec) ──────────────────────────────────
    const yearStart = startOf('year', now);
    const yearBuckets = Array.from({ length: 12 }, (_, m) => {
        const start = new Date(yearStart); start.setMonth(m);
        const end = new Date(start); end.setMonth(m + 1);
        return { start, end, label: label(start, 'monthShort') };
    });

    // Run all bucket queries in parallel
    const [dayData, weekData, monthData, yearData] = await Promise.all([
        buildPeriodBuckets(workspaceId, dayStart, now, dayBuckets.slice(0, now.getHours() + 1)),
        buildPeriodBuckets(workspaceId, weekStart, now, weekBuckets),
        buildPeriodBuckets(workspaceId, monthStart, now, monthBuckets),
        buildPeriodBuckets(workspaceId, yearStart, now, yearBuckets.slice(0, now.getMonth() + 1)),
    ]);

    // ── Totals (for KPI cards + trend) ───────────────────────────────────────
    const sum = (arr: typeof dayData, key: 'contentCreated' | 'tasksDone' | 'tasksTotal') =>
        arr.reduce((a, b) => a + b[key], 0);

    const totals = {
        day: { content: sum(dayData, 'contentCreated'), tasksDone: sum(dayData, 'tasksDone'), tasksTotal: sum(dayData, 'tasksTotal') },
        week: { content: sum(weekData, 'contentCreated'), tasksDone: sum(weekData, 'tasksDone'), tasksTotal: sum(weekData, 'tasksTotal') },
        month: { content: sum(monthData, 'contentCreated'), tasksDone: sum(monthData, 'tasksDone'), tasksTotal: sum(monthData, 'tasksTotal') },
        year: { content: sum(yearData, 'contentCreated'), tasksDone: sum(yearData, 'tasksDone'), tasksTotal: sum(yearData, 'tasksTotal') },
    };

    // ── Member Stats (all-time for this workspace) ─────────────────────────
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, photo: true, role: true } } }
    });

    const memberStats = await Promise.all(members.map(async m => {
        const [tasksDone, tasksInProgress, tasksTotal] = await Promise.all([
            prisma.task.count({ where: { workspaceId, assigneeId: m.userId, status: 'DONE' } }),
            prisma.task.count({ where: { workspaceId, assigneeId: m.userId, status: { in: ['IN_PROGRESS', 'TODO'] } } }),
            prisma.task.count({ where: { workspaceId, assigneeId: m.userId } }),
        ]);

        // Count distinct content items that are linked to tasks assigned to this user
        const linkedTasks = await prisma.task.findMany({
            where: { workspaceId, assigneeId: m.userId, relatedItemId: { not: null } },
            select: { relatedItemId: true },
        });
        const uniqueContentIds = [...new Set(linkedTasks.map(t => t.relatedItemId).filter(Boolean))];
        const contentAssigned = uniqueContentIds.length;

        return {
            id: m.userId,
            name: m.user.name,
            photo: m.user.photo,
            role: m.user.role,
            contentCreated: contentAssigned,
            tasksDone,
            tasksInProgress,
            tasksTotal,
        };
    }));

    // Sort by task productivity (tasks done first, then total tasks)
    memberStats.sort((a, b) => (b.tasksDone + b.tasksTotal) - (a.tasksDone + a.tasksTotal));

    const analyticsData = {
        day: dayData,
        week: weekData,
        month: monthData,
        year: yearData,
        totals,
        members: memberStats,
    };

    const workspaceInfo = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });

    return (
        <div className="fade-in" style={{ padding: '0 32px 64px' }}>
            {/* Page Header */}
            <div style={{ marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: 'linear-gradient(135deg, #2eaadc, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 6px 20px rgba(46,170,220,0.35)'
                    }}>
                        <BarChart2 size={24} color="#fff" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
                            Analytics & Reports
                        </h1>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {workspaceInfo?.name} — Team Performance Overview
                        </p>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border-color)' }}>
                        {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Interactive Client Part */}
            <AnalyticsClient data={analyticsData as any} />
        </div>
    );
}
