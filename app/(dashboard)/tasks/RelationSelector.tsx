'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, Link as LinkIcon, ChevronRight, X } from 'lucide-react';
import LucideIcon from '../../../components/LucideIcon';

export type RelationItem = {
    id: string;
    title: string;
    database: {
        name: string;
        icon: string | null;
        iconColor?: string | null;
    } | null;
};

interface RelationSelectorProps {
    value: string;
    onChange: (val: string) => void;
    disabled?: boolean;
    relations: RelationItem[];
    placeholder?: string;
}

export default function RelationSelector({
    value,
    onChange,
    disabled = false,
    relations,
    placeholder = 'Select relation...'
}: RelationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Group relations by database name
    const groupedRelations = useMemo(() => {
        const query = searchQuery.toLowerCase();
        const filtered = relations.filter(r =>
            r.title.toLowerCase().includes(query) ||
            r.database?.name.toLowerCase().includes(query)
        );

        const groups: Record<string, RelationItem[]> = {};
        filtered.forEach(rel => {
            const dbName = rel.database?.name || 'Uncategorized';
            if (!groups[dbName]) groups[dbName] = [];
            groups[dbName].push(rel);
        });

        return Object.entries(groups).map(([name, items]) => ({ name, items }));
    }, [relations, searchQuery]);

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
                handleSelect(flattenedItems[activeIndex].id);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchQuery('');
    };

    const current = relations.find(r => r.id === value);

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--input-bg, var(--sidebar-bg))',
                    border: isOpen ? '1px solid #007aff' : '1px solid var(--border-color)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 0 4px rgba(0, 122, 255, 0.1)' : 'none',
                    minHeight: 44
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', flex: 1 }}>
                    <LinkIcon size={14} style={{ color: current ? '#007aff' : 'var(--text-secondary)', transition: 'color 0.2s' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {current ? (
                            <>
                                <span style={{
                                    fontSize: 12,
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '2px 6px',
                                    borderRadius: 6,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    border: '1px solid var(--border-color)'
                                }}>
                                    {current.database?.icon ?
                                        <LucideIcon name={current.database.icon as any} size={14} color={current.database.iconColor || 'inherit'} /> :
                                        '📄'
                                    }
                                </span>
                                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{current.title}</span>
                                {current.database?.name && (
                                    <span style={{
                                        fontSize: 10,
                                        color: 'var(--text-secondary)',
                                        background: 'rgba(55,53,47,0.05)',
                                        padding: '2px 6px',
                                        borderRadius: 4,
                                        fontWeight: 600,
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        {current.database.name}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{placeholder}</span>
                        )}
                    </div>
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
                        borderRadius: 14,
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                        zIndex: 1000,
                        padding: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transformOrigin: 'top',
                        animation: 'slideDownFade 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                >
                    <style>{`
                        @keyframes slideDownFade {
                            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, color: 'var(--text-secondary)' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search content or database..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={handleKeyDown}
                            style={{
                                width: '100%',
                                background: 'var(--sidebar-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 10,
                                padding: '10px 12px 10px 36px',
                                fontSize: 13,
                                color: 'var(--text-primary)',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                        />
                    </div>

                    <div className="custom-scrollbar" style={{ maxHeight: 300, overflowY: 'auto', paddingRight: 4 }}>
                        <div
                            onClick={() => handleSelect('')}
                            style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 13,
                                background: !value ? 'rgba(0,122,255,0.06)' : 'transparent',
                                color: !value ? '#007aff' : 'var(--text-secondary)',
                                transition: 'all 0.1s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = !value ? 'rgba(0,122,255,0.06)' : 'transparent'}
                        >
                            <X size={14} />
                            No Relation
                            {!value && <Check size={14} style={{ marginLeft: 'auto' }} />}
                        </div>

                        {groupedRelations.map(group => (
                            <div key={group.name} style={{ marginTop: 8 }}>
                                <div style={{
                                    padding: '4px 12px',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    color: 'var(--text-secondary)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}>
                                    <div style={{ width: 12, height: 1, background: 'var(--border-color)' }} />
                                    {group.name}
                                </div>
                                {group.items.map(rel => {
                                    const isSelected = value === rel.id;
                                    const isHovered = flattenedItems[activeIndex]?.id === rel.id;

                                    return (
                                        <div
                                            key={rel.id}
                                            onClick={() => handleSelect(rel.id)}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                fontSize: 13,
                                                marginTop: 2,
                                                background: isSelected ? 'rgba(0,122,255,0.08)' : (isHovered ? 'var(--hover-bg)' : 'transparent'),
                                                transition: 'all 0.15s',
                                                border: isHovered && !isSelected ? '1px solid rgba(0,122,255,0.2)' : '1px solid transparent'
                                            }}
                                            onMouseEnter={() => {
                                                const idx = flattenedItems.findIndex(f => f.id === rel.id);
                                                setActiveIndex(idx);
                                            }}
                                        >
                                            <span style={{
                                                fontSize: 13,
                                                background: 'rgba(255,255,255,0.05)',
                                                padding: '2px 6px',
                                                borderRadius: 6,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {rel.database?.icon ?
                                                    <LucideIcon name={rel.database.icon as any} size={14} color={rel.database.iconColor || 'inherit'} /> :
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
                                            {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#007aff', flexShrink: 0 }} />}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}

                        {groupedRelations.length === 0 && searchQuery && (
                            <div style={{ padding: '32px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                                <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                                No matching items found<br />
                                <span style={{ fontSize: 11, opacity: 0.7 }}>Try a different search term</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
