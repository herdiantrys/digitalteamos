'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDatabase, deleteDatabase } from '../../../../lib/database-actions';
import { ArrowLeft, Pencil, Trash2, Check, X, Plus, MoreHorizontal } from 'lucide-react';
import LucideIcon from '../../../../components/LucideIcon';
import Link from 'next/link';
import DatabaseImportExportPanel from './DatabaseImportExportPanel';
import CreateContentModal from '../../../../components/content-management/CreateContentModal';
import ImportExportPanel from '../../../../components/content-management/ImportExportPanel';
import EditDatabaseModal from './EditDatabaseModal';

interface Database {
    id: string;
    name: string;
    icon: string | null;
    iconColor: string | null;
    description: string | null;
    contentHeaderTemplate: string | null;
    contentFooterTemplate: string | null;
}

export default function DatabaseHeader({
    database,
    userRole,
    properties,
    userOptionsRaw
}: {
    database: Database;
    userRole: string;
    properties: any[];
    userOptionsRaw: string;
}) {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const router = useRouter();
    const isAdmin = userRole === 'ADMIN';

    function handleDelete() {
        if (!confirm(`Delete "${database.name}"? This will permanently delete all items, properties and views inside.`)) return;
        startTransition(async () => {
            await deleteDatabase(database.id);
            router.push('/databases');
        });
    }

    const currentIconColor = database.iconColor || 'var(--accent-primary)';

    return (
        <div style={{ marginBottom: 24 }}>

            {/* Back link */}
            <Link
                href="/databases"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, marginBottom: 12 }}
            >
                <ArrowLeft size={14} />
                All Databases
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: `color-mix(in srgb, ${currentIconColor} 15%, transparent)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <LucideIcon name={database.icon || 'Database'} size={28} style={{ color: currentIconColor }} />
                    </div>

                    <div>
                        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{database.name}</h1>
                        {database.description && (
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
                                {database.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div
                    className="premium-scrollbar"
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        overflowX: 'auto', whiteSpace: 'nowrap',
                        maxWidth: '100%', paddingBottom: 6,
                        scrollbarWidth: 'thin'
                    }}
                >
                    <CreateContentModal
                        properties={properties}
                        userOptionsRaw={userOptionsRaw}
                        databaseId={database.id}
                    />
                    <div style={{ width: 1, height: 24, background: 'var(--border-color)', margin: '0 4px' }} />

                    {isAdmin && (
                        <>
                            <DatabaseImportExportPanel databaseId={database.id} userRole={userRole} />
                            <button
                                onClick={() => setIsEditModalOpen(true)}
                                title="Edit database"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                    border: '1px solid var(--border-color)', borderRadius: 8, background: 'none',
                                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                                <Pencil size={14} />
                                Edit
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={pending}
                                title="Delete database"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                                    border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, background: 'rgba(239,68,68,0.08)',
                                    color: '#ef4444', cursor: 'pointer', fontSize: 13,
                                }}
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </div>

            {isEditModalOpen && (
                <EditDatabaseModal
                    database={database}
                    onClose={() => setIsEditModalOpen(false)}
                />
            )}
        </div>
    );
}
