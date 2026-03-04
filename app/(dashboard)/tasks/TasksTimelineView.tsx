'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

const STATUS_COLORS: Record<string, string> = {
    'TODO': '#ff4d4f',
    'IN_PROGRESS': '#1890ff',
    'REVIEW': '#faad14',
    'DONE': '#27ae60',
};

function daysBetween(a: Date, b: Date) {
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export default function TasksTimelineView({
    tasks,
    onEditTask
}: {
    tasks: any[];
    onEditTask: (task: any) => void;
}) {
    const today = useMemo(() => { d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    var d; // for the useMemo above

    const [zoom, setZoom] = useState<'day' | 'week'>('day');
    const colW = zoom === 'day' ? 50 : 30;
    const scrollRef = useRef<HTMLDivElement>(null);

    const rangeStart = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() - 14);
        return d;
    }, [today]);

    const rangeEnd = useMemo(() => {
        const d = new Date(today);
        d.setDate(d.getDate() + 45);
        return d;
    }, [today]);

    const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
    const todayOffset = daysBetween(rangeStart, today);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ left: todayOffset * colW - 200, behavior: 'smooth' });
        }
    }, [todayOffset, colW]);

    const groups = useMemo(() => {
        const map = new Map<string, any[]>();
        tasks.forEach(t => {
            const key = t.assignee?.name || 'Unassigned';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        });
        return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
    }, [tasks]);

    return (
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', gap: 12, padding: '12px 16px', background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>By Assignee</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                    <button onClick={() => setZoom('day')} style={btnStyle(zoom === 'day')}>Day</button>
                    <button onClick={() => setZoom('week')} style={btnStyle(zoom === 'week')}>Compact</button>
                    <button onClick={() => scrollRef.current?.scrollTo({ left: todayOffset * colW - 200, behavior: 'smooth' })} style={{ ...btnStyle(false), marginLeft: 8 }}>Today</button>
                </div>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflow: 'auto' }}>
                <div style={{ width: totalDays * colW, minWidth: '100%', position: 'relative' }}>
                    {/* Header Scale */}
                    <div style={{ display: 'flex', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
                        {Array.from({ length: totalDays }, (_, i) => {
                            const d = new Date(rangeStart.getTime() + i * 86_400_000);
                            const isToday = d.getTime() === today.getTime();
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                                <div key={i} style={{
                                    width: colW, flexShrink: 0, padding: '8px 0', textAlign: 'center', fontSize: 10,
                                    borderRight: '1px solid var(--border-color)',
                                    background: isToday ? 'var(--accent-color)' : isWeekend ? 'rgba(0,0,0,0.03)' : 'transparent',
                                    color: isToday ? '#fff' : 'var(--text-secondary)',
                                    fontWeight: isToday ? 700 : 400
                                }}>
                                    {zoom === 'day' ? (
                                        <>
                                            <div style={{ opacity: 0.6 }}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]}</div>
                                            <div>{d.getDate()}</div>
                                        </>
                                    ) : (
                                        <div>{d.getDate()}</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Groups */}
                    {groups.map(g => (
                        <div key={g.label} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ position: 'sticky', left: 0, zIndex: 5, padding: '4px 12px', background: 'var(--sidebar-bg)', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid rgba(0,0,0,0.05)', width: 'fit-content' }}>
                                {g.label}
                            </div>
                            <div style={{ position: 'relative', height: g.items.length * 36 + 10, minHeight: 40 }}>
                                {g.items.map((t, idx) => {
                                    if (!t.dueDate) return null;
                                    const offset = daysBetween(rangeStart, new Date(t.dueDate));
                                    if (offset < 0 || offset >= totalDays) return null;
                                    return (
                                        <div
                                            key={t.id}
                                            onClick={() => onEditTask(t)}
                                            style={{
                                                position: 'absolute',
                                                left: offset * colW + 4,
                                                top: idx * 36 + 10,
                                                width: colW * 1.5,
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                background: STATUS_COLORS[t.status],
                                                color: '#fff',
                                                fontSize: 11,
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                                                zIndex: 2
                                            }}
                                            title={t.title}
                                        >
                                            {t.title}
                                        </div>
                                    );
                                })}
                                {/* Vertical Grid Lines */}
                                {Array.from({ length: totalDays }, (_, i) => (
                                    <div key={i} style={{ position: 'absolute', left: i * colW, top: 0, bottom: 0, width: 1, borderRight: '1px solid rgba(0,0,0,0.03)', pointerEvents: 'none' }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function btnStyle(active: boolean) {
    return {
        background: active ? 'var(--text-primary)' : 'transparent',
        border: '1px solid var(--border-color)',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        color: active ? 'var(--bg-color)' : 'var(--text-secondary)',
        cursor: 'pointer',
        fontWeight: 600
    };
}
