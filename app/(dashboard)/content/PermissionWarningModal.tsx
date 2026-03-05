'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface PermissionWarningModalProps {
    isOpen: boolean;
    onClose: () => void;
    message?: string;
}

export default function PermissionWarningModal({
    isOpen,
    onClose,
    message = 'Peringatan: Anda tidak bisa menghapus data orang lain.'
}: PermissionWarningModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Document overflow handled by parent if needed, but we can do it here too
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => {
                document.body.style.overflow = 'auto';
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999, // Extremely high z-index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            pointerEvents: isVisible ? 'auto' : 'none',
            transition: 'all 0.3s ease'
        }}>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)', // Slightly darker
                    backdropFilter: 'blur(10px)', // Slightly stronger blur
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    cursor: 'pointer'
                }}
            />

            {/* Modal Content */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: 400,
                background: '#fff',
                borderRadius: 24,
                padding: '32px 24px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'rgba(255, 77, 79, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ff4d4f',
                    marginBottom: 20
                }}>
                    <AlertTriangle size={32} />
                </div>

                <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#333',
                    letterSpacing: '-0.02em'
                }}>
                    Akses Dibatasi
                </h3>

                <p style={{
                    margin: 0,
                    fontSize: 15,
                    lineHeight: 1.6,
                    color: '#666',
                    marginBottom: 32
                }}>
                    {message}
                </p>

                <button
                    onClick={onClose}
                    style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: 14,
                        background: '#1a1a1a', // Darker button
                        color: '#fff',
                        border: 'none',
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = '#000';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = '#1a1a1a';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                >
                    Saya Mengerti
                </button>

                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 16,
                        right: 16,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#999',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <X size={18} />
                </button>
            </div>
        </div>,
        document.body
    );
}
