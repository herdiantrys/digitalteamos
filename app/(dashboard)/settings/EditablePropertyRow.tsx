'use client';

import { useState } from 'react';
import { updatePropertyDefinition, deletePropertyDefinition } from '../../../lib/property-actions';

export default function EditablePropertyRow({ property }: { property: any }) {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(property.name);

    // Parse existing options to a comma array
    const parsedOptions = property.options ? JSON.parse(property.options).join(', ') : '';
    const [optionsStr, setOptionsStr] = useState(parsedOptions);

    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updatePropertyDefinition(property.id, name, property.type, optionsStr);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    if (isEditing) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--sidebar-bg)', borderRadius: 8, border: '1px solid var(--text-primary)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                        placeholder="Property Name"
                    />
                    <span style={{ fontSize: 10, background: 'var(--border-color)', color: 'var(--text-secondary)', padding: '2px 6px', borderRadius: 4 }}>{property.type} (Fixed)</span>
                </div>

                {(property.type === 'SELECT' || property.type === 'MULTI_SELECT' || property.type === 'STATUS') && (
                    <input
                        value={optionsStr}
                        onChange={e => setOptionsStr(e.target.value)}
                        style={{ padding: '6px 10px', fontSize: 12, border: '1px solid var(--border-color)', borderRadius: 4, background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                        placeholder="Comma separated options (e.g. Option A, Option B)"
                    />
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={() => setIsEditing(false)} disabled={isSaving} style={{ padding: '4px 8px', fontSize: 12, border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Cancel</button>
                    <button onClick={handleSave} disabled={isSaving} style={{ padding: '4px 12px', fontSize: 12, border: 'none', background: 'var(--text-primary)', color: 'var(--bg-color)', borderRadius: 4, cursor: 'pointer' }}>
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'var(--sidebar-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <div>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {property.name}
                    <span style={{ fontSize: 10, background: 'var(--text-primary)', color: 'var(--bg-color)', padding: '2px 6px', borderRadius: 4 }}>{property.type}</span>
                </div>
                {property.options && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Options: {JSON.parse(property.options).join(', ')}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                <form action={async () => {
                    await deletePropertyDefinition(property.id);
                }}>
                    <button type="submit" style={{ background: 'transparent', border: '1px solid #ff4d4f', color: '#ff4d4f', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </form>
            </div>
        </div>
    );
}
