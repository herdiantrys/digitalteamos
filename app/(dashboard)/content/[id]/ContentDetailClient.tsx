'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentMain, updateSingleContentField } from '../../../../lib/content-actions';
import MultiSelectBadgeDropdown from '../MultiSelectBadgeDropdown';
import EditableCell from '../EditableCell';

const TYPE_ICONS: Record<string, string> = {
    TEXT: 'T', NUMBER: '#', SELECT: '▾', MULTI_SELECT: '◫',
    DATE: '📅', PERSON: '👤', CHECKBOX: '☑', URL: '🔗'
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
    const saveTimeout = useRef<NodeJS.Timeout>(undefined);
    const lastSavedValues = useRef({ title: content.title, caption: content.caption });

    const handleMainChange = (key: string, val: string) => {
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


                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>👤</span> Author
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '4px 0' }}>
                                    {content.author?.name || 'Unknown'}
                                </div>
                            </div>

                            {/* Linked Tasks */}
                            <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'start', padding: '4px 8px' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                    <span>⏳</span> Tasks
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {content.tasks && content.tasks.length > 0 ? (
                                        content.tasks.map((task: any) => (
                                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: TYPE_ICONS[task.status] || '#ccc' }} title={task.status} />
                                                <div style={{ flex: 1, fontWeight: 500 }}>{task.title}</div>
                                                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{task.assignee?.name || 'Unassigned'}</div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6, padding: '8px 0' }}>No tasks linked</div>
                                    )}
                                    <button
                                        onClick={() => router.push(`/tasks?contentId=${content.id}`)}
                                        style={{ width: 'fit-content', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: 6, fontSize: 11, cursor: 'pointer', marginTop: 4 }}
                                    >
                                        + Add Task
                                    </button>
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
                            placeholder="Start writing..."
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
