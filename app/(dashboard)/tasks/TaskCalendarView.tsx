'use client';

import { useState, useMemo, useEffect, useRef, useTransition } from 'react';
import { updateTaskDueDate } from '../../../lib/task-actions';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';

/* ── Date helpers ─────────────────────────────────────────── */
const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

export default function TaskCalendarView({
    tasks: initialTasks,
    currentUser,
    onDetail,
    onNewTaskWithDate
}: {
    tasks: any[];
    currentUser: any;
    onDetail: (task: any) => void;
    onNewTaskWithDate?: (dateStr: string) => void;
}) {
    // Current month view state
    const [baseDate, setBaseDate] = useState(() => startOfDay(new Date()));
    const [tasks, setTasks] = useState(initialTasks);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // Compute month grid days
    const days = useMemo(() => {
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const startDay = start.getDay(); // 0 = Sunday
        const prevMonthDays = startDay === 0 ? 6 : startDay - 1; // Start on Monday

        const gridStart = new Date(year, month, 1 - prevMonthDays);
        const nextMonthDays = 42 - (prevMonthDays + end.getDate()); // Always show 6 weeks (42 days)

        const daysArr = [];
        for (let i = 0; i < 42; i++) {
            daysArr.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
        }
        return daysArr;
    }, [baseDate]);

    // Map tasks to their due dates
    const tasksByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        tasks.forEach(t => {
            if (!t.dueDate) return;
            const key = fmt(new Date(t.dueDate));
            if (!map[key]) map[key] = [];
            map[key].push(t);
        });
        return map;
    }, [tasks]);

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        setTimeout(() => {
            const el = document.getElementById(`calendar-task-${taskId}`);
            if (el) el.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, taskId: string) => {
        const el = document.getElementById(`calendar-task-${taskId}`);
        if (el) el.style.opacity = '1';
    };

    const handleDrop = (e: React.DragEvent, dateStr: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const newDate = new Date(dateStr);
        // Optimistic UI update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, dueDate: newDate } : t));

        startTransition(async () => {
            try {
                await updateTaskDueDate(taskId, newDate);
            } catch (err: any) {
                setTasks(initialTasks);
                alert(err.message || 'Failed to update due date');
            }
        });
    };

    return (
        <div style={{
            display: 'flex', flexDirection: 'column', height: '100%',
            background: 'var(--bg-color)', border: '1px solid var(--border-color)',
            borderRadius: 16, overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                background: 'rgba(55,53,47,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', padding: 4, background: 'var(--sidebar-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            style={{ padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => setBaseDate(startOfDay(new Date()))}
                            style={{ padding: '6px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setBaseDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            style={{ padding: '6px 10px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {baseDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </span>
                </div>
            </div>

            {/* Grid */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--border-color)', gap: 1 }}>
                {/* Days of week header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: 'var(--bg-color)' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} style={{ padding: '10px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', borderRight: '1px solid var(--border-color)' }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div style={{
                    flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                    gridTemplateRows: `repeat(${days.length / 7}, 1fr)`,
                    backgroundColor: 'var(--border-color)', gap: 1
                }}>
                    {days.map((date, idx) => {
                        const dateStr = fmt(date);
                        const isCurrentMonth = date.getMonth() === baseDate.getMonth();
                        const isToday = dateStr === fmt(new Date());
                        const dayTasks = tasksByDate[dateStr] || [];

                        return (
                            <div
                                key={dateStr}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => handleDrop(e, dateStr)}
                                style={{
                                    backgroundColor: isCurrentMonth ? 'var(--bg-color)' : 'rgba(55,53,47,0.015)',
                                    padding: '8px',
                                    display: 'flex', flexDirection: 'column',
                                    gap: 6, minHeight: 0, overflow: 'hidden', position: 'relative'
                                }}
                                className="calendar-cell"
                            >
                                <style>{`.calendar-cell:hover .add-btn { opacity: 1 !important; }`}</style>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 12, fontWeight: isToday ? 800 : 500,
                                        color: isToday ? '#fff' : (isCurrentMonth ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                        background: isToday ? '#007aff' : 'transparent',
                                        width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: '50%', opacity: isToday ? 1 : (isCurrentMonth ? 1 : 0.6)
                                    }}>
                                        {date.getDate()}
                                    </span>

                                    {onNewTaskWithDate && (
                                        <button
                                            className="add-btn"
                                            onClick={() => onNewTaskWithDate(dateStr)}
                                            style={{
                                                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                                cursor: 'pointer', opacity: 0, transition: 'opacity 0.2s', padding: 4
                                            }}
                                            title="Add task on this date"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>

                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, paddingRight: 4 }}>
                                    {dayTasks.map(task => {
                                        const canEdit = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;
                                        const isOverdue = new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'DONE';

                                        return (
                                            <div
                                                key={task.id}
                                                id={`calendar-task-${task.id}`}
                                                draggable={canEdit}
                                                onDragStart={(e) => canEdit && handleDragStart(e, task.id)}
                                                onDragEnd={(e) => canEdit && handleDragEnd(e, task.id)}
                                                onClick={() => onDetail(task)}
                                                style={{
                                                    fontSize: 11, fontWeight: 600, padding: '4px 8px',
                                                    background: task.status === 'DONE' ? 'rgba(46, 204, 113, 0.15)' : (isOverdue ? 'rgba(255, 77, 79, 0.1)' : 'var(--sidebar-bg)'),
                                                    color: task.status === 'DONE' ? '#27ae60' : (isOverdue ? '#ff4d4f' : 'var(--text-primary)'),
                                                    borderRadius: 6, border: `1px solid ${task.status === 'DONE' ? 'rgba(46, 204, 113, 0.3)' : (isOverdue ? 'rgba(255, 77, 79, 0.3)' : 'var(--border-color)')}`,
                                                    cursor: canEdit ? 'pointer' : 'default',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                                                    textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                                                    opacity: task.status === 'DONE' ? 0.7 : 1
                                                }}
                                                title={task.title}
                                            >
                                                {task.title}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
