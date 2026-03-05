'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateSingleContentField, updateMultipleContentOrder } from '../../../lib/content-actions';
import { ChevronLeft, ChevronRight, Eye, EyeOff, LayoutTemplate, Hash, Menu, Type, Calendar, CheckSquare, Link as LinkIcon, AtSign, Phone, User } from 'lucide-react';
import { getBadgeColorObj } from '../../../lib/colors';

export default function CalendarView({
    contents,
    properties,
    userOptionsRaw,
    onOpenContent,
    viewSettings,
    currentUser,
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
    onOpenContent?: (id: string) => void;
    viewSettings?: any;
    currentUser?: any;
}) {
    const router = useRouter();
    // ── Persistent View Settings Data ──
    const layoutConfig = viewSettings?.layoutConfig ? JSON.parse(viewSettings.layoutConfig) : {};

    // Find all DATE properties to allow grouping
    const dateProps = properties.filter(p => p.type === 'DATE');

    const [activeDatePropId, setActiveDatePropId] = useState<string | null>(
        layoutConfig.datePropId || (dateProps.length > 0 ? dateProps[0].id : null)
    );

    // Sync state if viewSettings changes externally
    useEffect(() => {
        if (layoutConfig.datePropId) setActiveDatePropId(layoutConfig.datePropId);
    }, [viewSettings?.layoutConfig]);

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
    const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);

    // Property visibility from viewSettings
    const visiblePropIds: string[] = (() => {
        if (!viewSettings?.propertyVisibility) return properties.map(p => p.id);
        try { return JSON.parse(viewSettings.propertyVisibility); }
        catch { return properties.map(p => p.id); }
    })();

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    useEffect(() => {
        setLocalContents(contents);
    }, [contents]);

    function daysBetweenDates(a: Date, b: Date) {
        return Math.round((b.getTime() - a.getTime()) / 86400000);
    }

    // Format a JS Date object to 'YYYY-MM-DD' for comparison
    const formatDateStr = (d: Date | null) => {
        if (!d) return '';
        const yy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yy}-${mm}-${dd}`;
    };

    // Map contents to their respective dates using optimistic local data
    const contentByDateStr = useMemo(() => {
        const map: Record<string, any[]> = {};
        if (!activeDatePropId) return map;

        localContents.forEach(content => {
            const customData = content.customFields ? JSON.parse(content.customFields) : {};
            const dateVal = customData[activeDatePropId];

            if (dateVal) {
                const [sPart, ePart] = dateVal.includes(' → ') ? dateVal.split(' → ') : [dateVal, dateVal];
                const start = new Date(sPart);
                const end = new Date(ePart || sPart);

                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    let current = new Date(start);
                    // Iterate through each day in the range
                    while (current <= end) {
                        const dStr = formatDateStr(current);
                        if (!map[dStr]) map[dStr] = [];
                        map[dStr].push(content);

                        // Safety break for extremely long ranges (e.g. 1 year)
                        if (daysBetweenDates(start, current) > 365) break;
                        current.setDate(current.getDate() + 1);
                    }
                }
            }
        });

        // Sort items within each date by orderIdx
        Object.keys(map).forEach(date => {
            map[date].sort((a, b) => {
                const orderA = a.orderIdx || 0;
                const orderB = b.orderIdx || 0;
                return orderA - orderB;
            });
        });

        return map;
    }, [localContents, activeDatePropId]);

    const isToday = (d: Date | null) => {
        if (!d) return false;
        const today = new Date();
        return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    };

    const handleDrop = async (e: React.DragEvent, cellDateStr: string) => {
        e.preventDefault();
        setDragOverCellStr(null);
        setDragOverItemId(null);
        setDraggedItemId(null);
        if (!activeDatePropId) return;

        const contentId = e.dataTransfer.getData('text/plain');
        if (!contentId) return;

        // Get the list of items already in this cell
        const currentItems = [...(contentByDateStr[cellDateStr] || [])];

        // Remove the dragged item if it was already in this cell
        const filteredItems = currentItems.filter(item => item.id !== contentId);

        // Find the dragged item in global contents
        const draggedItem = localContents.find(c => c.id === contentId);
        if (!draggedItem) return;

        // Determine the insertion index
        let targetIndex = filteredItems.length;
        if (dragOverItemId) {
            targetIndex = filteredItems.findIndex(item => item.id === dragOverItemId);
            if (targetIndex === -1) targetIndex = filteredItems.length;
        }

        // Insert at the target position
        const newItemsInCell = [...filteredItems];
        newItemsInCell.splice(targetIndex, 0, { ...draggedItem });

        // Create a flat list of updates for the entire cell
        const updates = newItemsInCell.map((item, idx) => ({
            id: item.id,
            orderIdx: idx,
            date: cellDateStr
        }));

        // Optimistically update the UI
        setLocalContents(prev => {
            return prev.map(c => {
                const update = updates.find(u => u.id === c.id);
                if (update) {
                    const custom = c.customFields ? JSON.parse(c.customFields) : {};
                    custom[activeDatePropId] = update.date;
                    return { ...c, customFields: JSON.stringify(custom), orderIdx: update.orderIdx };
                }
                return c;
            });
        });

        try {
            await updateSingleContentField(contentId, activeDatePropId, cellDateStr);
            await updateMultipleContentOrder(updates.map(u => ({ id: u.id, orderIdx: u.orderIdx })));
        } catch (error) {
            console.error("Failed to update ordering", error);
            setLocalContents(contents);
        }
    };

    return (
        <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>

            {/* Calendar Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={prevMonth} className="icon-btn" style={btnStyle}><ChevronLeft size={16} /></button>
                        <button onClick={nextMonth} className="icon-btn" style={btnStyle}><ChevronRight size={16} /></button>
                        <button onClick={goToToday} style={{ ...btnStyle, marginLeft: 4, padding: '4px 12px', fontSize: 13 }}>Today</button>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{monthNames[month]} {year}</h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Controls moved to unified settings menu */}
                </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', borderBottom: '1px solid var(--border-color)' }}>
                {daysOfWeek.map((day, i) => (
                    <div key={day} style={{ padding: '8px', textAlign: 'center', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gridTemplateRows: 'repeat(6, minmax(130px, 1fr))' }}>
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
                                background: isDragOver ? 'linear-gradient(135deg, rgba(46, 170, 220, 0.1), rgba(46, 170, 220, 0.02))' : (cell.isCurrentMonth ? 'transparent' : 'rgba(0,0,0,0.02)'),
                                opacity: cell.isCurrentMonth ? 1 : 0.4,
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                boxShadow: isDragOver ? 'inset 0 0 0 2px var(--accent-color), inset 0 0 30px rgba(46, 170, 220, 0.15)' : 'none',
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
                                fontWeight: (todayFlag || isDragOver) ? 600 : 400,
                                background: todayFlag ? 'var(--text-primary)' : (isDragOver ? 'var(--accent-color)' : 'transparent'),
                                color: (todayFlag || isDragOver) ? 'var(--bg-color)' : 'var(--text-primary)',
                                marginBottom: 4,
                                alignSelf: 'flex-start',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: isDragOver ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
                                boxShadow: isDragOver ? '0 4px 12px rgba(46, 170, 220, 0.3)' : 'none'
                            }}>
                                {cell.dayNumber}
                            </div>

                            {/* Event Badges */}
                            <div className="no-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                                                setDragOverItemId(null);
                                            }}
                                            onDragOver={(e) => {
                                                e.preventDefault();
                                                if (draggedItemId && draggedItemId !== item.id && dragOverItemId !== item.id) {
                                                    setDragOverItemId(item.id);
                                                }
                                            }}
                                            onDragLeave={(e) => {
                                                // Only clear if we are leaving to an element outside our current card
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                if (e.clientX < rect.left || e.clientX >= rect.right || e.clientY < rect.top || e.clientY >= rect.bottom) {
                                                    if (dragOverItemId === item.id) setDragOverItemId(null);
                                                }
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: item.colorMatch ? `${item.colorMatch}1a` : 'var(--sidebar-bg)',
                                                borderRadius: 6,
                                                fontSize: 12,
                                                fontWeight: 600,
                                                cursor: isDragging ? 'grabbing' : 'grab',
                                                border: item.colorMatch ? `1px solid ${item.colorMatch}` : '1px solid var(--border-color)',
                                                borderLeft: item.colorMatch ? `4px solid ${item.colorMatch}` : '4px solid var(--accent-color)',
                                                transition: 'all 0.15s ease',
                                                opacity: isDragging ? 0.4 : 1,
                                                transform: isDragging ? 'scale(0.95)' : 'scale(1)',
                                                boxShadow: isDragging ? 'none' : (dragOverItemId === item.id ? `0 -2px 0 0 var(--accent-color)` : '0 1px 2px rgba(0,0,0,0.03)'),
                                                filter: isDragging ? 'grayscale(100%)' : 'none',
                                                position: 'relative',
                                                overflow: 'hidden'
                                            }}
                                            onClick={() => onOpenContent ? onOpenContent(item.id) : router.push(`/content/${item.id}`)}
                                            title={item.title}
                                            onMouseEnter={(e) => {
                                                if (!isDragging) {
                                                    e.currentTarget.style.transform = 'scale(1.02)';
                                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                                                    e.currentTarget.style.position = 'relative';
                                                    e.currentTarget.style.zIndex = '50';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isDragging) {
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                                                    e.currentTarget.style.position = '';
                                                    e.currentTarget.style.zIndex = '';
                                                }
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {item.title}
                                            </div>

                                            {visiblePropIds.length > 0 && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 2 }}>
                                                    {visiblePropIds.map(propId => {
                                                        const customFields = item.customFields ? JSON.parse(item.customFields) : {};
                                                        const propVal = customFields[propId];
                                                        if (!propVal || (Array.isArray(propVal) && propVal.length === 0)) return null;

                                                        const propDef = properties.find(p => p.id === propId);
                                                        if (!propDef) return null;

                                                        let renderedVal: React.ReactNode = propVal;

                                                        if (propDef.type === 'PERSON') {
                                                            const users = (() => { try { return JSON.parse(userOptionsRaw) } catch { return [] } })();
                                                            const u = users.find((u: any) => u.id === propVal);
                                                            renderedVal = u ? u.name : 'Unknown';
                                                        } else if (propDef.type === 'SELECT') {
                                                            // Compact colored pill for select
                                                            const colorCfg = propDef.colorConfig ? JSON.parse(propDef.colorConfig) : {};
                                                            const clr = getBadgeColorObj(String(propVal), colorCfg);
                                                            return <div key={propId} style={{
                                                                display: 'inline-flex', alignSelf: 'flex-start', padding: '2px 6px',
                                                                background: clr.bg, border: `1px solid ${clr.bg}`, borderRadius: 4,
                                                                fontSize: 10, fontWeight: 500, color: clr.text
                                                            }}>{propVal}</div>;
                                                        } else if (propDef.type === 'MULTI_SELECT') {
                                                            const itemsArr = Array.isArray(propVal) ? propVal : String(propVal).split(',').map(s => s.trim());
                                                            const colorCfg = propDef.colorConfig ? JSON.parse(propDef.colorConfig) : {};
                                                            return (
                                                                <div key={propId} style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                                                    {itemsArr.map((v: string, i: number) => {
                                                                        const clr = getBadgeColorObj(v, colorCfg);
                                                                        return (
                                                                            <div key={i} style={{
                                                                                padding: '2px 6px', background: clr.bg, borderRadius: 4,
                                                                                fontSize: 10, fontWeight: 500, color: clr.text
                                                                            }}>{v}</div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        }

                                                        return (
                                                            <div key={propId} style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                                <span style={{ opacity: 0.6, display: 'flex' }}>{getTypeIcon(propDef.type)}</span>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{String(renderedVal)}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
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

function getTypeIcon(type: string) {
    const props = { size: 12, strokeWidth: 2.5 };
    switch (type) {
        case 'TEXT': return <Type {...props} />;
        case 'NUMBER': return <Hash {...props} />;
        case 'SELECT': return <Menu {...props} />;
        case 'MULTI_SELECT': return <LayoutTemplate {...props} />;
        case 'DATE': return <Calendar {...props} />;
        case 'CHECKBOX': return <CheckSquare {...props} />;
        case 'URL': return <LinkIcon {...props} />;
        case 'EMAIL': return <AtSign {...props} />;
        case 'PHONE': return <Phone {...props} />;
        case 'PERSON': return <User {...props} />;
        default: return <Type {...props} />;
    }
}
