'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateContentMain } from '../../lib/content-actions';
import EditableCell from './EditableCell';
import MarkdownEditor from './MarkdownEditor';
import ContentHistoryPanel from './ContentHistoryPanel';
import { X, Check, User, Clock, Type, Hash, ChevronDown, Layers, Calendar, CheckSquare, Link as LinkIcon, AtSign, Phone, Plus, History } from 'lucide-react';

import ReactMarkdown from 'react-markdown';

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

interface ContentDetailModalProps {
    content: any;
    isOpen: boolean;
    onClose: () => void;
    properties: any[];
    userOptionsRaw: string;
    database?: any;
    currentUser: { id: string, role: string };
}

export default function ContentDetailModal({
    content: initialContent,
    isOpen,
    onClose,
    properties,
    userOptionsRaw,
    database,
    currentUser,
}: ContentDetailModalProps) {
    const [content, setContent] = useState(initialContent);
    const [isSaving, startTransition] = useTransition();
    const [isVisible, setIsVisible] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const saveTimeout = useRef<NodeJS.Timeout>(undefined);
    const lastSavedValues = useRef({ title: initialContent?.title, caption: initialContent?.caption });
    const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
    const [historyKey, setHistoryKey] = useState(0); // bump to re-fetch history


    useEffect(() => {
        if (isOpen) {
            setContent(initialContent);
            lastSavedValues.current = { title: initialContent?.title, caption: initialContent?.caption };
            setTimeout(() => setIsVisible(true), 10);
            document.body.style.overflow = 'hidden';
        } else {
            setIsVisible(false);
            document.body.style.overflow = 'auto';
        }
    }, [isOpen, initialContent]);

    if ((!isOpen && !isVisible) || !content) return null;

    const customFields = (() => { try { return JSON.parse(content?.customFields || '{}'); } catch { return {}; } })();
    const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
    const isAssigned = personFields.some(id => {
        const val = customFields[id];
        if (!val) return false;
        return String(val).split(',').map(s => s.trim()).includes(currentUser.id);
    });

    const canEdit = currentUser.role === 'ADMIN' || content.authorId === currentUser.id || isAssigned;

    const handleMainChange = (key: string, val: string) => {
        if (!canEdit) return;
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



    const parseTemplate = (tmpl?: string) => {
        if (!tmpl) return '';
        const now = new Date();
        return tmpl.replace(/\{\{([^}]+)\}\}/g, (match, propName) => {
            const key = propName.trim().toLowerCase();

            // ── Built-in fields ──
            if (key === 'title') return content?.title || '';
            if (key === 'author') return content?.author?.name || 'Unknown';

            // ── Date / time ──
            if (key === 'date' || key === 'today')
                return now.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
            if (key === 'time' || key === 'now')
                return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
            if (key === 'datetime')
                return now.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            // ── Record timestamps ──
            if (key === 'created at' || key === 'createdat')
                return content?.createdAt ? new Date(content.createdAt).toLocaleString() : '';
            if (key === 'updated at' || key === 'updatedat')
                return content?.updatedAt ? new Date(content.updatedAt).toLocaleString() : '';

            // ── Custom property by name ──
            const propDef = properties.find(p => p.name.toLowerCase() === key);
            if (propDef) {
                const val = customFields[propDef.id];
                return val ? String(val) : '';
            }
            return match; // leave untouched if not found
        });
    };

    const evaluatedHeader = parseTemplate(database?.contentHeaderTemplate);
    const evaluatedFooter = parseTemplate(database?.contentFooterTemplate);


    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
            pointerEvents: isVisible ? 'auto' : 'none'
        }}>
            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .modal-backdrop { transition: opacity 0.3s ease; }
                .modal-panel { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>

            {/* Backdrop */}
            <div
                className="modal-backdrop"
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)',
                    opacity: isVisible ? 1 : 0,
                    cursor: 'pointer'
                }}
            />

            {/* Panel */}
            <div
                ref={panelRef}
                className="modal-panel"
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 960,
                    height: '100%',
                    background: 'var(--bg-color)',
                    boxShadow: '-10px 0 40px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={onClose} style={{
                            background: 'rgba(0,0,0,0.05)',
                            border: 'none',
                            width: 32, height: 32,
                            borderRadius: '50%',
                            cursor: 'pointer', color: 'var(--text-secondary)'
                        }}><X size={18} /></button>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Content Detail</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {isSaving ? (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>Saving...</span>
                        ) : (
                            <span style={{ fontSize: 12, color: '#27ae60', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} strokeWidth={3} /> Saved</span>
                        )}
                    </div>
                </div>

                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingLeft: 24, background: 'var(--bg-color)' }}>
                    {(['overview', 'history'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} style={{
                            padding: '10px 16px', fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
                            color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-secondary)',
                            background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid #007aff' : '2px solid transparent',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                            textTransform: 'capitalize'
                        }}>
                            {tab === 'history' && <History size={13} />}
                            {tab === 'overview' ? '📄 Overview' : 'History'}
                        </button>
                    ))}
                </div>

                {/* Overview tab */}
                {activeTab === 'overview' && (
                    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '40px 48px' }}>
                        <input
                            value={content?.title || ''}
                            onChange={(e) => handleMainChange('title', e.target.value)}
                            placeholder="Untitled"
                            disabled={!canEdit}
                            style={{
                                width: '100%', border: 'none', background: 'transparent',
                                fontSize: 36, fontWeight: 800, color: 'var(--text-primary)',
                                outline: 'none', marginBottom: 24, letterSpacing: '-0.03em',
                                opacity: canEdit ? 1 : 0.8
                            }}
                        />

                        {/* Properties Section */}
                        <div style={{
                            background: 'rgba(0,0,0,0.02)',
                            borderRadius: 16,
                            padding: '12px 16px',
                            marginBottom: 40,
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', columnGap: 32, rowGap: 8 }}>
                                {/* Static Author */}
                                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', minHeight: 40 }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ display: 'flex' }}><User size={14} /></span> Author
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                                        {content?.author?.name || 'Unknown'}
                                    </div>
                                </div>

                                {/* Dynamic Properties */}
                                {properties.map(prop => (
                                    <div key={prop.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', minHeight: 40 }}>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ display: 'flex', opacity: 0.7 }}>{getTypeIcon(prop.type)}</span>
                                            {prop.name}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <EditableCell
                                                contentId={content.id}
                                                propId={prop.id}
                                                type={prop.type}
                                                optionsRaw={prop.type === 'PERSON' ? userOptionsRaw : prop.options}
                                                initialValue={customFields[prop.id]}
                                                propertyId={prop.id}
                                                colorConfigRaw={(prop as any).colorConfig}
                                                disabled={!canEdit}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>


                        {/* Caption Section */}
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 32 }}>
                            <MarkdownEditor
                                value={content?.caption || ''}
                                onChange={(val) => handleMainChange('caption', val)}
                                contentTitle={content?.title}
                                isSaving={isSaving}
                                headerContent={evaluatedHeader || undefined}
                                footerContent={evaluatedFooter || undefined}
                                disabled={!canEdit}
                            />
                        </div>
                    </div>
                )}

                {/* History tab */}
                {activeTab === 'history' && (
                    <div key={historyKey} style={{ flex: 1, overflow: 'hidden', padding: '24px', background: 'var(--bg-color)' }}>
                        <ContentHistoryPanel
                            contentId={content?.id}
                            onRestored={() => setHistoryKey(k => k + 1)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
