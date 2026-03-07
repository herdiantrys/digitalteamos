'use client';

import { useState, useMemo, useTransition, useEffect, useRef, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import EditableCell from './EditableCell';
import { deleteContent, bulkDeleteContent, bulkUpdateContentProperty } from '../../lib/content-actions';
import { Type, Hash, ChevronDown, Layers, Calendar, User, CheckSquare, Link as LinkIcon, AtSign, Phone, X, Trash2, ArrowDown, ArrowUp, ArrowUpDown, Check, Edit, Save, Plus } from 'lucide-react';
import PermissionWarningModal from './PermissionWarningModal';
import CreatePropertyModal from './CreatePropertyModal';
import PropertyMenu from './PropertyMenu';
import LucideIcon from '../LucideIcon';
import { updateContentView } from './view-actions';

// ─── Constants ────────────────────────────────────────────────────────────────
function getTypeIcon(type: string, customIcon?: string | null) {
    if (customIcon) return <LucideIcon name={customIcon as any} size={12} strokeWidth={2.5} />;

    const props = { size: 12, strokeWidth: 2.5 };
    switch (type) {
        case 'TEXT': return <Type {...props} />;
        case 'NUMBER': return <Hash {...props} />;
        case 'SELECT': return <ChevronDown {...props} />;
        case 'MULTI_SELECT': return <Layers {...props} />;
        case 'DATE': return <Calendar {...props} />;
        case 'PERSON': return <User {...props} />;
        case 'CHECKBOX': return <CheckSquare {...props} />;
        case 'URL': return <LinkIcon {...props} />;
        case 'EMAIL': return <AtSign {...props} />;
        case 'PHONE': return <Phone {...props} />;
        default: return <span style={{ fontSize: 10 }}>○</span>;
    }
}

// ─── Single-row delete with confirmation ──────────────────────────────────────
function DeleteButton({ contentId, authorId, currentUser, onPermissionDenied }: {
    contentId: string; authorId?: string; currentUser?: any; onPermissionDenied: () => void;
}) {
    const [confirming, setConfirming] = useState(false);

    const handleAttemptDelete = () => {
        const canDelete = currentUser?.role === 'ADMIN' || (currentUser?.id && authorId === currentUser.id);
        if (!canDelete) {
            onPermissionDenied();
            return;
        }
        setConfirming(true);
    };

    if (confirming) return (
        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={async () => {
                await deleteContent({ id: contentId });
            }}
                style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Sure?</button>
            <button onClick={() => setConfirming(false)}
                style={{ padding: '3px 8px', borderRadius: 4, fontSize: 11, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </span>
    );
    return (
        <button onClick={handleAttemptDelete}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.color = '#ff4d4f'; b.style.borderColor = '#ff4d4f'; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border-color)'; }}
        ><Trash2 size={14} /></button>
    );
}

// ─── Mobile Card ──────────────────────────────────────────────────────────────
function MobileCard({ content, properties, userOptionsRaw, selected, onToggle, currentUser, onPermissionDenied }: {
    content: any; properties: any[]; userOptionsRaw: string; selected: boolean; onToggle: () => void; currentUser?: any; onPermissionDenied: () => void;
}) {
    const customData = useMemo(() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } }, [content.customFields]);

    return (
        <div style={{ background: selected ? 'rgba(24,144,255,0.06)' : 'var(--sidebar-bg)', border: `1px solid ${selected ? '#1890ff80' : 'var(--border-color)'}`, borderRadius: 12, padding: 16, marginBottom: 10, transition: 'all 0.15s' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <input type="checkbox" checked={selected} onChange={onToggle} style={{ marginTop: 2, cursor: 'pointer', accentColor: '#1890ff' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>By {content.author?.name}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <DeleteButton contentId={content.id} authorId={content.authorId} currentUser={currentUser} onPermissionDenied={onPermissionDenied} />
                </div>
            </div>
            {properties.slice(0, 4).map(p => {
                const val = customData[p.id];
                if (!val) return null;
                return (
                    <div key={p.id} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--text-secondary)', minWidth: 90, flexShrink: 0 }}>{p.name}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(val)}</span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────
function BulkActionBar({ count, onClearSelection, onDelete, onBulkUpdate, properties, busy }: {
    count: number;
    onClearSelection: () => void;
    onDelete: () => void;
    onBulkUpdate: (propId: string, value: string) => void;
    properties: any[];
    busy: boolean;
}) {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [showBulkEdit, setShowBulkEdit] = useState(false);
    const [selectedPropId, setSelectedPropId] = useState('');
    const [bulkValue, setBulkValue] = useState('');

    return (
        <div style={{
            position: 'sticky', top: 0, zIndex: 20,
            display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
            padding: '12px 16px',
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(24, 144, 255, 0.25)',
            borderRadius: 14,
            marginBottom: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(24,144,255,0.05)',
            animation: 'slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ background: '#1890ff', color: '#fff', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14 }}>
                    {count}
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#333' }}>Items Selected</span>
                <button
                    onClick={onClearSelection}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.03)', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
                >
                    <X size={12} strokeWidth={3} /> Deselect
                </button>
            </div>

            <div style={{ height: 24, width: 1, background: 'rgba(0,0,0,0.1)', margin: '0 6px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Bulk Edit Trigger */}
                {!showBulkEdit ? (
                    <button
                        onClick={() => setShowBulkEdit(true)}
                        disabled={busy}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(24,144,255,0.2)', background: 'rgba(24,144,255,0.05)', color: '#1890ff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(24,144,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(24,144,255,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(24,144,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(24,144,255,0.2)'; }}
                    >
                        <Edit size={14} /> Bulk Edit
                    </button>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(24,144,255,0.05)', padding: '4px 8px', borderRadius: 10, border: '1px solid rgba(24,144,255,0.1)' }}>
                        <select
                            value={selectedPropId}
                            onChange={e => setSelectedPropId(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', outline: 'none' }}
                        >
                            <option value="">Select Property...</option>
                            {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <input
                            placeholder="New value..."
                            value={bulkValue}
                            onChange={e => setBulkValue(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: 12, borderRadius: 6, border: '1px solid rgba(0,0,0,0.1)', background: '#fff', outline: 'none', width: 120 }}
                        />
                        <button
                            onClick={() => { if (selectedPropId) onBulkUpdate(selectedPropId, bulkValue); setShowBulkEdit(false); }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#1890ff', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            <Save size={12} /> Apply
                        </button>
                        <button onClick={() => setShowBulkEdit(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#999', padding: 2 }}>
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Bulk Delete Trigger */}
                {!confirmDelete ? (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        disabled={busy}
                        style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(255,77,79,0.2)', background: 'rgba(255,77,79,0.05)', color: '#ff4d4f', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,79,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,77,79,0.4)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,77,79,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,77,79,0.2)'; }}
                    >
                        <Trash2 size={14} /> Delete
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,77,79,0.05)', padding: '4px 12px', borderRadius: 10, border: '1px solid rgba(255,77,79,0.1)' }}>
                        <span style={{ fontSize: 12, color: '#ff4d4f', fontWeight: 700 }}>Confirm Delete?</span>
                        <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, background: '#ff4d4f', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>Yes</button>
                        <button onClick={() => setConfirmDelete(false)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#fff', color: '#666', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer' }}>No</button>
                    </div>
                )}
            </div>

            {busy && (
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(24,144,255,0.2)', borderTopColor: '#1890ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1890ff' }}>Processing...</span>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// ─── Main TableView ───────────────────────────────────────────────────────────
type SortDir = 'asc' | 'desc';

const MIN_COL_WIDTH = 100;

export default function TableView({
    contents,
    properties,
    userOptionsRaw,
    onOpenContent,
    viewSettings,
    currentUser,
    databaseId,
    onUpdateView,
    onToggleFilter,
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
    onOpenContent: (id: string) => void;
    viewSettings: any;
    currentUser?: any;
    databaseId?: string;
    onUpdateView?: (updated: any) => void;
    onToggleFilter?: (propId: string, value: string) => void;
}) {
    const router = useRouter();
    const [showPermissionWarning, setShowPermissionWarning] = useState(false);

    // ── Property Menu State ──
    const [openPropertyId, setOpenPropertyId] = useState<string | null>(null);
    const [menuAnchor, setMenuAnchor] = useState<{ x: number, y: number } | null>(null);

    const openProperty = useMemo(() => properties.find(p => p.id === openPropertyId), [properties, openPropertyId]);

    function handleHeaderClick(e: React.MouseEvent, propId: string) {
        // Don't open if clicking resizer or if dragging
        if ((e.target as HTMLElement).classList.contains('tv-col-resizer')) return;

        const rect = e.currentTarget.getBoundingClientRect();
        setMenuAnchor({ x: rect.left, y: rect.bottom + 4 });
        setOpenPropertyId(propId);
    }

    const handleHideProperty = async () => {
        if (!openPropertyId) return;
        // propertyVisibility is stored as JSON array of visible property IDs
        const currentVisible: string[] = (() => {
            try {
                if (!viewSettings?.propertyVisibility) return properties.map((p: any) => p.id);
                const parsed = JSON.parse(viewSettings.propertyVisibility);
                // Support both array (current) and legacy object format
                if (Array.isArray(parsed)) return parsed;
                return properties.map((p: any) => p.id);
            } catch { return properties.map((p: any) => p.id); }
        })();
        const updatedVisible = currentVisible.filter((id: string) => id !== openPropertyId);
        const update = { propertyVisibility: JSON.stringify(updatedVisible) };
        onUpdateView?.(update);
        if (viewSettings?.id) {
            try { await updateContentView(viewSettings.id, update); } catch (e) { console.error(e); }
        }
        setOpenPropertyId(null);
    };

    const handleSortProperty = async (direction: 'asc' | 'desc') => {
        if (!openPropertyId) return;
        // Replace all sorts with just this property sort
        const newSort = [{ id: openPropertyId, propertyId: openPropertyId, direction }];
        const update = { sort: JSON.stringify(newSort) };
        onUpdateView?.(update);
        if (viewSettings?.id) {
            try { await updateContentView(viewSettings.id, update); } catch (e) { console.error(e); }
        }
        setOpenPropertyId(null);
    };

    const handleToggleFilterProperty = async () => {
        if (!openPropertyId) return;
        // Parse current view filters (DB-persisted)
        const currentFilters: any[] = (() => {
            try { return viewSettings?.filter ? JSON.parse(viewSettings.filter) : []; } catch { return []; }
        })();
        // Toggle: if a filter for this property already exists, remove it; otherwise add a "not_empty" filter
        const existingIdx = currentFilters.findIndex((f: any) => f.propertyId === openPropertyId);
        const newFilters = existingIdx >= 0
            ? currentFilters.filter((_: any, i: number) => i !== existingIdx)
            : [...currentFilters, { id: Date.now().toString(), propertyId: openPropertyId, operator: 'not_empty', value: '' }];
        const update = { filter: JSON.stringify(newFilters) };
        onUpdateView?.(update);
        if (viewSettings?.id) {
            try { await updateContentView(viewSettings.id, update); } catch (e) { console.error(e); }
        }
        setOpenPropertyId(null);
    };

    // ── Persistent View Settings Data ──
    const visiblePropIds = useMemo(() => {
        if (!viewSettings?.propertyVisibility) return null;
        try {
            const parsed = JSON.parse(viewSettings.propertyVisibility);
            // Ensure it's an array (ViewSettingsMenu stores it as string[])
            return Array.isArray(parsed) ? (parsed as string[]) : null;
        } catch { return null; }
    }, [viewSettings?.propertyVisibility]);

    // Filter properties based on visibility settings
    const displayProperties = useMemo(() => {
        if (!visiblePropIds) return properties;
        return properties.filter((p: any) => visiblePropIds.includes(p.id));
    }, [properties, visiblePropIds]);


    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isPending, startTransition] = useTransition();
    const [busy, setBusy] = useState(false); // Added busy state
    const PAGE_SIZE = 20;

    // ── Drag-to-fill State ──
    const [activeCell, setActiveCell] = useState<{ contentId: string, propId: string, value: any } | null>(null);
    const [fillDragging, setFillDragging] = useState(false);
    const [fillTargetIds, setFillTargetIds] = useState<Set<string>>(new Set());

    const platformProp = displayProperties.find(p => p.name.toLowerCase().includes('platform'));

    // ── Column Width & Order State (Persisted) ──────────────────────────
    const [colWidths, setColWidths] = useState<Record<string, number>>({});
    const [orderedProps, setOrderedProps] = useState([...properties]);

    // Derived state: only ordered properties that are actively visible
    const visibleOrderedProps = useMemo(() => {
        return orderedProps.filter(op => displayProperties.some((dp: any) => dp.id === op.id));
    }, [orderedProps, displayProperties]);

    const [isClient, setIsClient] = useState(false);

    // Default Widths fallback
    const getColWidth = (id: string, defWidth: number) => {
        if (!isClient) return defWidth;
        const w = colWidths[id];
        return Math.max(MIN_COL_WIDTH, w || defWidth);
    };

    useEffect(() => {
        setIsClient(true);
        try {
            // Load widths
            const savedWidths = localStorage.getItem('dt_table_widths');
            if (savedWidths) setColWidths(JSON.parse(savedWidths));

            // Load order
            const savedOrderIds = localStorage.getItem('dt_table_order');
            if (savedOrderIds) {
                const orderIds: string[] = JSON.parse(savedOrderIds);
                const restoredProps: any[] = [];
                // Reconstruct ordered list matching DB properties
                orderIds.forEach(id => {
                    const p = properties.find(x => x.id === id);
                    if (p) restoredProps.push(p);
                });
                // Add any totally new properties that weren't in saved state to the end
                properties.forEach(p => {
                    if (!restoredProps.some(x => x.id === p.id)) restoredProps.push(p);
                });
                setOrderedProps(restoredProps);
            } else {
                setOrderedProps([...properties]);
            }
        } catch (e) {
            console.error('Failed to parse table view preferences', e);
        }
    }, [properties]);

    const saveWidth = (id: string, width: number) => {
        setColWidths(prev => {
            const next = { ...prev, [id]: width };
            localStorage.setItem('dt_table_widths', JSON.stringify(next));
            return next;
        });
    };

    // ── Column Reorder Handlers ──────────────────────────────────────────
    const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
    const [dropIdx, setDropIdx] = useState<number | null>(null);

    const handleDragStart = (idx: number) => setDraggingIdx(idx);
    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggingIdx === null || draggingIdx === idx) return;
        setDropIdx(idx);
    };
    const handleDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        if (draggingIdx === null || draggingIdx === targetIdx) {
            setDraggingIdx(null);
            setDropIdx(null);
            return;
        }
        const newProps = [...orderedProps];
        const [movedItem] = newProps.splice(draggingIdx, 1);
        newProps.splice(targetIdx, 0, movedItem);

        setOrderedProps(newProps);
        setDraggingIdx(null);
        setDropIdx(null);
        localStorage.setItem('dt_table_order', JSON.stringify(newProps.map(p => p.id)));
    };

    // ── Resizer Drag Logic ────────────────────────────────────────────────
    const [resizingColId, setResizingColId] = useState<string | null>(null);
    const startXRef = useRef<number>(0);
    const startWidthRef = useRef<number>(0);

    const onResizeStart = (e: React.MouseEvent, colId: string, currentWidth: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColId(colId);
        startXRef.current = e.clientX;
        startWidthRef.current = currentWidth;
        document.body.style.cursor = 'col-resize';
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingColId) return;
            const diff = e.clientX - startXRef.current;
            const newWidth = Math.max(MIN_COL_WIDTH, startWidthRef.current + diff);
            setColWidths(prev => ({ ...prev, [resizingColId]: newWidth }));
        };
        const handleMouseUp = () => {
            if (resizingColId) {
                // Ensure the final width is persisted
                setColWidths(prev => {
                    localStorage.setItem('dt_table_widths', JSON.stringify(prev));
                    return prev;
                });
                setResizingColId(null);
                document.body.style.cursor = '';
            }
        };

        if (resizingColId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColId]);


    const groupableProps = properties.filter(p => ['STATUS', 'SELECT', 'MULTI_SELECT', 'PERSON'].includes(p.type));
    const groupByPropId = (viewSettings?.groupBy && groupableProps.some(p => p.id === viewSettings.groupBy))
        ? viewSettings.groupBy
        : null;

    const groupedContents = useMemo(() => {
        if (!groupByPropId) return [{ name: '', items: contents }];

        const activeProp = properties.find(p => p.id === groupByPropId);
        if (!activeProp) return [{ name: '', items: contents }];

        const optionsRaw = activeProp.options ? JSON.parse(activeProp.options) : (activeProp.type === 'PERSON' ? JSON.parse(userOptionsRaw) : []);
        const options: string[] = optionsRaw.map((opt: any) => typeof opt === 'string' ? opt : opt.name || opt.label);
        const buckets: Record<string, any[]> = { 'Uncategorized': [] };
        options.forEach(opt => buckets[opt] = []);

        contents.forEach(content => {
            const customData = content.customFields ? JSON.parse(content.customFields) : {};
            const val = customData[activeProp.id];

            if (activeProp.type === 'MULTI_SELECT' || activeProp.type === 'PERSON') {
                const vals = val ? val.split(',').map((v: string) => v.trim()).filter(Boolean) : [];
                if (vals.length > 0) {
                    vals.forEach((v: string) => {
                        if (buckets[v]) buckets[v].push(content);
                        else buckets['Uncategorized'].push(content);
                    });
                } else {
                    buckets['Uncategorized'].push(content);
                }
            } else {
                if (val && buckets[val]) buckets[val].push(content);
                else buckets['Uncategorized'].push(content);
            }
        });

        return [...options, 'Uncategorized'].map(name => ({
            name,
            items: buckets[name]
        })).filter(g => g.items.length > 0);
    }, [contents, groupByPropId, properties, userOptionsRaw]);

    // Apply pagination to grouped items (this is tricky, so let's flatten for pagination OR paginate per group)
    // For now, let's flatten the grouped contents for display but keep the group info
    const flattenedGrouped = useMemo(() => {
        const flat: { type: 'header' | 'row'; name?: string; content?: any }[] = [];
        groupedContents.forEach(g => {
            if (g.name) flat.push({ type: 'header', name: g.name });
            g.items.forEach(item => flat.push({ type: 'row', content: item }));
        });
        return flat;
    }, [groupedContents]);

    const totalPages = Math.max(1, Math.ceil(contents.length / PAGE_SIZE));
    // When grouped, we might want to disable pagination or paginate the contents only
    // Let's paginate the contents but keep them in their groups visually
    const pagedContents = contents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const pagedGrouped = useMemo(() => {
        if (!groupByPropId) return [{ name: '', items: pagedContents }];

        const result: { name: string; items: any[] }[] = [];
        groupedContents.forEach(g => {
            const items = g.items.filter(item => pagedContents.some(p => p.id === item.id));
            if (items.length > 0) {
                result.push({ name: g.name, items });
            }
        });
        return result;
    }, [groupedContents, pagedContents, groupByPropId]);

    const pagedIds = pagedContents.map(c => c.id);
    const allPageSelected = pagedIds.length > 0 && pagedIds.every(id => selectedIds.has(id));
    const someSelected = selectedIds.size > 0;



    // ── Selection helpers ──────────────────────────────────────────────────
    const toggleRow = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const togglePage = () => {
        setSelectedIds(prev => {
            const n = new Set(prev);
            if (allPageSelected) pagedIds.forEach(id => n.delete(id));
            else pagedIds.forEach(id => n.add(id));
            return n;
        });
    };
    const selectAll = () => setSelectedIds(new Set(contents.map(c => c.id)));
    const clearSelection = () => setSelectedIds(new Set());

    // ── Bulk operations ────────────────────────────────────────────────────
    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} items?`)) return;
        setBusy(true);
        try {
            await bulkDeleteContent([...selectedIds]);
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    };

    const handleBulkPropUpdate = async (propId: string, val: string) => {
        setBusy(true);
        try {
            await bulkUpdateContentProperty([...selectedIds], propId, val);
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
    };

    // ── Drag-to-fill Handlers ──
    const handleFillStart = (e: React.MouseEvent, contentId: string, propId: string, value: any) => {
        e.preventDefault();
        e.stopPropagation();
        setFillDragging(true);
        setActiveCell({ contentId, propId, value });
        setFillTargetIds(new Set());
    };

    const handleFillEnter = (contentId: string) => {
        if (!fillDragging || !activeCell) return;

        // Find indices to determine range
        const ids = pagedContents.map(c => c.id);
        const startIdx = ids.indexOf(activeCell.contentId);
        const currentIdx = ids.indexOf(contentId);

        if (startIdx === -1 || currentIdx === -1) return;

        const min = Math.min(startIdx, currentIdx);
        const max = Math.max(startIdx, currentIdx);
        const targetIds = new Set(ids.slice(min, max + 1));
        targetIds.delete(activeCell.contentId); // Don't include source in target updates
        setFillTargetIds(targetIds);
    };

    useEffect(() => {
        const handleGlobalUp = () => {
            if (fillDragging && activeCell && fillTargetIds.size > 0) {
                startTransition(async () => {
                    await bulkUpdateContentProperty([...fillTargetIds], activeCell.propId, activeCell.value);
                    router.refresh();
                });
            }
            setFillDragging(false);
            setFillTargetIds(new Set());
        };
        if (fillDragging) {
            window.addEventListener('mouseup', handleGlobalUp);
            return () => window.removeEventListener('mouseup', handleGlobalUp);
        }
    }, [fillDragging, activeCell, fillTargetIds, router]);

    return (
        <div>
            <style>{`
                .tv-row { transition: background 0.2s ease, transform 0.1s ease; }
                .tv-row:hover { background: rgba(0, 0, 0, 0.02) !important; }
                .tv-row-sel  { background: rgba(0, 122, 255, 0.04) !important; border-left: 2px solid #007aff !important; }
                
                .tv-th-btn { background:transparent; border:none; cursor:pointer; color:var(--text-secondary); display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; padding:0; letter-spacing:0.06em; text-transform:uppercase; transition: color 0.15s ease; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; outline: none; }
                .tv-th-btn:hover { color: var(--text-primary) !important; }
                .tv-title-link { cursor: pointer; color: var(--text-primary); transition: all 0.2s ease; font-weight: 500; }
                .tv-title-link:hover { color: #007aff; }

                /* Drag & Drop Columns */
                .th-draggable { cursor: grab; position: relative; transition: background 0.2s ease; }
                .th-draggable:active { cursor: grabbing; }
                .th-draggable:hover { background: rgba(0,0,0,0.03); }
                .drop-indicator-left::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #007aff; box-shadow: 0 0 12px rgba(0,122,255,0.4); z-index: 10; }
                .drop-indicator-right::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: #007aff; box-shadow: 0 0 12px rgba(0,122,255,0.4); z-index: 10; }
                
                /* Layout */
                .tv-cell-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; word-break: keep-all; box-sizing: border-box; }
                .tv-checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: #007aff; border-radius: 4px; border: 1.5px solid var(--border-color); transition: all 0.2s; display: block; }
                
                /* Resizer handles */
                .tv-col-resizer { position: absolute; right: -4px; top: 0; bottom: 0; width: 8px; cursor: col-resize; z-index: 10; transition: background 0.2s; }
                .tv-col-resizer:hover, .tv-col-resizer.is-resizing { background: rgba(0, 122, 255, 0.3); }

                /* Drag-to-fill styles */
                .tv-td-active { box-shadow: inset 0 0 0 2px #007aff !important; position: relative; z-index: 5; }
                .tv-fill-handle { 
                    position: absolute; 
                    right: -4px; 
                    bottom: -4px; 
                    width: 7px; 
                    height: 7px; 
                    background: #007aff; 
                    border: 1px solid #fff; 
                    cursor: crosshair; 
                    z-index: 10; 
                    border-radius: 1px;
                }
                .tv-fill-target { background: rgba(0, 122, 255, 0.08) !important; position: relative; }
                .tv-fill-target::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    border-left: 2px dashed #007aff;
                    border-right: 2px dashed #007aff;
                    pointer-events: none;
                }
                .tv-fill-target-top::after { border-top: 2px dashed #007aff; }
                .tv-fill-target-bottom::after { border-bottom: 2px dashed #007aff; }

                @media(max-width:700px){.tv-desktop{display:none!important}.tv-mobile{display:block!important}}
                @media(min-width:701px){.tv-desktop{display:block!important}.tv-mobile{display:none!important}}
            `}</style>

            {/* ── Toolbar ── */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{contents.length} object{contents.length !== 1 ? 's' : ''}</span>
                    {someSelected && contents.length > PAGE_SIZE && (
                        <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(0,122,255,0.2)', background: 'rgba(0,122,255,0.05)', color: '#007aff', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,122,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,122,255,0.05)'}>
                            Select all {contents.length}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Bulk Action Bar ── */}
            {someSelected && (
                <BulkActionBar
                    count={selectedIds.size}
                    onClearSelection={clearSelection}
                    onDelete={handleBulkDelete}
                    onBulkUpdate={handleBulkPropUpdate}
                    properties={properties}
                    busy={busy}
                />
            )}

            {/* ── Mobile Cards ── */}
            <div className="tv-mobile">
                {pagedGrouped.map(group => (
                    <div key={group.name} style={{ marginBottom: 20 }}>
                        {group.name && (
                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 10, padding: '0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {group.name}
                                <span style={{ fontSize: 10, background: 'var(--sidebar-bg)', padding: '2px 6px', borderRadius: 10 }}>{group.items.length}</span>
                            </div>
                        )}
                        {group.items.map(c => <MobileCard key={c.id} content={c} properties={visibleOrderedProps} userOptionsRaw={userOptionsRaw} selected={selectedIds.has(c.id)} onToggle={() => toggleRow(c.id)} currentUser={currentUser} onPermissionDenied={() => setShowPermissionWarning(true)} />)}
                    </div>
                ))}
                {pagedContents.length === 0 && <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>No content found matches the criteria.</div>}
            </div>

            {/* ── Desktop Table ── */}
            <div className="tv-desktop" style={{ borderRadius: 12, border: '1px solid rgba(0, 0, 0, 0.05)', background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
                <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 230px)', width: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 15, background: '#fafafa', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                            <tr style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>

                                {/* Select all checkbox (fixed 40px width) */}
                                <th style={{ padding: '14px 16px', width: 40, boxSizing: 'border-box' }}>
                                    <input
                                        type="checkbox"
                                        className="tv-checkbox"
                                        checked={allPageSelected}
                                        ref={el => { if (el) el.indeterminate = !allPageSelected && pagedIds.some(id => selectedIds.has(id)); }}
                                        onChange={togglePage}
                                        title="Select/deselect this page"
                                    />
                                </th>

                                {/* Title Column */}
                                <th style={{ padding: '14px 16px', position: 'relative', width: getColWidth('col_title', 280), boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Title
                                    </div>
                                    <div className={`tv-col-resizer ${resizingColId === 'col_title' ? 'is-resizing' : ''}`} onMouseDown={(e) => onResizeStart(e, 'col_title', getColWidth('col_title', 280))} />
                                </th>

                                {/* Date Column */}
                                <th style={{ padding: '14px 16px', position: 'relative', width: getColWidth('col_createdAt', 140), boxSizing: 'border-box' }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Created
                                    </div>
                                    <div className={`tv-col-resizer ${resizingColId === 'col_createdAt' ? 'is-resizing' : ''}`} onMouseDown={(e) => onResizeStart(e, 'col_createdAt', getColWidth('col_createdAt', 140))} />
                                </th>

                                {/* Custom Properties */}
                                {visibleOrderedProps.map((p, idx) => {
                                    const w = getColWidth(p.id, 160);
                                    // Map visual index to actual orderedProps index for drag/drop
                                    const actualIdx = orderedProps.findIndex(op => op.id === p.id);

                                    return (
                                        <th
                                            key={p.id}
                                            draggable={resizingColId === null} // disable drag during resize
                                            onDragStart={() => handleDragStart(actualIdx)}
                                            onDragOver={(e) => handleDragOver(e, actualIdx)}
                                            onDrop={(e) => handleDrop(e, actualIdx)}
                                            className={`th-draggable ${dropIdx === actualIdx ? (draggingIdx !== null && draggingIdx < actualIdx ? 'drop-indicator-right' : 'drop-indicator-left') : ''}`}
                                            onClick={(e) => handleHeaderClick(e, p.id)}
                                            style={{ padding: '14px 16px', width: w, minWidth: MIN_COL_WIDTH, position: 'relative', borderLeft: '1px solid rgba(0,0,0,0.03)', boxSizing: 'border-box', cursor: 'pointer' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                <span style={{ display: 'flex', flexShrink: 0 }}>{getTypeIcon(p.type, p.icon)}</span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</span>
                                            </div>
                                            <div className={`tv-col-resizer ${resizingColId === p.id ? 'is-resizing' : ''}`} onMouseDown={(e) => onResizeStart(e, p.id, w)} />
                                        </th>
                                    );
                                })}

                                {/* Actions Column / Add Property */}
                                <th style={{ padding: '14px 16px', width: 60, boxSizing: 'border-box', position: 'relative' }}>
                                    {currentUser?.role === 'ADMIN' && databaseId && (
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <CreatePropertyModal databaseId={databaseId} />
                                        </div>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: 13, background: '#fff' }}>
                            {pagedGrouped.map(group => (
                                <Fragment key={group.name}>
                                    {group.name && (
                                        <tr style={{ background: '#f8f9fa' }}>
                                            <td colSpan={visibleOrderedProps.length + 4} style={{ padding: '8px 16px', fontWeight: 700, fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {group.name}
                                                    <span style={{ fontSize: 10, background: 'var(--bg-color)', padding: '1px 6px', borderRadius: 10, border: '1px solid var(--border-color)', fontWeight: 600 }}>{group.items.length}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {group.items.map((content) => {
                                        const isSelected = selectedIds.has(content.id);
                                        const customData = (() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } })();

                                        return (
                                            <tr key={content.id} className={`tv-row${isSelected ? ' tv-row-sel' : ''}`}
                                                style={{
                                                    borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                                                    background: isSelected ? undefined : (content.colorMatch ? `${content.colorMatch}1a` : 'transparent'),
                                                    transition: 'background 0.2s'
                                                }}>

                                                <td style={{ padding: '14px 16px', boxSizing: 'border-box' }}>
                                                    <input type="checkbox" className="tv-checkbox" checked={isSelected} onChange={() => toggleRow(content.id)} />
                                                </td>

                                                <td className="tv-cell-truncate" style={{ padding: '14px 16px', boxSizing: 'border-box' }}>
                                                    <div
                                                        className="tv-title-link tv-cell-truncate"
                                                        onClick={() => onOpenContent ? onOpenContent(content.id) : router.push(`/content/${content.id}`)}
                                                        style={{ fontSize: 13.5, marginBottom: 2 }}
                                                        title={content.title}
                                                    >
                                                        {content.title}
                                                    </div>
                                                    <div className="tv-cell-truncate" style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.8 }}>by {content.author?.name || 'Admin'}</div>
                                                </td>

                                                <td suppressHydrationWarning className="tv-cell-truncate" style={{ padding: '14px 16px', color: '#666', boxSizing: 'border-box' }}>
                                                    {new Date(content.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </td>

                                                {visibleOrderedProps.map(p => {
                                                    const isActive = activeCell?.contentId === content.id && activeCell?.propId === p.id;
                                                    const isTarget = fillTargetIds.has(content.id) && activeCell?.propId === p.id;

                                                    // Determine border styles for target range
                                                    let targetClass = '';
                                                    if (isTarget) {
                                                        const ids = pagedContents.map(c => c.id);
                                                        const startIdx = ids.indexOf(activeCell!.contentId);
                                                        const currentIdx = ids.indexOf(content.id);
                                                        const min = Math.min(startIdx, currentIdx);
                                                        const max = Math.max(startIdx, currentIdx);

                                                        targetClass = ' tv-fill-target';
                                                        if (currentIdx === min) targetClass += ' tv-fill-target-top';
                                                        if (currentIdx === max) targetClass += ' tv-fill-target-bottom';
                                                    }

                                                    return (
                                                        <td
                                                            key={p.id}
                                                            className={`tv-cell-truncate${isActive ? ' tv-td-active' : ''}${targetClass}`}
                                                            style={{ padding: '8px 12px', borderLeft: '1px solid rgba(0,0,0,0.02)', boxSizing: 'border-box' }}
                                                            onMouseEnter={() => handleFillEnter(content.id)}
                                                            onClick={() => setActiveCell({ contentId: content.id, propId: p.id, value: customData[p.id] })}
                                                        >
                                                            <EditableCell
                                                                contentId={content.id}
                                                                propId={p.id}
                                                                type={p.type}
                                                                optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options}
                                                                userOptionsRaw={userOptionsRaw}
                                                                initialValue={customData[p.id]}
                                                                propertyId={p.id}
                                                                colorConfigRaw={(p as any).colorConfig}
                                                                disabled={(() => {
                                                                    if (currentUser?.role === 'ADMIN') return false;
                                                                    if (content.authorId === currentUser?.id) return false;

                                                                    // Check if user is linked in any PERSON property
                                                                    const customFields = (() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } })();
                                                                    const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
                                                                    return !personFields.some(id => {
                                                                        const val = customFields[id];
                                                                        if (!val) return false;
                                                                        return String(val).split(',').map(s => s.trim()).includes(currentUser?.id);
                                                                    });
                                                                })()}
                                                            />
                                                            {isActive && (
                                                                <div
                                                                    className="tv-fill-handle"
                                                                    onMouseDown={(e) => handleFillStart(e, content.id, p.id, customData[p.id])}
                                                                    title="Drag vertically to fill value"
                                                                />
                                                            )}
                                                        </td>
                                                    );
                                                })}

                                                <td style={{ padding: '14px 16px', textAlign: 'right', boxSizing: 'border-box', borderLeft: '1px solid rgba(0,0,0,0.02)' }}>
                                                    <DeleteButton
                                                        contentId={content.id}
                                                        authorId={content.authorId}
                                                        currentUser={currentUser}
                                                        onPermissionDenied={() => setShowPermissionWarning(true)}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>

                    {pagedContents.length === 0 && (
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
                        {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, contents.length)} of {contents.length}
                    </span>
                </div>
            )}

            {showPermissionWarning && (
                <PermissionWarningModal isOpen={showPermissionWarning} onClose={() => setShowPermissionWarning(false)} />
            )}

            {openPropertyId && menuAnchor && openProperty && (
                <div style={{ position: 'fixed', left: menuAnchor.x, top: menuAnchor.y, zIndex: 10001 }}>
                    <PropertyMenu
                        property={openProperty}
                        onClose={() => { setOpenPropertyId(null); setMenuAnchor(null); }}
                        onHide={handleHideProperty}
                        onToggleSort={handleSortProperty}
                        onToggleFilter={handleToggleFilterProperty}
                    />
                </div>
            )}
        </div>
    );
}
