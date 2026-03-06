'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteDatabase } from '../../../lib/database-actions';
import NewDatabaseModal from './NewDatabaseModal';
import { Database, Plus, Trash2, ChevronRight, MoreHorizontal } from 'lucide-react';
import LucideIcon from '../../../components/LucideIcon';

interface DB {
    id: string;
    name: string;
    icon: string | null;
    iconColor: string | null;
    description: string | null;
    createdAt: Date;
}

export default function DatabasesClient({ databases, isAdmin }: { databases: DB[]; isAdmin: boolean }) {
    const [showModal, setShowModal] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [menuId, setMenuId] = useState<string | null>(null);
    const router = useRouter();
    const [dbs, setDbs] = useState(databases);

    async function handleDelete(id: string) {
        if (!confirm('Delete this database? All items, properties and views inside will be permanently deleted.')) return;
        setDeletingId(id);
        try {
            await deleteDatabase(id);
            setDbs(prev => prev.filter(d => d.id !== id));
        } finally {
            setDeletingId(null);
            setMenuId(null);
        }
    }

    return (
        <div className="fade-in" style={{ padding: '0 32px', maxWidth: 960, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>Databases</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        {dbs.length} database{dbs.length !== 1 ? 's' : ''} in this workspace
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '10px 18px', borderRadius: 8, border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                        }}
                    >
                        <Plus size={16} />
                        New Database
                    </button>
                )}
            </div>

            {/* Empty state */}
            {dbs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                    <div style={{ fontSize: 56, marginBottom: 16 }}>🗃️</div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No databases yet</h3>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
                        Create a database to organize your data with custom properties and views.
                    </p>
                    {isAdmin && (
                        <button
                            onClick={() => setShowModal(true)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '10px 20px', borderRadius: 8, border: 'none',
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                            }}
                        >
                            <Plus size={16} />
                            Create your first database
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {dbs.map(db => {
                        const currentIconColor = db.iconColor || 'var(--accent-primary)';
                        return (
                            <div
                                key={db.id}
                                className="glass-card"
                                style={{ padding: 0, borderRadius: 12, overflow: 'hidden', position: 'relative', transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
                            >
                                {/* Card header band */}
                                <div style={{
                                    height: 4,
                                    background: `linear-gradient(90deg, ${currentIconColor}, color-mix(in srgb, ${currentIconColor} 60%, white))`,
                                }} />
                                <div style={{ padding: '20px 20px 16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Link
                                            href={`/databases/${db.id}`}
                                            style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 10,
                                                    background: `color-mix(in srgb, ${currentIconColor} 12%, transparent)`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <LucideIcon name={db.icon || 'Database'} size={22} style={{ color: currentIconColor }} />
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{db.name}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                        Created {new Date(db.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </div>
                                            {db.description && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                                    {db.description}
                                                </p>
                                            )}
                                        </Link>

                                        {/* Options menu */}
                                        {isAdmin && (
                                            <div style={{ position: 'relative' }}>
                                                <button
                                                    onClick={e => { e.stopPropagation(); setMenuId(menuId === db.id ? null : db.id); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 6 }}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                {menuId === db.id && (
                                                    <div
                                                        style={{
                                                            position: 'absolute', right: 0, top: 28, background: 'var(--sidebar-bg)',
                                                            border: '1px solid var(--border-color)', borderRadius: 8, padding: 4,
                                                            minWidth: 140, zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => handleDelete(db.id)}
                                                            disabled={deletingId === db.id}
                                                            style={{
                                                                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                padding: '8px 12px', borderRadius: 6, color: '#ef4444', fontSize: 13,
                                                            }}
                                                        >
                                                            <Trash2 size={14} />
                                                            {deletingId === db.id ? 'Deleting…' : 'Delete'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Link
                                    href={`/databases/${db.id}`}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '10px 20px', borderTop: '1px solid var(--border-color)',
                                        color: 'var(--text-secondary)', fontSize: 13, textDecoration: 'none',
                                        transition: 'color 0.15s',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.color = currentIconColor)}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                >
                                    <span>Open database</span>
                                    <ChevronRight size={14} />
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && <NewDatabaseModal onClose={() => setShowModal(false)} />}

            {/* Close menu on outside click */}
            {menuId && (
                <div
                    style={{ position: 'fixed', inset: 0, zIndex: 9 }}
                    onClick={() => setMenuId(null)}
                />
            )}
        </div>
    );
}
