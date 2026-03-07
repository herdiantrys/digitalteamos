import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../../../lib/auth';
import AnalyticsClient from './AnalyticsClient';
import { BarChart2 } from 'lucide-react';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    // We need to fetch tasks and content to determine their "resolved" dates locally 
    // because resolved date is a virtual property based on customFields JSON.
    const [contents, tasks] = await Promise.all([
        prisma.content.findMany({ where: { workspaceId, createdAt: { gte: from } } }),
        prisma.task.findMany({
            where: { workspaceId, status: 'DONE', updatedAt: { gte: from } },
            include: {
                relatedItems: {
                    include: { database: { include: { properties: true } } }
                }
            }
        }),
    ]);

    const resolvedTasks = tasks.map(t => ({ ...t, resolvedDate: resolveTaskDate(t) }));

    const results = buckets.map(b => {
        const contentCreated = contents.filter(c => c.createdAt >= b.start && c.createdAt < b.end).length;
        const tasksDone = resolvedTasks.filter(t => t.resolvedDate >= b.start && t.resolvedDate < b.end).length;
        // Total tasks still use createdAt for "entry" tracking
        return { label: b.label, contentCreated, tasksDone, tasksTotal: 0 }; // tasksTotal will be handled via a simpler query if needed, or ignored for buckets for now
    });

    // Handle tasksTotal separately as it's not "resolved" date dependent for "created" tracking
    const totalTasks = await Promise.all(buckets.map(b =>
        prisma.task.count({ where: { workspaceId, createdAt: { gte: b.start, lt: b.end } } })
    ));

    results.forEach((r, i) => r.tasksTotal = totalTasks[i]);

    return results;
}

function resolveTaskDate(task: any): Date {
    const updatedAt = new Date(task.updatedAt);
    const relatedItem = task.relatedItems?.[0];
    if (!relatedItem || !relatedItem.customFields || !relatedItem.database?.properties) {
        return updatedAt;
    }

    try {
        const properties = relatedItem.database.properties;
        const dateProp = properties.find((p: any) => p.type === 'DATE');
        if (!dateProp) return updatedAt;

        const customFields = JSON.parse(relatedItem.customFields);
        const dateVal = customFields[dateProp.id];
        if (!dateVal) return updatedAt;

        // Handle range: "2023-10-01 → 2023-10-05"
        let dateStr = dateVal;
        if (dateStr.includes(' → ')) {
            const parts = dateStr.split(' → ');
            dateStr = parts[parts.length - 1].trim();
        }

        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? updatedAt : d;
    } catch (e) {
        return updatedAt;
    }
}

async function getMemberStats(workspaceId: string, members: any[], startDate: Date | null) {
    const stats = await Promise.all(members.map(async m => {
        // Fetch all done tasks for this member to filter by resolved date locally
        const doneTasks = await prisma.task.findMany({
            where: { workspaceId, assignees: { some: { id: m.userId } }, status: 'DONE' },
            include: {
                relatedItems: {
                    include: { database: { include: { properties: true } } }
                }
            }
        });

        const filteredDone = startDate
            ? doneTasks.filter(t => resolveTaskDate(t) >= startDate)
            : doneTasks;

        const [tasksInProgress, tasksTotal] = await Promise.all([
            prisma.task.count({ where: { workspaceId, assignees: { some: { id: m.userId } }, status: { in: ['IN_PROGRESS', 'TODO'] }, createdAt: startDate ? { gte: startDate } : undefined } }),
            prisma.task.count({ where: { workspaceId, assignees: { some: { id: m.userId } }, createdAt: startDate ? { gte: startDate } : undefined } }),
        ]);

        const linkedTasks = await prisma.task.findMany({
            where: { workspaceId, assignees: { some: { id: m.userId } }, relatedItems: { some: {} }, createdAt: startDate ? { gte: startDate } : undefined },
            include: { relatedItems: { select: { id: true } } },
        });
        const uniqueContentIds = [...new Set(linkedTasks.flatMap(t => t.relatedItems.map((r: any) => r.id)))];

        return {
            id: m.userId,
            name: m.user.name,
            photo: m.user.photo,
            role: m.user.role,
            contentCreated: uniqueContentIds.length,
            tasksDone: filteredDone.length,
            tasksInProgress,
            tasksTotal,
        };
    }));

    return stats.sort((a, b) => (b.tasksDone + b.tasksTotal) - (a.tasksDone + a.tasksTotal));
}

async function getCompletedTasksInPeriod(workspaceId: string, startDate: Date | null) {
    const tasks = await prisma.task.findMany({
        where: {
            workspaceId,
            status: 'DONE',
        },
        orderBy: { updatedAt: 'desc' },
        include: {
            assignees: { select: { id: true, name: true, photo: true } },
            relatedItems: {
                include: {
                    database: {
                        include: {
                            properties: true
                        }
                    }
                }
            }
        }
    });

    const withResolved = tasks.map(t => {
        return {
            id: t.id,
            title: t.title,
            status: t.status,
            updatedAt: t.updatedAt.toISOString(),
            resolvedDate: resolveTaskDate(t).toISOString(),
            assignees: t.assignees.map(a => ({
                id: a.id,
                name: a.name,
                photo: a.photo
            })),
            relatedItems: (t as any).relatedItems.map((ri: any) => ({
                id: ri.id,
                title: ri.title,
                database: ri.database ? {
                    name: ri.database.name,
                    icon: ri.database.icon,
                    iconColor: ri.database.iconColor
                } : null
            }))
        };
    });

    if (!startDate) return withResolved;

    return withResolved.filter(t => new Date(t.resolvedDate) >= startDate)
        .sort((a, b) => new Date(b.resolvedDate).getTime() - new Date(a.resolvedDate).getTime());
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

    // Periods
    const dayStart = startOf('day', now);
    const weekStart = startOf('week', now);
    const monthStart = startOf('month', now);
    const yearStart = startOf('year', now);

    // ── Chart Data ───────────────────────────────────────────────────────────
    const [dayBucketsData, weekBucketsData, monthBucketsData, yearBucketsData] = await Promise.all([
        buildPeriodBuckets(workspaceId, dayStart, now, Array.from({ length: 24 }, (_, h) => {
            const s = new Date(dayStart); s.setHours(h);
            const e = new Date(s); e.setHours(h + 1);
            return { start: s, end: e, label: label(s, 'hour') };
        }).slice(0, now.getHours() + 1)),
        buildPeriodBuckets(workspaceId, weekStart, now, Array.from({ length: 7 }, (_, i) => {
            const s = new Date(weekStart); s.setDate(weekStart.getDate() + i);
            const e = new Date(s); e.setDate(s.getDate() + 1);
            return { start: s, end: e, label: label(s, 'dayShort') };
        })),
        buildPeriodBuckets(workspaceId, monthStart, now, (() => {
            const nextMonth = new Date(monthStart); nextMonth.setMonth(nextMonth.getMonth() + 1);
            const b = []; let c = new Date(monthStart); let w = 1;
            while (c < nextMonth && w <= 5) {
                const s = new Date(c);
                const e = new Date(c); e.setDate(e.getDate() + 7);
                if (e > nextMonth) e.setTime(nextMonth.getTime());
                b.push({ start: s, end: e, label: `Week ${w}` });
                c.setDate(c.getDate() + 7); w++;
            }
            return b;
        })()),
        buildPeriodBuckets(workspaceId, yearStart, now, Array.from({ length: 12 }, (_, m) => {
            const s = new Date(yearStart); s.setMonth(m);
            const e = new Date(s); e.setMonth(m + 1);
            return { start: s, end: e, label: label(s, 'monthShort') };
        }).slice(0, now.getMonth() + 1)),
    ]);

    // ── Totals ───────────────────────────────────────────────────────────────
    const sum = (arr: any[], key: string) => arr.reduce((a, b) => a + (b as any)[key], 0);
    const totals = {
        day: { content: sum(dayBucketsData, 'contentCreated'), tasksDone: sum(dayBucketsData, 'tasksDone'), tasksTotal: sum(dayBucketsData, 'tasksTotal') },
        week: { content: sum(weekBucketsData, 'contentCreated'), tasksDone: sum(weekBucketsData, 'tasksDone'), tasksTotal: sum(weekBucketsData, 'tasksTotal') },
        month: { content: sum(monthBucketsData, 'contentCreated'), tasksDone: sum(monthBucketsData, 'tasksDone'), tasksTotal: sum(monthBucketsData, 'tasksTotal') },
        year: { content: sum(yearBucketsData, 'contentCreated'), tasksDone: sum(yearBucketsData, 'tasksDone'), tasksTotal: sum(yearBucketsData, 'tasksTotal') },
    };

    // ── Member Stats (Per Period) ───────────────────────────────────────────
    const members = await prisma.workspaceMember.findMany({
        where: { workspaceId },
        include: { user: { select: { id: true, name: true, photo: true, role: true, isActive: true } } }
    });
    const activeMembers = (members as any[]).filter(m => m.user?.isActive);

    const [dayMembers, weekMembers, monthMembers, yearMembers] = await Promise.all([
        getMemberStats(workspaceId, activeMembers, dayStart),
        getMemberStats(workspaceId, activeMembers, weekStart),
        getMemberStats(workspaceId, activeMembers, monthStart),
        getMemberStats(workspaceId, activeMembers, yearStart),
    ]);

    // ── Completed Task History (Per Period) ─────────────────────────────────
    const [dayTasks, weekTasks, monthTasks, yearTasks] = await Promise.all([
        getCompletedTasksInPeriod(workspaceId, dayStart),
        getCompletedTasksInPeriod(workspaceId, weekStart),
        getCompletedTasksInPeriod(workspaceId, monthStart),
        getCompletedTasksInPeriod(workspaceId, yearStart),
    ]);

    const analyticsData = {
        day: dayBucketsData,
        week: weekBucketsData,
        month: monthBucketsData,
        year: yearBucketsData,
        totals,
        memberPeriods: { day: dayMembers, week: weekMembers, month: monthMembers, year: yearMembers },
        taskPeriods: { day: dayTasks, week: weekTasks, month: monthTasks, year: yearTasks },
    };

    const workspaceInfo = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } });

    return (
        <div className="fade-in" style={{ padding: '32px 32px 64px' }}>
            <div className="analytics-no-print" style={{ marginBottom: 40 }}>
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

            <AnalyticsClient
                data={analyticsData as any}
                workspaceName={workspaceInfo?.name || 'Workspace'}
            />
        </div>
    );
}
