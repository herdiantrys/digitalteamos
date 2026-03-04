'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ──────────────────────────────────────────────────────────────────────────────
// Constants & Helpers
// ──────────────────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

type ZoomLevel = 'day' | 'week' | 'month';
type GroupBy = 'platform' | 'none';

const COL_WIDTH: Record<ZoomLevel, number> = { day: 40, week: 28, month: 22 };

function daysBetween(a: Date, b: Date) {
    return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(d: Date, n: number) {
    const res = new Date(d);
    res.setDate(res.getDate() + n);
    return res;
}

function startOfWeek(d: Date) {
    const r = new Date(d);
    r.setDate(r.getDate() - r.getDay());
    return r;
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline Header (month labels + day ticks)
// ──────────────────────────────────────────────────────────────────────────────
function TimelineHeader({ startDate, totalDays, zoom, colW, todayOffset }: {
    startDate: Date; totalDays: number; zoom: ZoomLevel; colW: number; todayOffset: number;
}) {
    // Build month spans
    const monthSpans: { label: string; startIdx: number; span: number }[] = [];
    let cur = new Date(startDate);
    for (let i = 0; i < totalDays;) {
        const month = cur.getMonth();
        const year = cur.getFullYear();
        let count = 0;
        while (i + count < totalDays && new Date(startDate).setDate(startDate.getDate() + i + count), new Date(startDate.getTime() + (i + count) * 86_400_000).getMonth() === month) {
            count++;
        }
        monthSpans.push({ label: `${FULL_MONTH[month]} ${year}`, startIdx: i, span: count });
        i += count;
        cur = new Date(startDate.getTime() + i * 86_400_000);
    }

    return (
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', borderBottom: '1px solid var(--border-color)' }}>
            {/* Month row */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                {monthSpans.map((ms, i) => (
                    <div key={i} style={{
                        width: ms.span * colW,
                        flexShrink: 0,
                        padding: '6px 8px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        borderRight: '1px solid var(--border-color)',
                        whiteSpace: 'nowrap', overflow: 'hidden'
                    }}>
                        {ms.label}
                    </div>
                ))}
            </div>
            {/* Day / Week ticks */}
            <div style={{ display: 'flex', position: 'relative' }}>
                {Array.from({ length: totalDays }, (_, i) => {
                    const d = new Date(startDate.getTime() + i * 86_400_000);
                    const isToday = isSameDay(d, new Date());
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                    if (zoom === 'month' && d.getDate() !== 1 && d.getDate() % 7 !== 1) {
                        return (
                            <div key={i} style={{ width: colW, flexShrink: 0, borderRight: '1px solid transparent', background: isWeekend ? 'rgba(255,255,255,0.02)' : undefined }}>
                                {isToday && <div style={{ width: 2, height: '100%', background: 'hsl(10, 90%, 60%)', position: 'absolute', left: i * colW + colW / 2 }} />}
                            </div>
                        );
                    }

                    return (
                        <div key={i} style={{
                            width: colW, flexShrink: 0,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '4px 0',
                            borderRight: '1px solid var(--border-color)',
                            background: isToday
                                ? 'hsl(10, 90%, 15%)'
                                : isWeekend
                                    ? 'rgba(255,255,255,0.015)'
                                    : undefined,
                            fontSize: 10,
                            fontWeight: isToday ? 700 : 400,
                            color: isToday ? 'hsl(10, 90%, 70%)' : isWeekend ? 'var(--text-secondary)' : 'var(--text-primary)'
                        }}>
                            {zoom !== 'month' && <span style={{ opacity: 0.5 }}>{DAY_LABELS[d.getDay()]}</span>}
                            <span>{d.getDate()}</span>
                        </div>
                    );
                })}
                {/* Today red line */}
                {todayOffset >= 0 && todayOffset < totalDays && (
                    <div style={{
                        position: 'absolute', top: 0, bottom: 0,
                        left: todayOffset * colW + colW / 2 - 1,
                        width: 2, background: 'hsl(10, 90%, 60%)',
                        pointerEvents: 'none'
                    }} />
                )}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline Bar (a single content item as a horizontal pill)
// ──────────────────────────────────────────────────────────────────────────────
function TimelineBar({ content, startDate, totalDays, colW, datePropId, properties }: {
    content: any; startDate: Date; totalDays: number; colW: number; datePropId: string | null; properties: any[];
}) {
    const getDate = (c: any): Date | null => {
        if (!datePropId) return null;
        try {
            const fields = JSON.parse(c.customFields || '{}');
            const v = fields[datePropId];
            if (!v) return null;
            const d = new Date(v);
            return isNaN(d.getTime()) ? null : d;
        } catch { return null; }
    };

    const date = getDate(content);
    if (!date) return null;

    const offset = daysBetween(startDate, date);
    if (offset < 0 || offset >= totalDays) return null;

    const color = 'hsl(210, 60%, 60%)';
    const left = offset * colW;
    const router = useRouter();

    return (
        <div
            title={`${content.title}\n${date.toLocaleDateString()}\nClick to open detail`}
            onClick={() => router.push(`/content/${content.id}`)}
            style={{
                position: 'absolute',
                left: left + 2,
                top: '50%',
                transform: 'translateY(-50%)',
                height: 26,
                minWidth: colW * 2,
                maxWidth: (totalDays - offset) * colW - 4,
                background: color,
                borderRadius: 6,
                display: 'flex', alignItems: 'center',
                padding: '0 10px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: 12, fontWeight: 600,
                color: '#fff',
                boxShadow: `0 2px 8px ${color}55`,
                cursor: 'pointer',
                userSelect: 'none',
                zIndex: 2,
                transition: 'filter 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.filter = 'brightness(1.15)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-50%) scaleY(1.08)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.filter = ''; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-50%)'; }}
        >
            {content.title}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Timeline Row (a group section)
// ──────────────────────────────────────────────────────────────────────────────
function TimelineGroup({ label, contents, startDate, totalDays, colW, datePropId, color, todayOffset, properties }: {
    label: string; contents: any[]; startDate: Date; totalDays: number; colW: number;
    datePropId: string | null; color: string; todayOffset: number; properties: any[];
}) {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div style={{ borderBottom: '1px solid var(--border-color)' }}>
            {/* Group header */}
            <div
                onClick={() => setCollapsed(c => !c)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    background: 'var(--sidebar-bg)',
                    borderBottom: '1px solid var(--border-color)',
                    position: 'sticky', left: 0, zIndex: 5,
                    width: '100%', boxSizing: 'border-box'
                }}
            >
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', transition: 'transform 0.2s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>▾</span>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>({contents.length})</span>
            </div>

            {!collapsed && contents.map(c => (
                <div key={c.id} style={{ position: 'relative', height: 44, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    {/* Row background — weekend shading + today line */}
                    {Array.from({ length: totalDays }, (_, i) => {
                        const d = new Date(startDate.getTime() + i * 86_400_000);
                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                        if (!isWeekend && i !== todayOffset) return null;
                        return (
                            <div key={i} style={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: i * colW, width: colW,
                                background: i === todayOffset ? 'hsl(10, 90%, 10%, 0.3)' : 'rgba(255,255,255,0.018)',
                                pointerEvents: 'none'
                            }} />
                        );
                    })}
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < totalDays && (
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayOffset * colW + colW / 2 - 1, width: 2, background: 'hsl(10, 90%, 60%)', opacity: 0.4, pointerEvents: 'none', zIndex: 1 }} />
                    )}
                    <TimelineBar content={c} startDate={startDate} totalDays={totalDays} colW={colW} datePropId={datePropId} properties={properties} />
                </div>
            ))}
        </div>
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main TimelineView Component
// ──────────────────────────────────────────────────────────────────────────────
export default function TimelineView({ contents, properties }: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    const today = useMemo(() => new Date(), []);
    const [zoom, setZoom] = useState<ZoomLevel>('week');
    const [groupBy, setGroupBy] = useState<GroupBy>('platform');
    const [datePropId, setDatePropId] = useState<string | null>(() => {
        const dp = properties.find(p => p.type === 'DATE');
        return dp?.id ?? null;
    });
    const scrollRef = useRef<HTMLDivElement>(null);

    // Build date range: 3 months back → 3 months forward
    const rangeStart = useMemo(() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() - 2);
        d.setDate(1);
        return d;
    }, [today]);

    const rangeEnd = useMemo(() => {
        const d = new Date(today);
        d.setMonth(d.getMonth() + 4);
        d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
        return d;
    }, [today]);

    const totalDays = daysBetween(rangeStart, rangeEnd) + 1;
    const colW = COL_WIDTH[zoom];
    const todayOffset = daysBetween(rangeStart, today);

    // Scroll to today on mount / zoom change
    useEffect(() => {
        if (scrollRef.current) {
            const targetScroll = Math.max(0, todayOffset * colW - 300);
            scrollRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
        }
    }, [zoom, todayOffset, colW]);

    // Group contents
    const groups = useMemo((): { label: string; items: any[]; color: string }[] => {
        if (groupBy === 'none') return [{ label: 'All Content', items: contents, color: 'hsl(210, 70%, 60%)' }];

        const platformProp = properties.find(p => p.name.toLowerCase().includes('platform'));

        const map = new Map<string, any[]>();
        for (const c of contents) {
            const cd = JSON.parse(c.customFields || '{}');
            let key = 'Unset';
            if (groupBy === 'platform' && platformProp) {
                key = cd[platformProp.id] || 'Unset';
            }
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(c);
        }
        const palette = [
            'hsl(210, 70%, 60%)', 'hsl(280, 65%, 60%)', 'hsl(145, 60%, 50%)',
            'hsl(30, 90%, 58%)', 'hsl(340, 70%, 60%)', 'hsl(190, 65%, 55%)',
        ];

        return Array.from(map.entries()).map(([label, items], i) => ({
            label: label || 'Unset',
            items,
            color: palette[i % palette.length]
        })).sort((a, b) => a.label.localeCompare(b.label));
    }, [contents, groupBy, properties]);

    // Filter date properties
    const dateProps = properties.filter(p => p.type === 'DATE');

    const totalW = totalDays * colW;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400, overflow: 'hidden', border: '1px solid var(--border-color)', borderRadius: 12, background: 'var(--bg-color)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>

            {/* ── Toolbar ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                flexWrap: 'wrap', flexShrink: 0
            }}>
                {/* Date Property selector */}
                {dateProps.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Date Property:</span>
                        <select
                            value={datePropId || ''}
                            onChange={e => setDatePropId(e.target.value || null)}
                            style={{ padding: '5px 10px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', cursor: 'pointer', outline: 'none' }}
                        >
                            {dateProps.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                )}

                {/* Group By */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>Group By:</span>
                    <div style={{ display: 'flex', background: 'var(--bg-color)', padding: 2, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        {(['platform', 'none'] as GroupBy[]).map(g => (
                            <button key={g} onClick={() => setGroupBy(g)} style={{
                                padding: '4px 12px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                                border: 'none',
                                background: groupBy === g ? 'var(--text-primary)' : 'transparent',
                                color: groupBy === g ? 'var(--bg-color)' : 'var(--text-secondary)',
                                fontWeight: groupBy === g ? 600 : 500,
                                transition: 'all 0.2s',
                                textTransform: 'capitalize'
                            }}>{g === 'none' ? 'Off' : g}</button>
                        ))}
                    </div>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Today button */}
                    <button onClick={() => scrollRef.current?.scrollTo({ left: Math.max(0, todayOffset * colW - 300), behavior: 'smooth' })}
                        style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--sidebar-bg)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-color)')}
                    >
                        Today
                    </button>

                    {/* Zoom */}
                    <div style={{ display: 'flex', background: 'var(--bg-color)', padding: 2, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                        {(['day', 'week', 'month'] as ZoomLevel[]).map(z => (
                            <button key={z} onClick={() => setZoom(z)} style={{
                                padding: '4px 12px', fontSize: 12, border: 'none', cursor: 'pointer', borderRadius: 6,
                                background: zoom === z ? 'var(--text-primary)' : 'transparent',
                                color: zoom === z ? 'var(--bg-color)' : 'var(--text-secondary)',
                                fontWeight: zoom === z ? 600 : 500,
                                transition: 'all 0.2s',
                                textTransform: 'capitalize'
                            }}>{z}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Scrollable Timeline Body ── */}
            <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
                <div style={{ width: totalW, minWidth: '100%', position: 'relative' }}>

                    {/* Header */}
                    <TimelineHeader startDate={rangeStart} totalDays={totalDays} zoom={zoom} colW={colW} todayOffset={todayOffset} />

                    {/* Groups */}
                    {groups.map(group => (
                        <TimelineGroup
                            key={group.label}
                            label={group.label}
                            contents={group.items}
                            startDate={rangeStart}
                            totalDays={totalDays}
                            colW={colW}
                            datePropId={datePropId}
                            color={group.color}
                            todayOffset={todayOffset}
                            properties={properties}
                        />
                    ))}

                    {/* Empty state inside grid */}
                    {groups.every(g => g.items.length === 0) && (
                        <div style={{ padding: 64, textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div style={{ fontSize: 40, marginBottom: 16 }}>🗓️</div>
                            <div style={{ fontSize: 15, fontWeight: 500 }}>No content matches your filters.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

