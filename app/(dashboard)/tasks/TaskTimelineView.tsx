'use client';

import { useState, useMemo, useRef, useEffect, useTransition } from 'react';
import { updateTaskDueDate } from '../../../lib/task-actions';
import { ChevronDown, ChevronRight, User as UserIcon } from 'lucide-react';

const FULL_MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type ZoomLevel = 'hours' | 'day' | 'week' | 'bi-week' | 'month' | 'year';

const ZOOM_CONFIG: Record<ZoomLevel, { colW: number; totalDays: number }> = {
    hours: { colW: 480, totalDays: 14 },
    day: { colW: 48, totalDays: 45 },
    week: { colW: 32, totalDays: 90 },
    'bi-week': { colW: 24, totalDays: 120 },
    month: { colW: 8, totalDays: 365 },
    year: { colW: 2.5, totalDays: 1095 }
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    TODO: { bg: 'var(--sidebar-bg)', text: 'var(--text-primary)', border: 'var(--border-color)' },
    IN_PROGRESS: { bg: 'rgba(52, 152, 219, 0.15)', text: '#2980b9', border: 'rgba(52, 152, 219, 0.4)' },
    DONE: { bg: 'rgba(46, 204, 113, 0.15)', text: '#27ae60', border: 'rgba(46, 204, 113, 0.4)' }
};

function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86_400_000); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function TimelineHeader({ topRowItems, bottomRowItems, zoom, leftPanelWidth }: {
    topRowItems: { label: string; left: number; width: number }[];
    bottomRowItems: { label: string; left: number; width: number; isToday?: boolean; isWeekend?: boolean }[];
    zoom: ZoomLevel; leftPanelWidth: number;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg-color)' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', height: 38, background: 'rgba(55,53,47,0.015)' }}>
                <div style={{ width: leftPanelWidth, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', paddingLeft: 20, position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 31, boxShadow: '2px 0 8px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tasks</span>
                </div>
                <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', flex: 1 }}>
                    {topRowItems.map((m, idx) => (
                        <div key={idx} style={{
                            position: 'absolute', left: m.left, width: m.width, height: '100%',
                            display: 'flex', alignItems: 'center', padding: '0 12px', borderRight: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', height: 30, background: 'var(--bg-color)' }}>
                <div style={{ width: leftPanelWidth, flexShrink: 0, borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 31, boxShadow: '2px 0 8px rgba(0,0,0,0.02)' }} />
                <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', flex: 1 }}>
                    {bottomRowItems.map((b, idx) => (
                        <div key={idx} style={{
                            position: 'absolute', left: b.left, width: b.width, height: '100%',
                            borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: b.isWeekend ? 'rgba(55,53,47,0.015)' : 'transparent'
                        }}>
                            {b.isToday && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,122,255,0.08)' }} />}
                            <span style={{
                                fontSize: zoom === 'hours' || zoom === 'day' ? 12 : 10,
                                fontWeight: b.isToday ? 800 : 500,
                                color: b.isToday ? '#007aff' : 'var(--text-secondary)',
                                background: b.isToday ? 'rgba(0,122,255,0.1)' : 'transparent',
                                borderRadius: 4, padding: '2px 4px'
                            }}>
                                {b.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            {/* Soft shadow under header */}
            <div style={{ height: 4, width: '100%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.03), transparent)', position: 'absolute', top: 68, pointerEvents: 'none' }} />
        </div>
    );
}

export default function TaskTimelineView({
    tasks: initialTasks,
    currentUser,
    onDetail,
    users,
    onUpdate
}: {
    tasks: any[];
    currentUser: any;
    onDetail: (task: any) => void;
    users: any[];
    onUpdate?: (updatedTask: any) => void;
}) {
    const [zoom, setZoom] = useState<ZoomLevel>('week');
    const [groupBy, setGroupBy] = useState<'STATUS' | 'PRIORITY' | 'ASSIGNEE'>('STATUS');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [tasks, setTasks] = useState(initialTasks);
    const [, startTransition] = useTransition();

    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    const [startDateStr, setStartDateStr] = useState(() => {
        const d = new Date(); d.setDate(d.getDate() - 15);
        return d.toISOString().slice(0, 10);
    });
    const gridRef = useRef<HTMLDivElement>(null);

    const conf = ZOOM_CONFIG[zoom];
    const colW = conf.colW;
    const totalDays = conf.totalDays;
    const startDate = useMemo(() => new Date(startDateStr), [startDateStr]);

    const { topRowItems, bottomRowItems } = useMemo(() => {
        const top: any[] = [];
        const bottom: any[] = [];
        const today = new Date();

        // Top Row
        if (zoom === 'hours') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(startDate, i);
                top.push({ label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), left: i * colW, width: colW });
            }
        } else if (zoom === 'month' || zoom === 'year') {
            let i = 0;
            while (i < totalDays) {
                const year = addDays(startDate, i).getFullYear();
                let count = 0;
                while (i + count < totalDays && addDays(startDate, i + count).getFullYear() === year) count++;
                top.push({ label: String(year), left: i * colW, width: count * colW });
                i += count;
            }
        } else {
            let i = 0;
            while (i < totalDays) {
                const d = addDays(startDate, i);
                const month = d.getMonth(), year = d.getFullYear();
                let count = 0;
                while (i + count < totalDays && addDays(startDate, i + count).getMonth() === month) count++;
                top.push({ label: `${FULL_MONTH[month]} ${year}`, left: i * colW, width: count * colW });
                i += count;
            }
        }

        // Bottom Row
        if (zoom === 'hours') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(startDate, i);
                const isToday = isSameDay(d, today);
                for (let h = 0; h < 24; h += 3) {
                    bottom.push({ label: `${String(h).padStart(2, '0')}:00`, left: i * colW + (h / 24) * colW, width: colW / 8, isToday });
                }
            }
        } else if (zoom === 'year') {
            let i = 0;
            while (i < totalDays) {
                const d = addDays(startDate, i);
                const q = Math.floor(d.getMonth() / 3);
                let count = 0;
                while (i + count < totalDays && Math.floor(addDays(startDate, i + count).getMonth() / 3) === q) count++;
                bottom.push({ label: `Q${q + 1}`, left: i * colW, width: count * colW });
                i += count;
            }
        } else if (zoom === 'month') {
            let i = 0;
            while (i < totalDays) {
                const d = addDays(startDate, i);
                const month = d.getMonth();
                let count = 0;
                while (i + count < totalDays && addDays(startDate, i + count).getMonth() === month) count++;
                bottom.push({ label: FULL_MONTH[month].substring(0, 3), left: i * colW, width: count * colW });
                i += count;
            }
        } else {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(startDate, i);
                const isToday = isSameDay(d, today);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                let showLabel = (zoom === 'day' || d.getDay() === 1 || d.getDate() === 1);
                bottom.push({ label: showLabel ? String(d.getDate()) : '', left: i * colW, width: colW, isToday, isWeekend });
            }
        }

        return { topRowItems: top, bottomRowItems: bottom };
    }, [startDate, zoom, colW, totalDays]);

    const grouped = useMemo(() => {
        const groups: any[] = [];
        if (groupBy === 'STATUS') {
            const statusOrder = ['TODO', 'IN_PROGRESS', 'DONE'];
            const labels: any = { TODO: 'To Do', IN_PROGRESS: 'In Progress', DONE: 'Done' };
            const colors: any = { TODO: 'var(--text-secondary)', IN_PROGRESS: '#3498db', DONE: '#2ecc71' };
            statusOrder.forEach(s => {
                groups.push({ key: s, label: labels[s], color: colors[s], items: tasks.filter(t => t.status === s) });
            });
        } else if (groupBy === 'PRIORITY') {
            const priorityOrder = ['HIGH', 'MEDIUM', 'LOW'];
            const colors: any = { HIGH: '#ff4d4f', MEDIUM: '#f1c40f', LOW: 'var(--text-secondary)' };
            priorityOrder.forEach(p => {
                groups.push({ key: p, label: p, color: colors[p], items: tasks.filter(t => t.priority === p) });
            });
        } else if (groupBy === 'ASSIGNEE') {
            users.forEach(u => {
                groups.push({ key: u.id, label: u.name, color: '#007aff', items: tasks.filter(t => t.assigneeId === u.id), photo: u.photo });
            });
            groups.push({ key: 'unassigned', label: 'Unassigned', color: 'var(--text-secondary)', items: tasks.filter(t => !t.assigneeId) });
        }
        return groups;
    }, [tasks, groupBy, users]);

    const handleDrop = async (e: React.DragEvent, dayOffset: number) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newEnd = addDays(startDate, dayOffset);

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: newEnd } : t));
        if (onUpdate) {
            onUpdate({ id: taskId, dueDate: newEnd });
        }

        startTransition(async () => {
            try {
                await updateTaskDueDate(taskId, newEnd);
            } catch (err: any) {
                setTasks(initialTasks);
                alert(err.message || 'Failed to update date');
            }
        });
    };

    const exactDaysFromStart = (new Date().getTime() - startDate.getTime()) / 86400000;
    const LEFT_PANEL = 300;
    const HEADER_HEIGHT = 68;
    const ROW_HEIGHT = 44;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(55,53,47,0.01)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', background: 'var(--bg-color)', borderRadius: 8, padding: 3, border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        {(['day', 'week', 'month', 'year'] as ZoomLevel[]).map(z => (
                            <button key={z} onClick={() => setZoom(z)} style={{
                                padding: '4px 14px', fontSize: 12, fontWeight: 700, borderRadius: 6, border: 'none', cursor: 'pointer',
                                background: zoom === z ? 'var(--text-primary)' : 'transparent',
                                color: zoom === z ? 'var(--bg-color)' : 'var(--text-secondary)',
                                transition: 'all 0.2s', textTransform: 'capitalize'
                            }}>{z}</button>
                        ))}
                    </div>
                    <select value={groupBy} onChange={e => setGroupBy(e.target.value as any)} style={{
                        padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
                        background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600,
                        cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                    }}>
                        <option value="STATUS">Group by Status</option>
                        <option value="PRIORITY">Group by Priority</option>
                        <option value="ASSIGNEE">Group by Assignee</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: 6, padding: 3, background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                    <button onClick={() => setStartDateStr(addDays(startDate, -7).toISOString().slice(0, 10))} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>‹</button>
                    <button onClick={() => setStartDateStr(addDays(new Date(), -5).toISOString().slice(0, 10))} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Today</button>
                    <button onClick={() => setStartDateStr(addDays(startDate, 7).toISOString().slice(0, 10))} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>›</button>
                </div>
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflow: 'auto', position: 'relative' }} ref={gridRef}>
                <div style={{ minWidth: LEFT_PANEL + totalDays * colW }}>
                    <TimelineHeader topRowItems={topRowItems} bottomRowItems={bottomRowItems} zoom={zoom} leftPanelWidth={LEFT_PANEL} />

                    <div style={{ position: 'absolute', top: HEADER_HEIGHT, left: LEFT_PANEL, right: 0, bottom: 0, pointerEvents: 'none' }}>
                        {bottomRowItems.map((b, idx) => (
                            <div key={idx} style={{ position: 'absolute', left: b.left, width: b.width, top: 0, bottom: 0, borderRight: '1px dashed var(--border-color)', opacity: 0.6, background: b.isWeekend ? 'rgba(55,53,47,0.015)' : 'transparent' }} />
                        ))}
                    </div>

                    {exactDaysFromStart >= 0 && exactDaysFromStart <= totalDays && (
                        <div style={{ position: 'absolute', left: LEFT_PANEL + exactDaysFromStart * colW, top: HEADER_HEIGHT, bottom: 0, width: 2, background: 'rgba(0,122,255,0.4)', zIndex: 10, pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: -1, left: -4, width: 10, height: 10, background: '#007aff', borderRadius: '50%', boxShadow: '0 0 0 4px rgba(0,122,255,0.2)' }} />
                        </div>
                    )}

                    {grouped.map(group => {
                        const isCollapsed = collapsed[group.key];
                        return (
                            <div key={group.key}>
                                <div onClick={() => setCollapsed(prev => ({ ...prev, [group.key]: !isCollapsed }))} style={{ display: 'flex', height: 36, alignItems: 'center', background: 'rgba(55,53,47,0.02)', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', position: 'sticky', left: 0, zIndex: 5 }}>
                                    <div style={{ width: LEFT_PANEL, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRight: '1px solid var(--border-color)', background: 'var(--bg-color)', boxShadow: '2px 0 8px rgba(0,0,0,0.01)' }}>
                                        {isCollapsed ? <ChevronRight size={14} color="var(--text-secondary)" /> : <ChevronDown size={14} color="var(--text-secondary)" />}
                                        {group.photo && <img src={group.photo} style={{ width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--border-color)' }} />}
                                        <span style={{ fontSize: 13, fontWeight: 700, color: group.color }}>{group.label}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: 8 }}>{group.items.length}</span>
                                    </div>
                                    <div style={{ flex: 1 }} />
                                </div>

                                {!isCollapsed && group.items.map((task: any) => {
                                    const created = new Date(task.createdAt);
                                    const due = task.dueDate ? new Date(task.dueDate) : created;
                                    const startOffset = daysBetween(startDate, created);
                                    const endOffset = daysBetween(startDate, due);

                                    const barLeft = Math.max(0, startOffset);
                                    const barWidth = Math.max(1, endOffset - startOffset + 1);
                                    const canEdit = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;

                                    const colors = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;

                                    return (
                                        <div key={task.id} className="timeline-row" style={{ display: 'flex', height: ROW_HEIGHT, borderBottom: '1px solid var(--border-color)', position: 'relative', transition: 'background-color 0.15s' }}>
                                            <style>{`.timeline-row:hover { background-color: rgba(0,0,0,0.01); } .timeline-row:hover .title-cell { background-color: var(--hover-bg) !important; }`}</style>

                                            {/* Left Panel: Task Detail */}
                                            <div className="title-cell" style={{ width: LEFT_PANEL, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', padding: '0 20px', position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 4, cursor: 'pointer', transition: 'background-color 0.15s', boxShadow: '2px 0 8px rgba(0,0,0,0.01)' }} onClick={() => onDetail(task)}>
                                                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{task.title}</span>
                                                    {(task.assignee || task.priority) && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                                            {task.assignee && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                    {task.assignee.photo ? <img src={task.assignee.photo} style={{ width: 14, height: 14, borderRadius: '50%' }} /> : <UserIcon size={12} color="var(--text-secondary)" />}
                                                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{task.assignee.name}</span>
                                                                </div>
                                                            )}
                                                            {task.priority === 'HIGH' && <span style={{ fontSize: 10, color: '#ff4d4f', fontWeight: 800 }}>HIGH PRIORITY</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Timeline Area */}
                                            <div style={{ flex: 1, position: 'relative' }} onDragOver={e => e.preventDefault()} onDrop={e => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const offset = Math.floor((e.clientX - rect.left) / colW);
                                                handleDrop(e, offset);
                                            }}>
                                                <div
                                                    draggable={canEdit}
                                                    onDragStart={e => e.dataTransfer.setData('taskId', task.id)}
                                                    onClick={() => onDetail(task)}
                                                    style={{
                                                        position: 'absolute', left: barLeft * colW + 4, width: Math.max(24, barWidth * colW - 8),
                                                        top: '50%', transform: 'translateY(-50%)', height: 26, borderRadius: 8,
                                                        background: task.status === 'DONE' ? 'rgba(46, 204, 113, 0.08)' : (canEdit ? colors.bg : 'var(--sidebar-bg)'),
                                                        border: `1px solid ${task.status === 'DONE' ? 'rgba(46, 204, 113, 0.3)' : colors.border}`,
                                                        borderLeft: `4px solid ${task.status === 'DONE' ? '#27ae60' : colors.text}`,
                                                        color: task.status === 'DONE' ? '#27ae60' : colors.text,
                                                        fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', padding: '0 10px',
                                                        cursor: canEdit ? 'grab' : 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                        boxShadow: '0 2px 5px rgba(0,0,0,0.02)', transition: 'all 0.15s ease',
                                                        opacity: task.status === 'DONE' ? 0.6 : 1, textDecoration: task.status === 'DONE' ? 'line-through' : 'none'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.transform = 'translateY(-50%) scale(1.02)';
                                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                                                        e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.02)';
                                                    }}
                                                >
                                                    {task.title}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 6px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
