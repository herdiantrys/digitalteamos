'use client';

import { useState, useMemo, useRef, useEffect, useTransition, Fragment } from 'react';
import { updateTaskStatus, deleteTask } from '../../../lib/task-actions';
import {
    ArrowUp, ArrowDown, ArrowUpDown,
    ChevronDown, ChevronRight,
    Trash2, X, Search, Users
} from 'lucide-react';

type SortDir = 'asc' | 'desc' | null;
type SortCol = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee' | 'relation';
type GroupBy = 'STATUS' | 'PRIORITY' | 'ASSIGNEE' | 'NONE';

const STATUS_ORDER = ['TODO', 'IN_PROGRESS', 'DONE', 'CANCELED'];
const PRIORITY_ORDER = ['HIGH', 'MEDIUM', 'LOW'];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    TODO: { label: 'To Do', color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.12)' },
    IN_PROGRESS: { label: 'In Progress', color: '#3498db', bg: 'rgba(52,152,219,0.12)' },
    DONE: { label: 'Done', color: '#2ecc71', bg: 'rgba(46,204,113,0.12)' },
    CANCELED: { label: 'Canceled', color: '#ff4d4f', bg: 'rgba(255,77,79,0.10)' },
};

const PRIORITY_META: Record<string, { color: string; bg: string }> = {
    HIGH: { color: '#ff4d4f', bg: 'rgba(255,77,79,0.12)' },
    MEDIUM: { color: '#f1c40f', bg: 'rgba(241,196,15,0.12)' },
    LOW: { color: 'var(--text-secondary)', bg: 'rgba(148,163,184,0.08)' },
};

const MIN_COL = 120;

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol | null; sortDir: SortDir }) {
    if (sortCol !== col) return <ArrowUpDown size={12} style={{ opacity: 0.35 }} />;
    if (sortDir === 'asc') return <ArrowUp size={12} style={{ color: '#007aff' }} />;
    return <ArrowDown size={12} style={{ color: '#007aff' }} />;
}

function StatusBadge({ status, onClick }: { status: string; onClick?: (e: React.MouseEvent) => void }) {
    const m = STATUS_META[status] || STATUS_META.TODO;
    return (
        <span
            onClick={onClick}
            title={onClick ? 'Click to cycle status' : undefined}
            style={{
                fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 8,
                color: m.color, background: m.bg, cursor: onClick ? 'pointer' : 'default',
                userSelect: 'none', display: 'inline-block', whiteSpace: 'nowrap',
                transition: 'opacity 0.15s',
                textDecoration: status === 'CANCELED' ? 'line-through' : 'none'
            }}
        >
            {m.label}
        </span>
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const m = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 7,
            color: m.color, background: m.bg, letterSpacing: '0.04em'
        }}>
            {priority}
        </span>
    );
}

function Avatar({ user }: { user: any }) {
    if (!user) return <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
                width: 24, height: 24, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0
            }}>
                {user.photo
                    ? <img src={user.photo} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : user.name.substring(0, 2).toUpperCase()}
            </div>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{user.name}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function TaskTableView({
    tasks: initialTasks,
    users,
    currentUser,
    onDetail,
}: {
    tasks: any[];
    users: any[];
    currentUser: any;
    onDetail: (task: any) => void;
}) {
    const [tasks, setTasks] = useState(initialTasks);
    const [, startTransition] = useTransition();

    useEffect(() => { setTasks(initialTasks); }, [initialTasks]);

    // ── Toolbar state ──
    const [search, setSearch] = useState('');
    const [groupBy, setGroupBy] = useState<GroupBy>('STATUS');

    // ── Sort state ──
    const [sortCol, setSortCol] = useState<SortCol | null>(null);
    const [sortDir, setSortDir] = useState<SortDir>(null);

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

    // ── Column widths ──
    const [colWidths, setColWidths] = useState<Record<string, number>>({
        title: 280, status: 140, priority: 110, dueDate: 130, assignee: 180, relation: 200, actions: 60
    });
    const resizingRef = useRef<{ col: string; startX: number; startW: number } | null>(null);

    // ── Collapsed groups ──
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    // ── Column resize mouse events ──
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!resizingRef.current) return;
            const { col, startX, startW } = resizingRef.current;
            const newW = Math.max(MIN_COL, startW + (e.clientX - startX));
            setColWidths(prev => ({ ...prev, [col]: newW }));
        };
        const onUp = () => { resizingRef.current = null; document.body.style.cursor = ''; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    const startResize = (e: React.MouseEvent, col: string) => {
        e.preventDefault();
        e.stopPropagation();
        resizingRef.current = { col, startX: e.clientX, startW: colWidths[col] };
        document.body.style.cursor = 'col-resize';
    };

    // ── Sort handler ──
    const handleSort = (col: SortCol) => {
        if (sortCol === col) {
            if (sortDir === 'asc') { setSortDir('desc'); }
            else { setSortCol(null); setSortDir(null); }
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    // ── Filter + Sort ──
    const filteredSorted = useMemo(() => {
        let list = tasks.filter(t =>
            !search || t.title.toLowerCase().includes(search.toLowerCase())
        );
        if (sortCol) {
            list = [...list].sort((a, b) => {
                let av: any, bv: any;
                switch (sortCol) {
                    case 'title': av = a.title?.toLowerCase(); bv = b.title?.toLowerCase(); break;
                    case 'status': av = STATUS_ORDER.indexOf(a.status); bv = STATUS_ORDER.indexOf(b.status); break;
                    case 'priority': av = PRIORITY_ORDER.indexOf(a.priority); bv = PRIORITY_ORDER.indexOf(b.priority); break;
                    case 'dueDate': av = a.dueDate ? new Date(a.dueDate).getTime() : 0; bv = b.dueDate ? new Date(b.dueDate).getTime() : 0; break;
                    case 'assignee': av = a.assignees?.[0]?.name?.toLowerCase() ?? 'zzz'; bv = b.assignees?.[0]?.name?.toLowerCase() ?? 'zzz'; break;
                    case 'relation': av = a.relatedItems?.[0]?.title?.toLowerCase() ?? 'zzz'; bv = b.relatedItems?.[0]?.title?.toLowerCase() ?? 'zzz'; break;
                }
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return list;
    }, [tasks, search, sortCol, sortDir]);

    // ── Grouping ──
    const groups = useMemo(() => {
        if (groupBy === 'NONE') return [{ key: 'all', label: '', color: '', items: filteredSorted }];

        const buckets: Record<string, { label: string; color: string; items: any[] }> = {};

        if (groupBy === 'STATUS') {
            STATUS_ORDER.forEach(s => { buckets[s] = { label: STATUS_META[s].label, color: STATUS_META[s].color, items: [] }; });
            filteredSorted.forEach(t => { buckets[t.status]?.items.push(t); });
        } else if (groupBy === 'PRIORITY') {
            PRIORITY_ORDER.forEach(p => { buckets[p] = { label: p, color: PRIORITY_META[p].color, items: [] }; });
            filteredSorted.forEach(t => { buckets[t.priority]?.items.push(t); });
        } else if (groupBy === 'ASSIGNEE') {
            users.forEach(u => { buckets[u.id] = { label: u.name, color: '#007aff', items: [] }; });
            buckets['_none'] = { label: 'Unassigned', color: 'var(--text-secondary)', items: [] };
            filteredSorted.forEach(t => {
                if (t.assignees && t.assignees.length > 0) {
                    t.assignees.forEach((a: any) => {
                        if (buckets[a.id]) buckets[a.id].items.push(t);
                    });
                } else {
                    buckets['_none'].items.push(t);
                }
            });
        }

        return Object.entries(buckets)
            .map(([key, v]) => ({ key, ...v }))
            .filter(g => g.items.length > 0);
    }, [filteredSorted, groupBy, users]);

    // ── Selection helpers ──
    const allIds = filteredSorted.map(t => t.id);
    const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (allSelected) allIds.forEach(id => n.delete(id));
            else allIds.forEach(id => n.add(id));
            return n;
        });
    };
    const toggleOne = (id: string) => {
        setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    // ── Status cycle inline ──
    const cycleStatus = (e: React.MouseEvent, task: any) => {
        e.stopPropagation();
        const canEdit = currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id);
        if (!canEdit) return;
        const idx = STATUS_ORDER.indexOf(task.status);
        const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
        startTransition(() => updateTaskStatus(task.id, next));
    };

    // ── Bulk delete ──
    const handleBulkDelete = () => {
        const ids = [...selectedIds];
        setConfirmBulkDelete(false);
        setTasks(prev => prev.filter(t => !ids.includes(t.id)));
        setSelectedIds(new Set());
        ids.forEach(id => startTransition(() => deleteTask(id)));
    };

    // ── Header cell ──
    const Th = ({ col, label, style: extraStyle }: { col: SortCol; label: string; style?: React.CSSProperties }) => (
        <th
            onClick={() => handleSort(col)}
            style={{
                padding: '13px 14px', width: colWidths[col as string], minWidth: MIN_COL,
                position: 'relative', cursor: 'pointer', userSelect: 'none',
                borderRight: '1px solid var(--border-color)', boxSizing: 'border-box',
                ...extraStyle
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
                {label}
            </div>
            {/* Resizer */}
            <div
                onMouseDown={e => startResize(e, col as string)}
                onClick={e => e.stopPropagation()}
                style={{
                    position: 'absolute', right: -4, top: 0, bottom: 0, width: 8,
                    cursor: 'col-resize', zIndex: 10
                }}
            />
        </th>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 16, overflow: 'hidden' }}>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border-color)', background: 'rgba(55,53,47,0.02)', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 12px', flex: '1 1 200px', maxWidth: 320 }}>
                    <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-primary)', width: '100%' }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0, display: 'flex' }}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Group by */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} style={{ color: 'var(--text-secondary)' }} />
                    <select
                        value={groupBy}
                        onChange={e => setGroupBy(e.target.value as GroupBy)}
                        style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                        <option value="NONE">No grouping</option>
                        <option value="STATUS">Group by Status</option>
                        <option value="PRIORITY">Group by Priority</option>
                        <option value="ASSIGNEE">Group by Assignee</option>
                    </select>
                </div>

                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {filteredSorted.length} task{filteredSorted.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* ── Bulk action bar ── */}
            {someSelected && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', background: 'rgba(0,122,255,0.04)',
                    borderBottom: '1px solid rgba(0,122,255,0.15)', flexWrap: 'wrap'
                }}>
                    <div style={{ background: '#007aff', color: '#fff', width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>
                        {selectedIds.size}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>selected</span>
                    <button onClick={() => setSelectedIds(new Set())} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 12, border: '1px solid var(--border-color)', background: 'var(--bg-color)', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <X size={12} /> Deselect
                    </button>
                    <div style={{ height: 20, width: 1, background: 'var(--border-color)' }} />
                    {!confirmBulkDelete ? (
                        <button
                            onClick={() => setConfirmBulkDelete(true)}
                            style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,77,79,0.25)', background: 'rgba(255,77,79,0.06)', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <Trash2 size={13} /> Delete
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 700 }}>Confirm delete?</span>
                            <button onClick={handleBulkDelete} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Yes</button>
                            <button onClick={() => setConfirmBulkDelete(false)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'var(--bg-color)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>No</button>
                        </div>
                    )}
                </div>
            )}

            {/* ── Table ── */}
            <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: 13 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg-color)', boxShadow: '0 1px 0 var(--border-color)' }}>
                        <tr>
                            {/* Checkbox */}
                            <th style={{ width: 44, padding: '13px 14px', textAlign: 'center', borderRight: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                                    onChange={toggleAll}
                                    style={{ cursor: 'pointer', accentColor: '#007aff', width: 15, height: 15 }}
                                />
                            </th>
                            <Th col="title" label="Title" />
                            <Th col="status" label="Status" />
                            <Th col="priority" label="Priority" />
                            <Th col="dueDate" label="Due Date" />
                            <Th col="assignee" label="Assignee" />
                            <Th col="relation" label="Related" />
                            {/* Actions */}
                            <th style={{ width: colWidths.actions, padding: '13px 14px', boxSizing: 'border-box' }} />
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSorted.length === 0 && (
                            <tr>
                                <td colSpan={8} style={{ padding: 64, textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <div style={{ fontSize: 32, marginBottom: 12 }}>🗂️</div>
                                    <div style={{ fontSize: 14, fontWeight: 600 }}>No tasks found</div>
                                    {search && <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search term</div>}
                                </td>
                            </tr>
                        )}

                        {groups.map(group => (
                            <Fragment key={group.key}>
                                {/* Group header */}
                                {group.label && (
                                    <tr key={`gh-${group.key}`}>
                                        <td colSpan={8} style={{ padding: 0, background: 'rgba(55,53,47,0.025)', borderBottom: '1px solid var(--border-color)' }}>
                                            <button
                                                onClick={() => setCollapsed(prev => ({ ...prev, [group.key]: !prev[group.key] }))}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 7, width: '100%',
                                                    padding: '9px 16px', background: 'transparent', border: 'none',
                                                    cursor: 'pointer', textAlign: 'left'
                                                }}
                                            >
                                                {collapsed[group.key]
                                                    ? <ChevronRight size={14} color="var(--text-secondary)" />
                                                    : <ChevronDown size={14} color="var(--text-secondary)" />}
                                                <span style={{ fontSize: 11, fontWeight: 800, color: group.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                                    {group.label}
                                                </span>
                                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 7px', borderRadius: 10, fontWeight: 600 }}>
                                                    {group.items.length}
                                                </span>
                                            </button>
                                        </td>
                                    </tr>
                                )}

                                {/* Rows */}
                                {!collapsed[group.key] && group.items.map((task: any, rowIdx: number) => {
                                    const isSelected = selectedIds.has(task.id);
                                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELED';
                                    const canEdit = currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id);

                                    return (
                                        <tr
                                            key={task.id}
                                            onClick={() => onDetail(task)}
                                            style={{
                                                borderBottom: '1px solid var(--border-color)',
                                                background: isSelected ? 'rgba(0,122,255,0.04)' : 'transparent',
                                                cursor: 'pointer',
                                                transition: 'background 0.15s',
                                                borderLeft: isSelected ? '2px solid #007aff' : '2px solid transparent',
                                            }}
                                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover-bg)'; }}
                                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                                        >
                                            {/* Checkbox */}
                                            <td style={{ padding: '12px 14px', textAlign: 'center', width: 44 }} onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleOne(task.id)}
                                                    style={{ cursor: 'pointer', accentColor: '#007aff', width: 15, height: 15 }}
                                                />
                                            </td>

                                            {/* Title */}
                                            <td style={{ padding: '12px 14px', width: colWidths.title, maxWidth: colWidths.title, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                                                {task.title}
                                            </td>

                                            {/* Status */}
                                            <td style={{ padding: '12px 14px', width: colWidths.status }} onClick={e => e.stopPropagation()}>
                                                <StatusBadge status={task.status} onClick={canEdit ? e => cycleStatus(e, task) : undefined} />
                                            </td>

                                            {/* Priority */}
                                            <td style={{ padding: '12px 14px', width: colWidths.priority }}>
                                                <PriorityBadge priority={task.priority} />
                                            </td>

                                            {/* Due Date */}
                                            <td style={{
                                                padding: '12px 14px', width: colWidths.dueDate, fontSize: 12,
                                                color: isOverdue ? '#ff4d4f' : (task.dueDate ? 'var(--text-primary)' : 'var(--text-secondary)'),
                                                fontWeight: isOverdue ? 700 : 500
                                            }}>
                                                {task.dueDate
                                                    ? new Date(task.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                    : '—'}
                                                {isOverdue && <span style={{ marginLeft: 5 }}>⚠️</span>}
                                            </td>

                                            {/* Assignee */}
                                            <td style={{ padding: '12px 14px', width: colWidths.assignee }}>
                                                {task.assignees && task.assignees.length > 0 ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        {task.assignees.map((a: any) => (
                                                            <Avatar key={a.id} user={a} />
                                                        ))}
                                                    </div>
                                                ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                                            </td>

                                            {/* Relation */}
                                            <td style={{ padding: '12px 14px', width: colWidths.relation }}>
                                                {task.relatedItems && task.relatedItems.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                        {task.relatedItems.map((rItem: any) => (
                                                            <span key={rItem.id} style={{
                                                                fontSize: 11, background: 'var(--sidebar-bg)', padding: '4px 9px',
                                                                borderRadius: 7, border: '1px solid var(--border-color)',
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                                            }}>
                                                                {rItem.database?.icon || '📄'} {rItem.title}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>—</span>}
                                            </td>

                                            {/* Delete action */}
                                            <td style={{ padding: '12px 14px', width: colWidths.actions, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Delete this task?')) {
                                                                setTasks(prev => prev.filter(t => t.id !== task.id));
                                                                startTransition(() => deleteTask(task.id));
                                                            }
                                                        }}
                                                        style={{
                                                            background: 'transparent', border: 'none', cursor: 'pointer',
                                                            color: 'var(--text-secondary)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'all 0.15s'
                                                        }}
                                                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,79,0.1)'; e.currentTarget.style.color = '#ff4d4f'; }}
                                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                                        title="Delete task"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <style>{`
                thead tr th { background: var(--bg-color); }
                thead tr th:hover { background: rgba(0,0,0,0.015); }
            `}</style>
        </div>
    );
}
