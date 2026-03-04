'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentMain, updateSingleContentField } from '../../../../lib/content-actions';
import MultiSelectBadgeDropdown from '../MultiSelectBadgeDropdown';
import EditableCell from '../EditableCell';

const TYPE_ICONS: Record<string, string> = {
    TEXT: 'T', NUMBER: '#', SELECT: '▾', MULTI_SELECT: '◫',
    DATE: '📅', PERSON: '👤', CHECKBOX: '☑', URL: '🔗', STATUS: '🚥'
};

export default function ContentDetailClient({
    initialContent,
    properties,
    userOptionsRaw
}: {
    initialContent: any;
    properties: any[];
    userOptionsRaw: string;
}) {
    const router = useRouter();
    const [content, setContent] = useState(initialContent);
    const [isSaving, startTransition] = useTransition();
    const customFields = (() => { try { return JSON.parse(content.customFields || '{}'); } catch { return {}; } })();

    // Debounced auto-save for Title and Caption
    const saveTimeout = useRef<NodeJS.Timeout>();
    const lastSavedValues = useRef({ title: content.title, caption: content.caption });

    const handleMainChange = (key: 'title' | 'caption', val: string) => {
        setContent((prev: any) => ({ ...prev, [key]: val }));

        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(() => {
            if (val !== (lastSavedValues.current as any)[key]) {
                startTransition(async () => {
                    await updateContentMain(content.id, { [key]: val });
                    (lastSavedValues.current as any)[key] = val;
                });
            }
        }, 800);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-color)', position: 'relative' }}>
            {/* ── Top Bar ── */}
            <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)' }}>
                <button onClick={() => router.push('/content')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>Content</span>
                    <span>/</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{content.title || 'Untitled'}</span>
                </div>
                {isSaving && <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>Saving...</div>}
                {!isSaving && <div style={{ marginLeft: 'auto', fontSize: 11, color: '#27ae60', opacity: 0.6 }}>Saved</div>}
            </div>

            {/* ── Content Body (Scrollable) ── */}
            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '40px 10%' }}>
                <div style={{ maxWidth: 800, margin: '0 auto' }}>

                    {/* Title Header */}
                    <input
                        value={content.title}
                        onChange={(e) => handleMainChange('title', e.target.value)}
                        placeholder="Untitled"
                        style={{
                            width: '100%', border: 'none', background: 'transparent',
                            fontSize: 42, fontWeight: 700, color: 'var(--text-primary)',
                            outline: 'none', marginBottom: 20, letterSpacing: '-0.02em'
                        }}
                    />

                    {/* Properties Area */}
                    <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '16px 0', marginBottom: 32 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>

                            {/* Metadata Built-in */}
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>⚙️</span> Platform
                                </div>
                                <div>
                                    <select
                                        value={content.platform}
                                        onChange={(e) => handleMainChange('platform', e.target.value)}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer', padding: '4px 0' }}
                                    >
                                        <option value="Instagram">Instagram</option>
                                        <option value="TikTok">TikTok</option>
                                        <option value="YouTube">YouTube</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>🚥</span> Status
                                </div>
                                <div>
                                    <select
                                        value={content.status}
                                        onChange={(e) => handleMainChange('status', e.target.value)}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer', padding: '4px 0' }}
                                    >
                                        <option value="DRAFT">Draft</option>
                                        <option value="REVIEW">Review</option>
                                        <option value="SCHEDULED">Scheduled</option>
                                        <option value="PUBLISHED">Published</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>👤</span> Author
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '4px 0' }}>
                                    {content.author?.name || 'Unknown'}
                                </div>
                            </div>

                            {/* Custom Properties */}
                            {properties.map(prop => (
                                <div key={prop.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ opacity: 0.7, fontSize: 11 }}>{TYPE_ICONS[prop.type] || '○'}</span>
                                        {prop.name}
                                    </div>
                                    <div style={{ minHeight: 32, display: 'flex', alignItems: 'center' }}>
                                        <EditableCell
                                            contentId={content.id}
                                            propId={prop.id}
                                            type={prop.type}
                                            optionsRaw={prop.type === 'PERSON' ? userOptionsRaw : prop.options}
                                            initialValue={customFields[prop.id]}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Text Content (Caption) */}
                    <div style={{ minHeight: 300 }}>
                        <textarea
                            value={content.caption || ''}
                            onChange={(e) => handleMainChange('caption', e.target.value)}
                            placeholder="Start writing or typing '/' for commands..."
                            style={{
                                width: '100%', minHeight: 500, border: 'none', background: 'transparent',
                                fontSize: 16, lineHeight: 1.6, color: 'var(--text-primary)',
                                outline: 'none', resize: 'none'
                            }}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
