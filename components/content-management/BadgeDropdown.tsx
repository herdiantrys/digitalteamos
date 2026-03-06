'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updatePropertyColorConfig } from '../../lib/property-actions';
import { X, Check, MoreHorizontal, Plus } from 'lucide-react';
import { COLOR_PALETTE, getBadgeColorObj } from '../../lib/colors';

export default function BadgeDropdown({
    optionsRaw,
    name,
    initialValues = [],
    onChange,
    multiple = true,
    placeholder = "Select...",
    propertyId,
    colorConfigRaw
}: {
    optionsRaw: string | null;
    name?: string;
    initialValues?: string[];
    onChange?: (values: string[]) => void;
    multiple?: boolean;
    placeholder?: string;
    propertyId?: string;
    colorConfigRaw?: string | null;
}) {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>(initialValues);
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeColorMenu, setActiveColorMenu] = useState<string | null>(null);
    const [customColorFor, setCustomColorFor] = useState<string | null>(null);
    const [customBg, setCustomBg] = useState<string>('#f0f0f0');
    const [customText, setCustomText] = useState<string>('#333333');
    const [colorConfig, setColorConfig] = useState<Record<string, string>>(
        colorConfigRaw ? JSON.parse(colorConfigRaw) : {}
    );

    useEffect(() => {
        if (colorConfigRaw) {
            try {
                setColorConfig(JSON.parse(colorConfigRaw));
            } catch (e) {
                console.error("Failed to parse color config", e);
            }
        }
    }, [colorConfigRaw]);

    // Sync selected state if initialValues changes externally
    useEffect(() => {
        setSelected(prev => {
            if (JSON.stringify(prev) === JSON.stringify(initialValues)) return prev;
            return [...initialValues];
        });
    }, [JSON.stringify(initialValues)]);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const colorMenuRef = useRef<HTMLDivElement>(null);
    const [dropdownStyles, setDropdownStyles] = useState<{ top: number, left: number, minWidth: number }>({ top: 0, left: 0, minWidth: 240 });

    const parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : [];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as Node;

            const isTriggerClick = containerRef.current && containerRef.current.contains(target);
            const isMenuClick = menuRef.current && menuRef.current.contains(target);

            // If clicking outside both the trigger button and the popup menu
            if (!isTriggerClick && !isMenuClick) {
                setIsOpen(false);
                setActiveColorMenu(null);
                setCustomColorFor(null);
            }

            // If color menu is open, and clicking outside IT (and not the trigger button)
            if (activeColorMenu && colorMenuRef.current && !colorMenuRef.current.contains(target)) {
                // Check if we clicked the "..." button that opens it
                const isTrigger = (target as HTMLElement).closest('.color-menu-trigger');
                if (!isTrigger) {
                    setActiveColorMenu(null);
                    setCustomColorFor(null);
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeColorMenu]);

    // Close the dropdown immediately if the user scrolls the page or the table
    useEffect(() => {
        const handleScroll = (e: Event) => {
            // If the scroll happened inside the dropdown menu itself, ignore it!
            if (menuRef.current && menuRef.current.contains(e.target as Node)) {
                return;
            }
            if (isOpen) {
                setIsOpen(false);
                setActiveColorMenu(null);
            }
        };
        // Use capture phase to catch internal table scrolls too
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const handleOpen = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyles({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                minWidth: Math.max(240, rect.width)
            });
        }
        setIsOpen(true);
        setSearch(''); // clear search when opening
    };

    const toggleOption = (opt: string) => {
        let newSel: string[];
        if (multiple) {
            newSel = [...selected];
            if (newSel.includes(opt)) {
                newSel = newSel.filter(x => x !== opt);
            } else {
                newSel.push(opt);
            }
        } else {
            // Single select
            newSel = selected.includes(opt) ? [] : [opt];
            setIsOpen(false);
        }
        setSelected(newSel);
        if (onChange) onChange(newSel);
    };

    const handleColorSelect = async (option: string, color: string) => {
        if (!propertyId) return;
        const newConfig = { ...colorConfig, [option]: color };
        setColorConfig(newConfig);
        setActiveColorMenu(null);
        await updatePropertyColorConfig(propertyId, JSON.stringify(newConfig));
        router.refresh();
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 100 }}>
            {name && selected.map(sel => (
                <input key={sel} type="hidden" name={name} value={sel} />
            ))}

            <div
                onClick={isOpen ? undefined : handleOpen}
                style={{
                    height: 32, // Fixed height to prevent table row stretching
                    padding: '4px 8px',
                    border: '1px solid transparent',
                    borderRadius: 6,
                    background: isOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                    cursor: isOpen ? 'default' : 'pointer',
                    display: 'flex',
                    flexWrap: 'nowrap', // Prevent wrapping to keep row height consistent
                    overflowX: 'auto', // Allow scrolling if many tags
                    overflowY: 'hidden',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE
                    gap: 6,
                    alignItems: 'center',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isOpen ? '0 0 0 2px rgba(24,144,255,0.15)' : 'none'
                }}
            >
                <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: '100%' }} className="hide-scroll" onClick={e => isOpen && setIsOpen(false)}>
                    {selected.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '2px 4px', opacity: 0.6 }}>{placeholder}</span>}
                    {selected.map(sel => {
                        const colorObj = getBadgeColorObj(sel, colorConfig);
                        // Find if this selection has an associated photo in parsedOptions
                        const optionObj = parsedOptions.find((opt: any) =>
                            (typeof opt === 'object') && (opt.id === sel || opt.name === sel || opt.value === sel)
                        );
                        const photo = optionObj?.photo;
                        const label = typeof optionObj === 'object' ? (optionObj.name || optionObj.label) : sel;

                        return (
                            <span key={sel} style={{
                                background: colorObj.bg,
                                color: colorObj.text,
                                fontSize: 11,
                                fontWeight: 600,
                                padding: photo ? '1px 10px 1px 1px' : '2px 10px',
                                borderRadius: 16, // Pill shape for person
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                border: `1px solid ${colorObj.text}20`,
                                whiteSpace: 'nowrap'
                            }}>
                                {photo ? (
                                    <img src={photo} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    optionObj && <div style={{ width: 22, height: 22, borderRadius: '50%', background: colorObj.text, color: colorObj.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{label.charAt(0)}</div>
                                )}
                                {label}
                                {multiple && (
                                    <span
                                        onClick={(e) => { e.stopPropagation(); toggleOption(sel); }}
                                        style={{ cursor: 'pointer', opacity: 0.7, fontSize: 12, display: 'flex', transition: 'opacity 0.1s', marginLeft: 2 }}
                                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                                    >
                                        <X size={12} />
                                    </span>
                                )}
                            </span>
                        )
                    })}
                </div>
            </div>

            {/* Portal Dropdown out of the DOM hierarchy so overflow: hidden doesn't clip it */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div ref={menuRef} style={{
                    position: 'absolute',
                    top: dropdownStyles.top + 8,
                    left: dropdownStyles.left,
                    minWidth: dropdownStyles.minWidth,
                    width: 'max-content',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: 12,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)',
                    zIndex: 9999, // Super high z-index to overlay tables and navs
                    maxHeight: 320,
                    overflowY: 'auto',
                    padding: 6,
                    animation: 'dropdownReveal 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <style>{`
                        @keyframes dropdownReveal {
                            from { opacity: 0; transform: translateY(-10px) scale(0.98); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>

                    {/* Notion-like Search Input */}
                    <div style={{ padding: '4px 6px', marginBottom: 6, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search or create..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '6px 8px', fontSize: 13, border: 'none',
                                background: 'rgba(0,0,0,0.03)', borderRadius: 6, outline: 'none',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>

                    {/* Filtered Options */}
                    {parsedOptions.filter((opt: any) => {
                        const label = typeof opt === 'string' ? opt : opt.name || opt.label || 'Unknown';
                        return label.toLowerCase().includes(search.toLowerCase());
                    }).length === 0 && search.trim() === '' && (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: '#666' }}>No options available</div>
                        )}

                    {parsedOptions.filter((opt: any) => {
                        const label = typeof opt === 'string' ? opt : opt.name || opt.label || 'Unknown';
                        return label.toLowerCase().includes(search.toLowerCase());
                    }).map((opt: any) => {
                        const label = typeof opt === 'string' ? opt : opt.name || opt.label || 'Unknown';
                        const val = typeof opt === 'string' ? opt : opt.id || opt.value || label;
                        const isSel = selected.includes(val);

                        return (
                            <div
                                key={val}
                                onClick={() => toggleOption(val)}
                                style={{
                                    padding: '10px 14px',
                                    fontSize: 13,
                                    fontWeight: isSel ? 600 : 400,
                                    cursor: 'pointer',
                                    borderRadius: 8,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'stretch',
                                    background: isSel ? 'rgba(0, 122, 255, 0.08)' : 'transparent',
                                    color: isSel ? '#007aff' : '#333',
                                    marginBottom: 4,
                                    transition: 'all 0.15s ease',
                                    position: 'relative'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = isSel ? 'rgba(0, 122, 255, 0.12)' : 'rgba(0, 0, 0, 0.04)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = isSel ? 'rgba(0, 122, 255, 0.08)' : 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {opt.photo ? (
                                            <img src={opt.photo} alt="" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <span style={{
                                                background: getBadgeColorObj(val, colorConfig).bg,
                                                width: 10, height: 10, borderRadius: '50%',
                                                boxShadow: '0 0 0 1px rgba(0,0,0,0.05)',
                                                border: `2px solid ${getBadgeColorObj(val, colorConfig).text}`
                                            }} />
                                        )}
                                        {label}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        {isSel && <span style={{ display: 'flex' }}><Check size={14} strokeWidth={3} /></span>}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveColorMenu(activeColorMenu === val ? null : val); }}
                                            className="color-menu-trigger"
                                            style={{
                                                fontSize: 14,
                                                opacity: activeColorMenu === val ? 1 : 0.4,
                                                transition: 'all 0.15s',
                                                padding: '2px 6px',
                                                borderRadius: 4,
                                                border: 'none',
                                                background: activeColorMenu === val ? 'rgba(0,0,0,0.06)' : 'transparent',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                color: 'inherit'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                            onMouseLeave={e => { if (activeColorMenu !== val) e.currentTarget.style.opacity = '0.4'; }}
                                        >
                                            <MoreHorizontal size={14} />
                                        </button>
                                    </div>
                                </div>

                                {activeColorMenu === val && (
                                    <div
                                        ref={colorMenuRef}
                                        style={{
                                            marginTop: 10,
                                            paddingTop: 10,
                                            borderTop: '1px solid rgba(0,0,0,0.06)',
                                            width: '100%',
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(5, 1fr)',
                                            gap: 6
                                        }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        {/* Color Grid */}
                                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 4 }}>
                                            {COLOR_PALETTE.map(c => (
                                                <div
                                                    key={c.name}
                                                    onClick={() => handleColorSelect(val, c.name)}
                                                    title={c.name}
                                                    style={{
                                                        height: 24,
                                                        background: c.bg,
                                                        borderRadius: 4,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: colorConfig[val] === c.name ? `2px solid ${c.text}` : `1px solid ${c.text}33`,
                                                        transition: 'transform 0.1s'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                                                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                                                >
                                                    {colorConfig[val] === c.name && <span style={{ display: 'flex' }}><Check size={12} color={c.text} strokeWidth={3} /></span>}
                                                </div>
                                            ))}
                                        </div>

                                        {/* Custom HEX Color Option */}
                                        {customColorFor !== val ? (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                cursor: 'pointer',
                                                padding: '4px 8px', fontSize: 11,
                                                background: 'transparent', border: '1px dashed rgba(0,0,0,0.15)',
                                                borderRadius: 6, color: 'var(--text-secondary)', textAlign: 'center'
                                            }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setCustomColorFor(val);
                                                    const existing = colorConfig[val];
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
                                                gridColumn: '1 / -1',
                                                display: 'flex', flexDirection: 'column', gap: 6,
                                                padding: '6px', background: 'rgba(0,0,0,0.02)', borderRadius: 6, border: '1px solid var(--border-color)'
                                            }} onClick={e => e.stopPropagation()}>
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
                                                    <button onClick={() => { handleColorSelect(val, `custom:${customBg}:${customText}`); setCustomColorFor(null); }} style={{ flex: 1, padding: '4px', fontSize: 11, cursor: 'pointer', background: 'var(--text-primary)', border: 'none', borderRadius: 4, color: 'var(--bg-color)', fontWeight: 600 }}>Apply</button>
                                                </div>
                                            </div>
                                        )}

                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Allow creation of new option if exact match doesn't exist */}
                    {search.trim() !== '' && !parsedOptions.some((opt: any) => {
                        const label = typeof opt === 'string' ? opt : opt.name || opt.label || 'Unknown';
                        return label.toLowerCase() === search.trim().toLowerCase();
                    }) && (
                            <div
                                onClick={() => {
                                    toggleOption(search.trim());
                                    setSearch('');
                                }}
                                style={{
                                    padding: '10px 14px', fontSize: 13, cursor: 'pointer', borderRadius: 8,
                                    display: 'flex', alignItems: 'center', gap: 10, background: 'transparent',
                                    color: '#007aff', transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0, 122, 255, 0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{ display: 'flex' }}><Plus size={16} /></span> Create &quot;<strong>{search.trim()}</strong>&quot;
                            </div>
                        )}
                </div>,
                document.body
            )}
        </div>
    );
}
