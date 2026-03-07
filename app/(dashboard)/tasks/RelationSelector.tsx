'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, Link as LinkIcon, ChevronRight, X, ExternalLink } from 'lucide-react';
import LucideIcon from '../../../components/LucideIcon';

export type RelationItem = {
    id: string;
    title: string;
    databaseId?: string | null;
    database: {
        name: string;
        icon: string | null;
        iconColor?: string | null;
    } | null;
};

interface RelationSelectorProps {
    value: string[];
    onChange: (val: string[]) => void;
    disabled?: boolean;
    relations: RelationItem[];
    placeholder?: string;
    onVisit?: (item: RelationItem) => void;
}

export default function RelationSelector({
    value = [],
    onChange,
    disabled = false,
    relations,
    placeholder = 'Select relations...',
    onVisit,
}: RelationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Group relations by database name
    const filteredRelations = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return relations.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.database?.name.toLowerCase().includes(query)
        );
    }, [relations, searchQuery]);

    const groupedRelations = useMemo(() => {
        const groups: Record<string, RelationItem[]> = {};
        filteredRelations.forEach(rel => {
            const dbName = rel.database?.name || 'Uncategorized';
            if (!groups[dbName]) groups[dbName] = [];
            groups[dbName].push(rel);
        });

        return Object.entries(groups).map(([name, items]) => ({ name, items }));
    }, [filteredRelations]);

    // Flatten for keyboard navigation
    const flattenedItems = useMemo(() => {
        return groupedRelations.flatMap(g => g.items);
    }, [groupedRelations]);

    useEffect(() => {
        if (isOpen) {
            setActiveIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % Math.max(1, flattenedItems.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + flattenedItems.length) % Math.max(1, flattenedItems.length));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (flattenedItems[activeIndex]) {
                handleToggle(flattenedItems[activeIndex].id);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleToggle = (id: string) => {
        const newValue = value.includes(id)
            ? value.filter(v => v !== id)
            : [...value, id];
        onChange(newValue);
    };

    const selectedItems = useMemo(() => {
        return relations.filter(r => value.includes(r.id));
    }, [relations, value]);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 14,
                    background: 'var(--input-bg, var(--sidebar-bg))',
                    border: isOpen ? '1.5px solid #007aff' : '1.5px solid rgba(150, 150, 150, 0.2)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 0 4px rgba(0, 122, 255, 0.1)' : 'none',
                    minHeight: 48,
                    flexWrap: 'wrap',
                    gap: 6
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                    <LinkIcon size={14} style={{ color: selectedItems.length > 0 ? '#007aff' : 'var(--text-secondary)', marginRight: 4 }} />
                    {selectedItems.length > 0 ? (
                        selectedItems.map(item => (
                            <div
                                key={item.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'rgba(0, 122, 255, 0.1)',
                                    color: '#007aff',
                                    padding: '2px 6px 2px 8px',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    border: '1px solid rgba(0, 122, 255, 0.2)'
                                }}
                            >
                                {item.database?.icon && <LucideIcon name={item.database.icon as any} size={12} />}
                                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.title}
                                </span>
                                {/* Navigate to database page */}
                                {onVisit && item.databaseId && (
                                    <span
                                        title={`Open in ${item.database?.name || 'database'}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onVisit(item);
                                        }}
                                        style={{ cursor: 'pointer', opacity: 0.7, flexShrink: 0, display: 'flex', alignItems: 'center' }}
                                    >
                                        <ExternalLink size={11} />
                                    </span>
                                )}
                                <X
                                    size={12}
                                    style={{ cursor: 'pointer', opacity: 0.7, flexShrink: 0 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggle(item.id);
                                    }}
                                />
                            </div>
                        ))
                    ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{placeholder}</span>
                    )}
                </div>
                <ChevronRight
                    size={16}
                    style={{
                        color: 'var(--text-secondary)',
                        transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        flexShrink: 0
                    }}
                />
            </div>

            {isOpen && (
                <div
                    className="fade-in"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        right: 0,
                        background: 'var(--bg-color)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 16,
                        boxShadow: '0 24px 48px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                        transformOrigin: 'top',
                        animation: 'slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <style>{`
                        @keyframes slideDownFade {
                            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={14} style={{ position: 'absolute', left: 14, color: 'var(--text-secondary)' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search and multi-select content..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                background: 'rgba(150, 150, 150, 0.05)',
                                border: '1px solid rgba(150, 150, 150, 0.1)',
                                borderRadius: 12,
                                padding: '12px 12px 12px 40px',
                                fontSize: 14,
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={e => e.target.parentElement!.style.borderColor = '#007aff'}
                        />
                    </div>

                    <div className="custom-scrollbar" style={{ maxHeight: 350, overflowY: 'auto', paddingRight: 4 }}>
                        {groupedRelations.map(group => (
                            <div key={group.name} style={{ marginBottom: 12 }}>
                                <div style={{
                                    padding: '4px 12px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    marginBottom: 4
                                }}>
                                    {group.name}
                                    <div style={{ flex: 1, height: 1, background: 'rgba(150, 150, 150, 0.1)' }} />
                                </div>
                                {group.items.map(rel => {
                                    const isSelected = value.includes(rel.id);
                                    const isHovered = flattenedItems[activeIndex]?.id === rel.id;

                                    return (
                                        <div
                                            key={rel.id}
                                            onClick={() => handleToggle(rel.id)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 10,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                fontSize: 14,
                                                marginTop: 2,
                                                background: isSelected ? 'rgba(0,122,255,0.08)' : (isHovered ? 'var(--hover-bg)' : 'transparent'),
                                                transition: 'all 0.15s',
                                                border: '1px solid transparent',
                                                borderColor: isHovered && !isSelected ? 'rgba(0,122,255,0.2)' : 'transparent'
                                            }}
                                            onMouseEnter={() => {
                                                const idx = flattenedItems.findIndex(f => f.id === rel.id);
                                                setActiveIndex(idx);
                                            }}
                                        >
                                            <div style={{
                                                width: 18, height: 18,
                                                borderRadius: 6,
                                                border: isSelected ? 'none' : '2px solid rgba(150, 150, 150, 0.3)',
                                                background: isSelected ? '#007aff' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}>
                                                {isSelected && <Check size={12} color="white" />}
                                            </div>

                                            <span style={{
                                                fontSize: 14,
                                                background: 'rgba(150, 150, 150, 0.1)',
                                                width: 30, height: 30,
                                                borderRadius: 8,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                {rel.database?.icon ?
                                                    <LucideIcon name={rel.database.icon as any} size={16} color={rel.database.iconColor || 'inherit'} /> :
                                                    '📄'
                                                }
                                            </span>

                                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
                                                <span style={{
                                                    fontWeight: isSelected ? 700 : 500,
                                                    color: isSelected ? '#007aff' : 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}>
                                                    {rel.title}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {groupedRelations.length === 0 && searchQuery && (
                            <div style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                                <p style={{ fontWeight: 600, margin: 0 }}>No matching items found</p>
                                <p style={{ opacity: 0.7, margin: '4px 0 0' }}>Try a different search term</p>
                            </div>
                        )}
                    </div>

                    {value.length > 0 && (
                        <div style={{
                            padding: '12px', borderTop: '1px solid rgba(150, 150, 150, 0.1)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {value.length} items selected
                            </span>
                            <button
                                onClick={() => onChange([])}
                                style={{
                                    background: 'transparent', border: 'none', color: '#ff4d4f',
                                    fontSize: 12, fontWeight: 700, cursor: 'pointer'
                                }}
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
