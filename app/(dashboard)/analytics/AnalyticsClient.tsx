'use client';

import { useState } from 'react';
import { BarChart2, CheckCircle2, FileText, Users, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Target, Clock, Download } from 'lucide-react';

type Period = 'day' | 'week' | 'month' | 'year';

type PeriodData = {
    label: string;
    contentCreated: number;
    tasksDone: number;
    tasksTotal: number;
};

type MemberStat = {
    id: string;
    name: string;
    photo: string | null;
    role: string;
    contentCreated: number;
    tasksDone: number;
    tasksTotal: number;
    tasksInProgress: number;
};

type AnalyticsData = {
    day: PeriodData[];
    week: PeriodData[];
    month: PeriodData[];
    year: PeriodData[];
    members: MemberStat[];
    totals: {
        day: { content: number; tasksDone: number; tasksTotal: number };
        week: { content: number; tasksDone: number; tasksTotal: number };
        month: { content: number; tasksDone: number; tasksTotal: number };
        year: { content: number; tasksDone: number; tasksTotal: number };
    };
};

function getChange(current: number, prev: number): { pct: number; dir: 'up' | 'down' | 'flat' } {
    if (prev === 0 && current === 0) return { pct: 0, dir: 'flat' };
    if (prev === 0) return { pct: 100, dir: 'up' };
    const pct = Math.round(((current - prev) / prev) * 100);
    return { pct: Math.abs(pct), dir: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' };
}

function TrendBadge({ current, prev }: { current: number; prev: number }) {
    const { pct, dir } = getChange(current, prev);
    const colors = { up: '#10b981', down: '#ef4444', flat: '#6b7280' };
    const icons = {
        up: <ArrowUpRight size={12} />,
        down: <ArrowDownRight size={12} />,
        flat: <Minus size={12} />
    };
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 700, color: colors[dir],
            background: `${colors[dir]}1a`, padding: '2px 7px', borderRadius: 20,
            border: `1px solid ${colors[dir]}33`
        }}>
            {icons[dir]}{pct}%
        </span>
    );
}

function BarChart({ data, metric, color }: { data: PeriodData[]; metric: 'contentCreated' | 'tasksDone'; color: string }) {
    if (!data || data.length === 0) return (
        <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No data for this period
        </div>
    );
    const max = Math.max(...data.map(d => d[metric]), 1);
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, paddingTop: 8 }}>
            {data.map((d, i) => {
                const h = Math.max((d[metric] / max) * 120, d[metric] > 0 ? 4 : 0);
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                        <div title={`${d[metric]}`} style={{
                            width: '100%', maxWidth: 28, height: h,
                            background: d[metric] > 0 ? `linear-gradient(180deg, ${color}ee, ${color}88)` : 'var(--border-color)',
                            borderRadius: '4px 4px 2px 2px',
                            transition: 'height 0.5s cubic-bezier(0.34,1.56,0.64,1)',
                            cursor: 'default',
                            boxShadow: d[metric] > 0 ? `0 4px 12px ${color}44` : 'none'
                        }} />
                        <span style={{ fontSize: 9, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center' }}>
                            {d.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function StatCard({
    title, value, subtitle, icon, color, prevValue
}: {
    title: string; value: number; subtitle: string; icon: React.ReactNode; color: string; prevValue?: number;
}) {
    return (
        <div style={{
            background: 'var(--bg-color)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: '22px 24px',
            position: 'relative', overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
        }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 32px ${color}22`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
        >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: color, filter: 'blur(60px)', opacity: 0.15, borderRadius: '50%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, position: 'relative' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}1a`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                    {icon}
                </div>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.02em', position: 'relative' }}>{value.toLocaleString()}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{subtitle}</span>
                {prevValue !== undefined && <TrendBadge current={value} prev={prevValue} />}
            </div>
        </div>
    );
}

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
    const [period, setPeriod] = useState<Period>('month');

    const periodLabel: Record<Period, string> = {
        day: 'Today (hourly)',
        week: 'This Week (daily)',
        month: 'This Month (weekly)',
        year: 'This Year (monthly)',
    };

    const prevPeriod: Record<Period, Period> = {
        day: 'day', week: 'day', month: 'week', year: 'month'
    };

    const curr = data.totals[period];
    const prev = data.totals[prevPeriod[period]];
    const chartData = data[period];

    const completionRate = curr.tasksTotal > 0 ? Math.round((curr.tasksDone / curr.tasksTotal) * 100) : 0;

    return (
        <div id="analytics-print-root">
            <style>{`
                /* ── Screen styles ───────────────────── */
                .analytics-period-btn {
                    padding: 8px 20px; border-radius: 8px; font-size: 13px; font-weight: 600;
                    border: 1px solid var(--border-color); cursor: pointer;
                    background: transparent; color: var(--text-secondary);
                    transition: all 0.2s; letter-spacing: 0.01em;
                }
                .analytics-period-btn:hover { background: var(--hover-bg); color: var(--text-primary); }
                .analytics-period-btn.active { background: var(--accent-color); color: #fff; border-color: var(--accent-color); box-shadow: 0 4px 12px rgba(46,170,220,0.3); }
                .analytics-member-row:hover { background: var(--hover-bg) !important; }
                .progress-bar { transition: width 0.6s cubic-bezier(0.34,1.56,0.64,1); }
                .analytics-no-print { }

                /* ── Print styles ─────────────────────── */
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 12mm 14mm 12mm 14mm;
                    }

                    /* Hide everything but our report */
                    body * { visibility: hidden !important; }
                    #analytics-print-root, #analytics-print-root * { visibility: visible !important; }
                    #analytics-print-root { position: fixed; top: 0; left: 0; width: 100%; }

                    /* Reset layout for print */
                    .analytics-no-print { display: none !important; }

                    /* Force white background + dark text everywhere */
                    #analytics-print-root { background: #fff !important; color: #1a1a2e !important; }
                    #analytics-print-root [style*="background"] { background: transparent !important; }
                    #analytics-print-root [style*="border"] { border-color: #e0e0e0 !important; }
                    #analytics-print-root [style*="color: var(--text-secondary)"] { color: #666 !important; }
                    #analytics-print-root [style*="color: var(--text-primary)"] { color: #111 !important; }
                    
                    /* Force stat/chart cards to white with border */
                    #analytics-print-root .print-card {
                        background: #fff !important;
                        border: 1px solid #ddd !important;
                        break-inside: avoid;
                    }
                    
                    /* KPI grid: 2 columns on A4 */
                    .print-kpi-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                        margin-bottom: 16px !important;
                    }

                    /* Charts: side by side */
                    .print-chart-grid {
                        display: grid !important;
                        grid-template-columns: 1fr 1fr !important;
                        gap: 10px !important;
                        margin-bottom: 16px !important;
                    }

                    /* Progress bar: force background color print */
                    .print-progress-fill {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Bar chart bars: force color */
                    .print-bar {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    /* Member table */
                    .print-member-table { break-inside: auto; }
                    .analytics-member-row { break-inside: avoid; }

                    /* Page breaks */
                    .print-break-before { break-before: page; }
                }
            `}</style>

            {/* ── Toolbar (screen only) ── */}
            <div className="analytics-no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                {/* Period Switcher */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(['day', 'week', 'month', 'year'] as Period[]).map(p => (
                        <button
                            key={p}
                            className={`analytics-period-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
                        </button>
                    ))}
                </div>

                {/* Export PDF Button */}
                <button
                    onClick={() => window.print()}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #2eaadc, #8b5cf6)',
                        color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '0.01em',
                        boxShadow: '0 4px 16px rgba(46,170,220,0.35)',
                        transition: 'opacity 0.2s, transform 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                    <Download size={15} />
                    Export PDF
                </button>
            </div>

            {/* Period Label (screen only) */}
            <p className="analytics-no-print" style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24, fontStyle: 'italic' }}>
                📅 Showing: <strong style={{ color: 'var(--text-primary)' }}>{periodLabel[period]}</strong>
            </p>

            {/* KPI Cards */}
            <div className="print-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 32 }}>
                <div className="print-card">
                    <StatCard
                        title="Content Created"
                        value={curr.content}
                        subtitle="pieces of content"
                        icon={<FileText size={18} />}
                        color="#2eaadc"
                        prevValue={prev.content}
                    /></div>
                <div className="print-card">
                    <StatCard
                        title="Tasks Completed"
                        value={curr.tasksDone}
                        subtitle={`of ${curr.tasksTotal} total tasks`}
                        icon={<CheckCircle2 size={18} />}
                        color="#10b981"
                        prevValue={prev.tasksDone}
                    /></div>
                <div className="print-card">
                    <StatCard
                        title="Tasks Total"
                        value={curr.tasksTotal}
                        subtitle="assigned in period"
                        icon={<Target size={18} />}
                        color="#f59e0b"
                        prevValue={prev.tasksTotal}
                    /></div>
                <div className="print-card">
                    <StatCard
                        title="Completion Rate"
                        value={completionRate}
                        subtitle="% tasks done"
                        icon={<TrendingUp size={18} />}
                        color="#8b5cf6"
                    /></div>
            </div>

            {/* Charts Row */}
            <div className="print-chart-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
                {/* Content Chart */}
                <div className="print-card" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#2eaadc1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BarChart2 size={16} color="#2eaadc" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Content Created</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>per period breakdown</div>
                        </div>
                    </div>
                    <BarChart data={chartData} metric="contentCreated" color="#2eaadc" />
                </div>

                {/* Tasks Done Chart */}
                <div className="print-card" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10b9811a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle2 size={16} color="#10b981" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Tasks Completed</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>per period breakdown</div>
                        </div>
                    </div>
                    <BarChart data={chartData} metric="tasksDone" color="#10b981" />
                </div>
            </div>

            {/* Task Completion Progress */}
            <div style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#8b5cf61a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Clock size={16} color="#8b5cf6" />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Team Completion Rate</div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>overall progress for {period}</div>
                        </div>
                    </div>
                    <span style={{ fontSize: 32, fontWeight: 800, color: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#f59e0b' : '#ef4444', letterSpacing: '-0.02em' }}>
                        {completionRate}%
                    </span>
                </div>
                <div style={{ height: 12, background: 'var(--border-color)', borderRadius: 99, overflow: 'hidden' }}>
                    <div
                        className="progress-bar"
                        style={{
                            height: '100%',
                            width: `${completionRate}%`,
                            background: completionRate >= 80
                                ? 'linear-gradient(90deg, #10b981, #059669)'
                                : completionRate >= 50
                                    ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                            borderRadius: 99,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span>0 done</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>{curr.tasksDone} completed</span>
                    <span>{curr.tasksTotal} total</span>
                </div>
            </div>

            {/* Member Leaderboard */}
            <div className="print-card print-member-table print-break-before" style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f59e0b1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Users size={16} color="#f59e0b" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>Member Performance</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>individual productivity stats — all-time</div>
                    </div>
                </div>

                {/* Table Header */}
                <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                    padding: '8px 16px', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em',
                    borderBottom: '1px solid var(--border-color)', marginBottom: 4
                }}>
                    <span>Member</span>
                    <span style={{ textAlign: 'center' }}>Content</span>
                    <span style={{ textAlign: 'center' }}>Done</span>
                    <span style={{ textAlign: 'center' }}>In Progress</span>
                    <span style={{ textAlign: 'center' }}>Rate</span>
                </div>

                {data.members.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                        No member data found.
                    </div>
                ) : data.members.map((m, i) => {
                    const rate = m.tasksTotal > 0 ? Math.round((m.tasksDone / m.tasksTotal) * 100) : 0;
                    const hue = Math.abs(m.name.charCodeAt(0) * 7 + (m.name.charCodeAt(1) || 0) * 13) % 360;
                    const initials = m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    const rateColor = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : rate > 0 ? '#ef4444' : 'var(--text-secondary)';

                    return (
                        <div
                            key={m.id}
                            className="analytics-member-row"
                            style={{
                                display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
                                padding: '14px 16px', borderRadius: 10, alignItems: 'center',
                                background: 'transparent', transition: 'background 0.15s',
                                borderBottom: i < data.members.length - 1 ? '1px solid var(--border-color)' : 'none'
                            }}
                        >
                            {/* Member */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: `hsl(${hue}, 55%, 22%)`, border: `2px solid hsl(${hue}, 65%, 40%)`,
                                    fontSize: 12, fontWeight: 700, color: `hsl(${hue}, 80%, 80%)`
                                }}>
                                    {m.photo
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={m.photo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : initials}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                                    <div style={{
                                        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                                        padding: '1px 7px', borderRadius: 20, display: 'inline-block', marginTop: 2,
                                        background: m.role === 'ADMIN' ? '#2eaadc22' : '#10b98122',
                                        color: m.role === 'ADMIN' ? '#2eaadc' : '#10b981',
                                        border: `1px solid ${m.role === 'ADMIN' ? '#2eaadc44' : '#10b98144'}`
                                    }}>
                                        {m.role}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: '#2eaadc' }}>{m.contentCreated}</div>

                            {/* Tasks Done */}
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: '#10b981' }}>{m.tasksDone}</div>

                            {/* In Progress */}
                            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: '#f59e0b' }}>{m.tasksInProgress}</div>

                            {/* Rate */}
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                                <div style={{
                                    height: 6, flex: 1, background: 'var(--border-color)',
                                    borderRadius: 99, maxWidth: 60, overflow: 'hidden'
                                }}>
                                    <div style={{
                                        height: '100%', width: `${rate}%`,
                                        background: rateColor, borderRadius: 99,
                                        transition: 'width 0.5s'
                                    }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, color: rateColor, minWidth: 32 }}>{rate}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
