'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createContent } from '../../lib/content-actions';
import { Plus, X } from 'lucide-react';
import BadgeDropdown from './BadgeDropdown';
import { createPortal } from 'react-dom';
import MarkdownEditor from './MarkdownEditor';

export default function CreateContentModal({
    properties,
    userOptionsRaw,
    databaseId,
    currentUser
}: {
    properties: any[];
    userOptionsRaw: string;
    databaseId?: string;
    currentUser?: any;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [caption, setCaption] = useState('');
    const [prefillData, setPrefillData] = useState<Record<string, string>>({});
    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        setCaption('');
        setPrefillData({});
    }, []);

    // Listen for global open event
    useEffect(() => {
        const handleOpenEvent = (e: any) => {
            if (e.detail?.prefillData) {
                setPrefillData(e.detail.prefillData);
            }
            setIsOpen(true);
        };
        window.addEventListener('open-create-content-modal', handleOpenEvent);
        return () => window.removeEventListener('open-create-content-modal', handleOpenEvent);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    // Handle click outside
    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if the backdrop itself was clicked, not its children or portal elements bubbling up
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        formData.set('caption', caption);
        try {
            await createContent(formData);
            handleClose();
        } catch (error) {
            console.error("Error creating content:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Auto-resize textarea removed — now using MarkdownEditor

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="btn-primary"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8, fontSize: 13,
                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                    transition: 'all 0.2s',
                    fontWeight: 600
                }}
            >
                <Plus size={16} />
                Add Content
            </button>

            {isOpen && createPortal(
                <div
                    onClick={handleBackdropClick}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 1000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'fadeIn 0.2s ease-out',
                        padding: 20
                    }}
                >
                    <style>{`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes slideUp { from { opacity: 0; transform: translateY(15px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                    `}</style>
                    <div
                        ref={modalRef}
                        className="glass-card"
                        style={{
                            width: '100%', maxWidth: 860,
                            maxHeight: '94vh',
                            background: 'var(--bg-color)',
                            borderRadius: 16,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                            overflow: 'hidden',
                            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            display: 'flex', flexDirection: 'column'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Plus size={16} color="#007aff" />
                                </div>
                                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Create New Content</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleClose}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-secondary)', padding: 4, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Body (Scrollable) */}
                        <div style={{ padding: '24px', overflowY: 'auto' }}>
                            <form id="create-content-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px' }}>
                                    <input
                                        name="title"
                                        placeholder="Enter a descriptive title..."
                                        required
                                        autoFocus
                                        style={{
                                            width: '100%', padding: '16px 20px', fontSize: 24, fontWeight: 700,
                                            border: 'none', borderBottom: '2px solid var(--border-color)', borderRadius: '12px 12px 0 0',
                                            fontFamily: 'inherit', letterSpacing: '-0.02em',
                                            background: 'linear-gradient(to bottom, var(--sidebar-bg), var(--bg-color))',
                                            color: 'var(--text-primary)',
                                            outline: 'none', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                        onFocus={e => { e.currentTarget.style.borderBottomColor = '#007aff'; e.currentTarget.style.background = 'var(--bg-color)'; }}
                                        onBlur={e => { e.currentTarget.style.borderBottomColor = 'var(--border-color)'; e.currentTarget.style.background = 'linear-gradient(to bottom, var(--sidebar-bg), var(--bg-color))'; }}
                                    />
                                </div>

                                {databaseId && <input type="hidden" name="databaseId" value={databaseId} />}

                                {properties.length > 0 && (
                                    <div style={{ padding: '0 20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                            <div style={{ width: 4, height: 16, background: '#007aff', borderRadius: 2 }} />
                                            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
                                                Properties
                                            </h3>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px 24px' }}>
                                            {properties.map(prop => (
                                                <div key={prop.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }} className="property-input-group">
                                                    <style>{`
                                                        .property-input-group:hover .prop-label { color: var(--text-primary); }
                                                        .prop-label { transition: color 0.2s; }
                                                    `}</style>
                                                    <label className="prop-label" style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {prop.name}
                                                    </label>

                                                    {/* Custom Input mapping based on type */}
                                                    {prop.type === 'SELECT' || prop.type === 'STATUS' ? (
                                                        <BadgeDropdown
                                                            optionsRaw={prop.options}
                                                            name={`prop_${prop.id}`}
                                                            multiple={false}
                                                            placeholder="-- Set --"
                                                            propertyId={prop.id}
                                                            colorConfigRaw={(prop as any).colorConfig}
                                                        />
                                                    ) : prop.type === 'PERSON' ? (
                                                        <BadgeDropdown
                                                            optionsRaw={userOptionsRaw}
                                                            name={`prop_${prop.id}`}
                                                            multiple={false}
                                                            initialValues={currentUser?.role === 'STAFF' ? [currentUser.id] : (prefillData[`prop_${prop.id}`] ? [prefillData[`prop_${prop.id}`]] : [])}
                                                            disabled={currentUser?.role === 'STAFF'}
                                                            placeholder="-- Select Member --"
                                                            propertyId={prop.id}
                                                            colorConfigRaw={(prop as any).colorConfig}
                                                        />
                                                    ) : prop.type === 'MULTI_SELECT' ? (
                                                        <BadgeDropdown
                                                            optionsRaw={prop.options}
                                                            name={`prop_${prop.id}`}
                                                            multiple={true}
                                                            propertyId={prop.id}
                                                            colorConfigRaw={(prop as any).colorConfig}
                                                        />
                                                    ) : prop.type === 'DATE' ? (
                                                        <input type="date" name={`prop_${prop.id}`} defaultValue={prefillData[`prop_${prop.id}`] || ''} style={inputStyle} />
                                                    ) : prop.type === 'NUMBER' || prop.type === 'CURRENCY' || prop.type === 'PERCENT' ? (
                                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                                            {prop.type === 'CURRENCY' && <span style={{ position: 'absolute', left: 12, color: 'var(--text-secondary)', fontSize: 13 }}>$</span>}
                                                            <input type="number" name={`prop_${prop.id}`} placeholder="0" defaultValue={prefillData[`prop_${prop.id}`] || ''} style={{ ...inputStyle, paddingLeft: prop.type === 'CURRENCY' ? 24 : 14, paddingRight: prop.type === 'PERCENT' ? 24 : 14 }} />
                                                            {prop.type === 'PERCENT' && <span style={{ position: 'absolute', right: 12, color: 'var(--text-secondary)', fontSize: 13 }}>%</span>}
                                                        </div>
                                                    ) : prop.type === 'CHECKBOX' ? (
                                                        <div style={{ height: '38px', display: 'flex', alignItems: 'center', padding: '0 12px', background: 'var(--input-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                            <input type="checkbox" name={`prop_${prop.id}`} value="true" defaultChecked={prefillData[`prop_${prop.id}`] === 'true'} style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#007aff' }} />
                                                        </div>
                                                    ) : (
                                                        <input type="text" name={`prop_${prop.id}`} placeholder={`Enter ${prop.name}`} defaultValue={prefillData[`prop_${prop.id}`] || ''} style={inputStyle} />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Content / Caption (Moved to bottom) ── */}
                                <div style={{ display: 'flex', flexDirection: 'column', padding: '0 20px 20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, marginTop: properties.length > 0 ? 12 : 0 }}>
                                        <div style={{ width: 4, height: 16, background: '#007aff', borderRadius: 2 }} />
                                        <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
                                            Content Details
                                        </h3>
                                    </div>
                                    <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                        <MarkdownEditor
                                            value={caption}
                                            onChange={setCaption}
                                        />
                                    </div>
                                </div>
                            </form>
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '16px 24px', background: 'var(--sidebar-bg)',
                            borderTop: '1px solid var(--border-color)',
                            display: 'flex', justifyContent: 'flex-end', gap: 12
                        }}>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                disabled={isSubmitting}
                                style={{
                                    padding: '8px 16px', fontSize: 13, fontWeight: 600,
                                    background: 'transparent', border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)', borderRadius: 8, cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                form="create-content-form"
                                className="btn-primary"
                                disabled={isSubmitting}
                                style={{
                                    padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8,
                                    boxShadow: '0 4px 12px rgba(0, 122, 255, 0.4)',
                                    opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSubmitting ? 'Creating...' : 'Create Content'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

const inputStyle = {
    padding: '10px 14px',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
};
