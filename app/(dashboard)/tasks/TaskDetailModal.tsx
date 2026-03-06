'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Link as LinkIcon, User as UserIcon, Edit2, Check, Clock } from 'lucide-react';
import { updateTask } from '../../../lib/task-actions';
import MarkdownEditor from '../../../components/content-management/MarkdownEditor';

type User = { id: string; name: string; photo: string | null };
type Relation = { id: string; title: string; database: { name: string; icon: string | null } | null };

export default function TaskDetailModal({
    task: initialTask,
    onClose,
    users,
    relations,
    currentUser,
    onUpdate
}: {
    task: any;
    onClose: () => void;
    users: User[];
    relations: Relation[];
    currentUser: any;
    onUpdate?: (updatedTask: any) => void;
}) {
    const [task, setTask] = useState(initialTask);
    const [isSaving, startTransition] = useTransition();
    const canEdit = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;

    const updateTaskOnServer = (updatedTask: any) => {
        const formData = new FormData();
        formData.append('title', updatedTask.title);
        formData.append('status', updatedTask.status);
        formData.append('priority', updatedTask.priority);
        formData.append('content', updatedTask.content || '');
        if (updatedTask.assigneeId) formData.append('assigneeId', updatedTask.assigneeId);
        if (updatedTask.relatedItemId) formData.append('relatedItemId', updatedTask.relatedItemId);
        if (updatedTask.dueDate) {
            const date = new Date(updatedTask.dueDate);
            if (!isNaN(date.getTime())) {
                formData.append('dueDate', date.toISOString().split('T')[0]);
            }
        }

        startTransition(async () => {
            try {
                await updateTask(task.id, formData);
                if (onUpdate) onUpdate(updatedTask);
            } catch (err: any) {
                console.error("Auto-save failed", err);
            }
        });
    };

    const handleFieldChange = (key: string, value: any) => {
        if (!canEdit) return;
        const updatedTask = { ...task, [key]: value };
        setTask(updatedTask);
        updateTaskOnServer(updatedTask);
    };

    return (
        <div
            className="fade-in"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', justifyContent: 'flex-end',
                zIndex: 1000, backdropFilter: 'blur(4px)',
                pointerEvents: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                .detail-panel {
                    animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    width: 100%;
                    max-width: 800px;
                    height: 100%;
                    background: var(--bg-color);
                    box-shadow: -10px 0 40px rgba(0,0,0,0.2);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 16px;
                    padding: 24px 32px;
                    background: rgba(0,0,0,0.01);
                    border-bottom: 1px solid var(--border-color);
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    position: relative;
                }
                .info-label {
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .info-value {
                    font-size: 13px;
                    color: var(--text-primary);
                }
                .editable-input {
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    padding: 4px 8px;
                    margin-left: -8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                    width: 100%;
                    outline: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .editable-input:hover {
                    background: var(--hover-bg);
                }
                .editable-input:focus {
                    background: var(--bg-color);
                    border-color: var(--border-color);
                    box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
                    cursor: text;
                }
                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 4px 8px;
                    margin-left: -8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                    width: fit-content;
                    font-size: 13px;
                    font-weight: 600;
                    border: 1px solid transparent;
                }
                .custom-select-trigger:hover {
                    background: var(--hover-bg);
                }
                .property-select {
                    appearance: none;
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 6px;
                    padding: 4px 8px;
                    margin-left: -8px;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-primary);
                    width: 100%;
                    outline: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .property-select:hover {
                    background: var(--hover-bg);
                }
                .property-select:focus {
                    background: var(--bg-color);
                    border-color: var(--border-color);
                }
            `}</style>

            <div className="detail-panel">
                {/* Header */}
                <div style={{
                    padding: '16px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    minHeight: 64
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={onClose} style={{
                            background: 'var(--hover-bg)', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><X size={18} /></button>
                        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Task Detail
                        </h2>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>
                            {isSaving ?
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                                    <Clock size={12} className="spin" /> SAVING...
                                </span> :
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#27ae60' }}>
                                    <Check size={12} /> SAVED
                                </span>
                            }
                        </div>
                    </div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Title Section */}
                    <div style={{ padding: '32px 32px 16px' }}>
                        <textarea
                            value={task.title}
                            onChange={(e) => {
                                setTask((prev: any) => ({ ...prev, title: e.target.value }));
                                e.target.style.height = 'auto';
                                e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            onBlur={(e) => handleFieldChange('title', e.target.value)}
                            disabled={!canEdit}
                            rows={1}
                            style={{
                                fontSize: 32,
                                fontWeight: 800,
                                margin: 0,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.02em',
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                padding: '4px 0',
                                transition: 'all 0.2s',
                                resize: 'none'
                            }}
                            placeholder="Untiled Task"
                        />
                    </div>

                    {/* Metadata Grid */}
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Status</span>
                            <div className="info-value">
                                <StatusSelector
                                    value={task.status}
                                    onChange={(val) => handleFieldChange('status', val)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Priority</span>
                            <div className="info-value">
                                <PrioritySelector
                                    value={task.priority}
                                    onChange={(val) => handleFieldChange('priority', val)}
                                    disabled={!canEdit}
                                />
                            </div>
                        </div>
                        <div className="info-item">
                            <span className="info-label"><UserIcon size={12} /> Assignee</span>
                            <div className="info-value">
                                <select
                                    className="property-select"
                                    value={task.assigneeId || ''}
                                    onChange={(e) => handleFieldChange('assigneeId', e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="">Unassigned</option>
                                    {users.map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="info-item">
                            <span className="info-label"><CalendarIcon size={12} /> Due Date</span>
                            <div className="info-value">
                                <input
                                    type="date"
                                    className="editable-input"
                                    value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                    disabled={!canEdit}
                                    style={{ color: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? '#ff4d4f' : 'inherit' }}
                                />
                            </div>
                        </div>
                        <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                            <span className="info-label"><LinkIcon size={12} /> Related Item</span>
                            <div className="info-value">
                                <select
                                    className="property-select"
                                    value={task.relatedItemId || ''}
                                    onChange={(e) => handleFieldChange('relatedItemId', e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="">No Relation</option>
                                    {relations.map(r => (
                                        <option key={r.id} value={r.id}>
                                            {r.database?.icon || '📄'} {r.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Unified Editor Section */}
                    <div style={{ padding: '32px' }}>
                        <div style={{ marginBottom: 16 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: 4 }}>Content</span>
                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>Write detailed instructions, notes, or documentation for this task.</p>
                        </div>

                        <div style={{ opacity: canEdit ? 1 : 0.8, pointerEvents: canEdit ? 'auto' : 'none' }}>
                            <MarkdownEditor
                                value={task.content || ''}
                                onChange={(newContent) => handleFieldChange('content', newContent)}
                                contentTitle={task.title}
                                isSaving={isSaving}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatusSelector({ value, onChange, disabled }: { value: string, onChange: (val: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { id: 'TODO', label: 'To Do', color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' },
        { id: 'IN_PROGRESS', label: 'In Progress', color: '#3498db', bg: 'rgba(52, 152, 219, 0.15)' },
        { id: 'DONE', label: 'Done', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)' },
    ];

    const current = options.find(o => o.id === value) || options[0];

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="custom-select-trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{ background: current.bg, color: current.color, opacity: disabled ? 0.7 : 1 }}
            >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: current.color }} />
                {current.label}
            </div>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute', top: '100%', left: -8, marginTop: 4,
                    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                    borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    zIndex: 10, minWidth: 160, padding: 6
                }}>
                    {options.map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            style={{
                                padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
                                background: value === opt.id ? 'var(--hover-bg)' : 'transparent',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = value === opt.id ? 'var(--hover-bg)' : 'transparent'}
                        >
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                            <span style={{ fontWeight: value === opt.id ? 700 : 500, color: opt.color }}>{opt.label}</span>
                            {value === opt.id && <Check size={14} style={{ marginLeft: 'auto', color: opt.color }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function PrioritySelector({ value, onChange, disabled }: { value: string, onChange: (val: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { id: 'LOW', label: 'Low', color: 'var(--text-secondary)', bg: 'rgba(255, 255, 255, 0.05)' },
        { id: 'MEDIUM', label: 'Medium', color: '#f1c40f', bg: 'rgba(241, 196, 15, 0.15)' },
        { id: 'HIGH', label: 'High', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.15)' },
    ];

    const current = options.find(o => o.id === value) || options[0];

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="custom-select-trigger"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{ background: current.bg, color: current.color, opacity: disabled ? 0.7 : 1 }}
            >
                {current.label}
            </div>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute', top: '100%', left: -8, marginTop: 4,
                    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
                    borderRadius: 10, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                    zIndex: 10, minWidth: 140, padding: 6
                }}>
                    {options.map(opt => (
                        <div
                            key={opt.id}
                            onClick={() => { onChange(opt.id); setIsOpen(false); }}
                            style={{
                                padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
                                background: value === opt.id ? 'var(--hover-bg)' : 'transparent',
                                transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                            onMouseLeave={e => e.currentTarget.style.background = value === opt.id ? 'var(--hover-bg)' : 'transparent'}
                        >
                            <span style={{ fontWeight: 800, color: opt.color, fontSize: 10 }}>{opt.id}</span>
                            <span style={{ fontWeight: value === opt.id ? 700 : 500, color: 'var(--text-primary)' }}>{opt.label}</span>
                            {value === opt.id && <Check size={14} style={{ marginLeft: 'auto', color: '#007aff' }} />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
