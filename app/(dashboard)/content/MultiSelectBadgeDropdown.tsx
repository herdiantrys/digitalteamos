'use client';

import { useState, useRef, useEffect } from 'react';

export default function MultiSelectBadgeDropdown({
    optionsRaw,
    name,
    initialValues = [],
    onChange
}: {
    optionsRaw: string | null;
    name?: string;
    initialValues?: string[];
    onChange?: (values: string[]) => void;
}) {
    const [selected, setSelected] = useState<string[]>(initialValues);
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : [];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (opt: string) => {
        let newSel = [...selected];
        if (newSel.includes(opt)) {
            newSel = newSel.filter(x => x !== opt);
        } else {
            newSel.push(opt);
        }
        setSelected(newSel);
        if (onChange) onChange(newSel);
    };

    const getBadgeColor = (str: string) => {
        // Deterministic color generation based on string hash
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 85%)`;
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
            {name && selected.map(sel => (
                <input key={sel} type="hidden" name={name} value={sel} />
            ))}

            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    minHeight: 32,
                    padding: '4px 8px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 4,
                    background: 'var(--bg-color)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    alignItems: 'center'
                }}
            >
                {selected.length === 0 && <span style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '2px 4px' }}>Select...</span>}
                {selected.map(sel => (
                    <span key={sel} style={{
                        background: getBadgeColor(sel),
                        color: '#000',
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        {sel}
                        <span
                            onClick={(e) => { e.stopPropagation(); toggleOption(sel); }}
                            style={{ cursor: 'pointer', opacity: 0.6, fontSize: 10, padding: 2 }}
                        >
                            ✕
                        </span>
                    </span>
                ))}
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    minWidth: '200px',
                    width: '100%',
                    marginTop: 4,
                    background: 'var(--sidebar-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 6,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    zIndex: 50,
                    maxHeight: 200,
                    overflowY: 'auto',
                    padding: 4
                }}>
                    {parsedOptions.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-secondary)' }}>No options defined</div>
                    )}
                    {parsedOptions.map((opt: string) => (
                        <div
                            key={opt}
                            onClick={() => toggleOption(opt)}
                            style={{
                                padding: '6px 12px',
                                fontSize: 13,
                                cursor: 'pointer',
                                borderRadius: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: selected.includes(opt) ? 'rgba(255,255,255,0.05)' : 'transparent'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = selected.includes(opt) ? 'rgba(255,255,255,0.05)' : 'transparent'}
                        >
                            <span style={{
                                background: getBadgeColor(opt),
                                color: '#000',
                                fontSize: 11,
                                fontWeight: 500,
                                padding: '2px 8px',
                                borderRadius: 12
                            }}>
                                {opt}
                            </span>
                            {selected.includes(opt) && <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>✓</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
