'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import TableView from './TableView';
import BoardView from './BoardView';
import GalleryView from './GalleryView';
import ListView from './ListView';
import CalendarView from './CalendarView';
import TimelineView from './TimelineView';
import ContentDetailModal from './ContentDetailModal';
import { createPortal } from 'react-dom';
import { getBadgeColorObj } from '../../lib/colors';
import { Table, Kanban, LayoutGrid, List as ListIcon, Clock, Calendar, Search, SlidersHorizontal, X, ChevronDown, Plus, MoreHorizontal, Eye } from 'lucide-react';
import { ContentViewData } from './ViewSettingsMenu';
import ViewSettingsMenu from './ViewSettingsMenu';
import { createContentView, updateContentViewOrder } from './view-actions';
import { createDatabaseView } from '../../app/(dashboard)/databases/[id]/view-actions';

type ViewMode = 'table' | 'board' | 'gallery' | 'list' | 'chart' | 'timeline' | 'feed' | 'map' | 'calendar' | 'form';

const VIEW_OPTIONS: { id: ViewMode; icon: React.ReactNode; label: string }[] = [
    { id: 'table', icon: <Table size={16} />, label: 'Table' },
    { id: 'board', icon: <Kanban size={16} />, label: 'Board' },
    { id: 'gallery', icon: <LayoutGrid size={16} />, label: 'Gallery' },
    { id: 'list', icon: <ListIcon size={16} />, label: 'List' },
    { id: 'timeline', icon: <Clock size={16} />, label: 'Timeline' },
    { id: 'calendar', icon: <Calendar size={16} />, label: 'Calendar' },
];

const VIEW_ICONS: Record<string, React.ReactNode> = {
    table: <Table size={16} />,
    board: <Kanban size={16} />,
    gallery: <LayoutGrid size={16} />,
    list: <ListIcon size={16} />,
    timeline: <Clock size={16} />,
    calendar: <Calendar size={16} />,
};

export default function ContentViewer({
    contents,
    properties,
    userOptionsRaw,
    initialViews,
    currentUser,
    database,
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
    initialViews: ContentViewData[];
    currentUser?: any;
    database?: any;
}) {
    // ── Persistent Views State ──
    const [views, setViews] = useState<ContentViewData[]>(initialViews);
    const [activeViewId, setActiveViewId] = useState<string>(initialViews[0]?.id || '');

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Initialize from URL parameter if present
    useEffect(() => {
        const vParam = searchParams.get('v');
        if (vParam && initialViews.some(v => v.id === vParam)) {
            setActiveViewId(vParam);
        }
        // Auto-open a specific content detail if ?open=contentId is in the URL
        const openParam = searchParams.get('open');
        if (openParam) {
            setSelectedContentId(openParam);
        }
    }, []); // Only on mount

    // Update URL when activeViewId changes
    useEffect(() => {
        if (!activeViewId) return;
        const currentV = searchParams.get('v');
        if (currentV === activeViewId) return;

        const params = new URLSearchParams(searchParams.toString());
        params.set('v', activeViewId);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
    }, [activeViewId, pathname, router, searchParams]);

    const [isCreatingView, setIsCreatingView] = useState(false);
    const [viewMenuOpenId, setViewMenuOpenId] = useState<string | null>(null);
    const [viewMenuInitialPanel, setViewMenuInitialPanel] = useState<'main' | 'layout' | 'properties' | 'group' | 'filter' | 'sort' | 'colors'>('main');
    // Portal anchor: stores the bounding rect of the "..." button that was clicked
    const [menuAnchorRect, setMenuAnchorRect] = useState<DOMRect | null>(null);

    const activeView = useMemo(() => views.find(v => v.id === activeViewId) || views[0], [views, activeViewId]);
    const activeLayout = (activeView?.layout || 'table') as ViewMode;

    const [search, setSearch] = useState('');
    // Local ephemeral states for the filter button popover
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
    const [dateFilters, setDateFilterState] = useState<Record<string, { from: string; to: string }>>({});
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
    const filterBtnRef = useRef<HTMLButtonElement>(null);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Close filter panel on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node) &&
                filterBtnRef.current && !filterBtnRef.current.contains(e.target as Node)
            ) setShowFilterPanel(false);
        };
        if (showFilterPanel) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showFilterPanel]);

    // Cmd/Ctrl+F to focus search
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const selectedContent = useMemo(() =>
        contents.find(c => c.id === selectedContentId),
        [contents, selectedContentId]
    );

    // Build a map of propertyId -> colorConfig string for consumption by views
    const colorConfigMap = useMemo(() => {
        const map: Record<string, string | null> = {};
        properties.forEach(p => { map[p.id] = (p as any).colorConfig || null; });
        return map;
    }, [properties]);

    // ── Filtering & Sorting Logic ──────────────────────────────────────────────
    const processedContents = useMemo(() => {
        // 1. Parse unified view settings
        const viewFilters: any[] = (() => { try { return activeView?.filter ? JSON.parse(activeView.filter) : []; } catch { return []; } })();
        const viewSorts: any[] = (() => { try { return activeView?.sort ? JSON.parse(activeView.sort) : []; } catch { return []; } })();
        const parsedLayout: Record<string, any> = (() => { try { return activeView?.layoutConfig ? JSON.parse(activeView.layoutConfig) : {}; } catch { return {}; } })();
        const colorRules: any[] = parsedLayout.conditionalColors || [];

        // 2. Apply Filters (Local ephemeral + Unified database rules)
        let filtered = contents.filter(item => {
            // A. Text Search (Local)
            if (search.trim()) {
                const q = search.toLowerCase();
                const titleMatch = item.title.toLowerCase().includes(q);
                const authorMatch = item.author?.name?.toLowerCase().includes(q);
                const captionMatch = item.caption?.toLowerCase().includes(q);
                if (!titleMatch && !authorMatch && !captionMatch) return false;
            }

            const customData = item.customFields ? JSON.parse(item.customFields) : {};

            // B. Local UI Filters (SELECT / MULTI_SELECT / STATUS / PERSON)
            for (const [propId, selectedValues] of Object.entries(activeFilters as Record<string, string[]>)) {
                if (selectedValues.length === 0) continue;
                const val = String(customData[propId] || '').trim();
                const itemValues = val.split(',').map(v => v.trim()).filter(Boolean);
                const hasMatch = selectedValues.some(sv => itemValues.length ? itemValues.includes(sv) : val === sv);
                if (!hasMatch) return false;
            }

            // C. Local UI Date Filters
            for (const [propId, { from, to }] of Object.entries(dateFilters as Record<string, { from: string; to: string }>)) {
                if (!from && !to) continue;
                const raw = customData[propId];
                if (!raw) return false;
                const d = new Date(raw.slice(0, 10));
                if (isNaN(d.getTime())) return false;
                if (from && d < new Date(from)) return false;
                if (to && d > new Date(to)) return false;
            }

            // D. Unified View Filters (from DB)
            for (const f of viewFilters) {
                const val = String(customData[f.propertyId] || '').trim().toLowerCase();
                const q = (f.value || '').toLowerCase();
                if (f.operator === 'equals' && val !== q) return false;
                if (f.operator === 'contains' && !val.includes(q)) return false;
                if (f.operator === 'not_equals' && val === q) return false;
                if (f.operator === 'is_empty' && val !== '') return false;
                if (f.operator === 'not_empty' && val === '') return false;
            }

            return true;
        });

        // 4. Apply Conditional Color Rules
        let contentsWithColors = filtered.map(item => {
            const custom = item.customFields ? JSON.parse(item.customFields) : {};
            let colorMatch: string | null = null;

            for (const rule of colorRules) {
                const val = (custom[rule.propertyId] || '').toLowerCase();
                const target = (rule.value || '').toLowerCase();
                let matched = false;

                if (rule.operator === 'equals') matched = (val === target);
                else if (rule.operator === 'contains') matched = (val.includes(target));
                else if (rule.operator === 'not_equals') matched = (val !== target);
                else if (rule.operator === 'is_empty') matched = (!val || val.trim() === '');
                else if (rule.operator === 'not_empty') matched = (!!val && val.trim() !== '');

                if (matched) {
                    colorMatch = rule.color;
                    break; // Use the first matching rule
                }
            }
            return { ...item, colorMatch };
        });

        // 3. Apply Unified View Sorting
        if (viewSorts.length > 0) {
            contentsWithColors = [...contentsWithColors].sort((a, b) => {
                const customA = a.customFields ? JSON.parse(a.customFields) : {};
                const customB = b.customFields ? JSON.parse(b.customFields) : {};

                for (const s of viewSorts) {
                    const valA = String(customA[s.propertyId] || '');
                    const valB = String(customB[s.propertyId] || '');
                    if (valA < valB) return s.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return s.direction === 'asc' ? 1 : -1;
                }
                return 0; // fallback to stable
            });
        }

        return contentsWithColors;
    }, [contents, search, activeFilters, dateFilters, activeView]);

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
        setDateFilterState({});
        setSearch('');
    };

    const setDateFilter = (propId: string, field: 'from' | 'to', value: string) => {
        setDateFilterState(prev => {
            const cur = prev[propId] || { from: '', to: '' };
            const next = { ...cur, [field]: value };
            if (!next.from && !next.to) {
                const n = { ...prev };
                delete n[propId];
                return n;
            }
            return { ...prev, [propId]: next };
        });
    };

    const clearDateFilter = (propId: string) => {
        setDateFilterState(prev => { const n = { ...prev }; delete n[propId]; return n; });
    };

    // Extract unique values per property for filter dropdown
    const filterOptions = useMemo(() => {
        const options: Record<string, any[]> = {};
        const allUsers: any[] = JSON.parse(userOptionsRaw || '[]');

        properties.forEach(p => {
            if (['SELECT', 'MULTI_SELECT', 'STATUS', 'PERSON'].includes(p.type)) {
                const values = new Set<string>();
                contents.forEach(c => {
                    const data = c.customFields ? JSON.parse(c.customFields) : {};
                    const val = data[p.id];
                    if (val) val.split(',').map((v: string) => v.trim()).forEach((v: string) => { if (v) values.add(v); });
                });

                if (p.type === 'PERSON') {
                    // For PERSON, resolve IDs to objects
                    options[p.id] = Array.from(values).map(v => {
                        const user = allUsers.find(u => u.id === v || u.name === v);
                        return user ? { id: user.id, name: user.name, photo: user.photo } : { id: v, name: v };
                    }).sort((a, b) => a.name.localeCompare(b.name));
                } else {
                    options[p.id] = Array.from(values).sort();
                }
            }
        });
        return options;
    }, [contents, properties, userOptionsRaw]);

    // Count how many unfiltered items match each option value (for count badges)
    const matchCounts = useMemo(() => {
        const counts: Record<string, Record<string, number>> = {};
        properties.forEach(p => {
            if (!filterOptions[p.id]) return;
            counts[p.id] = {};
            filterOptions[p.id].forEach(opt => {
                const val = typeof opt === 'string' ? opt : opt.id;
                counts[p.id][val] = contents.filter(c => {
                    const cd = c.customFields ? JSON.parse(c.customFields) : {};
                    const v = cd[p.id] ? String(cd[p.id]) : '';
                    return v.split(',').map((s: string) => s.trim()).includes(val);
                }).length;
            });
        });
        return counts;
    }, [contents, properties, filterOptions]);

    const dateProps = properties.filter(p => p.type === 'DATE');
    const activeDateFilterCount = Object.values(dateFilters).filter(d => d.from || d.to).length;
    const totalActiveFilters = Object.values(activeFilters).reduce((a, b) => a + b.length, 0) + activeDateFilterCount;
    const hasAnyFilter = !!search.trim() || totalActiveFilters > 0;

    // ── View Management Helpers ──────────────────────────────────────────────
    const handleCreateView = async () => {
        if (isCreatingView) return;
        setIsCreatingView(true);
        try {
            const newOrder = views.length > 0 ? Math.max(...views.map(v => v.order)) + 1 : 0;
            let newView;
            if (database?.id) {
                // Use database-scoped action which saves workspaceId (required for reload persistence)
                newView = await createDatabaseView(database.id, {
                    name: 'New View',
                    layout: 'table',
                    order: newOrder,
                });
            } else {
                newView = await createContentView({
                    name: 'New View',
                    layout: 'table',
                    order: newOrder,
                    databaseId: '',
                });
            }
            setViews(prev => [...prev, newView]);
            setActiveViewId(newView.id);
        } catch (e) {
            console.error("Failed to create view", e);
        } finally {
            setIsCreatingView(false);
        }
    };

    const handleUpdateViewLocally = (id: string, updated: Partial<ContentViewData>) => {
        setViews(prev => prev.map(v => v.id === id ? { ...v, ...updated } : v));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <style>{`
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                
                .premium-scrollbar::-webkit-scrollbar { height: 4px; }
                .premium-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .premium-scrollbar::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; }
                .premium-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--text-secondary); opacity: 0.5; }
            `}</style>
            {/* View Switching Tabs */}
            <div
                className="premium-scrollbar"
                style={{
                    display: 'flex', gap: 4, paddingBottom: 6,
                    overflowX: 'auto', whiteSpace: 'nowrap',
                    borderBottom: '1px solid var(--border-color)',
                    alignItems: 'center',
                    scrollbarWidth: 'thin',
                    msOverflowStyle: 'none'
                }}
            >
                {views.map(view => (
                    <div key={view.id} style={{ position: 'relative' }}>
                        <button
                            onClick={() => setActiveViewId(view.id)}
                            style={{
                                background: activeViewId === view.id ? 'var(--bg-color)' : 'transparent',
                                border: '1px solid',
                                borderColor: activeViewId === view.id ? 'var(--border-color)' : 'transparent',
                                borderRadius: 8,
                                padding: '6px 12px',
                                paddingRight: activeViewId === view.id ? 28 : 12,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: activeViewId === view.id ? 600 : 500,
                                color: activeViewId === view.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s',
                                boxShadow: activeViewId === view.id ? '0 2px 8px rgba(0,0,0,0.04)' : 'none'
                            }}
                        >
                            <span style={{ display: 'flex', opacity: 0.7 }}>{VIEW_ICONS[view.layout] ?? <Table size={16} />}</span>
                            {view.name}
                        </button>

                        {activeViewId === view.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (viewMenuOpenId === view.id) {
                                        setViewMenuOpenId(null);
                                        setMenuAnchorRect(null);
                                    } else {
                                        const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                        setMenuAnchorRect(rect);
                                        setViewMenuInitialPanel('main');
                                        setViewMenuOpenId(view.id);
                                    }
                                }}
                                style={{
                                    position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-secondary)', padding: 2, display: 'flex', borderRadius: 4
                                }}
                            >
                                <MoreHorizontal size={14} />
                            </button>
                        )}
                    </div>
                ))}

                {currentUser?.role === 'ADMIN' && (
                    <button
                        onClick={handleCreateView}
                        disabled={isCreatingView}
                        title="Add view"
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            padding: 6, borderRadius: 6, color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginLeft: 4, opacity: isCreatingView ? 0.5 : 1
                        }}
                    >
                        <Plus size={16} />
                    </button>
                )}
            </div>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                {/* Search */}
                <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, display: 'flex', pointerEvents: 'none' }}>
                        <Search size={15} />
                    </span>
                    <input
                        ref={searchRef}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search title, author, or content… (Ctrl+F)"
                        style={{
                            width: '100%', padding: '9px 36px 9px 36px', borderRadius: 10,
                            border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                            color: 'var(--text-primary)', outline: 'none', fontSize: 13,
                            transition: 'border-color 0.2s, box-shadow 0.2s'
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = '#007aff'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.1)'; }}
                        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    {search && (
                        <button onClick={() => setSearch('')} style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', display: 'flex',
                            color: 'var(--text-secondary)', padding: 2
                        }}><X size={14} /></button>
                    )}
                </div>

                {/* Properties button */}
                <button
                    onClick={(e) => {
                        if (viewMenuOpenId === activeViewId && viewMenuInitialPanel === 'properties') {
                            setViewMenuOpenId(null);
                            setMenuAnchorRect(null);
                        } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuAnchorRect(rect);
                            setViewMenuInitialPanel('properties');
                            setViewMenuOpenId(activeViewId);
                        }
                    }}
                    style={{
                        padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                        transition: 'all 0.2s', whiteSpace: 'nowrap',
                        border: '1px solid var(--border-color)',
                        background: 'var(--sidebar-bg)',
                        color: 'var(--text-secondary)'
                    }}
                >
                    <Eye size={14} />
                    <span>Properties</span>
                </button>

                {/* Filter button */}
                <div style={{ position: 'relative' }}>
                    <button
                        ref={filterBtnRef}
                        onClick={() => setShowFilterPanel(v => !v)}
                        style={{
                            padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                            transition: 'all 0.2s', whiteSpace: 'nowrap',
                            border: totalActiveFilters > 0 ? '1px solid #007aff' : '1px solid var(--border-color)',
                            background: totalActiveFilters > 0 ? 'rgba(0,122,255,0.08)' : 'var(--sidebar-bg)',
                            color: totalActiveFilters > 0 ? '#007aff' : 'var(--text-secondary)'
                        }}
                    >
                        <SlidersHorizontal size={14} />
                        <span>Filter</span>
                        {totalActiveFilters > 0 && (
                            <span style={{
                                background: '#007aff', color: '#fff',
                                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10, lineHeight: 1.5
                            }}>{totalActiveFilters}</span>
                        )}
                        <ChevronDown size={12} style={{ opacity: 0.5, transform: showFilterPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                    </button>

                    {/* Filter dropdown panel */}
                    {showFilterPanel && typeof document !== 'undefined' && createPortal(
                        <div ref={filterPanelRef} style={{
                            position: 'fixed',
                            top: (filterBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
                            right: window.innerWidth - (filterBtnRef.current?.getBoundingClientRect().right ?? 0),
                            width: 340, maxHeight: 460,
                            background: 'var(--bg-color)',
                            border: '1px solid var(--border-color)',
                            borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
                            zIndex: 9999, overflow: 'hidden',
                            display: 'flex', flexDirection: 'column',
                            animation: 'filterDropIn 0.18s cubic-bezier(0.16,1,0.3,1)'
                        }}>
                            <style>{`@keyframes filterDropIn { from { opacity:0; transform:translateY(-8px) scale(0.97); } to { opacity:1; transform:none; } }`}</style>

                            {/* Panel header */}
                            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Filter by property</span>
                                {totalActiveFilters > 0 && (
                                    <button onClick={clearAllFilters} style={{
                                        fontSize: 11, fontWeight: 600, color: '#ff4d4f', background: 'rgba(255,77,79,0.08)',
                                        border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer'
                                    }}>Clear all</button>
                                )}
                            </div>

                            {/* Filter groups */}
                            <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
                                {properties.filter(p => filterOptions[p.id]?.length > 0).length === 0 && (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                        No filterable properties found.
                                        <br /><span style={{ fontSize: 11 }}>Add SELECT or MULTI_SELECT properties in Settings.</span>
                                    </div>
                                )}
                                {properties.filter(p => filterOptions[p.id]?.length > 0).map(p => {
                                    const colorConfig = p.colorConfig ? JSON.parse(p.colorConfig) : {};
                                    const propFilters = activeFilters[p.id] || [];
                                    return (
                                        <div key={p.id} style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.name}</span>
                                                {propFilters.length > 0 && (
                                                    <button onClick={() => setActiveFilters(prev => { const n = { ...prev }; delete n[p.id]; return n; })} style={{
                                                        fontSize: 10, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                                                    }}>Clear</button>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {filterOptions[p.id].map(opt => {
                                                    const val = typeof opt === 'string' ? opt : opt.id;
                                                    const label = typeof opt === 'string' ? opt : opt.name;
                                                    const photo = typeof opt === 'string' ? null : opt.photo;
                                                    const isActive = propFilters.includes(val);
                                                    const c = getBadgeColorObj(val, colorConfig);
                                                    const count = matchCounts[p.id]?.[val] ?? 0;
                                                    return (
                                                        <button
                                                            key={val}
                                                            onClick={() => toggleFilter(p.id, val)}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                padding: photo ? '2px 10px 2px 2px' : '4px 10px', borderRadius: 20, cursor: 'pointer',
                                                                fontSize: 12, fontWeight: 600,
                                                                background: isActive ? c.bg : 'var(--sidebar-bg)',
                                                                color: isActive ? c.text : 'var(--text-secondary)',
                                                                border: isActive ? `2px solid ${c.text}40` : '1px solid var(--border-color)',
                                                                transition: 'all 0.15s'
                                                            }}
                                                        >
                                                            {photo ? (
                                                                <img src={photo} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? c.text : c.bg, flexShrink: 0, border: `1px solid ${c.text}60` }} />
                                                            )}
                                                            {label}
                                                            <span style={{ fontSize: 10, opacity: 0.6, fontWeight: 400 }}>({count})</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* DATE filter section */}
                                {dateProps.length > 0 && (
                                    <div>
                                        {dateProps.map(p => {
                                            const df = dateFilters[p.id] || { from: '', to: '' };
                                            const hasDateFilter = df.from || df.to;
                                            return (
                                                <div key={p.id} style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-color)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                            📅 {p.name}
                                                        </span>
                                                        {hasDateFilter && (
                                                            <button onClick={() => clearDateFilter(p.id)} style={{
                                                                fontSize: 10, color: '#007aff', background: 'none', border: 'none', cursor: 'pointer', padding: 0
                                                            }}>Clear</button>
                                                        )}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>From</div>
                                                            <input
                                                                type="date"
                                                                value={df.from}
                                                                onChange={e => setDateFilter(p.id, 'from', e.target.value)}
                                                                style={{
                                                                    width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 6,
                                                                    border: df.from ? '1px solid #007aff' : '1px solid var(--border-color)',
                                                                    background: df.from ? 'rgba(0,122,255,0.06)' : 'var(--sidebar-bg)',
                                                                    color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
                                                                }}
                                                            />
                                                        </div>
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', paddingTop: 14 }}>→</span>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 3 }}>To</div>
                                                            <input
                                                                type="date"
                                                                value={df.to}
                                                                min={df.from || undefined}
                                                                onChange={e => setDateFilter(p.id, 'to', e.target.value)}
                                                                style={{
                                                                    width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 6,
                                                                    border: df.to ? '1px solid #007aff' : '1px solid var(--border-color)',
                                                                    background: df.to ? 'rgba(0,122,255,0.06)' : 'var(--sidebar-bg)',
                                                                    color: 'var(--text-primary)', outline: 'none', cursor: 'pointer'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Panel footer */}
                            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {processedContents.length} of {contents.length} items
                                </span>
                                <button onClick={() => setShowFilterPanel(false)} style={{
                                    fontSize: 12, fontWeight: 600, padding: '5px 14px', borderRadius: 8,
                                    background: 'var(--text-primary)', color: 'var(--bg-color)',
                                    border: 'none', cursor: 'pointer'
                                }}>Done</button>
                            </div>
                        </div>,
                        document.body
                    )}
                </div>

                {/* Reset all */}
                {hasAnyFilter && (
                    <button onClick={clearAllFilters} style={{
                        padding: '9px 12px', fontSize: 12, fontWeight: 600,
                        background: 'transparent', border: '1px solid rgba(255,77,79,0.3)',
                        color: '#ff4d4f', borderRadius: 10, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        transition: 'all 0.15s', whiteSpace: 'nowrap'
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,79,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={12} /> Reset
                    </button>
                )}
            </div>

            {/* ── Active Filter Chips ── */}
            {
                totalActiveFilters > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, lineHeight: '26px' }}>Active:</span>
                        {Object.entries(activeFilters).flatMap(([propId, vals]) => {
                            const prop = properties.find(p => p.id === propId);
                            const colorConfig = prop?.colorConfig ? JSON.parse(prop.colorConfig) : {};
                            return vals.map(val => {
                                const c = getBadgeColorObj(val, colorConfig);
                                let displayLabel = val;
                                let photoUrl = null;

                                if (prop?.type === 'PERSON') {
                                    const allUsers: any[] = JSON.parse(userOptionsRaw || '[]');
                                    const user = allUsers.find(u => u.id === val || u.name === val);
                                    if (user) {
                                        displayLabel = user.name;
                                        photoUrl = user.photo;
                                    }
                                }

                                return (
                                    <span key={`${propId}:${val}`} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                        padding: photoUrl ? '2px 8px 2px 2px' : '3px 8px 3px 10px', borderRadius: 20,
                                        background: c.bg, color: c.text,
                                        fontSize: 12, fontWeight: 600,
                                        border: `1px solid ${c.text}30`
                                    }}>
                                        {photoUrl && (
                                            <img src={photoUrl} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                        )}
                                        <span style={{ opacity: 0.6, fontSize: 10 }}>{prop?.name}:</span>
                                        {displayLabel}
                                        <button onClick={() => toggleFilter(propId, val)} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            display: 'flex', padding: 0, color: c.text, opacity: 0.6
                                        }}><X size={11} /></button>
                                    </span>
                                );
                            });
                        })}
                        {/* Date filter chips */}
                        {Object.entries(dateFilters).map(([propId, df]) => {
                            const prop = properties.find(p => p.id === propId);
                            const label = [df.from, df.to].filter(Boolean).join(' → ');
                            if (!label) return null;
                            return (
                                <span key={`date:${propId}`} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 8px 3px 10px', borderRadius: 20,
                                    background: 'rgba(0,122,255,0.1)', color: '#007aff',
                                    fontSize: 12, fontWeight: 600,
                                    border: '1px solid rgba(0,122,255,0.25)'
                                }}>
                                    <span style={{ opacity: 0.65, fontSize: 10 }}>📅 {prop?.name}:</span>
                                    {label}
                                    <button onClick={() => clearDateFilter(propId)} style={{
                                        background: 'none', border: 'none', cursor: 'pointer',
                                        display: 'flex', padding: 0, color: '#007aff', opacity: 0.6
                                    }}><X size={11} /></button>
                                </span>
                            );
                        })}
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>
                            → {processedContents.length} result{processedContents.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                )
            }

            {/* View Rendering */}
            {
                activeLayout === 'table' && (
                    <TableView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        viewSettings={activeView}
                        currentUser={currentUser}
                        databaseId={database?.id}
                        onUpdateView={(updated: any) => handleUpdateViewLocally(activeView.id, updated)}
                        onToggleFilter={toggleFilter}
                    />
                )
            }

            {
                activeLayout === 'board' && (
                    <BoardView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        colorConfigMap={colorConfigMap}
                        viewSettings={activeView}
                        currentUser={currentUser}
                    />
                )
            }

            {
                activeLayout === 'gallery' && (
                    <GalleryView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        colorConfigMap={colorConfigMap}
                        viewSettings={activeView}
                        currentUser={currentUser}
                    />
                )
            }

            {
                activeLayout === 'list' && (
                    <ListView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        colorConfigMap={colorConfigMap}
                        viewSettings={activeView}
                        currentUser={currentUser}
                    />
                )
            }

            {
                activeLayout === 'calendar' && (
                    <CalendarView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        viewSettings={activeView}
                        currentUser={currentUser}
                    />
                )
            }

            {
                activeLayout === 'timeline' && (
                    <TimelineView
                        contents={processedContents}
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        onOpenContent={setSelectedContentId}
                        colorConfigMap={colorConfigMap}
                        viewSettings={activeView}
                        currentUser={currentUser}
                    />
                )
            }

            <ContentDetailModal
                isOpen={!!selectedContentId}
                onClose={() => setSelectedContentId(null)}
                content={selectedContent}
                properties={properties}
                userOptionsRaw={userOptionsRaw}
                database={database}
                currentUser={currentUser}
            />

            {/* ── ViewSettings Portal — rendered at body level to avoid overflow clipping ── */}
            {
                viewMenuOpenId && menuAnchorRect && typeof document !== 'undefined' && (() => {
                    const openView = views.find(v => v.id === viewMenuOpenId);
                    if (!openView) return null;
                    return createPortal(
                        <>
                            {/* Invisible backdrop to close when clicking outside */}
                            <div
                                onClick={() => { setViewMenuOpenId(null); setMenuAnchorRect(null); }}
                                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                            />
                            <div style={{
                                position: 'fixed',
                                top: menuAnchorRect.bottom + 4,
                                left: menuAnchorRect.left,
                                zIndex: 9999,
                                background: 'var(--bg-color)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 12,
                                boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
                                minWidth: 260
                            }}>
                                <ViewSettingsMenu
                                    view={openView}
                                    properties={properties}
                                    onClose={() => { setViewMenuOpenId(null); setMenuAnchorRect(null); }}
                                    onUpdate={(updated: any) => handleUpdateViewLocally(openView.id, updated)}
                                    databaseId={database?.id}
                                    initialPanel={viewMenuInitialPanel}
                                    currentUser={currentUser}
                                />
                            </div>
                        </>,
                        document.body
                    );
                })()
            }
        </div>
    );
}
