'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditableCell from './EditableCell';
import { Trash2 } from 'lucide-react';
import { deleteContent } from '../../lib/content-actions';
import PermissionWarningModal from './PermissionWarningModal';

export default function BoardView({
    contents,
    properties,
    userOptionsRaw,
    onOpenContent,
    colorConfigMap,
    viewSettings,
    currentUser,
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
    onOpenContent?: (id: string) => void;
    colorConfigMap?: Record<string, string | null>;
    viewSettings?: any;
    currentUser?: any;
}) {
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    // We need to pick a property to group by. Let's look for STATUS first, then SELECT.
    const groupableProps = properties.filter(p => ['STATUS', 'SELECT', 'MULTI_SELECT', 'PERSON'].includes(p.type));

    // Use viewSettings.groupBy if it's a valid groupable property, otherwise fallback
    const groupByPropId = (viewSettings?.groupBy && groupableProps.some(p => p.id === viewSettings.groupBy))
        ? viewSettings.groupBy
        : (groupableProps.length > 0 ? groupableProps[0].id : null);

    if (!groupByPropId || groupableProps.length === 0) {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                No compatible properties available for Board Grouping.
                <br />
                <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>Create a property of type STATUS, SELECT, MULTI_SELECT, or PERSON first.</span>
            </div>
        );
    }

    const activeProp = properties.find(p => p.id === groupByPropId);
    if (!activeProp) return null;

    const optionsRaw = activeProp.options ? JSON.parse(activeProp.options) : (activeProp.type === 'PERSON' ? JSON.parse(userOptionsRaw) : []);
    const options = optionsRaw.map((opt: any) => typeof opt === 'string' ? opt : opt.name || opt.label);

    // Create columns: one for each option, plus an 'Uncategorized' column
    const columns: Record<string, any[]> = { 'Uncategorized': [] };
    options.forEach((opt: string) => columns[opt] = []);

    contents.forEach(content => {
        const customData = content.customFields ? JSON.parse(content.customFields) : {};
        const val = customData[activeProp.id];

        if (activeProp.type === 'MULTI_SELECT' || activeProp.type === 'PERSON') {
            const vals = val ? val.split(',').map((v: string) => v.trim()).filter(Boolean) : [];
            if (vals.length > 0) {
                vals.forEach((v: string) => {
                    if (columns[v]) columns[v].push(content);
                    else columns['Uncategorized'].push(content);
                });
            } else {
                columns['Uncategorized'].push(content);
            }
        } else {
            if (val && columns[val]) {
                columns[val].push(content);
            } else {
                columns['Uncategorized'].push(content);
            }
        }
    });

    return (
        <div>

            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                {Object.keys(columns).map(columnName => {
                    const colItems = columns[columnName];
                    // Hide Uncategorized if empty
                    if (columnName === 'Uncategorized' && colItems.length === 0) return null;

                    return (
                        <div key={columnName} style={{
                            minWidth: 280,
                            maxWidth: 320,
                            flex: 1,
                            background: 'var(--sidebar-bg)',
                            borderRadius: 8,
                            padding: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{columnName}</h4>
                                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{colItems.length}</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {colItems.map((item: any) => {
                                    const cd = item.customFields ? JSON.parse(item.customFields) : {};
                                    return (
                                        <div key={item.id} style={{
                                            background: item.colorMatch ? `${item.colorMatch}1a` : 'var(--bg-color)',
                                            border: item.colorMatch ? `1px solid ${item.colorMatch}` : '1px solid var(--border-color)',
                                            borderRadius: 6,
                                            padding: 12,
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                            transition: 'all 0.2s'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                                <h5
                                                    onClick={() => onOpenContent ? onOpenContent(item.id) : router.push(`/content/${item.id}`)}
                                                    style={{ margin: 0, fontSize: 14, cursor: 'pointer', color: 'var(--text-primary)', transition: 'color 0.1s', flex: 1 }}
                                                    onMouseEnter={e => e.currentTarget.style.color = '#1890ff'}
                                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                                >
                                                    {item.title}
                                                </h5>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        const canDelete = currentUser?.role === 'ADMIN' || (currentUser?.id && item.authorId === currentUser.id);
                                                        if (!canDelete) {
                                                            setShowWarning(true);
                                                            return;
                                                        }
                                                        if (confirm(`Delete this content?`)) {
                                                            await deleteContent({ id: item.id });
                                                            router.refresh();
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '4px', background: 'transparent', border: 'none',
                                                        color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 4,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget.style.color = '#ff4d4f')}
                                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                                {properties.filter(p => p.id !== activeProp.id).slice(0, 3).map(p => (
                                                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.name}</span>
                                                        <div style={{ padding: '0 4px' }}>
                                                            <EditableCell
                                                                contentId={item.id}
                                                                propId={p.id}
                                                                initialValue={cd[p.id]}
                                                                type={p.type}
                                                                optionsRaw={p.options}
                                                                propertyId={p.id}
                                                                colorConfigRaw={(p as any).colorConfig}
                                                                disabled={(() => {
                                                                    if (currentUser?.role === 'ADMIN') return false;
                                                                    if (item.authorId === currentUser?.id) return false;

                                                                    const customFields = (() => { try { return JSON.parse(item.customFields || '{}'); } catch { return {}; } })();
                                                                    const personFields = properties.filter(p => p.type === 'PERSON').map(p => p.id);
                                                                    return !personFields.some(id => {
                                                                        const val = customFields[id];
                                                                        if (!val) return false;
                                                                        return String(val).split(',').map(s => s.trim()).includes(currentUser?.id);
                                                                    });
                                                                })()}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div style={{ marginTop: 12, paddingTop: 8, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>#{item.id.slice(-4)}</span>
                                                {item.author && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{item.author.name}</span>}
                                            </div>
                                        </div>
                                    );
                                })}
                                {colItems.length === 0 && (
                                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--border-color)', fontSize: 12 }}>
                                        Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            <PermissionWarningModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
            />
        </div>
    );
}
