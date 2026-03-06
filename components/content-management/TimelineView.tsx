'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronRight, Calendar, GripVertical } from 'lucide-react';
import { getBadgeColorObj } from '../../lib/colors';
import { updateSingleContentField } from '../../lib/content-actions';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
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

function daysBetween(a: Date, b: Date) { return Math.round((b.getTime() - a.getTime()) / 86_400_000); }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline Header
// ──────────────────────────────────────────────────────────────────────────────
function TimelineHeader({ topRowItems, bottomRowItems, zoom, leftPanelWidth }: {
    topRowItems: { label: string; left: number; width: number }[];
    bottomRowItems: { label: string; left: number; width: number; isToday?: boolean; isWeekend?: boolean }[];
    zoom: ZoomLevel; leftPanelWidth: number;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, zIndex: 30, background: 'var(--bg-color)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border-color)' }}>
            {/* Top row */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', height: 40, background: 'var(--glass-bg)', backdropFilter: 'blur(12px)' }}>
                <div style={{ width: leftPanelWidth, flexShrink: 0, borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', paddingLeft: 16, position: 'sticky', left: 0, background: 'var(--bg-color)', zIndex: 31 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Project Items</span>
                </div>
                <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', flex: 1 }}>
                    {topRowItems.map((m, idx) => (
                        <div key={idx} style={{
                            position: 'absolute', left: m.left, width: m.width, height: '100%',
                            display: 'flex', alignItems: 'center', padding: '0 8px', borderRight: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: 'flex', borderBottom: '2px solid var(--border-color)', height: 28, background: 'var(--sidebar-bg)' }}>
                <div style={{ width: leftPanelWidth, flexShrink: 0, borderRight: '1px solid var(--border-color)', position: 'sticky', left: 0, background: 'var(--sidebar-bg)', zIndex: 31 }} />
                <div style={{ display: 'flex', position: 'relative', overflow: 'hidden', flex: 1 }}>
                    {bottomRowItems.map((b, idx) => (
                        <div key={idx} style={{
                            position: 'absolute', left: b.left, width: b.width, height: '100%',
                            borderRight: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {b.isToday && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,122,255,0.08)' }} />}
                            <span style={{
                                fontSize: zoom === 'hours' || zoom === 'day' ? 11 : 9,
                                fontWeight: b.isToday ? 700 : 400,
                                color: b.isToday ? '#007aff' : b.isWeekend ? 'var(--text-secondary)' : 'var(--text-secondary)'
                            }}>
                                {b.label}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────────

export default function TimelineView({
    contents,
    properties,
    userOptionsRaw,
    onOpenContent,
    colorConfigMap,
    viewSettings,
    currentUser,
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
    onOpenContent?: (id: string) => void;
    colorConfigMap?: Record<string, string | null>;
    viewSettings?: any;
    currentUser?: any;
}) {
    const router = useRouter();
    // ── Persistent View Settings Data ──
    const layoutConfig = viewSettings?.layoutConfig ? JSON.parse(viewSettings.layoutConfig) : {};
    const defaultZoom = (layoutConfig.zoom as ZoomLevel) || 'week';
    const dateProps = useMemo(() => properties.filter(p => p.type === 'DATE'), [properties]);

    const [zoom, setZoom] = useState<ZoomLevel>(defaultZoom);

    // Grouping and Date property from viewSettings
    const groupPropId = viewSettings?.groupBy || null;
    const datePropId = layoutConfig.datePropId || dateProps[0]?.id || null;

    // Zoom sync
    useEffect(() => {
        if (layoutConfig.zoom) setZoom(layoutConfig.zoom);
    }, [viewSettings?.layoutConfig]);

    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [localContents, setLocalContents] = useState(contents);

    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [dragOverDayOffset, setDragOverDayOffset] = useState<number | null>(null);

    const [resizingItemId, setResizingItemId] = useState<string | null>(null);
    const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);

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
        const top: { label: string; left: number; width: number }[] = [];
        const bottom: { label: string; left: number; width: number; isToday?: boolean; isWeekend?: boolean }[] = [];

        if (zoom === 'hours') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(startDate, i);
                top.push({ label: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), left: i * colW, width: colW });
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

        if (zoom === 'hours') {
            for (let i = 0; i < totalDays; i++) {
                const d = addDays(startDate, i);
                const isToday = isSameDay(d, new Date());
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                for (let h = 0; h < 24; h += 3) {
                    bottom.push({
                        label: `${String(h).padStart(2, '0')}:00`,
                        left: i * colW + (h / 24) * colW,
                        width: colW / 8,
                        isToday,
                        isWeekend
                    });
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
                const isToday = isSameDay(d, new Date());
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                let showLabel = false;
                if (zoom === 'day') showLabel = true;
                else if (zoom === 'week') showLabel = (d.getDay() === 1 || d.getDate() === 1);
                else if (zoom === 'bi-week') showLabel = (d.getDay() === 1);
                bottom.push({ label: showLabel ? String(d.getDate()) : '', left: i * colW, width: colW, isToday, isWeekend });
            }
        }

        return { topRowItems: top, bottomRowItems: bottom };
    }, [startDate, zoom, colW, totalDays]);

    const handleZoomChange = (newZoom: ZoomLevel) => {
        const d = new Date(startDateStr);
        const t = new Date();
        const curOffset = daysBetween(d, t);
        const newTotal = ZOOM_CONFIG[newZoom].totalDays;

        if (curOffset < 0 || curOffset > newTotal * 0.8) {
            const newStart = new Date(t);
            newStart.setDate(t.getDate() - Math.floor(newTotal / 4));
            setStartDateStr(newStart.toISOString().slice(0, 10));
        }
        setZoom(newZoom);
    };


    // Sync local contents when prop changes, but only if not resizing to avoid jank
    useEffect(() => {
        if (!resizingItemId) {
            setLocalContents(contents);
        }
    }, [contents, resizingItemId]);

    // Resolved Date Property
    const usingFallbackDate = dateProps.length === 0;

    // Grouping Options
    const groupableProps = properties.filter(p => ['SELECT', 'STATUS', 'MULTI_SELECT', 'PERSON'].includes(p.type));

    // Build grouped items
    const grouped = useMemo(() => {
        const groups: { key: string; label: string; color: { bg: string; text: string }; items: any[] }[] = [];

        const filteredContents = localContents.filter(c => {
            if (!datePropId) {
                return usingFallbackDate && c.createdAt;
            }
            const cd = JSON.parse(c.customFields || '{}');
            return !!cd[datePropId];
        });

        if (!groupPropId) {
            groups.push({ key: '__all', label: 'All Content', color: { bg: '#e0e7ff', text: '#3730a3' }, items: filteredContents });
        } else {
            const prop = properties.find(p => p.id === groupPropId);
            const isMulti = prop?.type === 'MULTI_SELECT' || prop?.type === 'PERSON';
            const optionsRaw = prop?.options ? JSON.parse(prop.options) : (prop?.type === 'PERSON' ? JSON.parse(userOptionsRaw) : []);
            const options: string[] = optionsRaw.map((opt: any) => typeof opt === 'string' ? opt : opt.name || opt.label);
            const colorConfig: Record<string, string> = prop?.colorConfig ? JSON.parse(prop.colorConfig) : {};

            const buckets: Record<string, any[]> = { Uncategorized: [] };
            options.forEach(o => (buckets[o] = []));

            filteredContents.forEach(c => {
                const cd = c.customFields ? JSON.parse(c.customFields) : {};
                const val = cd[groupPropId];

                if (isMulti) {
                    const itemsArr = Array.isArray(val) ? val : (typeof val === 'string' && val.trim() ? val.split(',').map(s => s.trim()) : []);
                    const validItems = itemsArr.filter((v: string) => buckets[v]);
                    if (validItems.length > 0) {
                        validItems.forEach((v: string) => {
                            buckets[v].push(c);
                        });
                    } else {
                        buckets['Uncategorized'].push(c);
                    }
                } else {
                    if (val && buckets[val]) buckets[val].push(c);
                    else buckets['Uncategorized'].push(c);
                }
            });

            [...options, 'Uncategorized'].forEach(opt => {
                if (opt === 'Uncategorized' && buckets[opt].length === 0) return;
                const colorObj = getBadgeColorObj(opt, colorConfig);
                groups.push({ key: opt, label: opt, color: colorObj, items: buckets[opt] });
            });
        }
        return groups;
    }, [localContents, groupPropId, properties]);

    // ── Resizing Logic ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!resizingItemId || !resizingSide || !datePropId) return;

        const getDateAtPoint = (x: number) => {
            const rect = gridRef.current?.getBoundingClientRect();
            if (!rect) return null;
            const offset = Math.floor((x - rect.left) / colW);
            return addDays(startDate, offset);
        };

        const canEditItem = (item: any) => {
            if (currentUser?.role === 'ADMIN') return true;
            if (item.authorId === currentUser?.id) return true;

            const customFields = (() => { try { return JSON.parse(item.customFields || '{}'); } catch { return {}; } })();
            const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
            return personFields.some(id => {
                const val = customFields[id];
                if (!val) return false;
                return String(val).split(',').map(s => s.trim()).includes(currentUser?.id);
            });
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!gridRef.current) return;
            const rect = gridRef.current.getBoundingClientRect();
            const LEFT_PANEL = 280;
            const x = e.clientX - rect.left - LEFT_PANEL + gridRef.current.scrollLeft;
            const dayOffset = Math.floor(x / colW);

            setLocalContents(prev => prev.map(c => {
                if (c.id === resizingItemId) {
                    const cd = JSON.parse(c.customFields || '{}');
                    const val = cd[datePropId] || '';
                    const [sPart, ePart] = val.includes(' → ') ? val.split(' → ') : [val, val];

                    let newS = sPart;
                    let newE = ePart || sPart;

                    const targetDateStr = addDays(startDate, dayOffset).toISOString().slice(0, 10);

                    if (resizingSide === 'left') {
                        newS = targetDateStr;
                        // Clamp: Start can't be after end
                        if (newE && newS > newE) newS = newE;
                    } else if (resizingSide === 'right') {
                        newE = targetDateStr;
                        // Clamp: End can't be before start
                        if (newS && newE < newS) newE = newS;
                    }

                    const newVal = newS === newE ? newS : `${newS} → ${newE}`;
                    return { ...c, customFields: JSON.stringify({ ...cd, [datePropId]: newVal }) };
                }
                return c;
            }));
        };

        const handleMouseUp = async () => {
            const item = localContents.find(c => c.id === resizingItemId);
            if (item) {
                const cd = JSON.parse(item.customFields || '{}');
                const newVal = cd[datePropId];
                try {
                    await updateSingleContentField(resizingItemId, datePropId, newVal);
                } catch (err) {
                    console.error("Resize update failed", err);
                    setLocalContents(contents);
                }
            }
            setResizingItemId(null);
            setResizingSide(null);
            document.body.style.cursor = '';
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
        };
    }, [resizingItemId, resizingSide, colW, startDate, datePropId, localContents, contents, currentUser, properties]);

    const handleGridDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        if (!draggedItemId || dragOverDayOffset === null || !datePropId) return;

        const contentId = draggedItemId;
        const item = localContents.find(c => c.id === contentId);
        if (!item) return;

        const cd = JSON.parse(item.customFields || '{}');
        const val = cd[datePropId] || '';
        const [sPart, ePart] = val.includes(' → ') ? val.split(' → ') : [val, val];

        const sDate = sPart ? new Date(sPart) : new Date();
        const eDate = ePart ? new Date(ePart) : sDate;
        const duration = daysBetween(sDate, eDate);

        const newS = addDays(startDate, dragOverDayOffset);
        const newE = addDays(newS, duration);

        const newSStr = newS.toISOString().slice(0, 10);
        const newEStr = newE.toISOString().slice(0, 10);
        const newVal = newSStr === newEStr ? newSStr : `${newSStr} → ${newEStr}`;

        // Optimistic update
        setLocalContents(prev => prev.map(c => {
            if (c.id === contentId) {
                return { ...c, customFields: JSON.stringify({ ...JSON.parse(c.customFields || '{}'), [datePropId]: newVal }) };
            }
            return c;
        }));

        try {
            await updateSingleContentField(contentId, datePropId, newVal);
            setDraggedItemId(null);
            setDragOverDayOffset(null);
        } catch (error) {
            console.error("Timeline drop failed:", error);
            setLocalContents(contents);
        }
    };

    const exactDaysFromStart = (new Date().getTime() - startDate.getTime()) / 86400000;

    // Scroll to today on mount
    const hasScrolledRef = useRef(false);
    useEffect(() => {
        if (gridRef.current && !hasScrolledRef.current && exactDaysFromStart > 0) {
            gridRef.current.scrollLeft = exactDaysFromStart * colW - 200;
            hasScrolledRef.current = true;
        }
    }, [exactDaysFromStart, colW]);

    const navigate = (dir: -1 | 1) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + dir * Math.round(totalDays / 3));
        setStartDateStr(d.toISOString().slice(0, 10));
    };

    const LEFT_PANEL = 280;
    const HEADER_HEIGHT = 68; // 40 + 28
    const ROW_HEIGHT = 48;
    const GROUP_HEIGHT = 38;

    const canEditItem = (item: any) => {
        if (currentUser?.role === 'ADMIN') return true;
        if (item.authorId === currentUser?.id) return true;

        const customFields = (() => { try { return JSON.parse(item.customFields || '{}'); } catch { return {}; } })();
        const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
        return personFields.some(id => {
            const val = customFields[id];
            if (!val) return false;
            return String(val).split(',').map(s => s.trim()).includes(currentUser?.id);
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-color)' }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                borderBottom: '1px solid var(--border-color)',
                background: 'var(--sidebar-bg)',
                flexWrap: 'wrap'
            }}>
                {/* Zoom */}
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-color)', borderRadius: 8, padding: 2, border: '1px solid var(--border-color)' }}>
                    {(['hours', 'day', 'week', 'bi-week', 'month', 'year'] as ZoomLevel[]).map(z => (
                        <button key={z} onClick={() => handleZoomChange(z)} style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 600, borderRadius: 6,
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: zoom === z ? 'var(--text-primary)' : 'transparent',
                            color: zoom === z ? 'var(--bg-color)' : 'var(--text-secondary)'
                        }}>
                            {z === 'bi-week' ? 'Bi-Week' : z.charAt(0).toUpperCase() + z.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => navigate(-1)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>‹ Prev</button>
                    <button onClick={() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); setStartDateStr(d.toISOString().slice(0, 10)); }} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid #007aff', borderRadius: 6, background: 'rgba(0,122,255,0.08)', color: '#007aff', cursor: 'pointer', fontWeight: 600 }}>Today</button>
                    <button onClick={() => navigate(1)} style={{ padding: '5px 10px', fontSize: 12, border: '1px solid var(--border-color)', borderRadius: 6, background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Next ›</button>
                </div>
            </div>

            {/* Grid */}
            <div style={{ display: 'flex', overflow: 'auto', position: 'relative' }} ref={gridRef}>
                <div style={{ minWidth: LEFT_PANEL + totalDays * colW }}>
                    <TimelineHeader
                        topRowItems={topRowItems}
                        bottomRowItems={bottomRowItems}
                        zoom={zoom}
                        leftPanelWidth={LEFT_PANEL}
                    />

                    {/* Background Grid */}
                    <div style={{ position: 'absolute', top: HEADER_HEIGHT, left: LEFT_PANEL, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none' }}>
                        {bottomRowItems.map((b, idx) => (
                            <div key={idx} style={{ position: 'absolute', left: b.left, width: b.width, top: 0, bottom: 0, borderRight: '1px solid var(--border-color)', background: b.isWeekend ? 'rgba(0,0,0,0.015)' : 'transparent' }} />
                        ))}
                    </div>

                    {/* Today line */}
                    {exactDaysFromStart >= 0 && exactDaysFromStart <= totalDays && (
                        <div style={{
                            position: 'absolute',
                            left: LEFT_PANEL + exactDaysFromStart * colW,
                            top: 40, // Below top row
                            bottom: 0,
                            width: 2,
                            background: 'linear-gradient(to bottom, #007aff, transparent)',
                            boxShadow: '0 0 8px rgba(0,122,255,0.4)',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                position: 'absolute', top: -4, left: -3, width: 8, height: 8,
                                borderRadius: '50%', background: '#007aff', border: '2px solid #fff'
                            }} />
                        </div>
                    )}

                    {/* Rows */}
                    {grouped.map(group => {
                        const isCollapsed = collapsed[group.key];
                        return (
                            <div key={group.key}>
                                {grouped.length > 1 && (
                                    <div style={{
                                        display: 'flex', height: GROUP_HEIGHT, alignItems: 'center',
                                        background: `${group.color.bg}44`,
                                        borderBottom: '1px solid var(--border-color)',
                                        position: 'sticky', left: 0,
                                    }}>
                                        <div style={{
                                            width: LEFT_PANEL, flexShrink: 0,
                                            borderRight: '1px solid var(--border-color)',
                                            display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px',
                                            cursor: 'pointer'
                                        }} onClick={() => setCollapsed(prev => ({ ...prev, [group.key]: !isCollapsed }))}>
                                            <span style={{ display: 'flex', color: group.color.text }}>
                                                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                            </span>
                                            <span style={{
                                                display: 'inline-flex', padding: '2px 10px', borderRadius: 20,
                                                background: group.color.bg, color: group.color.text,
                                                fontSize: 12, fontWeight: 700
                                            }}>{group.label}</span>
                                        </div>
                                        <div style={{ flex: 1, height: '100%' }} />
                                    </div>
                                )}

                                {!isCollapsed && group.items.map(content => {
                                    const cd = JSON.parse(content.customFields || '{}');
                                    const isDragged = draggedItemId === content.id;

                                    let barStart: number | null = null;
                                    let barEnd: number | null = null;

                                    if (usingFallbackDate) {
                                        const s = content.createdAt ? new Date(content.createdAt) : null;
                                        if (s && !isNaN(s.getTime())) {
                                            barStart = daysBetween(startDate, s);
                                            barEnd = barStart;
                                        }
                                    } else if (datePropId) {
                                        const val = cd[datePropId] || '';
                                        const [sPart, ePart] = val.includes(' → ') ? val.split(' → ') : [val, val];
                                        const s = sPart ? new Date(sPart) : null;
                                        const e = (ePart || sPart) ? new Date(ePart || sPart) : s;

                                        if (s && !isNaN(s.getTime())) barStart = daysBetween(startDate, s);
                                        if (e && !isNaN(e.getTime())) barEnd = daysBetween(startDate, e);
                                    }

                                    const hasBar = barStart !== null && barEnd !== null;
                                    const barLeft = barStart !== null ? Math.max(0, barStart) : 0;
                                    const barLen = (barStart !== null && barEnd !== null) ? Math.max(1, barEnd - barStart + 1) : 1;

                                    let barColor = { bg: '#007aff', text: '#fff' };
                                    if (groupPropId && cd[groupPropId]) {
                                        const prop = properties.find(p => p.id === groupPropId);
                                        const colorConfig = prop?.colorConfig ? JSON.parse(prop.colorConfig) : {};
                                        const obj = getBadgeColorObj(cd[groupPropId], colorConfig);
                                        barColor = { bg: obj.bg ?? '#007aff', text: obj.text ?? '#fff' };
                                    }

                                    const secondaryProp = properties.find(p => p.type === 'STATUS' || p.type === 'SELECT');
                                    const secondaryVal = secondaryProp ? cd[secondaryProp.id] : null;
                                    const secondaryColor = secondaryVal ? getBadgeColorObj(secondaryVal, JSON.parse(secondaryProp?.colorConfig || '{}')) : null;

                                    return (
                                        <div key={content.id} className="timeline-row-item" style={{
                                            display: 'flex',
                                            height: ROW_HEIGHT,
                                            alignItems: 'center',
                                            borderBottom: '1px solid var(--border-color)',
                                            position: 'relative',
                                            background: content.colorMatch ? `${content.colorMatch}0a` : 'transparent',
                                            transition: 'background 0.1s'
                                        }}>
                                            <style>{`
                                                .timeline-row-item:hover { background: var(--sidebar-bg) !important; }
                                                .timeline-row-item:hover .grip-handle { opacity: 0.6 !important; }
                                            `}</style>
                                            <div style={{
                                                width: LEFT_PANEL, flexShrink: 0, borderRight: '1px solid var(--border-color)',
                                                display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', overflow: 'hidden',
                                                position: 'sticky', left: 0, background: content.colorMatch ? `${content.colorMatch}1a` : 'var(--bg-color)',
                                                zIndex: 10, height: '100%'
                                            }}>
                                                <GripVertical size={12} className="grip-handle" color="var(--text-secondary)" style={{ opacity: 0, transition: 'opacity 0.2s', flexShrink: 0 }} />
                                                <div onClick={() => onOpenContent ? onOpenContent(content.id) : router.push(`/content/${content.id}`)} style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-primary)', marginBottom: 2 }}>
                                                        {content.title}
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {secondaryVal && secondaryColor && (
                                                            <span style={{ fontSize: 9, padding: '0px 6px', borderRadius: 10, background: secondaryColor.bg, color: secondaryColor.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', border: `1px solid ${secondaryColor.text}22` }}>
                                                                {secondaryVal}
                                                            </span>
                                                        )}
                                                        <span style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.6 }}>#{content.id.slice(-4)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div
                                                style={{ flex: 1, position: 'relative', height: '100%' }}
                                                onDragOver={e => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setDragOverDayOffset(Math.floor((e.clientX - r.left) / colW)); }}
                                                onDrop={handleGridDrop}
                                            >
                                                {hasBar && (
                                                    <div
                                                        draggable={!resizingItemId && !resizingSide && canEditItem(content)}
                                                        onDragStart={(e) => {
                                                            if (resizingItemId || resizingSide || !canEditItem(content)) {
                                                                e.preventDefault();
                                                                return;
                                                            }
                                                            setDraggedItemId(content.id);
                                                            setTimeout(() => { }, 0);
                                                        }}
                                                        onDragEnd={() => { setDraggedItemId(null); setDragOverDayOffset(null); }}
                                                        style={{
                                                            position: 'absolute',
                                                            left: barLeft * colW + 4,
                                                            width: barLen * colW - 8,
                                                            top: '50%', transform: 'translateY(-50%)',
                                                            height: 22,
                                                            borderRadius: barLen === 1 ? 11 : 6, // Pill for single day
                                                            background: isDragged ? 'rgba(0,0,0,0.1)' : (content.colorMatch ? `linear-gradient(135deg, ${content.colorMatch}dd, ${content.colorMatch}ee)` : `linear-gradient(135deg, ${barColor.bg}dd, ${barColor.bg}ee)`),
                                                            backdropFilter: 'blur(4px)',
                                                            border: isDragged ? '1px dashed var(--border-color)' : (content.colorMatch ? `1px solid ${content.colorMatch}` : `1px solid ${barColor.bg}`),
                                                            cursor: resizingSide ? 'col-resize' : 'grab',
                                                            zIndex: isDragged ? 1 : (resizingItemId === content.id ? 20 : 5),
                                                            opacity: isDragged ? 0.4 : 1,
                                                            display: 'flex', alignItems: 'center',
                                                            boxShadow: isDragged ? 'none' : `0 3px 8px ${barColor.bg}33`,
                                                            transition: resizingItemId === content.id ? 'none' : 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                            overflow: 'hidden'
                                                        }}
                                                        onMouseEnter={e => { if (!isDragged && !resizingItemId) e.currentTarget.style.transform = 'translateY(-50%) scaleY(1.05)'; }}
                                                        onMouseLeave={e => { if (!isDragged && !resizingItemId) e.currentTarget.style.transform = 'translateY(-50%)'; }}
                                                    >
                                                        {/* Inner Ring effect */}
                                                        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 'inherit', pointerEvents: 'none' }} />

                                                        {/* Left Resize Handle */}
                                                        {barLen > 1 && (
                                                            <div
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (!canEditItem(content)) return;
                                                                    setResizingItemId(content.id);
                                                                    setResizingSide('left');
                                                                    document.body.style.cursor = 'col-resize';
                                                                }}
                                                                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, cursor: canEditItem(content) ? 'col-resize' : 'default', zIndex: 10, background: 'rgba(255,255,255,0.1)' }}
                                                            />
                                                        )}

                                                        <div style={{ flex: 1, padding: '0 10px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: 10, fontWeight: 800, color: barColor.text, pointerEvents: 'none', textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                                            {content.title}
                                                        </div>

                                                        {/* Right Resize Handle */}
                                                        {barLen > 1 && (
                                                            <div
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    if (!canEditItem(content)) return;
                                                                    setResizingItemId(content.id);
                                                                    setResizingSide('right');
                                                                    document.body.style.cursor = 'col-resize';
                                                                }}
                                                                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 8, cursor: canEditItem(content) ? 'col-resize' : 'default', zIndex: 10, background: 'rgba(255,255,255,0.1)' }}
                                                            />
                                                        )}
                                                    </div>
                                                )}

                                                {isDragged && dragOverDayOffset !== null && !resizingItemId && (
                                                    <div style={{
                                                        position: 'absolute', left: dragOverDayOffset * colW + 4, width: barLen * colW - 8,
                                                        top: '50%', transform: 'translateY(-50%)', height: 22, background: 'rgba(0,122,255,0.1)',
                                                        border: '2px dashed #007aff', borderRadius: barLen === 1 ? 11 : 6, pointerEvents: 'none', zIndex: 2
                                                    }} />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
