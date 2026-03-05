'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentMain, updateSingleContentField } from '../../../../lib/content-actions';
import EditableCell from '../EditableCell';
import { X, Check, User, Clock, Type, Hash, ChevronDown, Layers, Calendar, CheckSquare, Link as LinkIcon, AtSign, Phone, Plus } from 'lucide-react';

function getTypeIcon(type: string) {
    const props = { size: 12, strokeWidth: 2.5 };
    switch (type) {
        case 'TEXT': return <Type {...props} />;
        case 'NUMBER': return <Hash {...props} />;
        case 'SELECT': return <ChevronDown {...props} />;
        case 'MULTI_SELECT': return <Layers {...props} />;
        case 'DATE': return <Calendar {...props} />;
        case 'PERSON': return <User {...props} />;
        case 'CHECKBOX': return <CheckSquare {...props} />;
        case 'URL': return <LinkIcon {...props} />;
        case 'EMAIL': return <AtSign {...props} />;
        case 'PHONE': return <Phone {...props} />;
        default: return <span style={{ fontSize: 10 }}>○</span>;
    }
}

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
                <button onClick={() => router.push('/content')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: 4 }}><X size={18} /></button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>Content</span>
                    <span>/</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{content.title || 'Untitled'}</span>
                </div>
                {isSaving && <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>Saving...</div>}
                {!isSaving && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#27ae60', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} strokeWidth={3} /> Saved</div>}
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
                                    <span style={{ display: 'flex' }}><User size={14} /></span> Author
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-primary)', padding: '4px 0' }}>
                                    {content.author?.name || 'Unknown'}
                                </div>
                            </div>


                            {/* Custom Properties */}
                            {properties.map(prop => (
                                <div key={prop.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', alignItems: 'center', padding: '4px 8px' }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ opacity: 0.7, display: 'flex' }}>{getTypeIcon(prop.type)}</span>
                                        {prop.name}
                                    </div>
                                    <div style={{ minHeight: 32, display: 'flex', alignItems: 'center' }}>
                                        <EditableCell
                                            contentId={content.id}
                                            propId={prop.id}
                                            type={prop.type}
                                            optionsRaw={prop.type === 'PERSON' ? userOptionsRaw : prop.options}
                                            initialValue={customFields[prop.id]}
                                            propertyId={prop.id}
                                            colorConfigRaw={(prop as any).colorConfig}
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
