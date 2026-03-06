'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDatabase } from '../../../lib/database-actions';
import { X, Loader2, Database, Table, Layout, List, Calendar, Clipboard, Folder, FileText, PieChart, BarChart, Activity, Zap, Rocket, Globe, Palette, FlaskConical, Lightbulb, Trophy, Wrench, Package } from 'lucide-react';
import LucideIcon from '../../../components/LucideIcon';

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

export default function NewDatabaseModal({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('Database');
    const [iconColor, setIconColor] = useState('#6366f1');
    const [description, setDescription] = useState('');
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) { setError('Name is required'); return; }
        setError('');
        startTransition(async () => {
            try {
                const db = await createDatabase(name.trim(), icon, description.trim() || undefined, iconColor);
                router.push(`/databases/${db.id}`);
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
            <div className="glass-card" style={{ width: 520, padding: 32, borderRadius: 16, position: 'relative', maxHeight: '95vh', overflowY: 'auto' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={20} />
                </button>

                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>New Database</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>Create a new database with custom properties and views.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Icon & Color picker */}
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
                                            border: iconColor === c.value ? '2px solid #fff' : 'none',
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
                            ref={inputRef}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="My Database"
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
                            rows={2}
                            style={{
                                width: '100%', padding: '10px 14px', borderRadius: 8,
                                border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
                                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
                                outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                            }}
                        />
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
                            Create Database
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
