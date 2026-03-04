'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateSingleContentField } from '../../../lib/content-actions';

export default function CalendarView({
    contents,
    properties,
    userOptionsRaw
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    const router = useRouter();
    // Find all DATE properties to allow grouping
    const dateProps = properties.filter(p => p.type === 'DATE');

    const [activeDatePropId, setActiveDatePropId] = useState<string | null>(
        dateProps.length > 0 ? dateProps[0].id : null
    );

    const [currentDate, setCurrentDate] = useState(new Date());

    if (dateProps.length === 0) {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                No Date properties available for Calendar View.
                <br />
                <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>Create a property of type DATE in Team Settings first.</span>
            </div>
        );
    }

    // Month Navigation
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Calendar logic
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0-6 (Sun-Sat)

    // Generate grid cells (42 cells to ensure 6 rows are typically covered)
    const calendarCells = useMemo(() => {
        const cells: { date: Date | null, isCurrentMonth: boolean, dayNumber: number }[] = [];

        // Previous month padding
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            cells.push({
                date: new Date(year, month - 1, prevMonthDays - i),
                isCurrentMonth: false,
                dayNumber: prevMonthDays - i
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            cells.push({
                date: new Date(year, month, i),
                isCurrentMonth: true,
                dayNumber: i
            });
        }

        // Next month padding to complete the grid (usually up to 35 or 42 cells)
        const remainingCells = 42 - cells.length;
        for (let i = 1; i <= remainingCells; i++) {
            cells.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false,
                dayNumber: i
            });
        }

        return cells;
    }, [year, month, daysInMonth, firstDayOfMonth]);

    // Local state for optimistic updates and drag styling
    const [localContents, setLocalContents] = useState(contents);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverCellStr, setDragOverCellStr] = useState<string | null>(null);

    useEffect(() => {
        setLocalContents(contents);
    }, [contents]);

    // Map contents to their respective dates using optimistic local data
    const contentByDateStr = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (!activeDatePropId) return map;

        localContents.forEach(content => {
            const customData = content.customFields ? JSON.parse(content.customFields) : {};
            const dateVal = customData[activeDatePropId]; // typically 'YYYY-MM-DD'

            if (dateVal) {
                // We assume dateVal is ISO format like "2026-10-14"
                if (!map[dateVal]) map[dateVal] = [];
                map[dateVal].push(content);
            }
        });
        return map;
    }, [localContents, activeDatePropId]);

    // Format a JS Date object to 'YYYY-MM-DD' for comparison
    const formatDateStr = (d: Date | null) => {
        if (!d) return '';
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    };

    const isToday = (d: Date | null) => {
        if (!d) return false;
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    const handleDrop = async (e: React.DragEvent, cellDateStr: string) => {
        e.preventDefault();
        setDragOverCellStr(null);
        if (!activeDatePropId) return;

        const contentId = e.dataTransfer.getData('text/plain');
        if (!contentId) return;

        // Optimistically update the UI instantly
        setLocalContents(prev => prev.map(c => {
            if (c.id === contentId) {
                const custom = c.customFields ? JSON.parse(c.customFields) : {};
                custom[activeDatePropId] = cellDateStr;
                return { ...c, customFields: JSON.stringify(custom) };
            }
            return c;
        }));

        try {
            await updateSingleContentField(contentId, activeDatePropId, cellDateStr);
        } catch (error) {
            console.error("Failed to update date", error);
            // Revert on error by syncing with server props
            setLocalContents(contents);
        }
    };

    return (
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

            {/* Calendar Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={prevMonth} className="icon-btn" style={btnStyle}>◀</button>
                        <button onClick={nextMonth} className="icon-btn" style={btnStyle}>▶</button>
                        <button onClick={goToToday} style={{ ...btnStyle, marginLeft: 4, padding: '4px 12px', fontSize: 13 }}>Today</button>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{monthNames[month]} {year}</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Show by Date:</span>
                    <select
                        value={activeDatePropId || ''}
                        onChange={(e) => setActiveDatePropId(e.target.value)}
                        style={{
                            padding: '6px 10px',
                            border: '1px solid var(--border-color)',
                            borderRadius: 6,
                            background: 'var(--bg-color)',
                            color: 'var(--text-primary)',
                            fontSize: 13,
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {dateProps.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)' }}>
                {daysOfWeek.map((day, i) => (
                    <div key={day} style={{ padding: '8px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: 'repeat(6, minmax(130px, 1fr))' }}>
                {calendarCells.map((cell, index) => {
                    const dateStr = formatDateStr(cell.date);
                    const items = contentByDateStr[dateStr] || [];
                    const todayFlag = isToday(cell.date);
                    const isDragOver = dragOverCellStr === dateStr;

                    return (
                        <div
                            key={`${cell.date?.getTime()}-${index}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (dragOverCellStr !== dateStr) setDragOverCellStr(dateStr);
                            }}
                            onDragLeave={(e) => {
                                if (dragOverCellStr === dateStr) setDragOverCellStr(null);
                            }}
                            onDrop={(e) => {
                                handleDrop(e, dateStr);
                            }}
                            style={{
                                borderRight: (index + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                                borderBottom: index < 35 ? '1px solid var(--border-color)' : 'none',
                                padding: 8,
                                background: isDragOver ? 'rgba(0, 120, 255, 0.05)' : (cell.isCurrentMonth ? 'transparent' : 'rgba(0,0,0,0.02)'),
                                opacity: cell.isCurrentMonth ? 1 : 0.4,
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                transition: 'background 0.2s, box-shadow 0.2s',
                                boxShadow: isDragOver ? 'inset 0 0 0 2px rgba(0, 120, 255, 0.4)' : 'none',
                                zIndex: isDragOver ? 10 : 1
                            }}
                        >
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                fontSize: 13,
                                fontWeight: todayFlag ? 600 : 400,
                                background: todayFlag ? 'var(--text-primary)' : 'transparent',
                                color: todayFlag ? 'var(--bg-color)' : 'var(--text-primary)',
                                marginBottom: 4,
                                alignSelf: 'flex-start'
                            }}>
                                {cell.dayNumber}
                            </div>

                            {/* Event Badges */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: '100%' }}>
                                {items.map(item => {
                                    const isDragging = draggedItemId === item.id;
                                    return (
                                        <div
                                            key={item.id}
                                            draggable
                                            onDragStart={(e) => {
                                                e.dataTransfer.setData('text/plain', item.id);
                                                e.dataTransfer.effectAllowed = 'move';

                                                // Slight delay to allow the drag image to be generated before reducing opacity
                                                setTimeout(() => setDraggedItemId(item.id), 0);
                                            }}
                                            onDragEnd={() => {
                                                setDraggedItemId(null);
                                                setDragOverCellStr(null);
                                            }}
                                            style={{
                                                padding: '4px 6px',
                                                borderRadius: 4,
                                                background: `hsla(${hashString(item.title) % 360}, 70%, 50%, 0.1)`,
                                                borderLeft: `3px solid hsl(${hashString(item.title) % 360}, 70%, 50%)`,
                                                fontSize: 11,
                                                fontWeight: 500,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                cursor: 'pointer',
                                                transition: 'transform 0.1s, opacity 0.2s',
                                                opacity: isDragging ? 0.3 : 1,
                                                transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                                                boxShadow: isDragging ? 'none' : '0 1px 2px rgba(0,0,0,0.05)'
                                            }}
                                            onClick={() => router.push(`/content/${item.id}`)}
                                            title={item.title}
                                            onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.transform = 'scale(1.02)'; }}
                                            onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.transform = 'scale(1)'; }}
                                        >
                                            {item.title}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
};

// Simple hash for deterministic badge colors
function hashString(str: string) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}
