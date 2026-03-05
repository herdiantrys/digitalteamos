'use client';

import { useState, useTransition, useRef } from 'react';
import { updateProfile } from './actions';
import { User, Camera, Mail, FileText, Loader2, CheckCircle2, UploadCloud } from 'lucide-react';

export default function ProfilePage({ user }: { user: any }) {
    const [isPending, startTransition] = useTransition();
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [formState, setFormState] = useState({
        email: user.email || '',
        bio: user.bio || '',
        photoUrl: user.photo || ''
    });

    const handleFileChange = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        if (file.size > 4 * 1024 * 1024) {
            setError('Image is too large (Maximum 4MB)');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setFormState(prev => ({ ...prev, photoUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileChange(file);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        const formData = new FormData();
        formData.append('email', formState.email);
        formData.append('bio', formState.bio);
        formData.append('photoUrl', formState.photoUrl);

        startTransition(async () => {
            try {
                await updateProfile(formData);
                setSuccessMessage('Profile updated successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
            } catch (err: any) {
                setError(err.message || 'Failed to update profile');
            }
        });
    };

    return (
        <div className="page-container fade-in" style={{ padding: '24px 40px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: 32 }}>Your Profile</h1>

            <div className="glass-card" style={{ padding: '32px' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Interactive Avatar Upload Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginBottom: '8px' }}>
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                position: 'relative',
                                width: 120, height: 120, borderRadius: '50%',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                border: isDragging ? '2px dashed var(--accent-color)' : '2px solid transparent',
                                transition: 'all 0.3s ease',
                                transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                            }}
                            className={isPending ? 'pulse-animation' : ''}
                        >
                            <div style={{
                                width: '100%', height: '100%',
                                background: formState.photoUrl ? `url(${formState.photoUrl}) center/cover` : 'linear-gradient(135deg, var(--accent-color), var(--accent-hover))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: 40, fontWeight: 'bold'
                            }}>
                                {!formState.photoUrl && (user.name ? user.name.charAt(0).toUpperCase() : <User size={48} />)}
                            </div>

                            {/* Hover Overlay */}
                            <div className="avatar-overlay" style={{
                                position: 'absolute', inset: 0,
                                background: 'rgba(0,0,0,0.4)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                color: 'white', opacity: 0, transition: 'opacity 0.2s ease', gap: '4px'
                            }}>
                                <Camera size={24} />
                                <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Change Photo</span>
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: 'var(--text-primary)' }}>{user.name}</h2>
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                                Click or drag an image onto the circle to update your profile picture.
                            </p>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>
                    </div>

                    <style jsx>{`
                        .avatar-overlay:hover {
                            opacity: 1 !important;
                        }
                        div[onClick]:hover .avatar-overlay {
                            opacity: 1;
                        }
                        @keyframes pulse {
                            0% { transform: scale(1); opacity: 1; }
                            50% { transform: scale(0.98); opacity: 0.8; }
                            100% { transform: scale(1); opacity: 1; }
                        }
                        .pulse-animation {
                            animation: pulse 1.5s infinite ease-in-out;
                        }
                    `}</style>

                    {successMessage && (
                        <div className="fade-in" style={{ padding: '12px 16px', background: 'rgba(82, 196, 26, 0.1)', color: '#52c41a', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: 14 }}>
                            <CheckCircle2 size={18} /> {successMessage}
                        </div>
                    )}
                    {error && (
                        <div className="fade-in" style={{ padding: '12px 16px', background: 'rgba(255, 77, 79, 0.1)', color: '#ff4d4f', borderRadius: '8px', fontSize: 14 }}>
                            {error}
                        </div>
                    )}

                    {/* Email Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mail size={16} color="var(--text-secondary)" /> Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={formState.email}
                            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                            className="premium-input"
                            style={{
                                padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)', outline: 'none', fontSize: 14,
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    {/* Bio Input */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileText size={16} color="var(--text-secondary)" /> Short Biography
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Tell your team a little about yourself..."
                            value={formState.bio}
                            onChange={(e) => setFormState({ ...formState, bio: e.target.value })}
                            style={{
                                padding: '10px 14px', borderRadius: '8px',
                                border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-primary)', outline: 'none', fontSize: 14, resize: 'vertical',
                                transition: 'all 0.2s ease'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px', fontSize: 14, fontWeight: 500 }}
                        >
                            {isPending ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                            {isPending ? 'Syncing...' : 'Save Changes'}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
