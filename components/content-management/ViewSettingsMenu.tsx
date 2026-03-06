'use client';

import { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Kanban, List as ListIcon, Clock, Calendar, Check, Table, Trash2, ChevronLeft, Eye, EyeOff, Layers, Filter, ArrowDownUp, PaintBucket, Link as LinkIcon, Plus, X } from 'lucide-react';
import { updateContentView, deleteContentView } from './view-actions';
import CreatePropertyModal from './CreatePropertyModal';

export type ContentViewData = {
    id: string;
    name: string;
    layout: string;
    propertyVisibility: string | null;
    filter: string | null;
    sort: string | null;
    groupBy: string | null;
    layoutConfig: string | null;
    order: number;
};

const VIEW_LAYOUTS: { id: string; label: string; icon: React.ReactNode }[] = [
    { id: 'table', label: 'Table', icon: <Table size={15} /> },
    { id: 'board', label: 'Board', icon: <Kanban size={15} /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={15} /> },
    { id: 'calendar', label: 'Calendar', icon: <Calendar size={15} /> },
    { id: 'gallery', label: 'Gallery', icon: <LayoutGrid size={15} /> },
    { id: 'list', label: 'List', icon: <ListIcon size={15} /> },
];

type Panel = 'main' | 'layout' | 'properties' | 'group' | 'filter' | 'sort' | 'colors';

export default function ViewSettingsMenu({
    view,
    properties,
    onClose,
    onUpdate,
    databaseId,
    initialPanel,
    currentUser,
}: {
    view: ContentViewData;
    properties: any[];
    onClose: () => void;
    onUpdate: (updated: Partial<ContentViewData>) => void;
    databaseId?: string;
    initialPanel?: 'main' | 'layout' | 'properties' | 'group' | 'filter' | 'sort' | 'colors';
    currentUser?: any;
}) {
    const [panel, setPanel] = useState<Panel>(initialPanel || 'main');
    const [name, setName] = useState(view.name);
    const nameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Parse property visibility
    const visiblePropIds: string[] = (() => {
        try { return view.propertyVisibility ? JSON.parse(view.propertyVisibility) : properties.map(p => p.id); }
        catch { return properties.map(p => p.id); }
    })();

    // Parse layoutConfig for groupBy on timeline
    const layoutConfig: Record<string, any> = (() => {
        try { return view.layoutConfig ? JSON.parse(view.layoutConfig) : {}; }
        catch { return {}; }
    })();

    // Parse filter and sort
    const activeFilters: any[] = (() => {
        try { return view.filter ? JSON.parse(view.filter) : []; }
        catch { return []; }
    })();
    const activeSorts: any[] = (() => {
        try { return view.sort ? JSON.parse(view.sort) : []; }
        catch { return []; }
    })();
    const activeColorRules: any[] = (() => {
        try { return layoutConfig.conditionalColors || []; }
        catch { return []; }
    })();

    // Debounce name save
    useEffect(() => {
        if (name === view.name) return;
        if (nameTimerRef.current) clearTimeout(nameTimerRef.current);
        nameTimerRef.current = setTimeout(() => {
            onUpdate({ name });
            updateContentView(view.id, { name }).catch(console.error);
        }, 600);
        return () => { if (nameTimerRef.current) clearTimeout(nameTimerRef.current); };
    }, [name]);

    const saveViewUpdate = async (data: Partial<ContentViewData>) => {
        onUpdate(data);
        try { await updateContentView(view.id, data); } catch (e) { console.error(e); }
    };

    const handleLayoutSelect = (layout: string) => {
        saveViewUpdate({ layout });
        setPanel('main');
    };

    const togglePropertyVisibility = (propId: string) => {
        const newVisible = visiblePropIds.includes(propId)
            ? visiblePropIds.filter(id => id !== propId)
            : [...visiblePropIds, propId];
        saveViewUpdate({ propertyVisibility: JSON.stringify(newVisible) });
    };

    const showAllProperties = () => {
        saveViewUpdate({ propertyVisibility: JSON.stringify(properties.map(p => p.id)) });
    };

    const handleGroupBySelect = (propId: string | null) => {
        saveViewUpdate({ groupBy: propId });
        setPanel('main');
    };

    const handleDatePropSelect = (propId: string) => {
        const nextConfig = { ...layoutConfig, datePropId: propId };
        saveViewUpdate({ layoutConfig: JSON.stringify(nextConfig) });
    };

    const handleCopyLink = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('v', view.id);
        navigator.clipboard.writeText(url.toString());
        alert('Link copied to clipboard');
        setPanel('main');
    };

    const handleDelete = async () => {
        try { await deleteContentView(view.id); onClose(); } catch (e) { console.error(e); }
    };

    const currentLayout = VIEW_LAYOUTS.find(l => l.id === view.layout) || VIEW_LAYOUTS[0];
    const groupableProps = properties.filter(p => ['SELECT', 'MULTI_SELECT', 'STATUS', 'PERSON'].includes(p.type));

    // Shared styles
    const menuItemStyle: React.CSSProperties = {
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 14px', background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 13.5, color: 'var(--text-primary)', borderRadius: 6, transition: 'background 0.12s', textAlign: 'left'
    };

    // ── Layout Panel ──────────────────────────────────────────────────
    if (panel === 'layout') return (
        <div style={{ width: 240, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Layout</span>
            </div>
            <div style={{ padding: '6px 6px' }}>
                {VIEW_LAYOUTS.map(l => (
                    <button
                        key={l.id}
                        onClick={() => handleLayoutSelect(l.id)}
                        style={{ ...menuItemStyle, fontWeight: view.layout === l.id ? 600 : 400 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex' }}>{l.icon}</span>
                            {l.label}
                        </div>
                        {view.layout === l.id && <Check size={14} style={{ color: 'var(--accent-color, #7c3aed)' }} />}
                    </button>
                ))}
            </div>
        </div>
    );

    // ── Properties Panel ──────────────────────────────────────────────
    if (panel === 'properties') return (
        <div style={{ width: 260, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Properties</span>
                </div>
                <button onClick={showAllProperties} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--accent-color, #7c3aed)' }}>Show all</button>
            </div>
            <div style={{ padding: '6px 6px', maxHeight: 300, overflowY: 'auto' }}>
                {properties.map(p => {
                    const isVisible = visiblePropIds.includes(p.id);
                    return (
                        <button
                            key={p.id}
                            onClick={() => togglePropertyVisibility(p.id)}
                            style={{ ...menuItemStyle }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                            <span style={{ fontSize: 13.5 }}>{p.name}</span>
                            <span style={{ color: isVisible ? 'var(--accent-color, #7c3aed)' : 'var(--text-secondary)', display: 'flex' }}>
                                {isVisible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </span>
                        </button>
                    );
                })}
                {properties.length === 0 && (
                    <div style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 13 }}>No properties found.</div>
                )}
            </div>
            {databaseId && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '8px 14px' }}>
                    <CreatePropertyModal databaseId={databaseId}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', color: 'var(--accent-color, #007aff)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                            <Plus size={16} />
                            Add Property
                        </div>
                    </CreatePropertyModal>
                </div>
            )}
        </div>
    );

    // ── Group Panel ────────────────────────────────────────────────────
    if (panel === 'group') return (
        <div style={{ width: 240, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Group by</span>
            </div>
            <div style={{ padding: '6px 6px' }}>
                <button
                    onClick={() => handleGroupBySelect(null)}
                    style={{ ...menuItemStyle, fontWeight: !view.groupBy ? 600 : 400 }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    None
                    {!view.groupBy && <Check size={14} style={{ color: 'var(--accent-color, #7c3aed)' }} />}
                </button>
                {groupableProps.map(p => (
                    <button
                        key={p.id}
                        onClick={() => handleGroupBySelect(p.id)}
                        style={{ ...menuItemStyle, fontWeight: view.groupBy === p.id ? 600 : 400 }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        {p.name}
                        {view.groupBy === p.id && <Check size={14} style={{ color: 'var(--accent-color, #7c3aed)' }} />}
                    </button>
                ))}
                {groupableProps.length === 0 && (
                    <div style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: 13 }}>No groupable properties found.</div>
                )}
            </div>
        </div>
    );

    // Filter Handlers
    const handleAddFilter = () => {
        const newFilter = { id: Date.now().toString(), propertyId: properties[0]?.id || '', operator: 'contains', value: '' };
        saveViewUpdate({ filter: JSON.stringify([...activeFilters, newFilter]) });
    };
    const handleUpdateFilter = (idx: number, changes: any) => {
        const next = [...activeFilters];
        next[idx] = { ...next[idx], ...changes };
        saveViewUpdate({ filter: JSON.stringify(next) });
    };
    const handleRemoveFilter = (idx: number) => {
        saveViewUpdate({ filter: JSON.stringify(activeFilters.filter((_, i) => i !== idx)) });
    };

    // Sort Handlers
    const handleAddSort = () => {
        const newSort = { id: Date.now().toString(), propertyId: properties[0]?.id || '', direction: 'asc' };
        saveViewUpdate({ sort: JSON.stringify([...activeSorts, newSort]) });
    };
    const handleUpdateSort = (idx: number, changes: any) => {
        const next = [...activeSorts];
        next[idx] = { ...next[idx], ...changes };
        saveViewUpdate({ sort: JSON.stringify(next) });
    };
    const handleRemoveSort = (idx: number) => {
        saveViewUpdate({ sort: JSON.stringify(activeSorts.filter((_, i) => i !== idx)) });
    };

    // Shared input style for selects/inputs
    const controlStyle: React.CSSProperties = {
        padding: '4px 6px', fontSize: 12, borderRadius: 4, border: '1px solid var(--border-color)',
        background: 'transparent', color: 'var(--text-primary)', outline: 'none'
    };

    // ── Filter Panel ──────────────────────────────────────────────────
    if (panel === 'filter') return (
        <div style={{ width: 320, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Filter</span>
            </div>
            <div style={{ padding: '10px 14px', maxHeight: 300, overflowY: 'auto' }}>
                {activeFilters.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginBottom: 10 }}>No filters applied to this view.</div>}
                {activeFilters.map((f, i) => (
                    <div key={f.id} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                        <select value={f.propertyId} onChange={e => handleUpdateFilter(i, { propertyId: e.target.value })} style={{ ...controlStyle, flex: 1, maxWidth: 100 }}>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={f.operator} onChange={e => handleUpdateFilter(i, { operator: e.target.value })} style={{ ...controlStyle, width: 85 }}>
                            <option value="equals">Equals</option>
                            <option value="contains">Contains</option>
                            <option value="not_equals">Does not equal</option>
                            <option value="is_empty">Is empty</option>
                            <option value="not_empty">Is not empty</option>
                        </select>
                        {f.operator !== 'is_empty' && f.operator !== 'not_empty' && (
                            <input value={f.value} onChange={e => handleUpdateFilter(i, { value: e.target.value })} style={{ ...controlStyle, flex: 1, minWidth: 50 }} placeholder="Value" />
                        )}
                        <button onClick={() => handleRemoveFilter(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, display: 'flex' }}><X size={14} /></button>
                    </div>
                ))}
                <button onClick={handleAddFilter} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 4, padding: '4px 0' }}><Plus size={14} /> Add filter</button>
            </div>
        </div>
    );

    // ── Sort Panel ────────────────────────────────────────────────────
    if (panel === 'sort') return (
        <div style={{ width: 280, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Sort</span>
            </div>
            <div style={{ padding: '10px 14px', maxHeight: 300, overflowY: 'auto' }}>
                {activeSorts.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginBottom: 10 }}>No sorting applied to this view.</div>}
                {activeSorts.map((s, i) => (
                    <div key={s.id} style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
                        <select value={s.propertyId} onChange={e => handleUpdateSort(i, { propertyId: e.target.value })} style={{ ...controlStyle, flex: 1 }}>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <select value={s.direction} onChange={e => handleUpdateSort(i, { direction: e.target.value })} style={{ ...controlStyle, width: 95 }}>
                            <option value="asc">Ascending</option>
                            <option value="desc">Descending</option>
                        </select>
                        <button onClick={() => handleRemoveSort(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, display: 'flex' }}><X size={14} /></button>
                    </div>
                ))}
                <button onClick={handleAddSort} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 4, padding: '4px 0' }}><Plus size={14} /> Add sort</button>
            </div>
        </div>
    );

    // Color Rules Handlers
    const handleAddColorRule = () => {
        const nextRules = [...activeColorRules, { id: Date.now().toString(), propertyId: properties[0]?.id || '', operator: 'equals', value: '', color: '#3b82f6' }];
        saveViewUpdate({ layoutConfig: JSON.stringify({ ...layoutConfig, conditionalColors: nextRules }) });
    };
    const handleUpdateColorRule = (idx: number, changes: any) => {
        const nextRules = [...activeColorRules];
        nextRules[idx] = { ...nextRules[idx], ...changes };
        saveViewUpdate({ layoutConfig: JSON.stringify({ ...layoutConfig, conditionalColors: nextRules }) });
    };
    const handleRemoveColorRule = (idx: number) => {
        const nextRules = activeColorRules.filter((_, i) => i !== idx);
        saveViewUpdate({ layoutConfig: JSON.stringify({ ...layoutConfig, conditionalColors: nextRules }) });
    };

    // ── Color Panel ──────────────────────────────────────────────────
    if (panel === 'colors') return (
        <div style={{ width: 340, padding: '6px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px 10px', borderBottom: '1px solid var(--border-color)' }}>
                <button onClick={() => setPanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: 2 }}><ChevronLeft size={16} /></button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Conditional color</span>
            </div>
            <div style={{ padding: '10px 14px', maxHeight: 350, overflowY: 'auto' }}>
                {activeColorRules.length === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginBottom: 10 }}>No color rules defined.</div>}
                {activeColorRules.map((r, i) => (
                    <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, padding: 12, border: '1px solid var(--border-color)', borderRadius: 8, background: 'var(--bg-hover)' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select value={r.propertyId} onChange={e => handleUpdateColorRule(i, { propertyId: e.target.value })} style={{ ...controlStyle, flex: 1 }}>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button onClick={() => handleRemoveColorRule(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, display: 'flex' }}><X size={14} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <select value={r.operator} onChange={e => handleUpdateColorRule(i, { operator: e.target.value })} style={{ ...controlStyle, width: 90 }}>
                                <option value="equals">Equals</option>
                                <option value="contains">Contains</option>
                                <option value="not_equals">Does not equal</option>
                                <option value="is_empty">Is empty</option>
                                <option value="not_empty">Is not empty</option>
                            </select>
                            <input value={r.value || ''} onChange={e => handleUpdateColorRule(i, { value: e.target.value })} style={{ ...controlStyle, flex: 1 }} placeholder="Value" />
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Apply color:</span>
                            <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                                {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'].map(c => (
                                    <button
                                        key={c}
                                        onClick={() => handleUpdateColorRule(i, { color: c })}
                                        style={{
                                            width: 18, height: 18, borderRadius: '50%', background: c, border: r.color === c ? '2px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.1)', cursor: 'pointer'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                <button onClick={handleAddColorRule} style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, marginTop: 4, padding: '4px 0' }}><Plus size={14} /> Add rule</button>
            </div>
        </div>
    );
    const isAdmin = currentUser?.role === 'ADMIN';

    // ── Main Panel ────────────────────────────────────────────────────
    return (
        <div style={{ width: 260, padding: '6px 0' }}>
            {isAdmin ? (
                <div style={{ padding: '8px 14px 12px', borderBottom: '1px solid var(--border-color)' }}>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="View name"
                        style={{
                            width: '100%', padding: '5px 8px', borderRadius: 6,
                            border: '1px solid transparent', background: 'transparent',
                            fontSize: 15, fontWeight: 600, color: 'var(--text-primary)',
                            outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box'
                        }}
                        onFocus={e => { e.target.style.background = 'var(--bg-hover)'; e.target.style.borderColor = 'var(--border-color)'; }}
                        onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = 'transparent'; }}
                    />
                </div>
            ) : (
                <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-color)', fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {view.name}
                </div>
            )}

            <div style={{ padding: '6px 6px' }}>
                {/* Layout */}
                {isAdmin && (
                    <button
                        onClick={() => setPanel('layout')}
                        style={menuItemStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><LayoutGrid size={15} /></span>
                            Layout
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {currentLayout.label}
                            <span style={{ opacity: 0.5 }}>›</span>
                        </span>
                    </button>
                )}

                {/* Properties */}
                <button
                    onClick={() => setPanel('properties')}
                    style={menuItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><Eye size={15} /></span>
                        Properties
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {visiblePropIds.length}/{properties.length}
                        <span style={{ opacity: 0.5 }}>›</span>
                    </span>
                </button>
            </div>

            <div style={{ padding: '6px 6px', borderTop: '1px solid var(--border-color)' }}>
                {/* Filter */}
                <button
                    onClick={() => setPanel('filter')}
                    style={menuItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><Filter size={15} /></span>
                        Filter
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {activeFilters.length > 0 && <span style={{ opacity: 0.8 }}>{activeFilters.length}</span>}
                        <span style={{ opacity: 0.5 }}>›</span>
                    </span>
                </button>

                {/* Sort */}
                <button
                    onClick={() => setPanel('sort')}
                    style={menuItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><ArrowDownUp size={15} /></span>
                        Sort
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {activeSorts.length > 0 && <span style={{ opacity: 0.8 }}>{activeSorts.length}</span>}
                        <span style={{ opacity: 0.5 }}>›</span>
                    </span>
                </button>

                {/* Group (only for board/timeline/table/gallery/list) */}
                {['table', 'board', 'timeline', 'gallery', 'list'].includes(view.layout) && (
                    <button
                        onClick={() => setPanel('group')}
                        style={menuItemStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><Layers size={15} /></span>
                            Group
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {view.groupBy ? (properties.find(p => p.id === view.groupBy)?.name || '—') : 'None'}
                            <span style={{ opacity: 0.5 }}>›</span>
                        </span>
                    </button>
                )}

                {/* Date Property Selection for specific layouts */}
                {isAdmin && ['calendar', 'timeline'].includes(view.layout) && (
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', marginTop: 4 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                            Date Property
                        </div>
                        <select
                            value={layoutConfig.datePropId || ''}
                            onChange={(e) => handleDatePropSelect(e.target.value)}
                            style={{
                                width: '100%', padding: '6px 8px', borderRadius: 6,
                                border: '1px solid var(--border-color)', background: 'var(--bg-hover)',
                                color: 'var(--text-primary)', fontSize: 13, outline: 'none'
                            }}
                        >
                            <option value="" disabled>Select a date property</option>
                            {properties.filter(p => p.type === 'DATE').map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Conditional Color */}
                {isAdmin && (
                    <button
                        onClick={() => setPanel('colors')}
                        style={menuItemStyle}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><PaintBucket size={15} /></span>
                            Conditional color
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {activeColorRules.length > 0 && <span style={{ opacity: 0.8 }}>{activeColorRules.length}</span>}
                            <span style={{ opacity: 0.5 }}>›</span>
                        </span>
                    </button>
                )}

                {/* Copy Link to View */}
                <button
                    onClick={handleCopyLink}
                    style={menuItemStyle}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex' }}><LinkIcon size={15} /></span>
                        Copy link to view
                    </div>
                </button>
            </div>

            {/* Delete */}
            {isAdmin && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '6px 6px', marginTop: 2 }}>
                    <button
                        onClick={handleDelete}
                        style={{ ...menuItemStyle, color: 'var(--status-red, #ef4444)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Trash2 size={15} />
                            Delete view
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}
