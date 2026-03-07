'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X, Type, Hash, DollarSign, Percent, ChevronDown, Layers, Calendar, User, CheckSquare, Link as LinkIcon, AtSign, Phone, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { createPropertyDefinition } from '../../lib/property-actions';

const PROPERTY_TYPES = [
    { value: 'TEXT', label: 'Text', icon: <Type size={16} /> },
    { value: 'NUMBER', label: 'Number', icon: <Hash size={16} /> },
    { value: 'CURRENCY', label: 'Currency', icon: <DollarSign size={16} /> },
    { value: 'PERCENT', label: 'Percent', icon: <Percent size={16} /> },
    { value: 'SELECT', label: 'Select', icon: <ChevronDown size={16} /> },
    { value: 'MULTI_SELECT', label: 'Multi-select', icon: <Layers size={16} /> },
    { value: 'DATE', label: 'Date', icon: <Calendar size={16} /> },
    { value: 'PERSON', label: 'Person', icon: <User size={16} /> },
    { value: 'CHECKBOX', label: 'Checkbox', icon: <CheckSquare size={16} /> },
    { value: 'URL', label: 'URL', icon: <LinkIcon size={16} /> },
    { value: 'EMAIL', label: 'Email', icon: <AtSign size={16} /> },
    { value: 'PHONE', label: 'Phone', icon: <Phone size={16} /> },
    { value: 'STATUS', label: 'Status', icon: <AlertCircle size={16} /> },
];

export default function CreatePropertyModal({
    databaseId,
    onClose,
    isOpen: externalIsOpen,
    children
}: {
    databaseId: string;
    onClose?: () => void;
    isOpen?: boolean;
    children?: React.ReactNode;
}) {
    const [localIsOpen, setLocalIsOpen] = useState(false);
    const isOpen = externalIsOpen !== undefined ? externalIsOpen : localIsOpen;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [name, setName] = useState('');
    const [type, setType] = useState('TEXT');
    const [options, setOptions] = useState('');

    const modalRef = useRef<HTMLDivElement>(null);

    const handleOpen = () => setLocalIsOpen(true);
    const handleClose = useCallback(() => {
        if (onClose) onClose();
        setLocalIsOpen(false);
        setName('');
        setType('TEXT');
        setOptions('');
    }, [onClose]);

    // Close on escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleClose]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) handleClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('name', name);
        formData.append('type', type);
        formData.append('options', options);
        formData.append('databaseId', databaseId);

        try {
            await createPropertyDefinition(formData);
            handleClose();
        } catch (error) {
            console.error("Error creating property:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const needsOptions = ['SELECT', 'MULTI_SELECT', 'STATUS'].includes(type);

    const modalContent = (
        <div
            onClick={handleBackdropClick}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(4px)',
                zIndex: 2000,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out',
                padding: 20
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .prop-type-item {
                    display: flex; gap: 10px; align-items: center; padding: 10px 12px;
                    border-radius: 8px; cursor: pointer; transition: all 0.2s;
                    border: 1px solid var(--border-color); background: var(--bg-color);
                    font-size: 13px; font-weight: 500;
                }
                .prop-type-item:hover { background: var(--bg-hover); border-color: var(--accent-color, #007aff); }
                .prop-type-item.selected { border-color: #007aff; background: rgba(0,122,255,0.05); color: #007aff; }
            `}</style>
            <div
                ref={modalRef}
                className="glass-card"
                style={{
                    width: '100%', maxWidth: 480,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Plus size={16} color="#007aff" />
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>New Property</h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        style={{
                            background: 'transparent', border: 'none', cursor: 'pointer',
                            color: 'var(--text-secondary)', padding: 4, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Property Name</label>
                        <input
                            placeholder="e.g. Priority, Stage, Platform"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                            autoFocus
                            style={{
                                width: '100%', padding: '10px 14px', fontSize: 15,
                                border: '1px solid var(--border-color)', borderRadius: 8,
                                background: 'var(--input-bg)', color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, maxHeight: 200, overflowY: 'auto', padding: 2 }}>
                            {PROPERTY_TYPES.map(t => (
                                <div
                                    key={t.value}
                                    className={`prop-type-item ${type === t.value ? 'selected' : ''}`}
                                    onClick={() => setType(t.value)}
                                >
                                    <span style={{ opacity: type === t.value ? 1 : 0.6 }}>{t.icon}</span>
                                    {t.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {needsOptions && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Options</label>
                            <textarea
                                placeholder="Comma separated values (e.g. High, Medium, Low)"
                                value={options}
                                onChange={e => setOptions(e.target.value)}
                                required
                                style={{
                                    width: '100%', padding: '10px 14px', fontSize: 14,
                                    border: '1px solid var(--border-color)', borderRadius: 8,
                                    background: 'var(--input-bg)', color: 'var(--text-primary)',
                                    minHeight: 80, outline: 'none', resize: 'vertical'
                                }}
                            />
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            style={{
                                padding: '10px 16px', fontSize: 14, fontWeight: 600,
                                background: 'transparent', border: '1px solid var(--border-color)',
                                borderRadius: 8, cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="btn-primary"
                            style={{
                                padding: '10px 24px', fontSize: 14, fontWeight: 600, borderRadius: 8,
                                opacity: isSubmitting || !name.trim() ? 0.6 : 1,
                                cursor: isSubmitting || !name.trim() ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isSubmitting ? 'Creating...' : 'Create Property'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    // If used within another component that controls visibility, externalIsOpen is passed.
    // If used as a standalone trigger button, localIsOpen is used.
    if (externalIsOpen !== undefined) {
        return isOpen ? createPortal(modalContent, document.body) : null;
    }

    return (
        <>
            {children ? (
                <div onClick={handleOpen} style={{ width: '100%' }}>
                    {children}
                </div>
            ) : (
                <button
                    onClick={handleOpen}
                    style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 8, borderRadius: 6, color: 'var(--text-secondary)',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <Plus size={18} />
                </button>
            )}
            {isOpen && createPortal(modalContent, document.body)}
        </>
    );
}
