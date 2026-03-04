'use client';

import { useState, useMemo } from 'react';
import TableView from './TableView';
import BoardView from './BoardView';
import GalleryView from './GalleryView';
import ListView from './ListView';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView';

type ViewMode = 'table' | 'board' | 'gallery' | 'list' | 'chart' | 'timeline' | 'feed' | 'map' | 'calendar' | 'form';

const VIEW_OPTIONS: { id: ViewMode; icon: string; label: string }[] = [
    { id: 'table', icon: '▤', label: 'Table' },
    { id: 'board', icon: '◫', label: 'Board' },
    { id: 'gallery', icon: '㗊', label: 'Gallery' },
    { id: 'list', icon: '☷', label: 'List' },
    { id: 'timeline', icon: '⏳', label: 'Timeline' },
    { id: 'calendar', icon: '📅', label: 'Calendar' },
];

export default function ContentViewer({
    contents,
    properties,
    userOptionsRaw
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    const [viewMode, setViewMode] = useState<ViewMode>('table');
    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    const [showFilterPanel, setShowFilterPanel] = useState(false);

    // ── Filtering Logic ──────────────────────────────────────────────────────
    const filteredContents = useMemo(() => {
        return contents.filter(item => {
            // 1. Text Search (Title, Author, Caption)
            if (search.trim()) {
                const q = search.toLowerCase();
                const titleMatch = item.title.toLowerCase().includes(q);
                const authorMatch = item.author?.name?.toLowerCase().includes(q);
                const captionMatch = item.caption?.toLowerCase().includes(q);
                if (!titleMatch && !authorMatch && !captionMatch) return false;
            }

            // 2. Property Filters
            const customData = item.customFields ? JSON.parse(item.customFields) : {};
            for (const [propId, selectedValues] of Object.entries(activeFilters)) {
                if (selectedValues.length === 0) continue;

                const val = String(customData[propId] || '').trim();

                // For Multi-select or comma-separated values
                const itemValues = val.split(',').map(v => v.trim()).filter(Boolean);

                const hasMatch = selectedValues.some(sv => {
                    if (itemValues.length > 0) return itemValues.includes(sv);
                    return val === sv;
                });

                if (!hasMatch) return false;
            }

            return true;
        });
    }, [contents, search, activeFilters]);

    // ── Filter Helpers ───────────────────────────────────────────────────────
    const toggleFilter = (propId: string, value: string) => {
        setActiveFilters(prev => {
            const current = prev[propId] || [];
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];

            const newFilters = { ...prev };
            if (next.length === 0) delete newFilters[propId];
            else newFilters[propId] = next;
            return newFilters;
        });
    };

    const clearAllFilters = () => {
        setActiveFilters({});
        setSearch('');
    };

    // Extract unique values for distinct properties (SELECT, MULTI_SELECT, PERSON)
    const filterOptions = useMemo(() => {
        const options: Record<string, string[]> = {};
        properties.forEach(p => {
            if (['SELECT', 'MULTI_SELECT', 'STATUS', 'PERSON'].includes(p.type)) {
                const values = new Set<string>();
                contents.forEach(c => {
                    const data = c.customFields ? JSON.parse(c.customFields) : {};
                    const val = data[p.id];
                    if (val) {
                        val.split(',').map((v: string) => v.trim()).forEach((v: string) => {
                            if (v) values.add(v);
                        });
                    }
                });
                options[p.id] = Array.from(values).sort();
            }
        });
        return options;
    }, [contents, properties]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Toolbar: Search & Filter Trigger ── */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search title, author, or content..."
                        style={{
                            width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10,
                            border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                            color: 'var(--text-primary)', outline: 'none', fontSize: 14
                        }}
                    />
                </div>

                <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    style={{
                        padding: '10px 16px', borderRadius: 10, border: '1px solid var(--border-color)',
                        background: showFilterPanel ? 'var(--text-primary)' : 'var(--sidebar-bg)',
                        color: showFilterPanel ? 'var(--bg-color)' : 'var(--text-primary)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
                        transition: 'all 0.2s'
                    }}
                >
                    <span>⚡ Filter</span>
                    {Object.keys(activeFilters).length > 0 && (
                        <span style={{
                            background: showFilterPanel ? 'var(--bg-color)' : '#1890ff',
                            color: showFilterPanel ? 'var(--text-primary)' : '#fff',
                            fontSize: 10, padding: '1px 6px', borderRadius: 10
                        }}>
                            {Object.keys(activeFilters).length}
                        </span>
                    )}
                </button>

                {(search || Object.keys(activeFilters).length > 0) && (
                    <button
                        onClick={clearAllFilters}
                        style={{ background: 'transparent', border: 'none', color: '#ff4d4f', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                    >
                        Reset All
                    </button>
                )}
            </div>

            {/* ── Filter Panel ── */}
            {showFilterPanel && (
                <div className="glass-card" style={{ padding: 20, borderStyle: 'dashed', animation: 'fadeIn 0.2s ease' }}>
                    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 20 }}>
                        {properties.filter(p => filterOptions[p.id]?.length > 0).map(p => (
                            <div key={p.id}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>{p.name}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 150, overflowY: 'auto', paddingRight: 4 }}>
                                    {filterOptions[p.id].map(val => {
                                        const isSelected = activeFilters[p.id]?.includes(val);
                                        return (
                                            <div
                                                key={val}
                                                onClick={() => toggleFilter(p.id, val)}
                                                style={{
                                                    fontSize: 12, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                                                    background: isSelected ? 'rgba(24,144,255,0.12)' : 'transparent',
                                                    color: isSelected ? '#1890ff' : 'var(--text-secondary)',
                                                    border: `1px solid ${isSelected ? '#1890ff40' : 'transparent'}`,
                                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                            >
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                                                {isSelected && <span>✓</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* View Switching Tabs */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8, overflowX: 'auto', whiteSpace: 'nowrap' }}>
                {VIEW_OPTIONS.map(view => (
                    <button
                        key={view.id}
                        onClick={() => setViewMode(view.id)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: viewMode === view.id ? 600 : 400,
                            color: viewMode === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            borderBottom: viewMode === view.id ? '2px solid var(--text-primary)' : '2px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s'
                        }}
                    >
                        <span style={{ fontSize: 16 }}>{view.icon}</span> {view.label}
                    </button>
                ))}
            </div>

            {/* Dynamic View Rendering */}
            {viewMode === 'table' && (
                <TableView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}

            {viewMode === 'board' && (
                <BoardView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}

            {viewMode === 'gallery' && (
                <GalleryView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}

            {viewMode === 'list' && (
                <ListView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}

            {viewMode === 'calendar' && (
                <CalendarView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}

            {viewMode === 'timeline' && (
                <TimelineView
                    contents={filteredContents}
                    properties={properties}
                    userOptionsRaw={userOptionsRaw}
                />
            )}
        </div>
    );
}
