'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EditableCell from './EditableCell';

export default function BoardView({
    contents,
    properties,
    userOptionsRaw
}: {
    contents: any[];
    properties: any[];
    userOptionsRaw: string;
}) {
    const router = useRouter();
    // We need to pick a property to group by. Let's look for STATUS first, then SELECT.
    const groupableProps = properties.filter(p => p.type === 'STATUS' || p.type === 'SELECT');

    const [groupByPropId, setGroupByPropId] = useState<string | null>(
        groupableProps.length > 0 ? groupableProps[0].id : null
    );

    if (groupableProps.length === 0) {
        return (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', borderRadius: 8 }}>
                No Select properties available for Board Grouping.
                <br />
                <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>Create a property of type SELECT in Team Settings first.</span>
            </div>
        );
    }

    const activeProp = properties.find(p => p.id === groupByPropId);
    if (!activeProp) return null;

    const options = activeProp.options ? JSON.parse(activeProp.options) : [];

    // Create columns: one for each option, plus an 'Uncategorized' column
    const columns: Record<string, any[]> = { 'Uncategorized': [] };
    options.forEach((opt: string) => columns[opt] = []);

    contents.forEach(content => {
        const customData = content.customFields ? JSON.parse(content.customFields) : {};
        const val = customData[activeProp.id];
        if (val && columns[val]) {
            columns[val].push(content);
        } else {
            columns['Uncategorized'].push(content);
        }
    });

    return (
        <div>
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Group by:</span>
                <select
                    value={groupByPropId || ''}
                    onChange={(e) => setGroupByPropId(e.target.value)}
                    style={{
                        padding: '4px 8px',
                        border: '1px solid var(--border-color)',
                        borderRadius: 4,
                        background: 'var(--bg-color)',
                        color: 'var(--text-primary)',
                        fontSize: 13
                    }}
                >
                    {groupableProps.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

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
                                {colItems.map((item: any) => (
                                    <div key={item.id} style={{
                                        background: 'var(--bg-color)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: 6,
                                        padding: 12,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}>
                                        <h5
                                            onClick={() => router.push(`/content/${item.id}`)}
                                            style={{ margin: 0, fontSize: 14, marginBottom: 8, cursor: 'pointer', color: 'var(--text-primary)', transition: 'color 0.1s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#1890ff'}
                                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                                        >
                                            {item.title}
                                        </h5>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                                            {properties.filter(p => p.id !== activeProp.id).slice(0, 3).map(p => {
                                                const cd = item.customFields ? JSON.parse(item.customFields) : {};
                                                return (
                                                    <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{p.name}</span>
                                                        <div style={{ padding: '0 4px' }}>
                                                            <EditableCell
                                                                contentId={item.id}
                                                                propId={p.id}
                                                                type={p.type}
                                                                optionsRaw={p.type === 'PERSON' ? userOptionsRaw : p.options}
                                                                initialValue={cd[p.id]}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
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
        </div>
    );
}
