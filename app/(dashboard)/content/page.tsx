import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import { createContent } from '../../../lib/content-actions';
import MultiSelectBadgeDropdown from './MultiSelectBadgeDropdown';
import ContentViewer from './ContentViewer';
import ImportExportPanel from './ImportExportPanel';

const prisma = new PrismaClient();

export default async function ContentPage() {
    await requireAuth();

    const contents = await prisma.content.findMany({
        select: {
            id: true,
            title: true,
            caption: true,
            mediaUrl: true,
            customFields: true,
            authorId: true,
            createdAt: true,
            updatedAt: true,
            author: true,
            tasks: {
                include: { assignee: { select: { name: true } } }
            }
        },
        orderBy: { createdAt: 'desc' },
    });

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { createdAt: 'asc' }
    });

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    // Map users to a format suitable for our dropdowns
    const userOptionsRaw = JSON.stringify(users.map(u => u.name));

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 40px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Content Management</h1>
                <ImportExportPanel />
            </div>

            <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
                <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Create New Content</h3>
                <form action={createContent} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <input
                            name="title"
                            placeholder="Content Title..."
                            required
                            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-color)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    {/* Dynamic Properties rendered as inputs inline */}
                    {properties.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                            {properties.map(prop => (
                                <div key={prop.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{prop.name}</label>

                                    {/* Custom Input mapping based on type */}
                                    {prop.type === 'SELECT' || prop.type === 'STATUS' ? (
                                        <select name={`prop_${prop.id}`} style={inputStyle}>
                                            <option value="">-- Set --</option>
                                            {prop.options ? JSON.parse(prop.options).map((opt: string) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            )) : null}
                                        </select>
                                    ) : prop.type === 'PERSON' ? (
                                        <select name={`prop_${prop.id}`} style={inputStyle}>
                                            <option value="">-- Select Member --</option>
                                            {JSON.parse(userOptionsRaw).map((opt: string) => (
                                                <option key={opt} value={opt}>{opt}</option>
                                            ))}
                                        </select>
                                    ) : prop.type === 'MULTI_SELECT' ? (
                                        <MultiSelectBadgeDropdown
                                            optionsRaw={prop.options}
                                            name={`prop_${prop.id}`}
                                        />
                                    ) : prop.type === 'DATE' ? (
                                        <input type="date" name={`prop_${prop.id}`} style={inputStyle} />
                                    ) : prop.type === 'NUMBER' ? (
                                        <input type="number" name={`prop_${prop.id}`} placeholder="0" style={inputStyle} />
                                    ) : prop.type === 'CHECKBOX' ? (
                                        <input type="checkbox" name={`prop_${prop.id}`} value="true" style={{ marginTop: 8 }} />
                                    ) : (
                                        <input type="text" name={`prop_${prop.id}`} placeholder={`Enter ${prop.name}`} style={inputStyle} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="submit" className="btn-primary">Add Row</button>
                    </div>
                </form>
            </div>

            <ContentViewer
                contents={contents}
                properties={properties}
                userOptionsRaw={userOptionsRaw}
            />

        </div>
    );
}

const inputStyle = {
    padding: '6px 10px',
    border: '1px solid var(--border-color)',
    borderRadius: 4,
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontSize: 13
};
