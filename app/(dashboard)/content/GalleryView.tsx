'use client';

import { useRouter } from 'next/navigation';
import EditableCell from './EditableCell';
import { deleteContent } from '../../../lib/content-actions';

export default function GalleryView({
    contents,
    properties,
    userOptionsRaw
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    const router = useRouter();
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
            minHeight: 400
        }}>
            {contents.map(content => {
                const customData = content.customFields ? JSON.parse(content.customFields) : {};

                return (
                    <div
                        key={content.id}
                        className="gallery-card"
                        style={{
                            background: 'var(--bg-color)',
                            borderRadius: 12,
                            border: '1px solid var(--border-color)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'default'
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
                            position: 'relative'
                        }}>
                            <form action={async () => {
                                await deleteContent({ id: content.id });
                            }} style={{ position: 'absolute', top: 8, right: 8 }}>
                                <button type="submit" style={{
                                    background: 'rgba(255,77,79,0.1)',
                                    border: '1px solid rgba(255,77,79,0.2)',
                                    color: '#ff4d4f',
                                    cursor: 'pointer',
                                    fontSize: 10,
                                    width: 24,
                                    height: 24,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    ✕
                                </button>
                            </form>
                        </div>

                        {/* Card Body */}
                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <h3
                                    onClick={() => router.push(`/content/${content.id}`)}
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
                                {properties.map(p => (
                                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 11 }}>
                                            <span>{getTypeIcon(p.type)}</span>
                                            {p.name}
                                        </div>
                                        <div style={{ padding: '0 4px', background: 'rgba(0,0,0,0.1)', borderRadius: 4 }}>
                                            <EditableCell
                                                contentId={content.id}
                                                propId={p.id}
                                                type={p.type}
                                                optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options}
                                                initialValue={customData[p.id]}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            })}

            {contents.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                    No content entries found.
                </div>
            )}
        </div>
    );
}

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
