'use client';

import { useState } from 'react';
import { updateSingleContentField } from '../../../lib/content-actions';
import MultiSelectBadgeDropdown from './MultiSelectBadgeDropdown';

export default function EditableCell({
    contentId,
    propId,
    initialValue,
    type,
    optionsRaw
}: {
    contentId: string,
    propId: string,
    initialValue: any,
    type: string,
    optionsRaw: string | null
}) {
    const [value, setValue] = useState(initialValue ?? '');
    const [isSaving, setIsSaving] = useState(false);

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
        transition: 'all 0.2s',
        opacity: isSaving ? 0.5 : 1,
        cursor: 'text',
        boxSizing: 'border-box'
    };

    // ── MULTI_SELECT ──────────────────────────────────────────────────────────
    if (type === 'MULTI_SELECT') {
        // Build a merged options list: from property options + any values in the stored string
        let parsedOptions: string[] = [];
        try { parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : []; } catch { parsedOptions = []; }
        const currentSelected = value ? String(value).split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        // Ensure any stored values that aren't in options are still visible
        const mergedOptions = [...new Set([...parsedOptions, ...currentSelected])];
        const mergedRaw = JSON.stringify(mergedOptions);

        return (
            <div style={{ opacity: isSaving ? 0.5 : 1 }}>
                <MultiSelectBadgeDropdown
                    optionsRaw={mergedRaw}
                    initialValues={currentSelected}
                    onChange={(newSel) => handleSave(newSel.length > 0 ? newSel.join(', ') : '')}
                />
            </div>
        );
    }

    // ── SELECT / STATUS ───────────────────────────────────────────────────────
    if (type === 'SELECT' || type === 'STATUS') {
        let parsedOptions: string[] = [];
        try { parsedOptions = optionsRaw ? JSON.parse(optionsRaw) : []; } catch { parsedOptions = []; }
        // Include the current stored value even if missing from options list
        const valStr = value ? String(value) : '';
        if (valStr && !parsedOptions.includes(valStr)) parsedOptions = [valStr, ...parsedOptions];

        return (
            <select
                value={valStr}
                onChange={(e) => handleSave(e.target.value)}
                style={{ ...baseStyle, cursor: 'pointer', appearance: 'auto' as any }}
                disabled={isSaving}
            >
                <option value="">-</option>
                {parsedOptions.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        );
    }

    // ── PERSON ────────────────────────────────────────────────────────────────
    // optionsRaw for PERSON is a list of users [{id, name}] or a JSON string of names
    // Imported values are plain strings (names) — we fall back to a text input when value
    // doesn't match any user ID in the options list.
    if (type === 'PERSON') {
        let userOptions: { id: string; name: string }[] = [];
        try {
            const parsed = optionsRaw ? JSON.parse(optionsRaw) : [];
            userOptions = Array.isArray(parsed) ? parsed : [];
        } catch { userOptions = []; }

        const valStr = value ? String(value) : '';
        const matchedById = userOptions.find((u: any) => u.id === valStr || u === valStr);
        const matchedByName = userOptions.find((u: any) =>
            (u.name || u || '').toLowerCase() === valStr.toLowerCase()
        );

        // If options are available, show a select; otherwise show text input
        if (userOptions.length > 0) {
            // Determine what value to bind to the select
            const selectVal = matchedById ? (matchedById.id ?? matchedById) :
                matchedByName ? (matchedByName.id ?? valStr) : valStr;

            return (
                <select
                    value={selectVal}
                    onChange={(e) => handleSave(e.target.value)}
                    style={{ ...baseStyle, cursor: 'pointer', appearance: 'auto' as any }}
                    disabled={isSaving}
                >
                    <option value="">-</option>
                    {/* Show the current imported value even if not a user */}
                    {valStr && !matchedById && !matchedByName && (
                        <option value={valStr}>{valStr}</option>
                    )}
                    {userOptions.map((u: any) => {
                        const id = u.id ?? u;
                        const name = u.name ?? u;
                        return <option key={id} value={id}>{name}</option>;
                    })}
                </select>
            );
        }

        // No user options — plain text display
        return (
            <input
                type="text"
                value={valStr}
                onChange={(e) => setValue(e.target.value)}
                onBlur={() => handleSave(value)}
                placeholder="-"
                style={baseStyle}
                disabled={isSaving}
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
                style={{ cursor: 'pointer' }}
                disabled={isSaving}
            />
        );
    }

    // ── DATE ──────────────────────────────────────────────────────────────────
    if (type === 'DATE') {
        // Ensure value is in YYYY-MM-DD before binding to <input type=date>
        const dateVal = typeof value === 'string' ? value.slice(0, 10) : '';
        return (
            <input
                type="date"
                value={dateVal}
                onChange={(e) => handleSave(e.target.value)}
                style={{ ...baseStyle, padding: '2px 4px', cursor: 'pointer' }}
                disabled={isSaving}
            />
        );
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
                    disabled={isSaving}
                />
                {value && <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#1890ff', flexShrink: 0 }}>↗</a>}
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
            disabled={isSaving}
            onFocus={e => { (e.target as HTMLInputElement).style.border = '1px solid var(--border-color)'; (e.target as HTMLInputElement).style.background = 'var(--bg-color)'; }}
            onBlurCapture={e => { (e.target as HTMLInputElement).style.border = '1px solid transparent'; (e.target as HTMLInputElement).style.background = 'transparent'; }}
        />
    );
}
