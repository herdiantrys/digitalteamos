'use client';

import { useState, useTransition } from 'react';
import { X, Calendar as CalendarIcon, Link as LinkIcon, User as UserIcon } from 'lucide-react';
import { createTask } from '../../../lib/task-actions';
import MarkdownEditor from '../../../components/content-management/MarkdownEditor';

type User = { id: string; name: string; photo: string | null };
type Relation = { id: string; title: string; database: { name: string; icon: string | null } | null };

export default function NewTaskModal({
    onClose,
    users,
    relations,
    defaultStatus,
    onTaskCreated
}: {
    onClose: () => void;
    users: User[];
    relations: Relation[];
    defaultStatus: string;
    onTaskCreated?: (task: any) => void;
}) {
    const [isPending, startTransition] = useTransition();
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        formData.append('status', defaultStatus);

        startTransition(async () => {
            try {
                const newTask = await createTask(formData);
                if (onTaskCreated) {
                    // Resolve assignee object for UI
                    const assignee = newTask.assigneeId
                        ? users.find(u => u.id === newTask.assigneeId) || null
                        : null;
                    onTaskCreated({ ...newTask, assignee });
                }
                onClose();
            } catch (err: any) {
                alert(err.message);
            }
        });
    };

    return (
        <div
            className="fade-in"
            style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, backdropFilter: 'blur(8px)',
                padding: 20
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes slideUpFade {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .premium-modal {
                    animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .form-label {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .premium-input {
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: 1px solid var(--border-color);
                    background: var(--input-bg);
                    color: var(--text-primary);
                    font-size: 14px;
                    transition: all 0.2s;
                    outline: none;
                }
                .premium-input:focus {
                    border-color: #007aff;
                    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.1);
                }
            `}</style>

            <div
                className="glass-card premium-modal"
                style={{
                    width: '100%', maxWidth: 840,
                    padding: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--bg-color)',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.2)'
                }}
            >
                {/* Header with Gradient */}
                <div style={{
                    padding: '24px 32px',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'linear-gradient(to right, rgba(0,122,255,0.05), transparent)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Create Task</h2>
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Add a new objective to your workspace</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--hover-bg)', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            width: 32, height: 32, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'rotate(90deg)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'rotate(0deg)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div className="form-group">
                        <label className="form-label">Task Title</label>
                        <input
                            name="title"
                            required
                            autoFocus
                            className="premium-input"
                            placeholder="e.g. Design meeting for next week"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            name="description"
                            className="premium-input"
                            rows={3}
                            placeholder="Specify task details..."
                            style={{ resize: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label"><UserIcon size={14} /> Assignee</label>
                            <select name="assigneeId" className="premium-input" style={{ cursor: 'pointer' }}>
                                <option value="">Unassigned</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label"><CalendarIcon size={14} /> Due Date</label>
                            <input type="date" name="dueDate" className="premium-input" />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select name="priority" className="premium-input" defaultValue="MEDIUM" style={{ cursor: 'pointer' }}>
                                <option value="LOW">Low Priority</option>
                                <option value="MEDIUM">Medium Priority</option>
                                <option value="HIGH">High Priority</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label"><LinkIcon size={14} /> Related Item</label>
                            <select name="relatedItemId" className="premium-input" style={{ cursor: 'pointer' }}>
                                <option value="">No Relation</option>
                                {relations.map(r => (
                                    <option key={r.id} value={r.id}>
                                        {r.database?.icon || '📄'} {r.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
                        <label className="form-label">Task Content (Unified Editor)</label>
                        <input type="hidden" name="content" value={content} />
                        <MarkdownEditor
                            value={content}
                            onChange={setContent}
                            contentTitle="New Task"
                            isSaving={isPending}
                        />
                    </div>

                    <div style={{
                        display: 'flex', justifyContent: 'flex-end', gap: 12,
                        marginTop: 8, paddingTop: 24, borderTop: '1px solid var(--border-color)'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                            style={{ padding: '10px 20px', borderRadius: 10 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isPending}
                            style={{
                                padding: '10px 24px',
                                borderRadius: 10,
                                boxShadow: '0 8px 20px rgba(0, 122, 255, 0.3)'
                            }}
                        >
                            {isPending ? 'Creating...' : 'Create Task'}
                        </button>
                    </div>
                </form >
            </div >
        </div >
    );
}
