'use client';

import EditableCell from './EditableCell';
import { deleteContent } from '../../../lib/content-actions';
import { Type, Hash, ChevronDown, Layers, Calendar, User, CheckSquare, Link as LinkIcon, AtSign, Phone, X, Trash2 } from 'lucide-react';
import PermissionWarningModal from './PermissionWarningModal';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ListView({
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

        const options: string[] = activeProp.options ? JSON.parse(activeProp.options) : (activeProp.type === 'PERSON' ? userOptionsRaw.split(',').map(s => s.trim()) : []);
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

    const displayProperties = properties.filter(p => visiblePropIds.includes(p.id));
    const gridCols = `minmax(250px, 2fr) repeat(${displayProperties.length}, minmax(120px, 1fr)) 60px`;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, minHeight: 400 }}>
            {groupedContents.map(group => (
                <div key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', background: 'var(--sidebar-bg)', borderRadius: '8px 8px 0 0', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {group.name}
                            </h3>
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-color)', padding: '1px 6px', borderRadius: 10, fontWeight: 600, border: '1px solid var(--border-color)' }}>
                                {group.items.length}
                            </span>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Header (Only show once at the top of the view or per group if you prefer) */}
                        {!group.name && (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: gridCols,
                                gap: 16,
                                padding: '12px 16px',
                                background: 'var(--sidebar-bg)',
                                borderRadius: 8,
                                borderBottom: '1px solid var(--border-color)',
                                alignItems: 'center'
                            }}>
                                <div style={thStyle}>Content Title</div>
                                {displayProperties.map(p => (
                                    <div key={p.id} style={{ ...thStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{getTypeIcon(p.type)}</span>
                                        {p.name}
                                    </div>
                                ))}
                                <div style={thStyle}></div>
                            </div>
                        )}

                        {group.items.map(content => {
                            const customData = content.customFields ? JSON.parse(content.customFields) : {};

                            return (
                                <div
                                    key={content.id}
                                    className="list-row"
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: gridCols,
                                        gap: 16,
                                        padding: '12px 16px',
                                        background: content.colorMatch ? `${content.colorMatch}1a` : 'var(--bg-color)',
                                        borderRadius: 8,
                                        border: content.colorMatch ? `1px solid ${content.colorMatch}` : '1px solid var(--border-color)',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                                    }}
                                >
                                    {/* Title Column */}
                                    <div
                                        onClick={() => onOpenContent ? onOpenContent(content.id) : router.push(`/content/${content.id}`)}
                                        style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'pointer' }}
                                    >
                                        <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', transition: 'color 0.1s' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#1890ff')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'inherit')}>
                                            {content.title}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                            By {content.author?.name}
                                        </div>
                                    </div>

                                    {/* Property Columns */}
                                    {displayProperties.map(p => (
                                        <div key={p.id} style={{ overflow: 'visible' }}>
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
                                    ))}

                                    {/* Actions */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                                                padding: '6px', background: 'transparent', border: '1px solid var(--border-color)',
                                                color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: 8,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s'
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.color = '#ff4d4f')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        <div style={{ textAlign: 'right', minWidth: 60 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{content.author?.name || 'Unknown'}</div>
                                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{new Date(content.createdAt).toLocaleDateString()}</div>
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

const thStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const
};

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
