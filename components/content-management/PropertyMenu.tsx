'use client';

import { useState, useEffect, useRef } from 'react';
import {
    Type, Hash, DollarSign, Percent, List, CheckSquare, Calendar, User,
    ChevronRight, Filter, ArrowDownUp, Layers, EyeOff,
    Trash2, Copy, ArrowLeft, ArrowRight, Table,
    Check, X, Search, Info, Settings2
} from 'lucide-react';
import LucideIcon from '../LucideIcon';
import { updatePropertyDefinition, deletePropertyDefinition, duplicatePropertyDefinition, updatePropertyColorConfig } from '../../lib/property-actions';

interface Property {
    id: string;
    name: string;
    type: string;
    options: string | null;
    icon: string | null;
    colorConfig?: string | null;
}

const PROPERTY_TYPES = [
    { id: 'TEXT', label: 'Text', icon: <Type size={16} /> },
    { id: 'NUMBER', label: 'Number', icon: <Hash size={16} /> },
    { id: 'CURRENCY', label: 'Currency', icon: <DollarSign size={16} /> },
    { id: 'PERCENT', label: 'Percent', icon: <Percent size={16} /> },
    { id: 'SELECT', label: 'Select', icon: <List size={16} /> },
    { id: 'MULTI_SELECT', label: 'Multi-select', icon: <Layers size={16} /> },
    { id: 'STATUS', label: 'Status', icon: <CheckSquare size={16} /> },
    { id: 'DATE', label: 'Date', icon: <Calendar size={16} /> },
    { id: 'PERSON', label: 'Person', icon: <User size={16} /> },
];

const COLORS = [
    { name: 'Default', bg: '#f1f1ef', text: '#37352f' },
    { name: 'Gray', bg: '#f1f1f1', text: '#9b9a97' },
    { name: 'Brown', bg: '#f4eeee', text: '#976d6d' },
    { name: 'Orange', bg: '#fbecdd', text: '#d9730d' },
    { name: 'Yellow', bg: '#fbf3db', text: '#dfab01' },
    { name: 'Green', bg: '#edf3ec', text: '#448361' },
    { name: 'Blue', bg: '#e7f3f8', text: '#337ea9' },
    { name: 'Purple', bg: '#f4f0f7', text: '#9065b0' },
    { name: 'Pink', bg: '#f9f0f5', text: '#c14c8a' },
    { name: 'Red', bg: '#fdebec', text: '#d44c47' },
];

const POPULAR_ICONS = [
    'User', 'Hash', 'Type', 'Calendar', 'CheckSquare', 'Layers', 'List', 'Tag',
    'Flag', 'Clock', 'Link', 'Mail', 'Phone', 'MapPin', 'Globe', 'Database',
    'Briefcase', 'Star', 'Heart', 'Sun', 'Moon', 'Cloud', 'Lock', 'Bell'
];

export default function PropertyMenu({
    property,
    onClose,
    onToggleFilter,
    onToggleSort,
    onHide,
}: {
    property: Property;
    onClose: () => void;
    onToggleFilter?: () => void;
    onToggleSort?: (dir: 'asc' | 'desc') => void;
    onHide?: () => void;
}) {
    const [name, setName] = useState(property.name);
    const [isRenaming, setIsRenaming] = useState(false);
    const [activePanel, setActivePanel] = useState<'main' | 'type' | 'icons' | 'edit'>('main');
    const [options, setOptions] = useState<string[]>(() => {
        try { return property.options ? JSON.parse(property.options) : []; } catch { return []; }
    });
    const [colorConfig, setColorConfig] = useState<Record<string, string>>(() => {
        try { return property.colorConfig ? JSON.parse(property.colorConfig) : {}; } catch { return {}; }
    });
    const [newOption, setNewOption] = useState('');
    // Inline rename state: track which option is being edited and its temp value
    const [editingOption, setEditingOption] = useState<string | null>(null);
    const [editingValue, setEditingValue] = useState<string>('');
    // Which option's color swatches are open
    const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);

    // Custom color state
    const [customColorFor, setCustomColorFor] = useState<string | null>(null);
    const [customBg, setCustomBg] = useState<string>('#f0f0f0');
    const [customText, setCustomText] = useState<string>('#333333');

    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-save name on blur
    async function handleSaveName() {
        if (name === property.name) return;
        await updatePropertyDefinition(property.id, name, property.type, property.options, property.icon);
    }

    async function handleIconSelect(iconName: string) {
        await updatePropertyDefinition(property.id, property.name, property.type, property.options, iconName);
        setActivePanel('main');
    }

    async function handleTypeSelect(type: string) {
        await updatePropertyDefinition(property.id, property.name, type, property.options, property.icon);
        onClose();
    }

    async function handleDelete() {
        if (!confirm(`Delete property "${property.name}"? This will delete all data in this column.`)) return;
        await deletePropertyDefinition(property.id);
        onClose();
    }

    async function handleDuplicate() {
        await duplicatePropertyDefinition(property.id);
        onClose();
    }

    async function handleAddOption() {
        if (!newOption.trim()) return;
        const updated = [...options, newOption.trim()];
        setOptions(updated);
        setNewOption('');
        await updatePropertyDefinition(property.id, property.name, property.type, JSON.stringify(updated), property.icon);
    }

    async function handleRemoveOption(opt: string) {
        const updated = options.filter(o => o !== opt);
        setOptions(updated);
        await updatePropertyDefinition(property.id, property.name, property.type, JSON.stringify(updated), property.icon);
    }

    async function handleRenameOption(oldOpt: string, newName: string) {
        const trimmed = newName.trim();
        if (!trimmed || trimmed === oldOpt) { setEditingOption(null); return; }
        // Transfer color config to new name
        const newColorConfig = { ...colorConfig };
        if (newColorConfig[oldOpt]) { newColorConfig[trimmed] = newColorConfig[oldOpt]; delete newColorConfig[oldOpt]; }
        const updated = options.map(o => o === oldOpt ? trimmed : o);
        setOptions(updated);
        setColorConfig(newColorConfig);
        setEditingOption(null);
        await updatePropertyDefinition(property.id, property.name, property.type, JSON.stringify(updated), property.icon);
        if (Object.keys(newColorConfig).length > 0) {
            await updatePropertyColorConfig(property.id, JSON.stringify(newColorConfig));
        }
    }

    async function handleOptionColor(opt: string, colorName: string) {
        const updated = { ...colorConfig, [opt]: colorName };
        setColorConfig(updated);
        setColorPickerFor(null);
        await updatePropertyColorConfig(property.id, JSON.stringify(updated));
    }

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const itemStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '6px 14px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 13.5,
        color: 'var(--text-primary)',
        textAlign: 'left',
        transition: 'background 0.15s ease',
        borderRadius: 4
    };

    const isSelectable = ['SELECT', 'MULTI_SELECT', 'STATUS'].includes(property.type);

    return (
        <div
            ref={menuRef}
            style={{
                position: 'fixed',
                zIndex: 10000,
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2), 0 0 1px rgba(0,0,0,0.1)',
                width: 280,
                padding: '10px 6px',
                animation: 'menuFadeIn 0.2s cubic-bezier(0,0,0.2,1)',
                color: 'var(--text-primary)',
                maxHeight: '80vh',
                overflowY: 'auto'
            }}
        >
            <style>{`
                @keyframes menuFadeIn {
                    from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .property-menu-item:hover { background: var(--hover-bg) !important; }
                .color-dot:hover { transform: scale(1.2); }
            `}</style>

            {activePanel === 'main' && (
                <>
                    {/* Header: Icon & Name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 6 }}>
                        <button
                            onClick={() => setActivePanel('icons')}
                            style={{
                                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '1px solid var(--border-color)', borderRadius: 6, background: 'none', cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <LucideIcon name={property.icon || (PROPERTY_TYPES.find(t => t.id === property.type)?.id === 'TEXT' ? 'Type' : 'Database')} size={16} />
                        </button>
                        <input
                            ref={inputRef}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={handleSaveName}
                            onKeyDown={e => e.key === 'Enter' && inputRef.current?.blur()}
                            placeholder="Property name"
                            style={{
                                flex: 1, background: 'none', border: '1px solid transparent',
                                outline: 'none', fontSize: 13.5, fontWeight: 500, padding: '4px 6px',
                                borderRadius: 4, transition: 'all 0.2s'
                            }}
                            onFocus={e => (e.currentTarget.style.border = '1px solid var(--accent-color, #007aff)')}
                        />
                    </div>

                    {/* Menu Items */}
                    <button
                        className="property-menu-item"
                        style={{ ...itemStyle, opacity: isSelectable ? 1 : 0.5, cursor: isSelectable ? 'pointer' : 'default' }}
                        onClick={() => isSelectable && setActivePanel('edit')}
                    >
                        <Settings2 size={16} style={{ opacity: 0.6 }} />
                        <span>Edit property</span>
                        <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.4 }} />
                    </button>

                    <button className="property-menu-item" style={itemStyle} onClick={() => setActivePanel('type')}>
                        <Table size={16} style={{ opacity: 0.6 }} />
                        <span>Change type</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 12, opacity: 0.5 }}>{property.type}</span>
                            <ChevronRight size={14} style={{ opacity: 0.4 }} />
                        </div>
                    </button>

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '6px 14px' }} />

                    <button className="property-menu-item" style={itemStyle} onClick={onToggleFilter}>
                        <Filter size={16} style={{ opacity: 0.6 }} />
                        <span>Filter</span>
                    </button>

                    <button className="property-menu-item" style={itemStyle} onClick={() => onToggleSort?.('asc')}>
                        <ArrowDownUp size={16} style={{ opacity: 0.6 }} />
                        <span>Sort Ascending</span>
                    </button>

                    <button className="property-menu-item" style={itemStyle} onClick={() => onToggleSort?.('desc')}>
                        <ArrowDownUp size={16} style={{ opacity: 0.6, transform: 'rotate(180deg)' }} />
                        <span>Sort Descending</span>
                    </button>

                    <button className="property-menu-item" style={itemStyle} onClick={onHide}>
                        <EyeOff size={16} style={{ opacity: 0.6 }} />
                        <span>Hide in view</span>
                    </button>

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '6px 14px' }} />

                    <button className="property-menu-item" style={itemStyle} onClick={handleDuplicate}>
                        <Copy size={16} style={{ opacity: 0.6 }} />
                        <span>Duplicate property</span>
                    </button>

                    <button className="property-menu-item" style={{ ...itemStyle, color: '#ef4444' }} onClick={handleDelete}>
                        <Trash2 size={16} style={{ opacity: 0.8 }} />
                        <span>Delete property</span>
                    </button>
                </>
            )}

            {activePanel === 'edit' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                        <button onClick={() => { setActivePanel('main'); setColorPickerFor(null); setEditingOption(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Options</span>
                    </div>

                    <div style={{ padding: '0 8px 10px' }}>
                        {/* Add new option */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                            <input
                                value={newOption}
                                onChange={e => setNewOption(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddOption()}
                                placeholder="Add option..."
                                style={{ flex: 1, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid var(--border-color)', outline: 'none', background: 'var(--sidebar-bg)', color: 'var(--text-primary)' }}
                            />
                            <button onClick={handleAddOption} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--text-primary)', color: 'var(--bg-color)', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Add</button>
                        </div>

                        {/* Options list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {options.map(opt => {
                                const activeColor = COLORS.find(c => c.name === (colorConfig[opt] || 'Default')) || COLORS[0];
                                const isEditingThis = editingOption === opt;
                                const isColorOpen = colorPickerFor === opt;
                                return (
                                    <div key={opt} style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-color)', background: 'var(--hover-bg)' }}>
                                        {/* Option row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                                            {/* Color dot — click to open swatch picker */}
                                            <button
                                                title="Change color"
                                                onClick={() => setColorPickerFor(isColorOpen ? null : opt)}
                                                style={{
                                                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                                                    background: activeColor.bg,
                                                    border: `2px solid ${activeColor.text}50`,
                                                    cursor: 'pointer', outline: 'none',
                                                    transition: 'transform 0.15s',
                                                    transform: isColorOpen ? 'scale(1.2)' : 'scale(1)'
                                                }}
                                            />

                                            {/* Option name — click to rename inline */}
                                            {isEditingThis ? (
                                                <input
                                                    autoFocus
                                                    value={editingValue}
                                                    onChange={e => setEditingValue(e.target.value)}
                                                    onBlur={() => handleRenameOption(opt, editingValue)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleRenameOption(opt, editingValue);
                                                        if (e.key === 'Escape') setEditingOption(null);
                                                    }}
                                                    style={{
                                                        flex: 1, fontSize: 12, padding: '2px 6px',
                                                        borderRadius: 4, border: '1px solid var(--accent-color, #007aff)',
                                                        outline: 'none', background: 'var(--bg-color)', color: 'var(--text-primary)'
                                                    }}
                                                />
                                            ) : (
                                                <span
                                                    title="Click to rename"
                                                    onClick={() => { setEditingOption(opt); setEditingValue(opt); setColorPickerFor(null); }}
                                                    style={{
                                                        fontSize: 12, flex: 1, cursor: 'text',
                                                        padding: '2px 4px', borderRadius: 4,
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                >
                                                    {opt}
                                                </span>
                                            )}

                                            {/* Delete option */}
                                            <button onClick={() => handleRemoveOption(opt)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 2, opacity: 0.5, display: 'flex', flexShrink: 0 }}
                                                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                                onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>

                                        {/* Color swatch grid — shown only for this option */}
                                        {isColorOpen && (
                                            <div style={{
                                                padding: '6px 8px 8px',
                                                borderTop: '1px solid var(--border-color)',
                                                background: 'var(--bg-color)'
                                            }}>
                                                <div style={{
                                                    display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4,
                                                    marginBottom: 6
                                                }}>
                                                    {COLORS.map(c => (
                                                        <button
                                                            key={c.name}
                                                            title={c.name}
                                                            onClick={() => {
                                                                handleOptionColor(opt, c.name);
                                                                setCustomColorFor(null);
                                                            }}
                                                            style={{
                                                                height: 22, borderRadius: 6,
                                                                background: c.bg, border: colorConfig[opt] === c.name ? `2px solid ${c.text}` : '1px solid rgba(0,0,0,0.08)',
                                                                cursor: 'pointer', transition: 'transform 0.12s',
                                                                outline: 'none'
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
                                                            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Custom Color Button & Form */}
                                                {customColorFor !== opt ? (
                                                    <div style={{
                                                        cursor: 'pointer', padding: '4px 8px', fontSize: 11,
                                                        background: 'transparent', border: '1px dashed rgba(0,0,0,0.15)',
                                                        borderRadius: 6, color: 'var(--text-secondary)', textAlign: 'center'
                                                    }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCustomColorFor(opt);
                                                            // Try to initialize with existing custom color if it has one
                                                            const existing = colorConfig[opt];
                                                            if (existing && existing.startsWith('custom:')) {
                                                                const parts = existing.split(':');
                                                                if (parts.length === 3) {
                                                                    setCustomBg(parts[1]);
                                                                    setCustomText(parts[2]);
                                                                }
                                                            } else {
                                                                setCustomBg('#f0f0f0');
                                                                setCustomText('#333333');
                                                            }
                                                        }}>
                                                        + Custom HEX
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        display: 'flex', flexDirection: 'column', gap: 6,
                                                        padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: 6, border: '1px solid var(--border-color)'
                                                    }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Background</span>
                                                            <input type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Text</span>
                                                            <input type="color" value={customText} onChange={e => setCustomText(e.target.value)} style={{ width: 24, height: 24, padding: 0, border: 'none', cursor: 'pointer', borderRadius: 4 }} />
                                                        </div>
                                                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                                            <button onClick={() => setCustomColorFor(null)} style={{ flex: 1, padding: '4px', fontSize: 11, cursor: 'pointer', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-secondary)' }}>Cancel</button>
                                                            <button onClick={() => { handleOptionColor(opt, `custom:${customBg}:${customText}`); setCustomColorFor(null); }} style={{ flex: 1, padding: '4px', fontSize: 11, cursor: 'pointer', background: 'var(--text-primary)', border: 'none', borderRadius: 4, color: 'var(--bg-color)', fontWeight: 600 }}>Apply</button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {options.length === 0 && (
                        <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                            No options added yet.
                        </div>
                    )}
                </div>
            )}

            {activePanel === 'icons' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 8 }}>
                        <button onClick={() => setActivePanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Icons</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, padding: '0 8px' }}>
                        {POPULAR_ICONS.map(icon => (
                            <button
                                key={icon}
                                onClick={() => handleIconSelect(icon)}
                                style={{
                                    aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: property.icon === icon ? 'var(--accent-alpha)' : 'transparent',
                                    border: 'none', borderRadius: 4, cursor: 'pointer', color: property.icon === icon ? 'var(--accent-color)' : 'var(--text-primary)',
                                    transition: 'background 0.2s'
                                }}
                                className="property-menu-item"
                                title={icon}
                            >
                                <LucideIcon name={icon as any} size={18} />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {activePanel === 'type' && (
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 8 }}>
                        <button onClick={() => setActivePanel('main')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', color: 'var(--text-secondary)' }}>
                            <ArrowLeft size={16} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Change type</span>
                    </div>
                    <div style={{ padding: '0 2px' }}>
                        {PROPERTY_TYPES.map(type => (
                            <button
                                key={type.id}
                                onClick={() => handleTypeSelect(type.id)}
                                style={{ ...itemStyle, background: property.type === type.id ? 'var(--hover-bg)' : 'none' }}
                                className="property-menu-item"
                            >
                                <span style={{ opacity: 0.6 }}>{type.icon}</span>
                                <span>{type.label}</span>
                                {property.type === type.id && <Check size={14} style={{ marginLeft: 'auto', color: 'var(--accent-color)' }} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
