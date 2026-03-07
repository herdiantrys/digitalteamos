'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateSingleContentField } from '../../lib/content-actions';
import BadgeDropdown from './BadgeDropdown';
import { ExternalLink, Calendar, X, ArrowRight } from 'lucide-react';

export default function EditableCell({
    contentId,
    propId,
    initialValue,
    type,
    optionsRaw,
    userOptionsRaw,
    propertyId,
    colorConfigRaw,
    disabled,
}: {
    contentId: string,
    propId: string,
    initialValue: any,
    type: string,
    optionsRaw: string | null,
    userOptionsRaw?: string,
    propertyId?: string,
    colorConfigRaw?: string | null,
    disabled?: boolean,
}) {
    const [value, setValue] = useState(initialValue ?? '');
    const [isSaving, setIsSaving] = useState(false);
    const isEditingDisabled = disabled || isSaving;

    // Sync state if initialValue changes externally (e.g., drag-to-fill)
    useEffect(() => {
        setValue(initialValue ?? '');
    }, [initialValue]);

    const handleSave = async (newValue: any) => {
        setValue(newValue);
        setIsSaving(true);
        try {
            await updateSingleContentField(contentId, propId, newValue);
        } finally {
            setIsSaving(false);
        }
    };

    const baseStyle: React.CSSProperties = {
        padding: '5px 8px',
        border: '1px solid transparent',
        borderRadius: 4,
        background: 'transparent',
        color: 'var(--text-primary)',
        fontSize: 13,
        width: '100%',
        height: 32,
        transition: 'all 0.2s',
        opacity: disabled ? 0.7 : isSaving ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'text',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    };

    // ── MULTI_SELECT ──────────────────────────────────────────────────────────
    if (type === 'MULTI_SELECT') {
        let parsedOptions: string[] = [];
        try { parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : []; } catch { parsedOptions = []; }
        const currentSelected = value ? String(value).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        const mergedOptions = [...new Set([...parsedOptions, ...currentSelected])];
        const mergedRaw = JSON.stringify(mergedOptions);

        return (
            <div style={{ opacity: isSaving ? 0.5 : 1 }}>
                <BadgeDropdown
                    optionsRaw={mergedRaw}
                    initialValues={currentSelected}
                    multiple={true}
                    onChange={(newSel) => handleSave(newSel.length > 0 ? newSel.join(', ') : '')}
                    propertyId={propertyId}
                    colorConfigRaw={colorConfigRaw}
                    disabled={isEditingDisabled}
                />
            </div>
        );
    }

    // ── SELECT / STATUS ───────────────────────────────────────────────────────
    if (type === 'SELECT' || type === 'STATUS') {
        let parsedOptions: string[] = [];
        try { parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : []; } catch { parsedOptions = []; }
        const valStr = value ? String(value) : '';
        const currentSelected = valStr ? [valStr] : [];

        return (
            <div style={{ opacity: isSaving ? 0.5 : 1 }}>
                <BadgeDropdown
                    optionsRaw={JSON.stringify(parsedOptions)}
                    initialValues={currentSelected}
                    multiple={false}
                    onChange={(newSel) => handleSave(newSel[0] || '')}
                    placeholder="-"
                    propertyId={propertyId}
                    colorConfigRaw={colorConfigRaw}
                    disabled={isEditingDisabled}
                />
            </div>
        );
    }

    // ── PERSON ────────────────────────────────────────────────────────────────
    if (type === 'PERSON') {
        let userOptions: { id: string; name: string, photo?: string }[] = [];
        try {
            // First priority: options specific to this property (if any)
            const parsed = optionsRaw ? JSON.parse(optionsRaw) : [];
            userOptions = Array.isArray(parsed) ? parsed : [];

            // Second priority: If property options are empty, use global userOptionsRaw
            if (userOptions.length === 0 && userOptionsRaw) {
                const globalParsed = JSON.parse(userOptionsRaw);
                userOptions = Array.isArray(globalParsed) ? globalParsed : [];
            }
        } catch { userOptions = []; }

        const currentSelected = value ? String(value).split(',').map((s: string) => s.trim()).filter(Boolean) : [];

        // If we have any user options, use BadgeDropdown for selection & resolving
        if (userOptions.length > 0) {
            return (
                <div style={{ opacity: isSaving ? 0.5 : 1 }}>
                    <BadgeDropdown
                        optionsRaw={JSON.stringify(userOptions)}
                        initialValues={currentSelected}
                        multiple={true}
                        onChange={(newSel) => handleSave(newSel.length > 0 ? newSel.join(', ') : '')}
                        placeholder="-"
                        propertyId={propertyId}
                        colorConfigRaw={colorConfigRaw}
                        disabled={isEditingDisabled}
                    />
                </div>
            );
        }

        // Fallback: Just show the IDs if no user data found
        return (
            <input
                type="text"
                value={value ? String(value) : ''}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => handleSave(value)}
                placeholder="-"
                style={baseStyle}
                disabled={isEditingDisabled}
            />
        );
    }

    // ── CHECKBOX ──────────────────────────────────────────────────────────────
    if (type === 'CHECKBOX') {
        return (
            <input
                type="checkbox"
                checked={value === 'true' || value === true}
                onChange={(e) => handleSave(e.target.checked ? 'true' : 'false')}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
                disabled={isEditingDisabled}
            />
        );
    }

    // ── DATE (Notion-style Range) ───────────────────────────────────────────
    if (type === 'DATE') {
        return <DateRangeCell contentId={contentId} propId={propId} initialValue={value} onSave={handleSave} isSaving={isSaving} disabled={isEditingDisabled} />;
    }

    // ── URL ───────────────────────────────────────────────────────────────────
    if (type === 'URL') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                    type="url"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={() => handleSave(value)}
                    placeholder="-"
                    style={baseStyle}
                    disabled={isEditingDisabled}
                />
                {value && <a href={value} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', color: '#1890ff', flexShrink: 0 }}><ExternalLink size={14} /></a>}
            </div>
        );
    }

    // ── Default: TEXT / NUMBER / EMAIL / PHONE ────────────────────────────────
    return (
        <input
            type={type === 'NUMBER' ? 'number' : type === 'EMAIL' ? 'email' : type === 'PHONE' ? 'tel' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => handleSave(value)}
            placeholder="-"
            style={baseStyle}
            disabled={isEditingDisabled}
            onFocus={e => { (e.target as HTMLInputElement).style.border = '1px solid var(--border-color)'; (e.target as HTMLInputElement).style.background = 'var(--bg-color)'; }}
            onBlurCapture={e => { (e.target as HTMLInputElement).style.border = '1px solid transparent'; (e.target as HTMLInputElement).style.background = 'transparent'; }}
        />
    );
}

// ──────────────────────────────────────────────────────────────────────────────
// DateRangeCell (Notion-style Popover)
// ──────────────────────────────────────────────────────────────────────────────
function DateRangeCell({
    contentId,
    propId,
    initialValue,
    onSave,
    isSaving,
    disabled
}: {
    contentId: string;
    propId: string;
    initialValue: any;
    onSave: (val: string) => void;
    isSaving: boolean;
    disabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

    const valStr = String(initialValue || '');
    const [startPart, endPart] = valStr.includes(' → ') ? valStr.split(' → ') : [valStr, ''];

    const [startDate, setStartDate] = useState(startPart || '');
    const [endDate, setEndDate] = useState(endPart || '');
    const [hasEndDate, setHasEndDate] = useState(!!endPart);

    // Sync from props if they change externally
    useEffect(() => {
        const v = String(initialValue || '');
        const [s, e] = v.includes(' → ') ? v.split(' → ') : [v, ''];
        setStartDate(s || '');
        setEndDate(e || '');
        setHasEndDate(!!e);
    }, [initialValue]);

    const toggleOpen = () => {
        if (disabled) return;
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPopoverPos({ top: rect.bottom + window.scrollY, left: rect.left + window.scrollX });
        }
        setIsOpen(!isOpen);
    };

    const handleApply = () => {
        let finalVal = startDate;
        if (hasEndDate && endDate) {
            finalVal = `${startDate} → ${endDate}`;
        }
        onSave(finalVal);
        setIsOpen(false);
    };

    const handleClear = () => {
        setStartDate('');
        setEndDate('');
        setHasEndDate(false);
        onSave('');
        setIsOpen(false);
    };

    // Outside click closer
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    return (
        <div ref={containerRef} style={{ width: '100%', position: 'relative' }}>
            <div
                onClick={toggleOpen}
                style={{
                    padding: '5px 8px',
                    borderRadius: 4,
                    fontSize: 13,
                    color: valStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minHeight: 32,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: isOpen ? 'var(--hover-bg)' : 'transparent',
                    border: isOpen ? '1px solid var(--border-color)' : '1px solid transparent',
                    transition: 'all 0.15s'
                }}
            >
                <Calendar size={14} style={{ opacity: 0.5, flexShrink: 0 }} />
                <span>{valStr || 'Empty'}</span>
            </div>

            {isOpen && typeof document !== 'undefined' && createPortal(
                <div ref={popoverRef} style={{
                    position: 'absolute',
                    top: popoverPos.top + 8,
                    left: popoverPos.left,
                    width: 280,
                    background: 'var(--bg-color)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                    padding: 16,
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    animation: 'popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <style>{`@keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(-5px); } to { opacity: 1; transform: none; } }`}</style>

                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Schedule</span>
                        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
                    </div>

                    {/* Start Date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{hasEndDate ? 'Start Date' : 'Date'}</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6,
                                border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                color: 'var(--text-primary)', outline: 'none'
                            }}
                        />
                    </div>

                    {/* End Date Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>End date</span>
                        <div
                            onClick={() => {
                                if (!hasEndDate && !endDate) setEndDate(startDate);
                                setHasEndDate(!hasEndDate);
                            }}
                            style={{
                                width: 36, height: 20, borderRadius: 10,
                                background: hasEndDate ? '#007aff' : 'var(--border-color)',
                                cursor: 'pointer', position: 'relative', transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: 14, height: 14, borderRadius: '50%', background: '#fff',
                                position: 'absolute', top: 3, left: hasEndDate ? 19 : 3,
                                transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }} />
                        </div>
                    </div>

                    {/* End Date Input */}
                    {hasEndDate && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'fadeIn 0.2s ease-out' }}>
                            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }`}</style>
                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>End Date</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={(e) => setEndDate(e.target.value)}
                                style={{
                                    width: '100%', padding: '6px 10px', fontSize: 13, borderRadius: 6,
                                    border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                    color: 'var(--text-primary)', outline: 'none'
                                }}
                            />
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-color)' }}>
                        <button
                            onClick={handleClear}
                            style={{
                                flex: 1, padding: '7px', fontSize: 12, borderRadius: 6,
                                background: 'none', border: '1px solid var(--border-color)',
                                color: '#ff4d4f', cursor: 'pointer', fontWeight: 600
                            }}
                        >Clear</button>
                        <button
                            onClick={handleApply}
                            style={{
                                flex: 2, padding: '7px', fontSize: 12, borderRadius: 6,
                                background: '#007aff', border: 'none',
                                color: '#fff', cursor: 'pointer', fontWeight: 600
                            }}
                        >Apply</button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
