'use client';

import { useState, useTransition } from 'react';
import { X, Calendar as CalendarIcon, Link as LinkIcon, User as UserIcon, CheckCircle2, Type, AlertCircle } from 'lucide-react';
import { createTask } from '../../../lib/task-actions';
import MarkdownEditor from '../../../components/content-management/MarkdownEditor';
import RelationSelector from './RelationSelector';
import BadgeDropdown from '../../../components/content-management/BadgeDropdown';

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
    const [relatedItemIds, setRelatedItemIds] = useState<string[]>([]);
    const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
    const [isRange, setIsRange] = useState(false);
    const [title, setTitle] = useState('');

    const handleVisitRelation = (item: any) => {
        if (item.databaseId) {
            window.open(`/databases/${item.databaseId}?open=${item.id}`, '_blank');
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!title.trim()) return;

        const formData = new FormData(e.currentTarget);
        formData.append('status', defaultStatus);
        formData.append('relatedItemIds', JSON.stringify(relatedItemIds));
        formData.append('assigneeIds', JSON.stringify(assigneeIds));
        // ensure title is added if not natively captured
        if (!formData.has('title')) formData.append('title', title);

        startTransition(async () => {
            try {
                const newTask = await createTask(formData);
                if (onTaskCreated) {
                    const assignees = assigneeIds.map(id => users.find(u => u.id === id)).filter(Boolean);
                    onTaskCreated({ ...newTask, assignees });
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
                background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 1000, backdropFilter: 'blur(12px)',
                padding: 24, paddingBottom: '10vh'
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <style>{`
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(30px) scale(0.97); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .premium-modal {
                    animation: slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .form-label {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .premium-input {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 14px;
                    border: 1px solid rgba(150, 150, 150, 0.2);
                    background: rgba(var(--bg-rgb, 255, 255, 255), 0.5);
                    color: var(--text-primary);
                    font-size: 15px;
                    font-weight: 500;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    outline: none;
                    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .input-wrapper > svg {
                    position: absolute;
                    left: 16px;
                    color: var(--text-secondary);
                    pointer-events: none;
                }
                .premium-input.with-icon {
                    padding-left: 44px;
                }
                .premium-input:hover {
                    border-color: rgba(150, 150, 150, 0.4);
                    background: var(--bg-color);
                }
                .premium-input:focus {
                    border-color: #007aff;
                    background: var(--bg-color);
                    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.15), inset 0 2px 4px rgba(0,0,0,0.02);
                }
                .premium-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
                    background-repeat: no-repeat;
                    background-position: right 16px center;
                    background-size: 16px;
                    cursor: pointer;
                }
                .date-toggle {
                    font-size: 11px;
                    font-weight: 800;
                    padding: 6px 12px;
                    border-radius: 20px;
                    background: var(--hover-bg);
                    color: var(--text-secondary);
                    border: 1px solid rgba(150, 150, 150, 0.2);
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                .date-toggle.active {
                    background: #007aff;
                    color: #fff;
                    border-color: #007aff;
                    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
                }
                .btn-create {
                    background: linear-gradient(135deg, #007aff, #0056b3);
                    color: white;
                    padding: 12px 28px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 15px;
                    border: none;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 8px 20px rgba(0, 122, 255, 0.3), inset 0 1px 1px rgba(255,255,255,0.2);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .btn-create:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 24px rgba(0, 122, 255, 0.4), inset 0 1px 1px rgba(255,255,255,0.2);
                }
                .btn-create:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                    transform: none;
                }
                .btn-cancel {
                    background: transparent;
                    color: var(--text-secondary);
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 15px;
                    border: 1px solid rgba(150, 150, 150, 0.3);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-cancel:hover {
                    background: var(--hover-bg);
                    color: var(--text-primary);
                }
            `}</style>

            <div
                className="glass-card premium-modal"
                style={{
                    width: '100%', maxWidth: 880,
                    padding: 0,
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'var(--bg-color)',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(150, 150, 150, 0.15)',
                    borderRadius: 24,
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: '90vh'
                }}
            >
                {/* Header with Enhanced Gradient */}
                <div style={{
                    padding: '32px 40px',
                    borderBottom: '1px solid rgba(150, 150, 150, 0.1)',
                    background: 'radial-gradient(ellipse at top left, rgba(0,122,255,0.08), transparent 70%)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'linear-gradient(135deg, #007aff, #00c6ff)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', boxShadow: '0 4px 12px rgba(0,122,255,0.3)'
                            }}>
                                <CheckCircle2 size={20} />
                            </div>
                            <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                                Create Task
                            </h2>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, paddingLeft: 48, fontWeight: 500 }}>
                            Define a new objective and start making progress
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'var(--hover-bg)', border: '1px solid rgba(150, 150, 150, 0.2)',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            width: 36, height: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'rotate(90deg) scale(1.1)';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto' }}>
                    <form id="new-task-form" onSubmit={handleSubmit} style={{ padding: '32px 40px', display: 'flex', flexDirection: 'column', gap: 28 }}>

                        {/* Title & Description */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div className="form-group">
                                <label className="form-label">Task Title</label>
                                <div className="input-wrapper">
                                    <Type size={18} />
                                    <input
                                        name="title"
                                        required
                                        autoFocus
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        className="premium-input with-icon"
                                        placeholder="What needs to be done?"
                                        style={{ fontSize: 18, fontWeight: 600, padding: '16px 16px 16px 44px' }}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    className="premium-input"
                                    rows={2}
                                    placeholder="Add a brief summary or quick notes..."
                                    style={{ resize: 'vertical', minHeight: 60 }}
                                />
                            </div>
                        </div>

                        {/* Metadata Grid */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24,
                            padding: '24px', background: 'rgba(150, 150, 150, 0.03)',
                            borderRadius: 16, border: '1px solid rgba(150,150,150,0.1)'
                        }}>
                            <div className="form-group" style={{ zIndex: 10 }}>
                                <label className="form-label"><UserIcon size={14} /> Assignees</label>
                                <BadgeDropdown
                                    optionsRaw={JSON.stringify(users.map(u => ({ id: u.id, label: u.name, photo: u.photo, color: 'gray' })))}
                                    initialValues={assigneeIds}
                                    onChange={(val) => setAssigneeIds(val as string[])}
                                    placeholder="👤 Unassigned"
                                    multiple={true}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label"><AlertCircle size={14} /> Priority</label>
                                <select name="priority" className="premium-input premium-select" defaultValue="MEDIUM">
                                    <option value="LOW">↓ Low Priority</option>
                                    <option value="MEDIUM">→ Medium Priority</option>
                                    <option value="HIGH">↑ High Priority</option>
                                </select>
                            </div>

                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <label className="form-label"><CalendarIcon size={14} /> Timeline</label>
                                    <button
                                        type="button"
                                        className={`date-toggle ${isRange ? 'active' : ''}`}
                                        onClick={() => setIsRange(!isRange)}
                                    >
                                        {isRange ? 'Date Range' : 'Single Date'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    {isRange && (
                                        <>
                                            <input type="date" name="startDate" className="premium-input" style={{ flex: 1, cursor: 'text' }} />
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>to</span>
                                        </>
                                    )}
                                    <input type="date" name="dueDate" className="premium-input" style={{ flex: 1, cursor: 'text' }} />
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label"><LinkIcon size={14} /> Linked Items</label>
                            <div style={{ background: 'var(--bg-color)', borderRadius: 14 }}>
                                <RelationSelector
                                    value={relatedItemIds}
                                    onChange={setRelatedItemIds}
                                    relations={relations}
                                    placeholder="Link to database pages..."
                                    onVisit={handleVisitRelation}
                                />
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 8 }}>
                            <label className="form-label">Detailed Content</label>
                            <input type="hidden" name="content" value={content} />
                            <div style={{
                                border: '1px solid rgba(150, 150, 150, 0.2)', borderRadius: 16, overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                            }}>
                                <MarkdownEditor
                                    value={content}
                                    onChange={setContent}
                                    contentTitle={title || "New Task"}
                                    isSaving={isPending}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div style={{
                    display: 'flex', justifyContent: 'flex-end', gap: 16,
                    padding: '24px 40px', borderTop: '1px solid rgba(150, 150, 150, 0.1)',
                    background: 'var(--bg-color)', flexShrink: 0
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-cancel"
                    >
                        Cancel
                    </button>
                    <button
                        form="new-task-form"
                        type="submit"
                        className="btn-create"
                        disabled={isPending || !title.trim()}
                        onClick={(e) => {
                            if (!title.trim()) {
                                e.preventDefault();
                                alert("Please enter a task title.");
                            }
                        }}
                    >
                        {isPending ? 'Creating...' : 'Create Task'}
                    </button>
                </div>
            </div>
        </div>
    );
}
