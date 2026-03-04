'use client';

import { useState, useMemo, useEffect } from 'react';

const STATUS_COLORS: Record<string, string> = {
    'TODO': '#ff4d4f',
    'IN_PROGRESS': '#1890ff',
    'REVIEW': '#faad14',
    'DONE': '#27ae60',
};

export default function TasksCalendarView({
    tasks,
    onEditTask
}: {
    tasks: any[];
    onEditTask: (task: any) => void;
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    const calendarCells = useMemo(() => {
        const cells: { date: Date | null, isCurrentMonth: boolean, dayNumber: number }[] = [];
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            cells.push({ date: new Date(year, month - 1, prevMonthDays - i), isCurrentMonth: false, dayNumber: prevMonthDays - i });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({ date: new Date(year, month, i), isCurrentMonth: true, dayNumber: i });
        }
        const remainingCells = 42 - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false, dayNumber: i });
        }
        return cells;
    }, [year, month, daysInMonth, firstDayOfMonth]);

    const tasksByDate = useMemo(() => {
        const map: Record<string, any[]> = {};
        tasks.forEach(t => {
            if (t.dueDate) {
                const d = new Date(t.dueDate);
                const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!map[dateStr]) map[dateStr] = [];
                map[dateStr].push(t);
            }
        });
        return map;
    }, [tasks]);

    const isToday = (d: Date) => {
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    return (
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={prevMonth} style={btnStyle}>◀</button>
                        <button onClick={nextMonth} style={btnStyle}>▶</button>
                        <button onClick={goToToday} style={{ ...btnStyle, marginLeft: 4, padding: '4px 12px', fontSize: 13 }}>Today</button>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{monthNames[month]} {year}</h2>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
                {daysOfWeek.map((day, i) => (
                    <div key={day} style={{ padding: '8px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none' }}>
                        {day}
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(120px, 1fr))' }}>
                {calendarCells.map((cell, index) => {
                    const dateStr = `${cell.date!.getFullYear()}-${String(cell.date!.getMonth() + 1).padStart(2, '0')}-${String(cell.date!.getDate()).padStart(2, '0')}`;
                    const dayTasks = tasksByDate[dateStr] || [];
                    const todayFlag = isToday(cell.date!);

                    return (
                        <div
                            key={index}
                            style={{
                                borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                                borderBottom: index < 35 ? '1px solid var(--border-color)' : 'none',
                                padding: 8,
                                background: cell.isCurrentMonth ? 'transparent' : 'rgba(0,0,0,0.02)',
                                opacity: cell.isCurrentMonth ? 1 : 0.4,
                                minHeight: 120,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4
                            }}
                        >
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 12,
                                fontWeight: todayFlag ? 700 : 400,
                                background: todayFlag ? 'var(--accent-color)' : 'transparent',
                                color: todayFlag ? '#fff' : 'var(--text-primary)',
                                marginBottom: 4
                            }}>
                                {cell.dayNumber}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', maxHeight: 80 }}>
                                {dayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => onEditTask(task)}
                                        style={{
                                            padding: '3px 6px',
                                            borderRadius: 4,
                                            background: `${STATUS_COLORS[task.status]}15`,
                                            borderLeft: `3px solid ${STATUS_COLORS[task.status]}`,
                                            fontSize: 10,
                                            fontWeight: 500,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            cursor: 'pointer'
                                        }}
                                        title={task.title}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const btnStyle = {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    fontSize: 12,
};
