'use client';

import { useState, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import EditableCell from './EditableCell';
import { deleteContent, bulkDeleteContent } from '../../../lib/content-actions';

// ─── Constants ────────────────────────────────────────────────────────────────
function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
        TEXT: 'T', NUMBER: '#', SELECT: '▾', MULTI_SELECT: '◫',
        DATE: '📅', PERSON: '👤', CHECKBOX: '☑', URL: '🔗',
        EMAIL: '@', PHONE: '☎',
    };
    return icons[type] ?? '○';
}

// ─── Single-row delete with confirmation ──────────────────────────────────────
function DeleteButton({ contentId }: { contentId: string }) {
    const [confirming, setConfirming] = useState(false);
    if (confirming) return (
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={async () => { await deleteContent({ id: contentId }); }}
                style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sure?</button>
            <button onClick={() => setConfirming(false)}
                style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>✕</button>
        </span>
    );
    return (
        <button onClick={() => setConfirming(true)}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.color = '#ff4d4f'; b.style.borderColor = '#ff4d4f'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-color)'; }}
        >🗑</button>
    );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
function MobileCard({ content, properties, userOptionsRaw, selected, onToggle }: {
    content: any; properties: any[]; userOptionsRaw: string; selected: boolean; onToggle: () => void;
}) {
    const customData = useMemo(() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } }, [content.customFields]);

    return (
        <div style={{ background: selected ? 'rgba(24,144,255,0.06)' : 'var(--sidebar-bg)', border: `1px solid ${selected ? '#1890ff80' : 'var(--border-color)'}`, borderRadius: 12, padding: 16, marginBottom: 10, transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 2, cursor: 'pointer', accentColor: '#1890ff' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{content.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>By {content.author?.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DeleteButton contentId={content.id} />
                </div>
            </div>
            {properties.slice(0, 4).map(p => {
                const val = customData[p.id];
                if (!val) return null;
                return (
                    <div key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: 90, flexShrink: 0 }}>{p.name}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{String(val)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ count, onClearSelection, onDelete, busy }: {
    count: number;
    onClearSelection: () => void;
    onDelete: () => void;
    busy: boolean;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '10px 14px',
            background: 'hsl(220,25%,14%)',
            border: '1px solid #1890ff50',
            borderRadius: 10,
            marginBottom: 10,
            boxShadow: '0 4px 20px rgba(24,144,255,0.15)',
            animation: 'slideDown 0.15s ease'
        }}>
            <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

            {/* Selection count */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#1890ff' }}>{count}</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>selected</span>
                <button onClick={onClearSelection} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 4 }}>✕ Deselect all</button>
            </div>

            <div style={{ height: 20, width: 1, background: 'var(--border-color)', marginLeft: 4 }} />

            {/* Bulk Delete */}
            <div>
                {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)} disabled={busy} style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1px solid rgba(255,77,79,0.4)', background: 'rgba(255,77,79,0.08)', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                        🗑 Delete
                    </button>
                ) : (
                    <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 600 }}>Delete {count}?</span>
                        <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Yes, delete</button>
                        <button onClick={() => setConfirmDelete(false)} style={{ padding: '4px 8px', borderRadius: 6, fontSize: 12, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer' }}>Cancel</button>
                    </span>
                )}
            </div>

            {busy && <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 'auto' }}>Working…</span>}
        </div>
    );
}

// ─── Main TableView ───────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc';

export default function TableView({ contents, properties, userOptionsRaw }: {
    contents: any[]; properties: any[]; userOptionsRaw: string;
}) {
    const router = useRouter();
    const [sortCol, setSortCol] = useState<string>('title');
    const [sortDir, setSortDir] = useState<SortDir>('asc');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const PAGE_SIZE = 20;

    const platformProp = properties.find(p => p.name.toLowerCase().includes('platform'));

    // ── Sort ──────────────────────────────────────────────────────
    const sorted = useMemo(() => {
        const rows = [...contents].sort((a, b) => {
            let av: any = sortCol === 'title' ? a.title : a.createdAt;
            let bv: any = sortCol === 'title' ? b.title : b.createdAt;

            if (sortCol === 'platform' && platformProp) {
                const ad = JSON.parse(a.customFields || '{}');
                const bd = JSON.parse(b.customFields || '{}');
                av = ad[platformProp.id] || '';
                bv = bd[platformProp.id] || '';
            }

            const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return rows;
    }, [contents, sortCol, sortDir, platformProp]);

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pagedIds = paged.map(c => c.id);
    const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selected.has(id));
    const someSelected = selected.size > 0;

    const handleSort = (col: string) => { if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortCol(col); setSortDir('asc'); } setPage(1); };
    const SortIcon = ({ col }: { col: string }) => sortCol !== col ? <span style={{ opacity: 0.25 }}>↕</span> : <span>{sortDir === 'asc' ? '↑' : '↓'}</span>;

    // ── Selection helpers ──────────────────────────────────────────────────
    const toggleRow = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const togglePage = () => {
        setSelected(prev => {
            const n = new Set(prev);
            if (allPageSelected) pagedIds.forEach(id => n.delete(id));
            else pagedIds.forEach(id => n.add(id));
            return n;
        });
    };
    const selectAll = () => setSelected(new Set(sorted.map(c => c.id)));
    const clearSelection = () => setSelected(new Set());

    // ── Bulk operations ────────────────────────────────────────────────────
    const handleBulkDelete = () => startTransition(async () => {
        await bulkDeleteContent([...selected]);
        clearSelection();
    });

    return (
        <div>
            <style>{`
                .tv-row:hover { background: rgba(255,255,255,0.035) !important; }
                .tv-row-sel  { background: rgba(24,144,255,0.06) !important; }
                .tv-th-btn   { background:transparent;border:none;cursor:pointer;color:inherit;display:flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:0;letter-spacing:0.04em;text-transform:uppercase; }
                .tv-th-btn:hover { color: var(--text-primary) !important; }
                .tv-title-link { cursor: pointer; color: var(--text-primary); transition: color 0.1s; }
                .tv-title-link:hover { color: #1890ff; text-decoration: underline; }
                @media(max-width:700px){.tv-desktop{display:none!important}.tv-mobile{display:block!important}}
                @media(min-width:701px){.tv-desktop{display:block!important}.tv-mobile{display:none!important}}
            `}</style>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{sorted.length} row{sorted.length !== 1 ? 's' : ''}</span>
                    {/* Select all filtered */}
                    {someSelected && sorted.length > PAGE_SIZE && (
                        <button onClick={selectAll} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1px solid #1890ff50', background: 'rgba(24,144,255,0.08)', color: '#1890ff', cursor: 'pointer' }}>
                            Select all {sorted.length}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Bulk Action Bar ── */}
            {someSelected && (
                <BulkActionBar
                    count={selected.size}
                    onClearSelection={clearSelection}
                    onDelete={handleBulkDelete}
                    busy={isPending}
                />
            )}

            {/* ── Mobile Cards ── */}
            <div className="tv-mobile">
                {paged.map(c => <MobileCard key={c.id} content={c} properties={properties} userOptionsRaw={userOptionsRaw} selected={selected.has(c.id)} onToggle={() => toggleRow(c.id)} />)}
                {paged.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>No results found.</div>}
            </div>

            {/* ── Desktop Table ── */}
            <div className="tv-desktop" style={{ borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 600 }}>
                        <thead>
                            <tr style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border-color)' }}>
                                {/* Select all checkbox (page) */}
                                <th style={{ padding: '10px 12px', width: 36 }}>
                                    <input
                                        type="checkbox"
                                        checked={allPageSelected}
                                        ref={el => { if (el) el.indeterminate = !allPageSelected && pagedIds.some(id => selected.has(id)); }}
                                        onChange={togglePage}
                                        title="Select/deselect this page"
                                        style={{ cursor: 'pointer', accentColor: '#1890ff' }}
                                    />
                                </th>
                                <th style={{ padding: '10px 16px', minWidth: 220 }}>
                                    <button className="tv-th-btn" style={{ color: sortCol === 'title' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => handleSort('title')}>Title <SortIcon col="title" /></button>
                                </th>
                                <th style={{ padding: '10px 12px' }}>
                                    <button className="tv-th-btn" style={{ color: sortCol === 'createdAt' ? 'var(--text-primary)' : 'var(--text-secondary)' }} onClick={() => handleSort('createdAt')}>Created At <SortIcon col="createdAt" /></button>
                                </th>
                                {properties.map(p => (
                                    <th key={p.id} style={{ padding: '10px 12px', minWidth: 120 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            <span style={{ fontSize: 11, opacity: 0.7 }}>{getTypeIcon(p.type)}</span> {p.name}
                                        </div>
                                    </th>
                                ))}
                                <th style={{ padding: '10px 12px', width: 60 }} />
                            </tr>
                        </thead>
                        <tbody>
                            {paged.map((content, rowIdx) => {
                                const isSelected = selected.has(content.id);
                                const customData = (() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } })();

                                return (
                                    <tr key={content.id} className={`tv-row${isSelected ? ' tv-row-sel' : ''}`}
                                        style={{ borderBottom: '1px solid var(--border-color)', background: isSelected ? undefined : rowIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)', transition: 'background 0.12s', outline: isSelected ? '1px solid #1890ff30' : 'none', outlineOffset: -1 }}>

                                        {/* Checkbox */}
                                        <td style={{ padding: '10px 12px' }}>
                                            <input type="checkbox" checked={isSelected} onChange={() => toggleRow(content.id)} style={{ cursor: 'pointer', accentColor: '#1890ff' }} />
                                        </td>

                                        {/* Title */}
                                        <td style={{ padding: '10px 16px', minWidth: 220 }}>
                                            <div
                                                className="tv-title-link"
                                                onClick={() => router.push(`/content/${content.id}`)}
                                                style={{ fontWeight: 600, fontSize: 13, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}
                                                title={`Click to open ${content.title}`}
                                            >
                                                {content.title}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{content.author?.name}</div>
                                        </td>

                                        {/* Created At */}
                                        <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(content.createdAt).toLocaleDateString()}</td>

                                        {/* Custom properties */}
                                        {properties.map(p => (
                                            <td key={p.id} style={{ padding: '4px 8px', minWidth: 120 }}>
                                                <EditableCell contentId={content.id} propId={p.id} type={p.type} optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options} initialValue={customData[p.id]} />
                                            </td>
                                        ))}

                                        {/* Delete */}
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                            <DeleteButton contentId={content.id} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {paged.length === 0 && (
                        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                            No content matches your search or filters.
                        </div>
                    )}
                </div>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>← Prev</button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                        .reduce<(number | '…')[]>((acc, p, i, arr) => {
                            if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                            acc.push(p); return acc;
                        }, [])
                        .map((p, i) => p === '…'
                            ? <span key={`e${i}`} style={{ color: 'var(--text-secondary)', padding: '0 4px' }}>…</span>
                            : <button key={p} onClick={() => setPage(p as number)} style={{ width: 34, height: 34, borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', background: page === p ? 'var(--text-primary)' : 'transparent', color: page === p ? 'var(--bg-color)' : 'var(--text-primary)', cursor: 'pointer', fontWeight: page === p ? 700 : 400 }}>{p}</button>
                        )}

                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>Next →</button>

                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                    </span>
                </div>
            )}
        </div>
    );
}
