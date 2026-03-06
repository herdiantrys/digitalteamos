'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { updateDatabase } from '../../../../lib/database-actions';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import LucideIcon from '../../../../components/LucideIcon';

const LUCIDE_ICON_SUGGESTIONS = [
    'Database', 'Table', 'Layout', 'List', 'Calendar', 'Clipboard', 'Folder', 'FileText',
    'PieChart', 'BarChart', 'Activity', 'Zap', 'Rocket', 'Globe', 'Palette',
    'FlaskConical', 'Lightbulb', 'Trophy', 'Wrench', 'Package'
];

const COLOR_SUGGESTIONS = [
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Vibrant Blue', value: '#3b82f6' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Slate', value: '#64748b' },
];

interface Database {
    id: string;
    name: string;
    icon: string | null;
    iconColor: string | null;
    description: string | null;
    contentHeaderTemplate: string | null;
    contentFooterTemplate: string | null;
}

export default function EditDatabaseModal({
    database,
    onClose
}: {
    database: Database;
    onClose: () => void
}) {
    const [name, setName] = useState(database.name);
    const [icon, setIcon] = useState(database.icon || 'Database');
    const [iconColor, setIconColor] = useState(database.iconColor || '#6366f1');
    const [description, setDescription] = useState(database.description || '');
    const [headerTemplate, setHeaderTemplate] = useState(database.contentHeaderTemplate || '');
    const [footerTemplate, setFooterTemplate] = useState(database.contentFooterTemplate || '');
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [uploadingHeader, setUploadingHeader] = useState(false);
    const [uploadingFooter, setUploadingFooter] = useState(false);
    const headerImgRef = useRef<HTMLInputElement>(null);
    const footerImgRef = useRef<HTMLInputElement>(null);
    const headerTextareaRef = useRef<HTMLTextAreaElement>(null);
    const footerTextareaRef = useRef<HTMLTextAreaElement>(null);
    const router = useRouter();

    async function uploadImage(file: File, target: 'header' | 'footer') {
        const setUploading = target === 'header' ? setUploadingHeader : setUploadingFooter;
        const setTemplate = target === 'header' ? setHeaderTemplate : setFooterTemplate;
        const textareaRef = target === 'header' ? headerTextareaRef : footerTextareaRef;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload-image', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            // Insert markdown image at cursor
            const el = textareaRef.current;
            const imgMd = `![image](${data.url})`;
            if (el) {
                const start = el.selectionStart ?? 0;
                const end = el.selectionEnd ?? 0;
                setTemplate(prev => prev.slice(0, start) + imgMd + prev.slice(end));
                // Restore cursor after inserted text
                setTimeout(() => { el.focus(); el.setSelectionRange(start + imgMd.length, start + imgMd.length); }, 0);
            } else {
                setTemplate(prev => prev + '\n' + imgMd);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setError('Name is required'); return; }
        setError('');
        startTransition(async () => {
            try {
                await updateDatabase(database.id, {
                    name: name.trim(),
                    icon,
                    iconColor,
                    description: description.trim() || undefined,
                    contentHeaderTemplate: headerTemplate.trim() || undefined,
                    contentFooterTemplate: footerTemplate.trim() || undefined
                });
                router.refresh();
                onClose();
            } catch (err: any) {
                setError(err.message);
            }
        });
    }

    return (
        <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="glass-card" style={{ width: 520, padding: 32, borderRadius: 16, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Edit Database</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Update your database settings and appearance.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Icon & Color Picker */}
                    <div style={{ display: 'flex', gap: 24 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>ICON</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                                {LUCIDE_ICON_SUGGESTIONS.map(iconName => (
                                    <button
                                        key={iconName}
                                        type="button"
                                        onClick={() => setIcon(iconName)}
                                        style={{
                                            width: 36, height: 36, borderRadius: 8,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            border: icon === iconName ? `2px solid ${iconColor}` : '1px solid var(--border-color)',
                                            background: icon === iconName ? `${iconColor}15` : 'var(--sidebar-bg)',
                                            cursor: 'pointer', transition: 'all 0.15s',
                                            color: icon === iconName ? iconColor : 'var(--text-secondary)'
                                        }}
                                    >
                                        <LucideIcon name={iconName} size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ width: 120 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>COLOR</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                                {COLOR_SUGGESTIONS.map(c => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setIconColor(c.value)}
                                        title={c.name}
                                        style={{
                                            width: 36, height: 36, borderRadius: '50%',
                                            background: c.value,
                                            border: iconColor === c.value ? '3px solid #fff' : 'none',
                                            boxShadow: iconColor === c.value ? `0 0 0 2px ${c.value}` : 'none',
                                            cursor: 'pointer', transition: 'transform 0.2s',
                                            transform: iconColor === c.value ? 'scale(0.9)' : 'scale(1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>NAME *</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Database Name"
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 8,
                                border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                                outline: 'none',
                            }}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>DESCRIPTION (optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What is this database for?"
                            rows={3}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 8,
                                border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                            }}
                        />
                    </div>

                    <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                    {/* Content Templates */}
                    <div>
                        <h3 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>Data Item Templates</h3>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                            Customize the header and footer shown inside every content item (and in PDF exports). Supports Markdown.
                        </p>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '10px 12px', marginBottom: 16, lineHeight: 1.8 }}>
                            <strong>Available placeholders:</strong><br />
                            <code style={{ fontFamily: 'monospace' }}>{`{{Title}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{Author}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{Date}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{Time}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{DateTime}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{Created At}}`}</code> · <code style={{ fontFamily: 'monospace' }}>{`{{Updated At}}`}</code><br />
                            Atau nama properti apa pun, mis. <code style={{ fontFamily: 'monospace' }}>{`{{Status}}`}</code>, <code style={{ fontFamily: 'monospace' }}>{`{{Assignee}}`}</code>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>HEADER TEMPLATE (optional)</label>
                                    <button type="button" onClick={() => headerImgRef.current?.click()}
                                        disabled={uploadingHeader}
                                        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        {uploadingHeader ? <Loader2 size={12} className="spin" /> : <ImageIcon size={12} />} Upload Image
                                    </button>
                                    <input ref={headerImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'header'); e.target.value = ''; }} />
                                </div>
                                <textarea
                                    ref={headerTextareaRef}
                                    value={headerTemplate}
                                    onChange={e => setHeaderTemplate(e.target.value)}
                                    placeholder={`e.g., ![Logo](/uploads/logo.png) **{{Title}}**\n**Author:** {{Author}} | {{Date}}`}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 8,
                                        border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                        color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                                        outline: 'none', resize: 'vertical', fontFamily: 'monospace',
                                    }}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>FOOTER TEMPLATE (optional)</label>
                                    <button type="button" onClick={() => footerImgRef.current?.click()}
                                        disabled={uploadingFooter}
                                        style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        {uploadingFooter ? <Loader2 size={12} className="spin" /> : <ImageIcon size={12} />} Upload Image
                                    </button>
                                    <input ref={footerImgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'footer'); e.target.value = ''; }} />
                                </div>
                                <textarea
                                    ref={footerTextareaRef}
                                    value={footerTemplate}
                                    onChange={e => setFooterTemplate(e.target.value)}
                                    placeholder={`e.g., ---\n_DigitalTeam OS — {{DateTime}}_`}
                                    rows={3}
                                    style={{
                                        width: '100%', padding: '10px 14px', borderRadius: 8,
                                        border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                        color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                                        outline: 'none', resize: 'vertical', fontFamily: 'monospace',
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {error && <p style={{ color: '#ef4444', fontSize: 13 }}>{error}</p>}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}
                        >Cancel</button>
                        <button
                            type="submit"
                            disabled={pending || !name.trim()}
                            style={{
                                padding: '9px 20px', borderRadius: 8, border: 'none',
                                background: `linear-gradient(135deg, ${iconColor}, ${iconColor}cc)`,
                                color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 8,
                                opacity: pending || !name.trim() ? 0.6 : 1,
                            }}
                        >
                            {pending ? <Loader2 size={15} className="spin" /> : null}
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
