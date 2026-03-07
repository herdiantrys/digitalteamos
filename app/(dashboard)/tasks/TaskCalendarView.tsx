'use client';

import { useState, useMemo, useEffect, useRef, useCallback, useTransition } from 'react';
import { updateTaskDates } from '../../../lib/task-actions';
import { ChevronLeft, ChevronRight, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

/* ── Date helpers ─────────────────────────────────────────── */
const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const endOfDay = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; };
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);

const STATUS_CFG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    TODO: { bg: 'rgba(100,100,120,0.10)', text: '#8a8a9a', border: 'rgba(100,100,120,0.22)', dot: '#8a8a9a' },
    IN_PROGRESS: { bg: 'rgba(52,152,219,0.12)', text: '#3498db', border: 'rgba(52,152,219,0.32)', dot: '#3498db' },
    DONE: { bg: 'rgba(46,204,113,0.12)', text: '#27ae60', border: 'rgba(46,204,113,0.28)', dot: '#27ae60' },
    CANCELED: { bg: 'rgba(149,165,166,0.10)', text: '#95a5a6', border: 'rgba(149,165,166,0.25)', dot: '#95a5a6' },
};
const PRI_COLOR: Record<string, string> = { LOW: '#3498db', MEDIUM: '#f39c12', HIGH: '#e74c3c' };
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
    TODO: AlertCircle, IN_PROGRESS: Clock, DONE: CheckCircle2, CANCELED: AlertCircle,
};

const ACCENT = '#007aff';

/* ── Component ────────────────────────────────────────────── */
export default function TaskCalendarView({
    tasks: initialTasks,
    currentUser,
    onDetail,
    onNewTaskWithDate,
    onUpdate,
}: {
    tasks: any[];
    currentUser: any;
    onDetail: (task: any) => void;
    onNewTaskWithDate?: (dateStr: string) => void;
    onUpdate?: (task: any) => void;
}) {
    const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()));
    const [tasks, setTasks] = useState(initialTasks);
    const [, startTransition] = useTransition();
    const [hoveredDate, setHoveredDate] = useState<string | null>(null);

    /* drag-to-move (HTML5 API) */
    const [dragId, setDragId] = useState<string | null>(null);
    const dragIdRef = useRef<string | null>(null);
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const dragOffsetRef = useRef(0);
    const dragCounters = useRef<Record<string, number>>({});

    /* mouse-based resize */
    const [resizeId, setResizeId] = useState<string | null>(null);
    const resizeRef = useRef<{ id: string; side: 'left' | 'right'; origStart: Date; origEnd: Date } | null>(null);
    const didResizeRef = useRef(false);

    const [hoverCard, setHoverCard] = useState<string | null>(null);

    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    /* ── Month grid ── */
    const weeks = useMemo(() => {
        const y = baseDate.getFullYear(), m = baseDate.getMonth();
        const sd = new Date(y, m, 1).getDay();
        const prevDays = sd === 0 ? 6 : sd - 1;
        const gs = new Date(y, m, 1 - prevDays);
        return Array.from({ length: 6 }, (_, w) =>
            Array.from({ length: 7 }, (__, d) =>
                new Date(gs.getFullYear(), gs.getMonth(), gs.getDate() + w * 7 + d)
            )
        );
    }, [baseDate]);

    /* ── Tasks with normalised dates ── */
    const tasksWithDates = useMemo(() =>
        tasks.map(t => {
            const s = t.startDate ? startOfDay(new Date(t.startDate)) : (t.dueDate ? startOfDay(new Date(t.dueDate)) : null);
            const e = t.dueDate ? startOfDay(new Date(t.dueDate)) : s;
            return { ...t, _start: s, _end: e };
        }).filter(t => t._start && t._end),
        [tasks]
    );

    /* ── Lane assignment (greedy) ── */
    const lanes = useMemo(() => {
        const lm = new Map<string, number>();
        const sorted = [...tasksWithDates].sort((a, b) => {
            if (a._start.getTime() !== b._start.getTime()) return a._start.getTime() - b._start.getTime();
            return (b._end.getTime() - b._start.getTime()) - (a._end.getTime() - a._start.getTime());
        });
        const tails: number[] = [];
        sorted.forEach(t => {
            let lane = 0;
            while (tails[lane] !== undefined && tails[lane] >= t._start.getTime()) lane++;
            lm.set(t.id, lane);
            tails[lane] = t._end.getTime();
        });
        return lm;
    }, [tasksWithDates]);

    /* ── canEdit ── */
    const canEdit = useCallback((task: any) =>
        currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id),
        [currentUser]
    );

    /* ── Date hit-test (for resize) ── */
    const getDateAtPoint = useCallback((cx: number, cy: number): Date | null => {
        const cells = document.querySelectorAll<HTMLElement>('[data-cal-date]');
        for (const cell of Array.from(cells)) {
            const r = cell.getBoundingClientRect();
            if (cx >= r.left && cx < r.right && cy >= r.top && cy <= r.bottom) {
                const ds = cell.getAttribute('data-cal-date');
                if (ds) { const [y, m, d] = ds.split('-').map(Number); const dt = new Date(y, m - 1, d); dt.setHours(0); return dt; }
            }
        }
        return null;
    }, []);

    /* ── Commit date change to server ── */
    const commitDates = useCallback((taskId: string, newStart: Date, newEnd: Date) => {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, startDate: newStart, dueDate: newEnd } : t));
        if (onUpdate) onUpdate({ id: taskId, startDate: newStart, dueDate: newEnd });
        startTransition(async () => {
            try { await updateTaskDates(taskId, newStart, newEnd); }
            catch { setTasks(initialTasks); alert('Failed to update task dates'); }
        });
    }, [onUpdate, initialTasks]);

    /* ── Resize mouse handler ── */
    const startResize = useCallback((e: React.MouseEvent, task: any, side: 'left' | 'right') => {
        e.preventDefault(); e.stopPropagation();
        if (!canEdit(task)) return;
        resizeRef.current = { id: task.id, side, origStart: new Date(task._start), origEnd: new Date(task._end) };
        setResizeId(task.id);
        setHoverCard(task.id);
    }, [canEdit]);

    useEffect(() => {
        if (!resizeId) return;
        const onMove = (e: MouseEvent) => {
            const rs = resizeRef.current; if (!rs) return;
            const tgt = getDateAtPoint(e.clientX, e.clientY); if (!tgt) return;
            const ns = rs.side === 'left'
                ? (tgt > rs.origEnd ? rs.origEnd : startOfDay(tgt))
                : new Date(rs.origStart);
            const ne = rs.side === 'right'
                ? (tgt < rs.origStart ? rs.origStart : endOfDay(tgt))
                : new Date(rs.origEnd);
            setTasks(prev => prev.map(t => {
                if (t.id !== rs.id) return t;
                return { ...t, startDate: ns, dueDate: ne, _start: ns, _end: ne };
            }));
            resizeRef.current = { ...rs, origStart: startOfDay(ns), origEnd: startOfDay(ne) };
        };
        const onUp = () => {
            const rs = resizeRef.current; resizeRef.current = null; setResizeId(null);
            didResizeRef.current = true;
            if (!rs) return;
            commitDates(rs.id, startOfDay(rs.origStart), startOfDay(rs.origEnd));
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeId, getDateAtPoint, commitDates]);

    /* ── Window-level dragover (guarantees preventDefault before React re-renders) ── */
    useEffect(() => {
        const onDragOver = (e: DragEvent) => { if (!dragIdRef.current) return; e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'; };
        const onDragEnd = () => { dragIdRef.current = null; };
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragend', onDragEnd);
        return () => { window.removeEventListener('dragover', onDragOver); window.removeEventListener('dragend', onDragEnd); };
    }, []);

    /* ── Ghost range while dragging ── */
    const getGhostRange = (task: any): { start: Date; end: Date } | null => {
        if (task.id !== dragId || !dragOverDate) return null;
        const dur = daysBetween(task._start, task._end);
        const [y, m, d] = dragOverDate.split('-').map(Number);
        const hover = new Date(y, m - 1, d);
        const newStart = startOfDay(addDays(hover, -dragOffsetRef.current));
        return { start: newStart, end: addDays(newStart, dur) };
    };

    /* ── Drop handler ── */
    const handleDrop = useCallback((e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        setDragOverDate(null); setDragId(null); dragIdRef.current = null;
        if (!id) return;
        const task = tasksWithDates.find(t => t.id === id); if (!task) return;
        const [y, m, d] = dateStr.split('-').map(Number);
        const hover = new Date(y, m - 1, d);
        const newStart = startOfDay(addDays(hover, -dragOffsetRef.current));
        const dur = daysBetween(task._start, task._end);
        const newEnd = addDays(newStart, dur);
        dragOffsetRef.current = 0;
        commitDates(id, newStart, newEnd);
    }, [tasksWithDates, commitDates]);

    const today = fmt(new Date());

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.06)', overflow: 'hidden', userSelect: resizeId ? 'none' : 'auto' }}>
            <style>{`
                @keyframes cFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
                .tcv-cell:hover .tcv-add { opacity: 1 !important; pointer-events: auto !important; }
            `}</style>

            {/* ── Header (Sticky) ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-color)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', background: 'var(--hover-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
                        {[
                            { label: <ChevronLeft size={15} />, onClick: () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) },
                            { label: 'Today', onClick: () => setBaseDate(startOfDay(new Date())) },
                            { label: <ChevronRight size={15} />, onClick: () => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) },
                        ].map(({ label, onClick }, i) => (
                            <button key={i} onClick={onClick}
                                style={{ padding: typeof label === 'string' ? '6px 14px' : '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', borderRadius: 7, display: 'flex', alignItems: 'center', transition: 'background 0.15s, color 0.15s', letterSpacing: '0.03em' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-color)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >{label}</button>
                        ))}
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        {baseDate.toLocaleDateString('en-US', { month: 'long' })}
                        <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8, fontSize: 16 }}>{baseDate.getFullYear()}</span>
                    </h2>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: 14 }}>
                    {[['IN_PROGRESS', 'In Progress'], ['DONE', 'Done'], ['HIGH', 'High']].map(([key, label]) => {
                        const cfg = STATUS_CFG[key as keyof typeof STATUS_CFG] || { dot: PRI_COLOR[key] || '#999', text: '#999' };
                        return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: (cfg as any).dot || PRI_COLOR[key] || '#999', flexShrink: 0 }} />
                                {label}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Scrollable Week rows ── */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* ── Day-of-week header (Inside scroll to match width) ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--hover-bg)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20,
                    flexShrink: 0
                }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                        <div key={d} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none' }}>{d}</div>
                    ))}
                </div>

                {weeks.map((week, wIdx) => {
                    const ws = week[0], we = week[6];
                    const isLastWeek = wIdx === 5;

                    let weekTasks = tasksWithDates.filter(t => {
                        const s = t.id === dragId && dragOverDate ? getGhostRange(t)?.start ?? t._start : t._start;
                        const e = t.id === dragId && dragOverDate ? getGhostRange(t)?.end ?? t._end : t._end;
                        return s <= we && e >= ws;
                    });

                    // Greedy slot allocation for this week
                    const slots: any[][] = Array.from({ length: 20 }, () => []);
                    const taskToSlot = new Map<string, number>();
                    const sorted = [...weekTasks].sort((a, b) => {
                        const as_ = a._start, bs_ = b._start;
                        if (as_.getTime() !== bs_.getTime()) return as_.getTime() - bs_.getTime();
                        return (b._end.getTime() - b._start.getTime()) - (a._end.getTime() - a._start.getTime());
                    });
                    sorted.forEach(task => {
                        const ghost = getGhostRange(task);
                        const s = ghost ? ghost.start : task._start;
                        const e = ghost ? ghost.end : task._end;
                        for (let i = 0; i < slots.length; i++) {
                            const overlap = slots[i].some((ex: any) => {
                                const exGhost = getGhostRange(ex);
                                const es = exGhost ? exGhost.start : ex._start;
                                const ee = exGhost ? exGhost.end : ex._end;
                                return s <= ee && e >= es;
                            });
                            if (!overlap) { slots[i].push(task); taskToSlot.set(task.id, i); break; }
                        }
                    });

                    const maxSlot = taskToSlot.size > 0 ? Math.max(...taskToSlot.values()) : -1;
                    const ROW_H = 30;
                    const BAR_AREA = maxSlot >= 0 ? (maxSlot + 1) * ROW_H + 10 : 0;

                    return (
                        <div
                            key={wIdx}
                            style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: !isLastWeek ? '1px solid var(--border-color)' : 'none', position: 'relative' }}
                        >
                            {/* Background day cells */}
                            {week.map((date, dIdx) => {
                                const dateStr = fmt(date);
                                const isCur = date.getMonth() === baseDate.getMonth();
                                const isToday = dateStr === today;
                                const isWknd = dIdx >= 5;
                                const isDO = dragOverDate === dateStr && !!dragIdRef.current;
                                const isHov = hoveredDate === dateStr && !dragId;

                                return (
                                    <div
                                        key={dateStr}
                                        className="tcv-cell"
                                        data-cal-date={dateStr}
                                        onMouseEnter={() => !dragId && !resizeId && setHoveredDate(dateStr)}
                                        onMouseLeave={() => setHoveredDate(null)}
                                        onDragEnter={e => {
                                            e.preventDefault();
                                            dragCounters.current[dateStr] = (dragCounters.current[dateStr] || 0) + 1;
                                            if (dragIdRef.current) setDragOverDate(dateStr);
                                        }}
                                        onDragLeave={() => {
                                            dragCounters.current[dateStr] = (dragCounters.current[dateStr] || 1) - 1;
                                            if (dragCounters.current[dateStr] <= 0) {
                                                dragCounters.current[dateStr] = 0;
                                                setDragOverDate(prev => prev === dateStr ? null : prev);
                                            }
                                        }}
                                        onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                                        onDrop={e => { dragCounters.current[dateStr] = 0; handleDrop(e, dateStr); }}
                                        style={{
                                            minHeight: 90 + BAR_AREA,
                                            borderRight: dIdx < 6 ? '1px solid var(--border-color)' : 'none',
                                            backgroundColor: isToday
                                                ? 'rgba(0,122,255,0.03)'
                                                : isWknd ? 'rgba(55,53,47,0.025)' : !isCur ? 'rgba(55,53,47,0.02)' : 'var(--bg-color)',
                                            background: isDO
                                                ? `linear-gradient(180deg, ${ACCENT}18 0%, ${ACCENT}0a 100%)`
                                                : undefined,
                                            boxShadow: isDO ? `inset 0 0 0 2px ${ACCENT}55` : 'none',
                                            padding: '6px 6px 0',
                                            boxSizing: 'border-box',
                                            minWidth: 0,
                                            position: 'relative',
                                            transition: 'background 0.12s, box-shadow 0.12s',
                                        }}
                                    >
                                        {/* Date number row */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <span style={{
                                                fontSize: date.getDate() === 1 ? 11 : 13,
                                                fontWeight: isToday ? 800 : 500,
                                                color: isToday ? '#fff' : (isCur ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                opacity: !isCur ? 0.45 : 1,
                                                width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                borderRadius: '50%',
                                                background: isToday ? ACCENT : 'transparent',
                                                boxShadow: isToday ? `0 2px 8px ${ACCENT}50` : 'none',
                                                flexShrink: 0,
                                            }}>
                                                {date.getDate() === 1 && !isToday ? date.toLocaleString('default', { month: 'short' }) : date.getDate()}
                                            </span>
                                            {onNewTaskWithDate && (
                                                <button
                                                    className="tcv-add"
                                                    onClick={() => onNewTaskWithDate(dateStr)}
                                                    style={{ width: 20, height: 20, borderRadius: 6, background: ACCENT, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s, transform 0.15s', boxShadow: `0 2px 8px ${ACCENT}50`, flexShrink: 0 }}
                                                >
                                                    <Plus size={12} strokeWidth={2.8} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Drop-zone label */}
                                        {isDO && (
                                            <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 800, color: ACCENT, background: `${ACCENT}18`, borderRadius: 6, padding: '2px 8px', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 2 }}>
                                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][dIdx]} {date.getDate()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Spanning task bars ── */}
                            <div style={{ position: 'absolute', top: 36, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
                                {sorted.map(task => {
                                    const ghost = getGhostRange(task);
                                    const aS = ghost ? ghost.start : task._start;
                                    const aE = ghost ? ghost.end : task._end;
                                    const vS = aS < ws ? ws : aS;
                                    const vE = aE > we ? we : aE;
                                    const startCol = Math.round((vS.getTime() - ws.getTime()) / 86400000);
                                    const endCol = Math.round((vE.getTime() - ws.getTime()) / 86400000);
                                    const cw = 100 / 7;
                                    const left = `calc(${startCol * cw}% + 4px)`;
                                    const width = `calc(${(endCol - startCol + 1) * cw}% - 8px)`;
                                    const slotIdx = taskToSlot.get(task.id) || 0;
                                    const top = slotIdx * ROW_H + 2;

                                    const cfg = STATUS_CFG[task.status] || STATUS_CFG.TODO;
                                    const pc = PRI_COLOR[task.priority] || PRI_COLOR.MEDIUM;
                                    const editable = canEdit(task);
                                    const isDrag = dragId === task.id;
                                    const isGhost = isDrag && ghost !== null;
                                    const isRes = resizeId === task.id;
                                    const isHov = hoverCard === task.id;
                                    const trueS = fmt(aS) === fmt(vS);
                                    const trueE = fmt(aE) === fmt(vE);

                                    return (
                                        <div
                                            key={task.id}
                                            style={{ position: 'absolute', left, width, top, height: ROW_H - 4, pointerEvents: 'auto', zIndex: isDrag ? 50 : isRes ? 30 : isHov ? 20 : 5, boxSizing: 'border-box' }}
                                        >
                                            <div
                                                draggable={editable && !isRes}
                                                onDragStart={e => {
                                                    if (!editable || isRes) { e.preventDefault(); return; }
                                                    dragOffsetRef.current = Math.max(0, daysBetween(task._start, vS));
                                                    e.dataTransfer.setData('text/plain', task.id);
                                                    e.dataTransfer.effectAllowed = 'move';
                                                    dragIdRef.current = task.id;
                                                    setDragId(task.id);
                                                }}
                                                onDragEnd={() => { dragIdRef.current = null; setDragId(null); setDragOverDate(null); dragOffsetRef.current = 0; }}
                                                onDragOver={e => {
                                                    e.preventDefault(); e.stopPropagation();
                                                    e.dataTransfer.dropEffect = 'move';
                                                    const gridEl = (e.currentTarget as HTMLElement).parentElement?.parentElement;
                                                    if (!gridEl || !dragIdRef.current) return;
                                                    const rect = gridEl.getBoundingClientRect();
                                                    const col = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 7))));
                                                    const ds = week.map(fmt)[col];
                                                    if (ds && dragOverDate !== ds) setDragOverDate(ds);
                                                }}
                                                onDrop={e => {
                                                    e.stopPropagation();
                                                    if (!dragIdRef.current) return;
                                                    const gridEl = (e.currentTarget as HTMLElement).parentElement?.parentElement;
                                                    if (!gridEl) return;
                                                    const rect = gridEl.getBoundingClientRect();
                                                    const col = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 7))));
                                                    const ds = week.map(fmt)[col];
                                                    if (ds) { dragCounters.current[ds] = 0; handleDrop(e, ds); }
                                                }}
                                                onMouseEnter={() => { if (!isDrag) setHoverCard(task.id); }}
                                                onMouseLeave={() => { if (!isRes) setHoverCard(null); }}
                                                onClick={() => {
                                                    if (didResizeRef.current) { didResizeRef.current = false; return; }
                                                    if (!isDrag && !isRes) onDetail(task);
                                                }}
                                                style={{
                                                    height: '100%',
                                                    background: isGhost
                                                        ? `repeating-linear-gradient(45deg,${pc}10 0,${pc}10 4px,transparent 4px,transparent 10px)`
                                                        : `linear-gradient(135deg, ${cfg.bg}, ${pc}0a)`,
                                                    borderTop: isGhost ? `1px dashed ${pc}60` : `1px solid ${cfg.border}`,
                                                    borderBottom: isGhost ? `1px dashed ${pc}60` : `1px solid ${cfg.border}`,
                                                    borderRight: trueE ? (isGhost ? `1px dashed ${pc}60` : `1px solid ${cfg.border}`) : 'none',
                                                    borderLeft: trueS ? (isGhost ? `4px dashed ${pc}` : `4px solid ${pc}`) : 'none',
                                                    borderRadius: trueS && trueE ? 8 : trueS ? '8px 0 0 8px' : trueE ? '0 8px 8px 0' : 0,
                                                    display: 'flex', alignItems: 'center', gap: 5, padding: '0 6px',
                                                    cursor: editable ? (isDrag ? 'grabbing' : 'grab') : 'pointer',
                                                    color: cfg.text,
                                                    fontSize: 11, fontWeight: 700,
                                                    opacity: task.status === 'DONE' ? 0.55 : (isGhost ? 0.8 : isDrag ? 0.3 : 1),
                                                    textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                                                    boxShadow: isGhost
                                                        ? `0 0 0 2px ${pc}44`
                                                        : isHov
                                                            ? `0 4px 16px ${pc}30, 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)`
                                                            : `0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.35)`,
                                                    transform: isHov && !isDrag ? 'translateY(-1px)' : 'none',
                                                    transition: isDrag || isRes ? 'none' : 'box-shadow 0.18s, transform 0.18s, opacity 0.18s',
                                                    overflow: 'hidden', whiteSpace: 'nowrap', position: 'relative',
                                                    userSelect: 'none',
                                                }}
                                            >
                                                {/* Left resize handle */}
                                                {trueS && editable && (isHov || isRes) && (
                                                    <div
                                                        onMouseDown={e => startResize(e, task, 'left')}
                                                        style={{ position: 'absolute', left: -1, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, background: pc, borderRadius: '0 6px 6px 0', cursor: 'col-resize', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${pc}55` }}
                                                    >
                                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M5 1.5L2 4L5 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </div>
                                                )}

                                                {/* Status icon */}
                                                {trueS && (() => { const Icon = STATUS_ICON[task.status] || AlertCircle; return <Icon size={11} style={{ flexShrink: 0, opacity: 0.8 }} />; })()}
                                                {!trueS && <span style={{ opacity: 0.4, fontSize: 13 }}>‹</span>}

                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none', minWidth: 0 }}>{task.title}</span>

                                                {/* Ghost date label */}
                                                {isGhost && (
                                                    <span style={{ fontSize: 10, background: `${pc}20`, borderRadius: 5, padding: '1px 6px', color: pc, fontWeight: 800, flexShrink: 0 }}>
                                                        {fmt(aS)}{daysBetween(aS, aE) > 0 ? ` – ${fmt(aE)}` : ''}
                                                    </span>
                                                )}

                                                {/* Assignee avatars */}
                                                {!isGhost && task.assignees?.length > 0 && (
                                                    <div style={{ display: 'flex', flexShrink: 0, pointerEvents: 'none' }}>
                                                        {task.assignees.slice(0, 2).map((a: any, i: number) => (
                                                            <div key={a.id} title={a.name} style={{ width: 16, height: 16, borderRadius: '50%', fontSize: 8, fontWeight: 800, background: `hsl(${Math.abs((a.name?.charCodeAt(0) || 0) * 7) % 360},50%,30%)`, color: `hsl(${Math.abs((a.name?.charCodeAt(0) || 0) * 7) % 360},80%,80%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--bg-color)', marginLeft: i > 0 ? -4 : 0, overflow: 'hidden' }}>
                                                                {a.photo ? <img src={a.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {!trueE && !isGhost && <span style={{ opacity: 0.4, fontSize: 13 }}>›</span>}

                                                {/* Right resize handle */}
                                                {trueE && editable && (isHov || isRes) && (
                                                    <div
                                                        onMouseDown={e => startResize(e, task, 'right')}
                                                        style={{ position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, background: pc, borderRadius: '6px 0 0 6px', cursor: 'col-resize', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${pc}55` }}
                                                    >
                                                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M3 1.5L6 4L3 6.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
