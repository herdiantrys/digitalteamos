'use client';

import { useState, useMemo, useEffect, useTransition, useRef } from 'react';
import { updateTaskDates } from '../../../lib/task-actions';
import { ChevronLeft, ChevronRight, Plus, User as UserIcon } from 'lucide-react';

/* ── Date helpers ─────────────────────────────────────────── */
const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const addDays = (d: Date, days: number) => { const c = new Date(d); c.setDate(c.getDate() + days); return c; };

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    TODO: { bg: 'var(--sidebar-bg)', text: 'var(--text-primary)', border: 'var(--border-color)' },
    IN_PROGRESS: { bg: 'rgba(52, 152, 219, 0.15)', text: '#2980b9', border: 'rgba(52, 152, 219, 0.4)' },
    DONE: { bg: 'rgba(46, 204, 113, 0.15)', text: '#27ae60', border: 'rgba(46, 204, 113, 0.3)' }
};

export default function TaskCalendarView({
    tasks: initialTasks,
    currentUser,
    onDetail,
    onNewTaskWithDate,
    onUpdate
}: {
    tasks: any[];
    currentUser: any;
    onDetail: (task: any) => void;
    onNewTaskWithDate?: (dateStr: string) => void;
    onUpdate?: (updatedTask: any) => void;
}) {
    const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()));
    const [tasks, setTasks] = useState(initialTasks);
    const [, startTransition] = useTransition();

    // Dragming state for spanning tasks
    const [dragState, setDragState] = useState<{
        taskId: string;
        mode: 'move' | 'resize-start' | 'resize-end';
        originalStart: Date;
        originalEnd: Date;
        currentStart: Date;
        currentEnd: Date;
    } | null>(null);

    // Refs for grid calculations
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // Compute month grid days grouped by week
    const weeks = useMemo(() => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const start = new Date(year, month, 1);

        const startDay = start.getDay(); // 0 = Sunday
        const prevMonthDays = startDay === 0 ? 6 : startDay - 1; // Start on Monday

        const gridStart = new Date(year, month, 1 - prevMonthDays);

        const weeksArr: Date[][] = [];
        for (let w = 0; w < 6; w++) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                week.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + (w * 7) + d));
            }
            weeksArr.push(week);
        }
        return weeksArr;
    }, [baseDate]);

    // Compute active tasks with normalized start/end dates for rendering
    const tasksWithDates = useMemo(() => {
        return tasks.map(t => {
            const start = t.startDate ? startOfDay(new Date(t.startDate)) : (t.dueDate ? startOfDay(new Date(t.dueDate)) : null);
            const end = t.dueDate ? startOfDay(new Date(t.dueDate)) : start;
            return { ...t, _start: start, _end: end };
        }).filter(t => t._start && t._end); // Only tasks with dates
    }, [tasks]);

    // Handle dropping/resizing on the grid
    const handleMouseUp = async () => {
        if (!dragState) return;

        const { taskId, currentStart, currentEnd, originalStart, originalEnd } = dragState;
        setDragState(null);

        if (currentStart.getTime() === originalStart.getTime() && currentEnd.getTime() === originalEnd.getTime()) return;

        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, startDate: currentStart, dueDate: currentEnd } : t));
        if (onUpdate) onUpdate({ id: taskId, startDate: currentStart, dueDate: currentEnd });

        startTransition(async () => {
            try {
                await updateTaskDates(taskId, currentStart, currentEnd);
            } catch (err: any) {
                setTasks(initialTasks);
                alert(err.message || 'Failed to update dates');
            }
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState || !gridRef.current) return;

        // Calculate which day we are hovering over
        const rect = gridRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width - 1));
        const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height - 1));

        const colIndex = Math.floor((x / rect.width) * 7);
        const rowIndex = Math.floor((y / rect.height) * 6);

        const hoveredDate = weeks[rowIndex][colIndex];

        setDragState(prev => {
            if (!prev) return prev;
            let newStart = prev.currentStart;
            let newEnd = prev.currentEnd;

            if (prev.mode === 'move') {
                const daysDiff = Math.round((hoveredDate.getTime() - prev.originalStart.getTime()) / 86400000);
                const taskDuration = Math.round((prev.originalEnd.getTime() - prev.originalStart.getTime()) / 86400000);
                newStart = addDays(prev.originalStart, daysDiff);
                newEnd = addDays(newStart, taskDuration);
            } else if (prev.mode === 'resize-start') {
                newStart = hoveredDate;
                if (newStart > newEnd) newStart = newEnd; // Prevent start after end
            } else if (prev.mode === 'resize-end') {
                newEnd = hoveredDate;
                if (newEnd < newStart) newEnd = newStart; // Prevent end before start
            }

            // Only update state if dates changed
            if (newStart.getTime() !== prev.currentStart.getTime() || newEnd.getTime() !== prev.currentEnd.getTime()) {
                return { ...prev, currentStart: newStart, currentEnd: newEnd };
            }
            return prev;
        });
    };


    return (
        <div
            style={{
                display: 'flex', flexDirection: 'column', height: '100%',
                background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.02)',
                userSelect: dragState ? 'none' : 'auto'
            }}
            onMouseMove={dragState ? handleMouseMove : undefined}
            onMouseUp={dragState ? handleMouseUp : undefined}
            onMouseLeave={dragState ? handleMouseUp : undefined}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 24px', borderBottom: '1px solid var(--border-color)',
                background: 'rgba(55,53,47,0.01)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', padding: 3, background: 'var(--bg-color)', borderRadius: 8, border: '1px solid var(--border-color)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                        <button
                            onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            style={{ padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 6, transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setBaseDate(startOfDay(new Date()))}
                            style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            style={{ padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 6, transition: 'background 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                        {baseDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                </div>
            </div>

            {/* Grid Container */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--border-color)', gap: 1 }}>

                {/* Days of week header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--bg-color)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} style={{
                            padding: '12px 10px', fontSize: 13, fontWeight: 700,
                            color: 'var(--text-secondary)', textAlign: 'right',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            borderRight: '1px solid var(--border-color)'
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Weeks Grid */}
                <div ref={gridRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, backgroundColor: 'var(--border-color)', position: 'relative' }}>
                    {weeks.map((week, weekIdx) => {
                        const weekStart = week[0];
                        const weekEnd = week[6];

                        // Filter tasks that intersect this week
                        const weekTasks = tasksWithDates.filter(t => {
                            const taskStart = dragState?.taskId === t.id ? dragState!.currentStart : t._start;
                            const taskEnd = dragState?.taskId === t.id ? dragState!.currentEnd : t._end;
                            return taskStart <= weekEnd && taskEnd >= weekStart;
                        });

                        // Calculate visual rows to avoid overlap
                        // A simple greedy algorithm to find vertical slots
                        const allocatedSlots: any[][] = Array(20).fill(null).map(() => []);

                        // Sort by start date, then duration (longest first)
                        const sortedTasks = [...weekTasks].sort((a, b) => {
                            const aStart = dragState?.taskId === a.id ? dragState!.currentStart : a._start;
                            const bStart = dragState?.taskId === b.id ? dragState!.currentStart : b._start;
                            if (aStart.getTime() !== bStart.getTime()) return aStart.getTime() - bStart.getTime();

                            const aEnd = dragState?.taskId === a.id ? dragState!.currentEnd : a._end;
                            const bEnd = dragState?.taskId === b.id ? dragState!.currentEnd : b._end;
                            return (bEnd.getTime() - bStart.getTime()) - (aEnd.getTime() - aStart.getTime());
                        });

                        const taskToSlot = new Map<string, number>();

                        sortedTasks.forEach(task => {
                            const taskStart = dragState?.taskId === task.id ? dragState!.currentStart : task._start;
                            const taskEnd = dragState?.taskId === task.id ? dragState!.currentEnd : task._end;

                            // Find first empty slot
                            for (let i = 0; i < allocatedSlots.length; i++) {
                                const slot = allocatedSlots[i];
                                const hasOverlap = slot.some(existing => {
                                    const eStart = dragState?.taskId === existing.id ? dragState!.currentStart : existing._start;
                                    const eEnd = dragState?.taskId === existing.id ? dragState!.currentEnd : existing._end;
                                    return taskStart <= eEnd && taskEnd >= eStart;
                                });

                                if (!hasOverlap) {
                                    slot.push(task);
                                    taskToSlot.set(task.id, i);
                                    break;
                                }
                            }
                        });


                        return (
                            <div key={`week-${weekIdx}`} style={{ flex: 1, backgroundColor: 'var(--bg-color)', position: 'relative', display: 'flex' }}>

                                {/* Background Grid Cells */}
                                {week.map((date, dayIdx) => {
                                    const dateStr = fmt(date);
                                    const isCurrentMonth = date.getMonth() === baseDate.getMonth();
                                    const isToday = dateStr === fmt(new Date());

                                    return (
                                        <div key={dateStr} style={{
                                            flex: 1,
                                            borderRight: dayIdx < 6 ? '1px solid var(--border-color)' : 'none',
                                            backgroundColor: isCurrentMonth ? 'var(--bg-color)' : 'rgba(55,53,47,0.03)',
                                            position: 'relative'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 8px' }}>
                                                {onNewTaskWithDate ? (
                                                    <button
                                                        onClick={() => onNewTaskWithDate(dateStr)}
                                                        style={{
                                                            background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)',
                                                            cursor: 'pointer', opacity: 0, width: 24, height: 24, borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'opacity 0.2s',
                                                            position: 'relative', zIndex: 10
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                                        onMouseLeave={e => e.currentTarget.style.opacity = '0'}
                                                    >
                                                        <Plus size={14} />
                                                    </button>
                                                ) : <div />}

                                                <span style={{
                                                    fontSize: 13, fontWeight: isToday ? 800 : 600,
                                                    color: isToday ? '#fff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                    background: isToday ? '#007aff' : 'transparent',
                                                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '50%', opacity: isToday ? 1 : (isCurrentMonth ? 1 : 0.4),
                                                    boxShadow: isToday ? '0 2px 8px rgba(0, 122, 255, 0.4)' : 'none'
                                                }}>
                                                    {date.getDate() === 1 && !isToday ? `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}` : date.getDate()}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Spanning Tasks */}
                                <div style={{ position: 'absolute', top: 36, left: 0, right: 0, bottom: 0, pointerEvents: 'none', overflowY: 'auto' }} className="custom-scrollbar">
                                    <div style={{ position: 'relative', minHeight: '100%' }}>
                                        {sortedTasks.map(task => {
                                            const activeStart = dragState?.taskId === task.id ? dragState!.currentStart : task._start;
                                            const activeEnd = dragState?.taskId === task.id ? dragState!.currentEnd : task._end;

                                            // Clamping visual start/end to current week
                                            const visualStart = activeStart < weekStart ? weekStart : activeStart;
                                            const visualEnd = activeEnd > weekEnd ? weekEnd : activeEnd;

                                            // Calculate grid positions
                                            const startCol = Math.round((visualStart.getTime() - weekStart.getTime()) / 86400000);
                                            const endCol = Math.round((visualEnd.getTime() - weekStart.getTime()) / 86400000);

                                            const colWidth = 100 / 7;
                                            const left = `${startCol * colWidth}%`;
                                            const width = `${((endCol - startCol) + 1) * colWidth}%`;
                                            const rowIdx = taskToSlot.get(task.id) || 0;

                                            const ROW_HEIGHT = 28;
                                            const top = rowIdx * ROW_HEIGHT + 4;

                                            const colors = STATUS_COLORS[task.status] || STATUS_COLORS.TODO;
                                            const canEdit = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;
                                            const isDraggingThis = dragState?.taskId === task.id;

                                            return (
                                                <div
                                                    key={task.id}
                                                    style={{
                                                        position: 'absolute',
                                                        left, width, top, height: ROW_HEIGHT - 4,
                                                        padding: '0 4px',
                                                        pointerEvents: 'auto',
                                                        zIndex: isDraggingThis ? 20 : 10
                                                    }}
                                                >
                                                    <div
                                                        onMouseDown={(e) => {
                                                            if (!canEdit) return;
                                                            if ((e.target as HTMLElement).classList.contains('resizer')) return; // handled by resizer
                                                            setDragState({
                                                                taskId: task.id, mode: 'move',
                                                                originalStart: task._start, originalEnd: task._end,
                                                                currentStart: task._start, currentEnd: task._end
                                                            });
                                                        }}
                                                        onClick={(e) => {
                                                            if (!dragState) onDetail(task);
                                                        }}
                                                        style={{
                                                            height: '100%',
                                                            background: colors.bg,
                                                            border: `1px solid ${colors.border}`,
                                                            borderRadius: 6,
                                                            display: 'flex', alignItems: 'center',
                                                            padding: '0 8px',
                                                            cursor: canEdit ? 'grab' : 'pointer',
                                                            color: colors.text,
                                                            fontSize: 12, fontWeight: 700,
                                                            borderLeft: `3px solid ${colors.text}`,
                                                            opacity: task.status === 'DONE' ? 0.6 : (isDraggingThis ? 0.8 : 1),
                                                            textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                                                            boxShadow: isDraggingThis ? '0 4px 12px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                                                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {/* Left Resizer */}
                                                        {canEdit && activeStart >= weekStart && (
                                                            <div
                                                                className="resizer"
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    setDragState({
                                                                        taskId: task.id, mode: 'resize-start',
                                                                        originalStart: task._start, originalEnd: task._end,
                                                                        currentStart: task._start, currentEnd: task._end
                                                                    });
                                                                }}
                                                                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }}
                                                            />
                                                        )}

                                                        <span style={{ pointerEvents: 'none' }}>{task.title}</span>

                                                        {/* Right Resizer */}
                                                        {canEdit && activeEnd <= weekEnd && (
                                                            <div
                                                                className="resizer"
                                                                onMouseDown={(e) => {
                                                                    e.stopPropagation();
                                                                    setDragState({
                                                                        taskId: task.id, mode: 'resize-end',
                                                                        originalStart: task._start, originalEnd: task._end,
                                                                        currentStart: task._start, currentEnd: task._end
                                                                    });
                                                                }}
                                                                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: 'ew-resize' }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); }
            `}</style>
        </div>
    );
}
