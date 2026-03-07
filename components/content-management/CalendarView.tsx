'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { updateSingleContentField, updateContentField } from '../../lib/content-actions';
import {
    ChevronLeft, ChevronRight, Hash, Menu,
    Type, Calendar as CalIcon, User, ZoomIn, ZoomOut, Move, Plus, DollarSign, Percent
} from 'lucide-react';
import { getBadgeColorObj } from '../../lib/colors';

type ZoomLevel = 0 | 1 | 2 | 3;
const ZOOM_LABELS: Record<ZoomLevel, string> = { 0: 'Year', 1: 'Month', 2: 'Week', 3: 'Day' };

/* ── Date helpers ─────────────────────────────────────────── */
const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const startOf = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };
const endOf = (d: Date) => { const c = new Date(d); c.setHours(23, 59, 59, 999); return c; };
const daysBetween = (a: Date, b: Date) => Math.round((startOf(b).getTime() - startOf(a).getTime()) / 86400000);

// Parse a "YYYY-MM-DD" string as LOCAL time (not UTC) to avoid timezone column shift
const parseLocalDate = (s: string): Date => {
    const trimmed = s.trim();
    // Try YYYY-MM-DD first (most common stored format)
    const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
    // Fallback for other formats
    return new Date(trimmed);
};

const parseRange = (raw?: string | null): { start: Date; end: Date } | null => {
    if (!raw) return null;
    const p = raw.includes(' → ') ? raw.split(' → ') : [raw, raw];
    const s = parseLocalDate(p[0]), e = parseLocalDate(p[1] || p[0]);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;
    return { start: startOf(s), end: endOf(e) };
};
const serializeRange = (s: Date, e: Date) =>
    fmt(s) === fmt(e) ? fmt(s) : `${fmt(s)} → ${fmt(e)}`;

const ACCENT_DEFAULT = '#2eaadc';
const accent = (item: any) => item.colorMatch || ACCENT_DEFAULT;
const accentBg = (item: any) => item.colorMatch ? `${item.colorMatch}18` : `${ACCENT_DEFAULT}18`;

/* ── Main Component ───────────────────────────────────────── */
export default function CalendarView({
    contents, properties, userOptionsRaw, onOpenContent, viewSettings, currentUser
}: {
    contents: any[]; properties: any[]; userOptionsRaw: string;
    onOpenContent?: (id: string) => void; viewSettings?: any; currentUser?: any;
}) {
    const router = useRouter();
    const cfg = viewSettings?.layoutConfig ? JSON.parse(viewSettings.layoutConfig) : {};
    const dateProps = properties.filter(p => p.type === 'DATE');

    const [datePropId, setDatePropId] = useState<string | null>(
        cfg.datePropId || (dateProps[0]?.id ?? null)
    );
    useEffect(() => { if (cfg.datePropId) setDatePropId(cfg.datePropId); }, [viewSettings?.layoutConfig]);

    const [curDate, setCurDate] = useState(new Date());
    const [zoom, setZoom] = useState<ZoomLevel>(1);
    const [zooming, setZooming] = useState(false);
    const [items, setItems] = useState(contents);

    /* drag-to-move state */
    const [dragId, setDragId] = useState<string | null>(null);
    const dragIdRef = useRef<string | null>(null); // always current — avoids stale closure in event handlers
    const [dragOverDate, setDragOverDate] = useState<string | null>(null);
    const dragOffsetRef = useRef(0);
    // Per-cell drag-enter counter to prevent flicker from child element events
    const dragCounters = useRef<Record<string, number>>({});

    /* resize state */
    const [resizeId, setResizeId] = useState<string | null>(null);
    const resizeRef = useRef<{ id: string; side: 'left' | 'right'; origStart: Date; origEnd: Date } | null>(null);
    const didResizeRef = useRef(false); // suppresses the click that fires after mouseup ends a resize

    const [hoverCard, setHoverCard] = useState<string | null>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setItems(contents); }, [contents]);

    /* zoom helpers */
    const gotoZoom = (lv: ZoomLevel) => {
        if (lv === zoom) return;
        setZooming(true);
        setTimeout(() => { setZoom(lv); setZooming(false); }, 180);
    };

    /* navigation */
    const nav = (dir: -1 | 1) => {
        const d = new Date(curDate);
        if (zoom === 3) d.setDate(d.getDate() + dir);
        else if (zoom === 2) d.setDate(d.getDate() + dir * 7);
        else if (zoom === 1) d.setMonth(d.getMonth() + dir);
        else d.setFullYear(d.getFullYear() + dir);
        setCurDate(d);
    };

    const MONTHS = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const yr = curDate.getFullYear(), mo = curDate.getMonth();

    const weekStart = (d: Date) => { const c = new Date(d); c.setDate(c.getDate() - d.getDay()); return startOf(c); };
    const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart(curDate), i)), [curDate]);

    const dimMonth = new Date(yr, mo + 1, 0).getDate();
    const fdm = new Date(yr, mo, 1).getDay();
    const monthCells = useMemo(() => {
        const cells: { date: Date; cur: boolean }[] = [];
        const prev = new Date(yr, mo, 0).getDate();
        for (let i = fdm - 1; i >= 0; i--) cells.push({ date: new Date(yr, mo - 1, prev - i), cur: false });
        for (let i = 1; i <= dimMonth; i++) cells.push({ date: new Date(yr, mo, i), cur: true });
        while (cells.length < 42) cells.push({ date: new Date(yr, mo + 1, cells.length - dimMonth - fdm + 1), cur: false });
        return cells;
    }, [yr, mo, dimMonth, fdm]);

    const titleStr = () => {
        if (zoom === 3) return `${DOW[curDate.getDay()]}, ${MONTHS[mo]} ${curDate.getDate()}, ${yr}`;
        if (zoom === 2) { const s = weekDays[0], e = weekDays[6]; return `${MONTHS[s.getMonth()]} ${s.getDate()} – ${s.getMonth() !== e.getMonth() ? MONTHS[e.getMonth()] + ' ' : ''}${e.getDate()}, ${yr}`; }
        if (zoom === 1) return `${MONTHS[mo]} ${yr}`;
        return `${yr}`;
    };

    const isToday = (d: Date) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); };

    /* ── Computed ranges ──────────────────────────────────── */
    const ranges = useMemo(() => {
        const m: Record<string, { start: Date; end: Date }> = {};
        if (!datePropId) return m;
        items.forEach(c => {
            const cf = c.customFields ? JSON.parse(c.customFields) : {};
            const r = parseRange(cf[datePropId]);
            if (r) m[c.id] = r;
        });
        return m;
    }, [items, datePropId]);

    const byDate = useMemo(() => {
        const m: Record<string, any[]> = {};
        if (!datePropId) return m;
        items.forEach(c => {
            const r = ranges[c.id]; if (!r) return;
            let cur = new Date(r.start), n = 0;
            while (cur <= r.end && n++ < 366) {
                const s = fmt(cur); if (!m[s]) m[s] = []; m[s].push(c); cur = addDays(cur, 1);
            }
        });
        return m;
    }, [items, datePropId, ranges]);

    /* ── Lane assignment ───────────────────────────────────── */
    const lanes = useMemo(() => {
        const lm = new Map<string, number>();
        if (!datePropId) return lm;
        const sorted = items.filter(c => ranges[c.id]).sort((a, b) => {
            const ra = ranges[a.id], rb = ranges[b.id];
            if (ra.start.getTime() !== rb.start.getTime()) return ra.start.getTime() - rb.start.getTime();
            const durA = ra.end.getTime() - ra.start.getTime();
            const durB = rb.end.getTime() - rb.start.getTime();
            if (durA !== durB) return durB - durA; // longer duration first

            // Same start & same duration: sort vertically by orderIndex
            const oA = (a.customFields ? JSON.parse(a.customFields) : {}).orderIndex || 0;
            const oB = (b.customFields ? JSON.parse(b.customFields) : {}).orderIndex || 0;
            return oA - oB;
        });
        const tails: number[] = [];
        sorted.forEach(item => {
            const r = ranges[item.id]; let lane = 0;
            while (tails[lane] !== undefined && tails[lane] >= r.start.getTime()) lane++;
            lm.set(item.id, lane);
            tails[lane] = r.end.getTime();
        });
        return lm;
    }, [items, ranges, datePropId]);

    /* ── Resize mouse logic ───────────────────────────────────────── */
    // Scan [data-date] background cells by bounding rect — avoids elementFromPoint
    // which returns the topmost card instead of the background cell.
    const getDateAtPoint = useCallback((clientX: number, clientY: number): Date | null => {
        const cells = document.querySelectorAll<HTMLElement>('[data-date]');
        for (const cell of Array.from(cells)) {
            const r = cell.getBoundingClientRect();
            if (clientX >= r.left && clientX < r.right &&
                clientY >= r.top && clientY <= r.bottom) {
                const ds = cell.getAttribute('data-date');
                if (ds) return parseLocalDate(ds);
            }
        }
        return null;
    }, []);

    const canEditItem = useCallback((item: any) => {
        if (currentUser?.role === 'ADMIN') return true;
        if (item.authorId === currentUser?.id) return true;

        const customFields = (() => { try { return JSON.parse(item.customFields || '{}'); } catch { return {}; } })();
        const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
        return personFields.some(id => {
            const val = customFields[id];
            if (!val) return false;
            return String(val).split(',').map(s => s.trim()).includes(currentUser?.id);
        });
    }, [currentUser, properties]);

    const startResize = useCallback((e: React.MouseEvent, item: any, side: 'left' | 'right') => {
        e.preventDefault(); e.stopPropagation();
        if (!canEditItem(item)) return;
        const r = ranges[item.id]; if (!r) return;
        resizeRef.current = { id: item.id, side, origStart: new Date(r.start), origEnd: new Date(r.end) };
        setResizeId(item.id);
        setHoverCard(item.id);
    }, [ranges, canEditItem]);

    useEffect(() => {
        if (!resizeId) return;
        const onMove = (e: MouseEvent) => {
            const rs = resizeRef.current; if (!rs || !datePropId) return;
            const tgt = getDateAtPoint(e.clientX, e.clientY); if (!tgt) return;
            const ns = rs.side === 'left' ? (tgt > rs.origEnd ? rs.origEnd : startOf(tgt)) : rs.origStart;
            const ne = rs.side === 'right' ? (tgt < rs.origStart ? rs.origStart : endOf(tgt)) : rs.origEnd;
            setItems(prev => prev.map(c => {
                if (c.id !== rs.id) return c;
                const cf = c.customFields ? JSON.parse(c.customFields) : {};
                cf[datePropId] = serializeRange(ns, ne);
                return { ...c, customFields: JSON.stringify(cf) };
            }));
            resizeRef.current = { ...rs, origStart: ns, origEnd: ne };
        };
        const onUp = async () => {
            const rs = resizeRef.current; resizeRef.current = null; setResizeId(null);
            didResizeRef.current = true; // flag: next click on this card should be ignored
            if (!rs || !datePropId) return;
            try { await updateSingleContentField(rs.id, datePropId, serializeRange(rs.origStart, rs.origEnd)); }
            catch { setItems(contents); }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [resizeId, datePropId, getDateAtPoint, contents]);

    /* ── Window-level drag fallback ─────────────────────────────────
       Guarantees e.preventDefault() is called on EVERY dragover event,
       even before React re-renders or when cursor is over an unhandled element.
       Uses dragIdRef (synchronous) instead of dragId state (async).        */
    useEffect(() => {
        const onDragOver = (e: DragEvent) => {
            if (!dragIdRef.current) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        };
        const onDragEnd = () => { dragIdRef.current = null; }; // safety cleanup
        window.addEventListener('dragover', onDragOver);
        window.addEventListener('dragend', onDragEnd);
        return () => {
            window.removeEventListener('dragover', onDragOver);
            window.removeEventListener('dragend', onDragEnd);
        };
    }, []); // mount once — reads dragIdRef which is always current

    /* ── Property rendering ───────────────────────────────── */
    const visPropIds: string[] = (() => {
        if (!viewSettings?.propertyVisibility) return properties.map(p => p.id);
        try { return JSON.parse(viewSettings.propertyVisibility); } catch { return properties.map(p => p.id); }
    })();

    const renderProps = (item: any): React.ReactNode[] => {
        const rows: React.ReactNode[] = [];
        visPropIds.forEach(pid => {
            const cf = item.customFields ? JSON.parse(item.customFields) : {};
            const val = cf[pid];
            if (!val || (Array.isArray(val) && val.length === 0)) return;
            const prop = properties.find(p => p.id === pid); if (!prop) return;

            // Skip DATE props (already shown in the card header area)
            if (prop.type === 'DATE') return;

            let valueEl: React.ReactNode;

            if (prop.type === 'PERSON') {
                const users: any[] = (() => { try { return JSON.parse(userOptionsRaw); } catch { return []; } })();
                // val might be: a user ID string, a user name string, or a user object
                const uid = typeof val === 'object' ? val?.id : val;
                const uname = typeof val === 'object' ? val?.name : null;
                const u = users.find((u: any) =>
                    u.id === uid || u.id === val ||
                    u.email === uid ||
                    u.name === uid || u.name === uname
                );
                const displayName = u?.name ?? u?.email ?? uname ?? (typeof val === 'string' ? val : null) ?? '—';
                valueEl = (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontWeight: 700, color: 'var(--text-primary)'
                    }}>
                        <User size={9} strokeWidth={3} />{displayName}
                    </span>
                );
            } else if (prop.type === 'SELECT') {
                const cc = prop.colorConfig ? JSON.parse(prop.colorConfig) : {};
                const clr = getBadgeColorObj(String(val), cc);
                valueEl = (
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '1px 8px', background: clr.bg, borderRadius: 20,
                        fontWeight: 800, color: clr.text, border: `1px solid ${clr.text}18`
                    }}>
                        <span style={{
                            width: 5, height: 5, borderRadius: '50%', background: clr.text,
                            opacity: 0.7, display: 'inline-block', flexShrink: 0
                        }} />
                        {val}
                    </span>
                );
            } else if (prop.type === 'MULTI_SELECT') {
                const arr: string[] = Array.isArray(val) ? val : String(val).split(',').map((s: string) => s.trim());
                const cc = prop.colorConfig ? JSON.parse(prop.colorConfig) : {};
                valueEl = (
                    <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 3 }}>
                        {arr.map((v: string, i: number) => {
                            const clr = getBadgeColorObj(v, cc);
                            return <span key={i} style={{
                                padding: '1px 8px', background: clr.bg, borderRadius: 20,
                                fontWeight: 800, color: clr.text, border: `1px solid ${clr.text}18`
                            }}>{v}</span>;
                        })}
                    </span>
                );
            } else {
                valueEl = <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{String(val)}</span>;
            }

            rows.push(
                <div key={pid} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 6,
                    fontSize: 10, lineHeight: 1.5,
                }}>
                    {/* Label */}
                    <span style={{
                        color: 'var(--text-secondary)', fontWeight: 600, opacity: 0.7,
                        whiteSpace: 'nowrap', flexShrink: 0, minWidth: 56, maxWidth: 80,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{prop.name}:</span>
                    {/* Value */}
                    <span style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center', flex: 1 }}>
                        {valueEl}
                    </span>
                </div>
            );
        });
        return rows;
    };

    /* ── Ghost range calculator ───────────────────────────── */
    const getGhostRange = (id: string): { start: Date; end: Date } | null => {
        if (id !== dragId || !dragOverDate) return null;
        const r = ranges[id]; if (!r) return null;
        const dur = daysBetween(r.start, r.end);
        const newStart = startOf(addDays(new Date(dragOverDate), -dragOffsetRef.current));
        return { start: newStart, end: endOf(addDays(newStart, dur)) };
    };


    /* ── Drop handler (duration-preserving + reordering) ────────────── */
    const handleDrop = async (e: React.DragEvent, dateStr: string, targetId?: string, pos?: 'before' | 'after') => {
        e.preventDefault();
        const cid = e.dataTransfer.getData('text/plain');
        setDragOverDate(null); setDragId(null);
        if (!cid || !datePropId) return;

        const r = ranges[cid];
        const newStart = startOf(addDays(new Date(dateStr), -dragOffsetRef.current));
        const dur = r ? daysBetween(r.start, r.end) : 0;
        const newEnd = endOf(addDays(newStart, dur));
        const newRange = serializeRange(newStart, newEnd);
        dragOffsetRef.current = 0;

        // Calculate new orderIndex if dropping on a specific target
        let newOrderIndex: number | undefined;
        if (targetId && pos) {
            // Find all items that will share this exact start date & duration (competitors for this lane)
            const peers = items.filter(it => {
                if (it.id === cid) return false;
                const ir = ranges[it.id];
                return ir && ir.start.getTime() === newStart.getTime() &&
                    (ir.end.getTime() - ir.start.getTime()) === (newEnd.getTime() - newStart.getTime());
            }).sort((a, b) => {
                const oA = (a.customFields ? JSON.parse(a.customFields) : {}).orderIndex || 0;
                const oB = (b.customFields ? JSON.parse(b.customFields) : {}).orderIndex || 0;
                return oA - oB;
            });

            const tIdx = peers.findIndex(p => p.id === targetId);
            if (tIdx !== -1) {
                const getOBtn = (idx: number) => {
                    if (idx < 0 || idx >= peers.length) return undefined;
                    return (peers[idx].customFields ? JSON.parse(peers[idx].customFields) : {}).orderIndex || 0;
                };

                if (pos === 'before') {
                    const prevO = getOBtn(tIdx - 1);
                    const targetO = getOBtn(tIdx) || 0;
                    newOrderIndex = prevO !== undefined ? (prevO + targetO) / 2 : targetO - 100;
                } else {
                    const targetO = getOBtn(tIdx) || 0;
                    const nextO = getOBtn(tIdx + 1);
                    newOrderIndex = nextO !== undefined ? (targetO + nextO) / 2 : targetO + 100;
                }
            }
        } else if (!targetId) {
            // Dropped on empty cell: put it at the end
            const peers = items.filter(it => {
                if (it.id === cid) return false;
                const ir = ranges[it.id];
                return ir && ir.start.getTime() === newStart.getTime();
            });
            const maxVal = peers.reduce((max, p) => {
                const o = (p.customFields ? JSON.parse(p.customFields) : {}).orderIndex || 0;
                return Math.max(max, o);
            }, 0);
            newOrderIndex = maxVal + 100;
        }

        // Optimistic update
        setItems(prev => prev.map(c => {
            if (c.id !== cid) return c;
            const cf = c.customFields ? JSON.parse(c.customFields) : {};
            cf[datePropId] = newRange;
            if (newOrderIndex !== undefined) cf.orderIndex = newOrderIndex;
            return { ...c, customFields: JSON.stringify(cf) };
        }));

        try {
            const targetItem = items.find(i => i.id === cid);
            if (targetItem) {
                const nextCf = targetItem.customFields ? JSON.parse(targetItem.customFields) : {};
                nextCf[datePropId] = newRange;
                if (newOrderIndex !== undefined) nextCf.orderIndex = newOrderIndex;
                await updateContentField(cid, JSON.stringify(nextCf));
            }
        }
        catch { setItems(contents); }
    };

    /* ── Week grid renderer (SINGLE shared grid — no dual-grid drift) ── */
    const renderWeekGrid = (days: Date[], minH: number | string, inMonth = false) => {
        const ws = days[0], we = days[6];
        // Lane 0 = row 2 (month) or row 1 (week).  Row 1 in month = date number header.
        const rowOffset = inMonth ? 2 : 1;

        const weekItems = items.filter(it => {
            const r = ranges[it.id];
            return r && r.start <= we && r.end >= ws;
        });
        const maxLane = weekItems.reduce((m, it) => Math.max(m, lanes.get(it.id) ?? 0), 0);

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                gridAutoRows: 'auto',
                minHeight: minH,
            }}>
                {/* Header spacer row: reserves space for date numbers above cards (month only) */}
                {inMonth && (
                    <div style={{ gridColumn: '1 / span 7', gridRow: 1, height: 30, pointerEvents: 'none' }} />
                )}

                {days.map((d, i) => {
                    const ds = fmt(d);
                    const isDO = dragOverDate === ds && !!dragIdRef.current;
                    const isCM = d.getMonth() === mo;
                    return (
                        <div
                            key={`bg-${i}`}
                            className="db-calendar-cell"
                            data-date={ds}
                            onDragEnter={e => {
                                e.preventDefault();
                                dragCounters.current[ds] = (dragCounters.current[ds] || 0) + 1;
                                if (dragIdRef.current) setDragOverDate(ds); // ref avoids stale closure
                            }}
                            onDragLeave={() => {
                                dragCounters.current[ds] = (dragCounters.current[ds] || 1) - 1;
                                if (dragCounters.current[ds] <= 0) {
                                    dragCounters.current[ds] = 0;
                                    setDragOverDate(prev => prev === ds ? null : prev);
                                }
                            }}
                            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                            onDrop={e => { dragCounters.current[ds] = 0; handleDrop(e, ds); }}
                            style={{
                                gridColumn: `${i + 1}`,
                                gridRow: `1 / ${maxLane + rowOffset + 2}`, // span all card rows + spacer
                                borderRight: i < 6 ? '1px solid var(--border-color)' : 'none',
                                transition: 'background 0.12s, box-shadow 0.12s',
                                background: isDO
                                    ? `linear-gradient(180deg, ${ACCENT_DEFAULT}18 0%, ${ACCENT_DEFAULT}0a 100%)`
                                    : isCM ? 'transparent' : 'rgba(0,0,0,0.012)',
                                boxShadow: isDO ? `inset 0 0 0 2px ${ACCENT_DEFAULT}55` : 'none',
                                position: 'relative',
                                zIndex: 0,
                                minHeight: minH,
                                paddingTop: inMonth ? 4 : 0,
                                paddingLeft: 4,
                            }}
                        >
                            <style>{`.db-calendar-cell:hover .add-btn { opacity: 1 !important; pointer-events: auto !important; }`}</style>
                            {/* Date header — month view only */}
                            {inMonth && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 4 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: isToday(d) ? 700 : 400,
                                        background: isToday(d) ? 'var(--accent-color)' : 'transparent',
                                        color: isToday(d) ? '#fff' : 'var(--text-primary)',
                                        opacity: isCM ? 1 : 0.3, flexShrink: 0,
                                    }}>{d.getDate()}</div>

                                    {datePropId && (
                                        <button
                                            className="add-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const prefillData: Record<string, string> = {
                                                    [`prop_${datePropId}`]: ds
                                                };
                                                window.dispatchEvent(new CustomEvent('open-create-content-modal', {
                                                    detail: { prefillData }
                                                }));
                                            }}
                                            style={{
                                                background: 'transparent', border: 'none', color: 'var(--text-secondary)',
                                                cursor: 'pointer', opacity: 0, transition: 'all 0.2s', padding: 2, borderRadius: 4,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
                                                zIndex: 10
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            title="Add item to date"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                            {/* Drop-zone label */}
                            {isDO && (
                                <div style={{
                                    position: 'absolute', bottom: 6, left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: 9, fontWeight: 800, color: ACCENT_DEFAULT,
                                    background: `${ACCENT_DEFAULT}18`, borderRadius: 6,
                                    padding: '2px 7px', whiteSpace: 'nowrap',
                                    pointerEvents: 'none', zIndex: 2,
                                }}>
                                    {DOW[d.getDay()]} {d.getDate()}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* ── Cards directly in the same grid ───────────── */}
                {weekItems.map(item => {
                    const r = ranges[item.id]; if (!r) return null;
                    const ghost = getGhostRange(item.id);
                    const dispRange = ghost || r;
                    const winStrs = days.map(fmt);

                    const inWin = dispRange.start <= we && dispRange.end >= ws;
                    if (!inWin) return null;

                    let sc = winStrs.findIndex(s => s === fmt(dispRange.start));
                    let ec = winStrs.findIndex(s => s === fmt(dispRange.end));
                    if (sc === -1) sc = 0;
                    if (ec === -1) ec = 6;
                    if (sc > ec) return null;

                    const lane = lanes.get(item.id) ?? 0;
                    const span = ec - sc + 1;
                    const ac = accent(item);
                    const bg = accentBg(item);
                    const isHov = hoverCard === item.id && !dragId;
                    const isRes = resizeId === item.id;
                    const isDrag = dragId === item.id;
                    const isGhost = isDrag && ghost !== null;
                    const trueS = fmt(dispRange.start) === winStrs[sc];
                    const trueE = fmt(dispRange.end) === winStrs[ec];

                    return (
                        <div
                            key={item.id}
                            draggable={!isRes && canEditItem(item)}
                            onDragStart={e => {
                                if (!canEditItem(item)) {
                                    e.preventDefault();
                                    return;
                                }
                                const grabDateStr = winStrs[sc];
                                dragOffsetRef.current = grabDateStr ? Math.max(0, daysBetween(r.start, new Date(grabDateStr))) : 0;
                                e.dataTransfer.setData('text/plain', item.id);
                                e.dataTransfer.effectAllowed = 'move';
                                dragIdRef.current = item.id; // sync ref BEFORE state (no stale closure)
                                setDragId(item.id);
                            }}
                            onDragEnd={() => {
                                dragIdRef.current = null;
                                setDragId(null); setDragOverDate(null); dragOffsetRef.current = 0;
                            }}
                            onDragOver={e => {
                                // Allow drops even when cursor is over a card
                                e.preventDefault(); e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                // Update the hover-date indicator too
                                const gridEl = (e.currentTarget as HTMLElement).parentElement;
                                if (!gridEl || !dragIdRef.current) return;
                                const rect = gridEl.getBoundingClientRect();
                                const col = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 7))));
                                const ds = days.map(fmt)[col];
                                if (ds && dragOverDate !== ds) setDragOverDate(ds);
                            }}
                            onDrop={e => {
                                e.stopPropagation();
                                if (!dragIdRef.current) return;
                                // Calculate target date from cursor X position within the 7-column grid
                                const gridEl = (e.currentTarget as HTMLElement).parentElement;
                                if (!gridEl) return;
                                const gridRect = gridEl.getBoundingClientRect();
                                const col = Math.min(6, Math.max(0, Math.floor((e.clientX - gridRect.left) / (gridRect.width / 7))));
                                const ds = days.map(fmt)[col];

                                // Calculate Y position relative to the target CARD to determine before/after
                                const cardRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                const isTopHalf = (e.clientY - cardRect.top) < (cardRect.height / 2);
                                const pos = isTopHalf ? 'before' : 'after';

                                if (ds) { dragCounters.current[ds] = 0; handleDrop(e, ds, item.id, pos); }
                            }}
                            onMouseEnter={() => { if (!dragId) setHoverCard(item.id); }}
                            onMouseLeave={() => { if (!isRes) setHoverCard(null); }}
                            onClick={() => {
                                if (didResizeRef.current) { didResizeRef.current = false; return; } // ignore click after resize
                                if (!isRes && !isDrag) onOpenContent ? onOpenContent(item.id) : router.push(`/content/${item.id}`);
                            }}
                            style={{
                                gridColumn: `${sc + 1} / span ${span}`,
                                gridRow: `${lane + rowOffset}`,
                                alignSelf: 'start', // auto-height; don't stretch to fill grid row
                                margin: `3px ${trueE ? '6px' : '0'} 3px ${trueS ? '6px' : '0'}`,
                                padding: '7px 12px 8px',
                                background: isGhost
                                    ? `repeating-linear-gradient(45deg,${ac}08 0,${ac}08 4px,transparent 4px,transparent 10px),linear-gradient(135deg,${ac}18,${ac}0a)`
                                    : `linear-gradient(155deg, ${bg}, ${ac}06)`,
                                backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                                borderTop: isGhost ? `1px dashed ${ac}66` : `1px solid rgba(255,255,255,0.5)`,
                                borderBottom: isGhost ? `1px dashed ${ac}66` : `1px solid ${ac}22`,
                                borderRight: isGhost
                                    ? (trueE ? `1px dashed ${ac}66` : 'none')
                                    : (trueE ? `1px solid ${ac}22` : 'none'),
                                borderLeft: isGhost
                                    ? (trueS ? `4px dashed ${ac}` : `1px dashed ${ac}66`)
                                    : (trueS ? `5px solid ${ac}` : `1px solid ${ac}22`),
                                borderRadius: trueS && trueE ? 10 : trueS ? '10px 0 0 10px' : trueE ? '0 10px 10px 0' : 0,
                                zIndex: isDrag ? 50 : isRes ? 30 : isHov ? 20 : 5,
                                cursor: isRes ? 'col-resize' : (isDrag ? 'grabbing' : 'grab'),
                                boxShadow: isGhost
                                    ? `0 0 0 2px ${ac}44`
                                    : isHov
                                        ? `0 6px 20px ${ac}28, 0 2px 6px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6)`
                                        : `0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.4)`,
                                transform: isHov && !isDrag ? 'translateY(-1px)' : 'none',
                                transition: isRes || isDrag ? 'none' : 'box-shadow 0.2s, transform 0.2s',
                                display: 'flex', flexDirection: 'column', gap: 5,
                                minWidth: 0, overflow: 'visible', // minWidth:0 prevents column from growing; visible keeps resize handles unclipped
                                userSelect: 'none',
                                opacity: isDrag && !isGhost ? 0.3 : 1,
                                // Cards always interactive; drag handled by column overlays rendered during drag
                                pointerEvents: 'auto',
                                position: 'relative',
                            }}
                        >
                            {/* Left resize arrow */}
                            {trueS && (isHov || isRes) && (
                                <div onMouseDown={e => startResize(e, item, 'left')} style={{
                                    position: 'absolute', left: -1, top: '50%', transform: 'translateY(-50%)',
                                    width: 20, height: 20, cursor: 'col-resize', zIndex: 40,
                                    background: ac, borderRadius: '0 6px 6px 0',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 2px 8px ${ac}55`,
                                }}>
                                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                        <path d="M5 1.5L2 4.5L5 7.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}

                            {/* Title */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 7,
                                fontWeight: 800, fontSize: 13, color: isGhost ? ac : 'var(--text-primary)',
                                overflow: 'hidden', letterSpacing: '-0.01em', lineHeight: 1.3,
                            }}>
                                {trueS && <CalIcon size={13} strokeWidth={2.5} style={{ color: ac, flexShrink: 0 }} />}
                                {!trueS && <span style={{ opacity: 0.4, fontSize: 15 }}>‹</span>}
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{item.title}</span>
                                {!trueE && <span style={{ opacity: 0.4, fontSize: 15 }}>›</span>}
                            </div>

                            {/* Properties / ghost date */}
                            {isGhost ? (
                                <div style={{
                                    fontSize: 10, color: ac, fontWeight: 800,
                                    background: `${ac}18`, padding: '2px 8px', borderRadius: 8,
                                    display: 'inline-block', width: 'fit-content',
                                }}>
                                    {fmt(dispRange.start)}{daysBetween(dispRange.start, dispRange.end) > 0 ? ` – ${fmt(dispRange.end)}` : ''}
                                </div>
                            ) : (() => {
                                const propRows = renderProps(item);
                                return propRows.length > 0 ? (
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', gap: 3,
                                        marginTop: 2, borderTop: `1px solid ${ac}18`, paddingTop: 5,
                                        opacity: isHov ? 1 : 0.85, transition: 'opacity 0.2s',
                                    }}>
                                        {propRows}
                                    </div>
                                ) : null;
                            })()}

                            {/* Right resize arrow */}
                            {trueE && (isHov || isRes) && (
                                <div onMouseDown={e => startResize(e, item, 'right')} style={{
                                    position: 'absolute', right: -1, top: '50%', transform: 'translateY(-50%)',
                                    width: 20, height: 20, cursor: 'col-resize', zIndex: 40,
                                    background: ac, borderRadius: '6px 0 0 6px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 2px 8px ${ac}55`,
                                }}>
                                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                        <path d="M4 1.5L7 4.5L4 7.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    );
                })}



                {/* Bottom spacer row */}
                <div style={{ gridColumn: '1 / span 7', gridRow: maxLane + rowOffset + 1, height: 8 }} />
            </div>
        );
    };


    /* ── Day header ──────────────────────────────────────── */
    const dayHeader = (days: Date[]) => (
        <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)'
        }}>
            {days.map((d, i) => {
                const td = isToday(d);
                return (
                    <div key={i} style={{ padding: '8px', borderRight: i < 6 ? '1px solid var(--border-color)' : 'none', textAlign: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{DOW[d.getDay()]}</div>
                        {zoom > 1 && (
                            <div style={{
                                margin: '4px auto 0', width: 30, height: 30, borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 15, fontWeight: 700,
                                background: td ? 'var(--accent-color)' : 'transparent',
                                color: td ? '#fff' : 'var(--text-primary)',
                                boxShadow: td ? '0 2px 8px rgba(46,170,220,0.35)' : 'none',
                                transition: 'all 0.2s',
                            }}>{d.getDate()}</div>
                        )}
                    </div>
                );
            })}
        </div>
    );

    if (dateProps.length === 0) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No DATE property found. Add one to use Calendar View.</div>;

    return (
        <div ref={gridRef} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
            <style>{`
                @keyframes cFadeIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
                @keyframes dropPulse {
                    0%,100%{transform:translate(-50%,-50%) scale(0.9);opacity:0.6}
                    50%{transform:translate(-50%,-50%) scale(1.1);opacity:1}
                }
                .cal-card { animation: cFadeIn 0.3s cubic-bezier(0.16,1,0.3,1) both; }
                .cal-zoom-slider{-webkit-appearance:none;appearance:none;height:5px;background:rgba(0,0,0,0.08);border-radius:8px;outline:none;transition:background 0.2s;}
                .cal-zoom-slider:hover{background:rgba(0,0,0,0.14);}
                .cal-zoom-slider::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent-color);border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);cursor:pointer;transition:transform 0.15s;}
                .cal-zoom-slider::-webkit-slider-thumb:hover{transform:scale(1.3);}
                [data-dropzone-active] { animation: dropPulse 1s ease infinite; }
            `}</style>

            {/* ─ Toolbar ─ */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 20px', borderBottom: '1px solid var(--border-color)',
                background: 'var(--sidebar-bg)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 3 }}>
                        {([[-1, '←'], [1, '→']] as [(-1 | 1), string][]).map(([d, ic]) => (
                            <button key={d} onClick={() => nav(d)} style={BTN}>{ic === '←' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}</button>
                        ))}
                        <button onClick={() => setCurDate(new Date())} style={{ ...BTN, padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--accent-color)', borderColor: 'rgba(46,170,220,0.3)', letterSpacing: '0.02em' }}>Today</button>
                    </div>
                    <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: '-0.02em' }}>{titleStr()}</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Zoom pill selector */}
                    <div style={{ display: 'flex', gap: 1, background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 3 }}>
                        {([0, 1, 2, 3] as ZoomLevel[]).map(lv => (
                            <button key={lv} onClick={() => gotoZoom(lv)} style={{
                                background: zoom === lv ? 'var(--accent-color)' : 'transparent',
                                border: 'none', borderRadius: 8, padding: '5px 11px',
                                fontSize: 11, fontWeight: zoom === lv ? 800 : 600,
                                color: zoom === lv ? '#fff' : 'var(--text-secondary)',
                                cursor: 'pointer', transition: 'all 0.2s',
                                boxShadow: zoom === lv ? '0 2px 8px rgba(46,170,220,0.3)' : 'none',
                                letterSpacing: '0.01em',
                            }}>{ZOOM_LABELS[lv]}</button>
                        ))}
                    </div>
                    {/* Slider */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <button onClick={() => gotoZoom(Math.max(0, zoom - 1) as ZoomLevel)} style={BTN}><ZoomOut size={13} /></button>
                        <input type="range" min={0} max={3} value={zoom} onChange={e => gotoZoom(Number(e.target.value) as ZoomLevel)} className="cal-zoom-slider" style={{ width: 60 }} />
                        <button onClick={() => gotoZoom(Math.min(3, zoom + 1) as ZoomLevel)} style={BTN}><ZoomIn size={13} /></button>
                    </div>
                </div>
            </div>

            {/* ─ Month view ─ */}
            {zoom === 1 && (
                <div style={{ opacity: zooming ? 0 : 1, transition: 'opacity 0.18s' }}>
                    {dayHeader(DOW.map((_, i) => new Date(2024, 0, i)))}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {Array.from({ length: 6 }, (_, i) => (
                            <div key={i} style={{ borderBottom: i < 5 ? '1px solid var(--border-color)' : 'none' }}>
                                {renderWeekGrid(monthCells.slice(i * 7, i * 7 + 7).map(c => c.date), 128, true)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─ Week view ─ */}
            {zoom === 2 && (
                <div style={{ opacity: zooming ? 0 : 1, transition: 'opacity 0.18s' }}>
                    {dayHeader(weekDays)}
                    {renderWeekGrid(weekDays, 600)}
                </div>
            )}

            {/* ─ Year view ─ */}
            {zoom === 0 && (
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                    {MONTHS.map((m, mi) => {
                        const dIn = new Date(yr, mi + 1, 0).getDate(), fDay = new Date(yr, mi, 1).getDay();
                        const total = Array.from({ length: dIn }, (_, i) => (byDate[`${yr}-${String(mi + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`] || []).length).reduce((a, b) => a + b, 0);
                        const isCurMo = mi === new Date().getMonth() && yr === new Date().getFullYear();
                        return (
                            <div key={mi} onClick={() => { setCurDate(new Date(yr, mi, 1)); gotoZoom(1); }}
                                style={{
                                    border: isCurMo ? `1.5px solid ${ACCENT_DEFAULT}44` : '1px solid var(--border-color)',
                                    borderRadius: 12, padding: 12, cursor: 'pointer', transition: 'all 0.2s',
                                    background: isCurMo ? `${ACCENT_DEFAULT}06` : 'transparent'
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${ACCENT_DEFAULT}0d`}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = isCurMo ? `${ACCENT_DEFAULT}06` : 'transparent'}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em', color: isCurMo ? 'var(--accent-color)' : 'var(--text-primary)' }}>{m.slice(0, 3).toUpperCase()}</span>
                                    {total > 0 && <span style={{ fontSize: 9, fontWeight: 800, background: `${ACCENT_DEFAULT}18`, color: 'var(--accent-color)', padding: '1px 7px', borderRadius: 10 }}>{total}</span>}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1 }}>
                                    {DOW.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 7, color: 'var(--text-secondary)', opacity: 0.5, fontWeight: 700 }}>{d[0]}</div>)}
                                    {Array.from({ length: fDay }, (_, i) => <div key={`p${i}`} />)}
                                    {Array.from({ length: dIn }, (_, i) => {
                                        const d = i + 1;
                                        const ds = `${yr}-${String(mi + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                        const hasE = (byDate[ds] || []).length > 0;
                                        const isCD = d === new Date().getDate() && mi === new Date().getMonth() && yr === new Date().getFullYear();
                                        return <div key={d} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 8, borderRadius: '50%',
                                            background: isCD ? 'var(--accent-color)' : (hasE ? `${ACCENT_DEFAULT}22` : 'transparent'),
                                            color: isCD ? '#fff' : (hasE ? 'var(--accent-color)' : 'var(--text-secondary)'),
                                            fontWeight: isCD || hasE ? 700 : 400, width: 14, height: 14
                                        }}>{d}</div>;
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ─ Day view ─ */}
            {zoom === 3 && (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{fmt(curDate)}</h3>
                    {(byDate[fmt(curDate)] || []).map((item: any) => {
                        const ac = accent(item);
                        return (
                            <div key={item.id}
                                onClick={() => onOpenContent ? onOpenContent(item.id) : router.push(`/content/${item.id}`)}
                                style={{
                                    padding: '10px 14px', border: `1px solid ${ac}33`,
                                    borderLeft: `5px solid ${ac}`, borderRadius: 10,
                                    background: accentBg(item), cursor: 'pointer',
                                    boxShadow: `0 2px 8px ${ac}11`, transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'none'}>
                                <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{renderProps(item)}</div>
                            </div>
                        );
                    })}
                    {(byDate[fmt(curDate)] || []).length === 0 && (
                        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13, padding: '40px 0', opacity: 0.5 }}>
                            No items scheduled for this day.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

const BTN: React.CSSProperties = {
    background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 7,
    padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.15s',
};

function getTypeIcon(type: string) {
    const p = { size: 10, strokeWidth: 2.5 };
    switch (type) {
        case 'TEXT': return <Type {...p} />;
        case 'NUMBER': return <Hash {...p} />;
        case 'CURRENCY': return <DollarSign {...p} />;
        case 'PERCENT': return <Percent {...p} />;
        case 'SELECT': return <Menu {...p} />;
        case 'DATE': return <CalIcon {...p} />;
        case 'PERSON': return <User {...p} />;
        default: return <Hash {...p} />;
    }
}
