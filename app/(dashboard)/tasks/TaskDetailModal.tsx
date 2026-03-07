'use client';

import { useState, useTransition, useEffect, useRef } from 'react';
import { X, Calendar as CalendarIcon, Link as LinkIcon, User as UserIcon, Check, Clock, Trash2, ArrowRight, Circle, CheckCircle2, AlertCircle, Type, FileText } from 'lucide-react';
import { updateTask, deleteTask } from '../../../lib/task-actions';
import MarkdownEditor from '../../../components/content-management/MarkdownEditor';
import RelationSelector from './RelationSelector';
import BadgeDropdown from '../../../components/content-management/BadgeDropdown';

type User = { id: string; name: string; photo: string | null };
type Relation = { id: string; title: string; database: { name: string; icon: string | null; iconColor?: string | null } | null };

export default function TaskDetailModal({
    task: initialTask,
    onClose,
    users,
    relations,
    currentUser,
    onUpdate,
    onDelete
}: {
    task: any;
    onClose: () => void;
    users: User[];
    relations: Relation[];
    currentUser: any;
    onUpdate?: (updatedTask: any) => void;
    onDelete?: (taskId: string) => void;
}) {
    const [task, setTask] = useState({
        ...initialTask,
        assigneeIds: initialTask.assignees?.map((a: any) => a.id) || [],
        relatedItemIds: initialTask.relatedItems?.map((r: any) => r.id) || []
    });
    const [isSaving, startTransition] = useTransition();
    const canEdit = currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id);

    const handleVisitRelation = (item: any) => {
        if (item.databaseId) {
            window.open(`/databases/${item.databaseId}?open=${item.id}`, '_blank');
        }
    };

    const updateTaskOnServer = (updatedTask: any) => {
        const formData = new FormData();
        formData.append('title', updatedTask.title);
        formData.append('status', updatedTask.status);
        formData.append('priority', updatedTask.priority);
        formData.append('content', updatedTask.content || '');
        if (updatedTask.assigneeIds) formData.append('assigneeIds', JSON.stringify(updatedTask.assigneeIds));
        if (updatedTask.relatedItemIds) formData.append('relatedItemIds', JSON.stringify(updatedTask.relatedItemIds));
        if (updatedTask.startDate) {
            const date = new Date(updatedTask.startDate);
            if (!isNaN(date.getTime())) {
                formData.append('startDate', date.toISOString().split('T')[0]);
            }
        }
        if (updatedTask.dueDate) {
            const date = new Date(updatedTask.dueDate);
            if (!isNaN(date.getTime())) {
                formData.append('dueDate', date.toISOString().split('T')[0]);
            }
        }

        startTransition(async () => {
            try {
                await updateTask(task.id, formData);
                if (onUpdate) {
                    const assignees = updatedTask.assigneeIds
                        ? users.filter((u: User) => updatedTask.assigneeIds.includes(u.id))
                        : [];
                    const relatedItems = updatedTask.relatedItemIds
                        ? relations.filter((r: Relation) => updatedTask.relatedItemIds.includes(r.id))
                        : task.relatedItems || [];
                    onUpdate({ ...updatedTask, assignees, relatedItems });
                }
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

    const handleDelete = async () => {
        if (!canEdit) return;
        if (!confirm('Are you sure you want to delete this task?')) return;

        startTransition(async () => {
            try {
                await deleteTask(task.id);
                if (onDelete) onDelete(task.id);
                onClose();
            } catch (err: any) {
                alert(err.message || "Failed to delete task");
            }
        });
    };

    return (
        <div
            className="fade-in"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', justifyContent: 'flex-end',
                zIndex: 1000, backdropFilter: 'blur(8px)',
                pointerEvents: 'auto'
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes slideInRight {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
                .detail-panel {
                    animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                    width: 100%;
                    max-width: 840px;
                    height: 100%;
                    background: var(--bg-color);
                    box-shadow: -20px 0 60px rgba(0,0,0,0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    border-left: 1px solid rgba(150, 150, 150, 0.15);
                }
                .property-card {
                    background: rgba(150, 150, 150, 0.03);
                    border: 1px solid rgba(150, 150, 150, 0.1);
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    transition: all 0.2s;
                }
                .property-card:hover {
                    border-color: rgba(150, 150, 150, 0.2);
                    background: rgba(150, 150, 150, 0.05);
                }
                .property-card-label {
                    font-size: 11px;
                    font-weight: 800;
                    color: var(--text-secondary);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .editable-input {
                    background: transparent;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    padding: 6px 10px;
                    margin-left: -10px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    width: 100%;
                    outline: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .editable-input:hover:not(:disabled) {
                    background: rgba(150, 150, 150, 0.1);
                }
                .editable-input:focus {
                    background: var(--bg-color);
                    border-color: #007aff;
                    box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
                    cursor: text;
                }
                .custom-select-trigger {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 6px 12px;
                    margin-left: -12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    width: fit-content;
                    font-size: 14px;
                    font-weight: 600;
                    border: 1px solid transparent;
                }
                .custom-select-trigger:hover:not(.disabled) {
                    background: rgba(150, 150, 150, 0.1);
                }
                .property-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 10px center;
                    background-size: 14px;
                    border: 1px solid transparent;
                    border-radius: 8px;
                    padding: 6px 32px 6px 10px;
                    margin-left: -10px;
                    font-size: 14px;
                    font-weight: 600;
                    color: var(--text-primary);
                    width: 100%;
                    outline: none;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .property-select:hover:not(:disabled) {
                    background-color: rgba(150, 150, 150, 0.1);
                }
                .property-select:focus {
                    background-color: var(--bg-color);
                    border-color: #007aff;
                    box-shadow: 0 0 0 3px rgba(0,122,255,0.1);
                }
                .date-toggle {
                    font-size: 10px;
                    font-weight: 800;
                    padding: 4px 10px;
                    border-radius: 12px;
                    background: var(--hover-bg);
                    color: var(--text-secondary);
                    border: 1px solid rgba(150, 150, 150, 0.2);
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                }
                .date-toggle.active {
                    background: #007aff;
                    color: #fff;
                    border-color: #007aff;
                }
            `}</style>

            <div className="detail-panel">
                {/* Header with Blur Effect */}
                <div style={{
                    padding: '20px 40px',
                    borderBottom: '1px solid rgba(150, 150, 150, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(var(--bg-rgb, 255, 255, 255), 0.8)',
                    backdropFilter: 'blur(20px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button onClick={onClose} style={{
                            background: 'rgba(150, 150, 150, 0.1)', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            width: 36, height: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                            <ArrowRight size={18} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>
                            {isSaving ?
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', background: 'rgba(150,150,150,0.1)', padding: '6px 12px', borderRadius: 20 }}>
                                    <Clock size={14} className="spin" /> SAVING...
                                </span> :
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#27ae60', background: 'rgba(39, 174, 96, 0.1)', padding: '6px 12px', borderRadius: 20 }}>
                                    <Check size={14} /> SAVED
                                </span>
                            }
                        </div>

                        {canEdit && (
                            <button
                                onClick={handleDelete}
                                title="Delete task"
                                style={{
                                    background: 'transparent', border: '1px solid rgba(255, 77, 79, 0.2)',
                                    color: '#ff4d4f', cursor: 'pointer',
                                    width: 36, height: 36, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s', marginLeft: 8
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'scale(1)'; }}
                            >
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>
                    {/* Title Section */}
                    <div style={{ padding: '40px 40px 32px' }}>
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
                                fontSize: 40,
                                fontWeight: 800,
                                margin: 0,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.03em',
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                padding: '4px 0',
                                transition: 'all 0.2s',
                                resize: 'none',
                                lineHeight: 1.1
                            }}
                            placeholder="Untitled Task"
                        />
                    </div>

                    {/* Properties Grid */}
                    <div style={{ padding: '0 40px 40px' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                            gap: 20
                        }}>
                            <div className="property-card">
                                <span className="property-card-label"><Circle size={14} /> Status</span>
                                <div>
                                    <StatusSelector
                                        value={task.status}
                                        onChange={(val) => handleFieldChange('status', val)}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className="property-card">
                                <span className="property-card-label"><AlertCircle size={14} /> Priority</span>
                                <div>
                                    <PrioritySelector
                                        value={task.priority}
                                        onChange={(val) => handleFieldChange('priority', val)}
                                        disabled={!canEdit}
                                    />
                                </div>
                            </div>

                            <div className="property-card" style={{ zIndex: 10 }}>
                                <span className="property-card-label"><UserIcon size={14} /> Assignees</span>
                                <div style={{ marginTop: 2 }}>
                                    <BadgeDropdown
                                        optionsRaw={JSON.stringify(users.map(u => ({ id: u.id, label: u.name, photo: u.photo, color: 'gray' })))}
                                        initialValues={task.assigneeIds || []}
                                        onChange={(val) => handleFieldChange('assigneeIds', val as string[])}
                                        disabled={!canEdit}
                                        placeholder="👤 Unassigned"
                                        multiple={true}
                                    />
                                </div>
                            </div>

                            <div className="property-card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="property-card-label"><CalendarIcon size={14} /> Date</span>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const newIsRange = !task.startDate;
                                                handleFieldChange('startDate', newIsRange ? new Date().toISOString() : null);
                                            }}
                                            className={`date-toggle ${task.startDate ? 'active' : ''}`}
                                        >
                                            {task.startDate ? 'Range' : 'Single'}
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -4 }}>
                                    {task.startDate && (
                                        <>
                                            <input
                                                type="date"
                                                className="editable-input"
                                                value={new Date(task.startDate).toISOString().split('T')[0]}
                                                onChange={(e) => handleFieldChange('startDate', e.target.value)}
                                                disabled={!canEdit}
                                                style={{ width: 'auto', flex: 1 }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)' }}>to</span>
                                        </>
                                    )}
                                    <input
                                        type="date"
                                        className="editable-input"
                                        value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleFieldChange('dueDate', e.target.value)}
                                        disabled={!canEdit}
                                        style={{
                                            color: task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? '#ff4d4f' : 'inherit',
                                            width: 'auto', flex: 1
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="property-card" style={{ gridColumn: '1 / -1' }}>
                                <span className="property-card-label"><LinkIcon size={14} /> Linked Item</span>
                                <div style={{ marginTop: -4 }}>
                                    <RelationSelector
                                        value={task.relatedItemIds || []}
                                        onChange={(val) => handleFieldChange('relatedItemIds', val)}
                                        disabled={!canEdit}
                                        relations={relations}
                                        onVisit={handleVisitRelation}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unified Editor Section */}
                    <div style={{ padding: '0 40px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(150,150,150,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Detailed Content</h3>
                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>Instructions, notes, and sub-tasks.</p>
                            </div>
                        </div>

                        <div style={{
                            opacity: canEdit ? 1 : 0.8, pointerEvents: canEdit ? 'auto' : 'none',
                            border: '1px solid rgba(150, 150, 150, 0.2)', borderRadius: 16, overflow: 'hidden',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                        }}>
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
        { id: 'TODO', label: 'To Do', color: 'var(--text-secondary)', bg: 'rgba(150, 150, 150, 0.1)' },
        { id: 'IN_PROGRESS', label: 'In Progress', color: '#007aff', bg: 'rgba(0, 122, 255, 0.15)' },
        { id: 'DONE', label: 'Done', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)' },
        { id: 'CANCELED', label: 'Canceled', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.12)' },
    ];

    const current = options.find(o => o.id === value) || options[0];

    return (
        <div style={{ position: 'relative' }}>
            <div
                className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    background: current.bg, color: current.color,
                    opacity: disabled ? 0.7 : 1, marginTop: -4,
                    border: isOpen ? `1px solid ${current.color}` : '1px solid transparent'
                }}
            >
                {current.id === 'DONE' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                {current.label}
            </div>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: -10,
                    background: 'var(--bg-color)', border: '1px solid rgba(150, 150, 150, 0.2)',
                    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    zIndex: 50, minWidth: 180, padding: 8
                }}>
                    <style>{`
                        @keyframes popIn {
                            from { opacity: 0; transform: translateY(-10px) scale(0.95); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                    `}</style>
                    <div style={{ animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        {options.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                style={{
                                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
                                    background: value === opt.id ? 'var(--hover-bg)' : 'transparent',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = value === opt.id ? 'var(--hover-bg)' : 'transparent'}
                            >
                                {opt.id === 'DONE' ? <CheckCircle2 size={16} color={opt.color} /> : <Circle size={16} color={opt.color} />}
                                <span style={{ fontWeight: value === opt.id ? 700 : 500, color: opt.color }}>{opt.label}</span>
                                {value === opt.id && <Check size={16} style={{ marginLeft: 'auto', color: opt.color }} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function PrioritySelector({ value, onChange, disabled }: { value: string, onChange: (val: string) => void, disabled: boolean }) {
    const [isOpen, setIsOpen] = useState(false);

    const options = [
        { id: 'LOW', label: 'Low', color: 'var(--text-secondary)', bg: 'rgba(150, 150, 150, 0.1)', icon: '↓' },
        { id: 'MEDIUM', label: 'Medium', color: '#f1c40f', bg: 'rgba(241, 196, 15, 0.15)', icon: '→' },
        { id: 'HIGH', label: 'High', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.15)', icon: '↑' },
    ];

    const current = options.find(o => o.id === value) || options[0];

    return (
        <div style={{ position: 'relative' }}>
            <div
                className={`custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    background: current.bg, color: current.color,
                    opacity: disabled ? 0.7 : 1, marginTop: -4,
                    border: isOpen ? `1px solid ${current.color}` : '1px solid transparent'
                }}
            >
                <span style={{ fontWeight: 800 }}>{current.icon}</span>
                {current.label}
            </div>

            {isOpen && (
                <div className="fade-in" style={{
                    position: 'absolute', top: 'calc(100% + 8px)', left: -10,
                    background: 'var(--bg-color)', border: '1px solid rgba(150, 150, 150, 0.2)',
                    borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    zIndex: 50, minWidth: 160, padding: 8
                }}>
                    <div style={{ animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                        {options.map(opt => (
                            <div
                                key={opt.id}
                                onClick={() => { onChange(opt.id); setIsOpen(false); }}
                                style={{
                                    padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
                                    background: value === opt.id ? 'var(--hover-bg)' : 'transparent',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                onMouseLeave={e => e.currentTarget.style.background = value === opt.id ? 'var(--hover-bg)' : 'transparent'}
                            >
                                <span style={{ fontWeight: 800, color: opt.color, width: 14 }}>{opt.icon}</span>
                                <span style={{ fontWeight: value === opt.id ? 700 : 500, color: 'var(--text-primary)' }}>{opt.label}</span>
                                {value === opt.id && <Check size={16} style={{ marginLeft: 'auto', color: opt.color }} />}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
