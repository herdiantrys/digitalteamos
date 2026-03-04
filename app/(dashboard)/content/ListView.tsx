'use client';

import EditableCell from './EditableCell';
import { deleteContent } from '../../../lib/content-actions';

export default function ListView({
    contents,
    properties,
    userOptionsRaw
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 400 }}>
            {/* Header */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `minmax(250px, 2fr) repeat(${properties.length}, minmax(120px, 1fr)) 60px`,
                gap: 16,
                padding: '12px 16px',
                background: 'var(--sidebar-bg)',
                borderRadius: 8,
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center'
            }}>
                <div style={thStyle}>Content Title</div>
                {properties.map(p => (
                    <div key={p.id} style={{ ...thStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{getTypeIcon(p.type)}</span>
                        {p.name}
                    </div>
                ))}
                <div style={thStyle}></div>
            </div>

            {/* List Rows */}
            {contents.map(content => {
                const customData = content.customFields ? JSON.parse(content.customFields) : {};

                return (
                    <div
                        key={content.id}
                        className="list-row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `minmax(250px, 2fr) repeat(${properties.length}, minmax(120px, 1fr)) 60px`,
                            gap: 16,
                            padding: '12px 16px',
                            background: 'var(--bg-color)',
                            borderRadius: 8,
                            border: '1px solid var(--border-color)',
                            alignItems: 'center',
                            transition: 'all 0.2s',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                    >
                        {/* Title Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {content.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                                By {content.author?.name}
                            </div>
                        </div>

                        {/* Property Columns */}
                        {properties.map(p => (
                            <div key={p.id} style={{ overflow: 'visible' }}>
                                <EditableCell
                                    contentId={content.id}
                                    propId={p.id}
                                    type={p.type}
                                    optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options}
                                    initialValue={customData[p.id]}
                                />
                            </div>
                        ))}

                        {/* Actions */}
                        <div style={{ textAlign: 'right' }}>
                            <form action={async () => {
                                await deleteContent({ id: content.id });
                            }}>
                                <button type="submit" style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ff4d4f',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    padding: '4px 8px',
                                    borderRadius: 4
                                }}>
                                    ✕
                                </button>
                            </form>
                        </div>
                    </div>
                )
            })}

            {contents.length === 0 && (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                    No content entries found.
                </div>
            )}
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
    switch (type) {
        case 'TEXT': return '≡';
        case 'NUMBER': return '#';
        case 'SELECT': return '▾';
        case 'MULTI_SELECT': return '▤';
        case 'DATE': return '📅';
        case 'PERSON': return '👤';
        case 'CHECKBOX': return '☑';
        case 'URL': return '🔗';
        case 'EMAIL': return '@';
        case 'PHONE': return '📞';
        default: return '○';
    }
}
