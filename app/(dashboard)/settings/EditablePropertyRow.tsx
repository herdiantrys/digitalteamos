'use client';

import { useState } from 'react';
import { updatePropertyDefinition, deletePropertyDefinition, updatePropertyColorConfig } from '../../../lib/property-actions';
import { COLOR_PALETTE } from '../../../lib/colors';

// ── Option Color Picker row ────────────────────────────────────────────────────
function OptionColorRow({ option, colorConfig, propertyId, onColorChange }: {
    option: string;
    colorConfig: Record<string, string>;
    propertyId: string;
    onColorChange: (option: string, colorName: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [showCustom, setShowCustom] = useState(false);
    const [customBg, setCustomBg] = useState('#f0f0f0');
    const [customText, setCustomText] = useState('#333333');

    const currentColorName = colorConfig[option] || 'Default';

    // Determine the styles for the preview badge & trigger button
    let currentColor = { name: 'Default', bg: '#f0f0f0', text: '#555' };
    if (currentColorName.startsWith('custom:')) {
        const parts = currentColorName.split(':');
        if (parts.length === 3) {
            currentColor = { name: 'Custom', bg: parts[1], text: parts[2] };
        }
    } else {
        currentColor = COLOR_PALETTE.find(c => c.name === currentColorName) || COLOR_PALETTE[0];
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            {/* Badge preview */}
            <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '3px 10px', borderRadius: 20,
                background: currentColor.bg, color: currentColor.text,
                fontSize: 12, fontWeight: 600, minWidth: 80,
                border: `1.5px solid ${currentColor.text}20`
            }}>
                {option}
            </span>

            {/* Color swatch trigger */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', fontSize: 12, borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--sidebar-bg)', cursor: 'pointer',
                    color: 'var(--text-primary)', fontWeight: 500,
                    transition: 'border-color 0.15s'
                }}
            >
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: currentColor.bg, border: `2px solid ${currentColor.text}` }} />
                {currentColorName}
                <span style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
            </button>

            {/* Inline swatch picker */}
            {open && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: 10,
                    padding: '10px 12px', width: 200,
                    background: 'var(--bg-color)', borderRadius: 10,
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    zIndex: 50
                }}>
                    {!showCustom ? (
                        <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {COLOR_PALETTE.map(c => (
                                    <button
                                        key={c.name}
                                        title={c.name}
                                        onClick={() => {
                                            onColorChange(option, c.name);
                                            setOpen(false);
                                        }}
                                        style={{
                                            width: 22, height: 22, borderRadius: '50%',
                                            background: c.bg,
                                            border: currentColorName === c.name ? `2.5px solid ${c.text}` : '2px solid transparent',
                                            cursor: 'pointer',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                            outline: 'none',
                                            transition: 'transform 0.1s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => {
                                    setShowCustom(true);
                                    if (currentColorName.startsWith('custom:')) {
                                        setCustomBg(currentColor.bg);
                                        setCustomText(currentColor.text);
                                    }
                                }}
                                style={{
                                    marginTop: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                                    background: 'transparent', border: '1px dashed var(--border-color)',
                                    borderRadius: 6, color: 'var(--text-secondary)', textAlign: 'center'
                                }}
                            >
                                + Custom HEX
                            </button>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>Custom Color</div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: 11, color: 'var(--text-primary)' }}>Background</label>
                                <input type="color" value={customBg} onChange={e => setCustomBg(e.target.value)} style={{ padding: 0, width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <label style={{ fontSize: 11, color: 'var(--text-primary)' }}>Text Color</label>
                                <input type="color" value={customText} onChange={e => setCustomText(e.target.value)} style={{ padding: 0, width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                            </div>

                            {/* Live preview */}
                            <div style={{ margin: '6px 0', textAlign: 'center' }}>
                                <span style={{
                                    display: 'inline-flex', padding: '2px 8px', borderRadius: 20,
                                    background: customBg, color: customText, fontSize: 11, fontWeight: 600,
                                    border: `1px solid ${customText}33`
                                }}>
                                    Preview
                                </span>
                            </div>

                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => setShowCustom(false)} style={{ flex: 1, padding: '4px 0', fontSize: 11, background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 4, cursor: 'pointer', color: 'var(--text-primary)' }}>Back</button>
                                <button
                                    onClick={() => {
                                        onColorChange(option, `custom:${customBg}:${customText}`);
                                        setOpen(false);
                                        setShowCustom(false);
                                    }}
                                    style={{ flex: 1, padding: '4px 0', fontSize: 11, background: '#007aff', border: 'none', color: '#fff', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function EditablePropertyRow({ property }: { property: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [showColorPanel, setShowColorPanel] = useState(false);
    const [name, setName] = useState(property.name);
    const [type, setType] = useState(property.type);

    const parsedOptions: string[] = property.options ? JSON.parse(property.options) : [];
    const [optionsStr, setOptionsStr] = useState(parsedOptions.join(', '));

    // colorConfig state: {optionName: colorName }
    const [colorConfig, setColorConfig] = useState<Record<string, string>>(() => {
        try { return property.colorConfig ? JSON.parse(property.colorConfig) : {}; }
        catch { return {}; }
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isSavingColor, setIsSavingColor] = useState(false);
    const [colorSaved, setColorSaved] = useState(false);

    const isColorable = type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS' || type === 'PERSON';
    const currentOptions = isEditing
        ? optionsStr.split(',').map(s => s.trim()).filter(Boolean)
        : parsedOptions;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePropertyDefinition(property.id, name, type, optionsStr);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleColorChange = async (option: string, colorName: string) => {
        const updated = { ...colorConfig, [option]: colorName };
        setColorConfig(updated);
        setIsSavingColor(true);
        try {
            await updatePropertyColorConfig(property.id, JSON.stringify(updated));
            setColorSaved(true);
            setTimeout(() => setColorSaved(false), 1500);
        } finally {
            setIsSavingColor(false);
        }
    };

    const PROPERTY_TYPES = [
        'TEXT', 'NUMBER', 'SELECT', 'MULTI_SELECT', 'STATUS', 'DATE', 'PERSON', 'CHECKBOX', 'URL'
    ];

    return (
        <div style={{
            background: 'var(--sidebar-bg)',
            borderRadius: 10,
            border: '1px solid var(--border-color)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
        }}>
            {/* ── Header Row ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Property Name</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        style={inputStyle}
                                        placeholder="Property Name"
                                    />
                                </div>
                                <div style={{ width: 140 }}>
                                    <label style={labelStyle}>Type</label>
                                    <select
                                        value={type}
                                        onChange={e => setType(e.target.value)}
                                        style={{ ...inputStyle, cursor: 'pointer' }}
                                    >
                                        {PROPERTY_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {(type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS') && (
                                <div>
                                    <label style={labelStyle}>Options (comma-separated)</label>
                                    <input
                                        value={optionsStr}
                                        onChange={e => setOptionsStr(e.target.value)}
                                        style={inputStyle}
                                        placeholder="Option A, Option B, Option C"
                                    />
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    disabled={isSaving}
                                    style={{ padding: '6px 14px', fontSize: 12, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{ padding: '6px 18px', fontSize: 12, border: 'none', background: '#007aff', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,122,255,0.2)' }}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                {property.name}
                                <span style={{ fontSize: 10, background: 'var(--text-primary)', color: 'var(--bg-color)', padding: '2px 6px', borderRadius: 4 }}>{property.type}</span>
                            </div>
                            {property.options && (
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {parsedOptions.map(opt => {
                                        const colorName = colorConfig[opt] || 'Default';
                                        const color = COLOR_PALETTE.find(c => c.name === colorName) || COLOR_PALETTE[0];
                                        return (
                                            <span key={opt} style={{
                                                padding: '1px 8px', borderRadius: 20,
                                                background: color.bg, color: color.text,
                                                fontSize: 11, fontWeight: 600,
                                                border: `1px solid ${color.text}20`
                                            }}>{opt}</span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12, alignItems: 'center' }}>
                        {isColorable && currentOptions.length > 0 && (
                            <button
                                onClick={() => setShowColorPanel(v => !v)}
                                title="Configure option colors"
                                style={{
                                    padding: '4px 10px', fontSize: 12,
                                    border: '1px solid var(--border-color)',
                                    background: showColorPanel ? 'var(--text-primary)' : 'transparent',
                                    color: showColorPanel ? 'var(--bg-color)' : 'var(--text-primary)',
                                    borderRadius: 6, cursor: 'pointer',
                                    transition: 'all 0.15s', fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: 4
                                }}
                            >
                                🎨 Colors
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(true)}
                            style={{ padding: '4px 8px', fontSize: 12, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', borderRadius: 4, cursor: 'pointer' }}
                        >
                            Edit
                        </button>
                        <form action={async () => { await deletePropertyDefinition(property.id); }}>
                            <button type="submit" style={{ padding: '4px 8px', fontSize: 12, border: '1px solid #ff4d4f', background: 'transparent', color: '#ff4d4f', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                        </form>
                    </div>
                )}
            </div>

            {/* ── Color Configuration Panel ── */}
            {showColorPanel && !isEditing && isColorable && (
                <div style={{
                    borderTop: '1px solid var(--border-color)',
                    padding: '12px 16px', background: 'var(--bg-color)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            🎨 Option Colors
                        </div>
                        {isSavingColor ? (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Saving...</span>
                        ) : colorSaved ? (
                            <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 600 }}>✓ Saved</span>
                        ) : null}
                    </div>

                    {currentOptions.length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            {type === 'PERSON' ? 'Person colors are set per user in Content Management.' : 'No options defined. Add options first.'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {currentOptions.map(opt => (
                                <OptionColorRow
                                    key={opt}
                                    option={opt}
                                    colorConfig={colorConfig}
                                    propertyId={property.id}
                                    onColorChange={handleColorChange}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Shared Styles ──────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 13,
    border: '1px solid var(--border-color)', borderRadius: 6,
    background: 'var(--sidebar-bg)', color: 'var(--text-primary)',
    boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 700,
    color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase'
};
