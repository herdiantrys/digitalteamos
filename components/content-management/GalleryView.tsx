'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import EditableCell from './EditableCell';
import { deleteContent } from '../../lib/content-actions';
import { Type, Hash, ChevronDown, Layers, Calendar, User, CheckSquare, Link as LinkIcon, AtSign, Phone, X, Trash2 } from 'lucide-react';
import PermissionWarningModal from './PermissionWarningModal';

export default function GalleryView({
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

    // Property visibility from viewSettings
    const visiblePropIds: string[] = (() => {
        if (!viewSettings?.propertyVisibility) return properties.map(p => p.id);
        try { return JSON.parse(viewSettings.propertyVisibility); }
        catch { return properties.map(p => p.id); }
    })();

    const groupableProps = properties.filter(p => ['STATUS', 'SELECT', 'MULTI_SELECT', 'PERSON'].includes(p.type));
    const groupByPropId = (viewSettings?.groupBy && groupableProps.some(p => p.id === viewSettings.groupBy))
        ? viewSettings.groupBy
        : null;

    const groupedContents = (() => {
        if (!groupByPropId) return [{ name: '', items: contents }];

        const activeProp = properties.find(p => p.id === groupByPropId);
        if (!activeProp) return [{ name: '', items: contents }];

        const optionsRaw = activeProp.options ? JSON.parse(activeProp.options) : (activeProp.type === 'PERSON' ? JSON.parse(userOptionsRaw) : []);
        const options: string[] = optionsRaw.map((opt: any) => typeof opt === 'string' ? opt : opt.name || opt.label);
        const buckets: Record<string, any[]> = { 'Uncategorized': [] };
        options.forEach(opt => buckets[opt] = []);

        contents.forEach(content => {
            const customData = content.customFields ? JSON.parse(content.customFields) : {};
            const val = customData[activeProp.id];

            if (activeProp.type === 'MULTI_SELECT' || activeProp.type === 'PERSON') {
                const vals = val ? val.split(',').map((v: string) => v.trim()).filter(Boolean) : [];
                if (vals.length > 0) {
                    vals.forEach((v: string) => {
                        if (buckets[v]) buckets[v].push(content);
                        else buckets['Uncategorized'].push(content);
                    });
                } else {
                    buckets['Uncategorized'].push(content);
                }
            } else {
                if (val && buckets[val]) buckets[val].push(content);
                else buckets['Uncategorized'].push(content);
            }
        });

        return [...options, 'Uncategorized'].map(name => ({
            name,
            items: buckets[name]
        })).filter(g => g.items.length > 0);
    })();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32, minHeight: 400 }}>
            {groupedContents.map(group => (
                <div key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {group.name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {group.name}
                            </h3>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>
                                {group.items.length}
                            </span>
                        </div>
                    )}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 24
                    }}>
                        {group.items.map(content => {
                            const customData = content.customFields ? JSON.parse(content.customFields) : {};

                            return (
                                <div
                                    key={content.id}
                                    className="gallery-card"
                                    style={{
                                        borderRadius: 12,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        transition: 'transform 0.2s, box-shadow 0.2s, background 0.2s',
                                        cursor: 'default',
                                        background: content.colorMatch ? `${content.colorMatch}1a` : 'var(--bg-color)',
                                        borderColor: content.colorMatch ? content.colorMatch : 'var(--border-color)',
                                        border: '1px solid'
                                    }}
                                >
                                    {/* Card Header (Cover placeholder) */}
                                    <div style={{
                                        height: 60,
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                                        borderBottom: '1px solid var(--border-color)',
                                        display: 'flex',
                                        alignItems: 'flex-end',
                                        padding: '12px 16px',
                                        position: 'relative',
                                        justifyContent: 'flex-end' // Align items to the right
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const canDelete = currentUser?.role === 'ADMIN' || (currentUser?.id && content.authorId === currentUser.id);
                                                    if (!canDelete) {
                                                        setShowWarning(true);
                                                        return;
                                                    }
                                                    if (confirm(`Delete this content?`)) {
                                                        await deleteContent({ id: content.id });
                                                        router.refresh();
                                                    }
                                                }}
                                                style={{
                                                    padding: '6px', background: 'rgba(255,77,79,0.06)', border: 'none',
                                                    color: '#ff4d4f', cursor: 'pointer', borderRadius: 8,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-color)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)' }}>
                                                {content.author?.name?.slice(0, 2).toUpperCase() || '??'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <h3
                                                onClick={() => onOpenContent ? onOpenContent(content.id) : router.push(`/content/${content.id}`)}
                                                style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.4, cursor: 'pointer', color: 'var(--text-primary)', transition: 'color 0.1s' }}
                                                onMouseEnter={e => e.currentTarget.style.color = '#1890ff'}
                                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                            >
                                                {content.title}
                                            </h3>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>By {content.author?.name}</div>
                                        </div>

                                        {/* Properties List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {properties.filter(p => visiblePropIds.includes(p.id)).map(p => (
                                                <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
                                                        <span>{getTypeIcon(p.type)}</span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                                                    </div>
                                                    <div style={{ padding: '0 4px', background: 'rgba(0,0,0,0.1)', borderRadius: 4 }}>
                                                        <EditableCell
                                                            contentId={content.id}
                                                            propId={p.id}
                                                            type={p.type}
                                                            optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options}
                                                            initialValue={customData[p.id]}
                                                            propertyId={p.id}
                                                            colorConfigRaw={colorConfigMap?.[p.id]}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}

            {contents.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                    No content entries found.
                </div>
            )}
            <PermissionWarningModal
                isOpen={showWarning}
                onClose={() => setShowWarning(false)}
            />
        </div>
    );
}

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
