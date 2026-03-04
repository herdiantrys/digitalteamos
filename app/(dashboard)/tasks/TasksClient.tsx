'use client';

import { useState, useTransition, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { updateTaskStatus, deleteTask, searchContent } from '../../../lib/actions';
import TaskModal from './TaskModal';
import TasksCalendarView from './TasksCalendarView';
import TasksTimelineView from './TasksTimelineView';

const STATUS_COLUMNS = [
    { id: 'TODO', label: 'To Do', color: '#ff4d4f' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#1890ff' },
    { id: 'REVIEW', label: 'Review', color: '#faad14' },
    { id: 'DONE', label: 'Done', color: '#27ae60' },
];

type ViewMode = 'board' | 'calendar' | 'timeline';

export default function TasksClient({
    initialTasks,
    userOptions,
    isAdmin
}: {
    initialTasks: any[];
    userOptions: any[];
    isAdmin: boolean;
}) {
    const [tasks, setTasks] = useState(initialTasks);
    const [view, setView] = useState<ViewMode>('board');
    const [isPending, startTransition] = useTransition();
    const searchParams = useSearchParams();

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editTask, setEditTask] = useState<any>(null);

    useEffect(() => {
        setTasks(initialTasks);
    }, [initialTasks]);

    // Handle auto-open for content-linked task creation
    useEffect(() => {
        const contentId = searchParams.get('contentId');
        if (contentId) {
            const init = async () => {
                setEditTask({ contentId, title: '', status: 'TODO' });
                setIsModalOpen(true);
            };
            init();
        }
    }, [searchParams]);

    const handleStatusUpdate = (e: React.ChangeEvent<HTMLSelectElement>, taskId: string) => {
        e.stopPropagation();
        const newStatus = e.target.value;
        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
        startTransition(async () => {
            await updateTaskStatus(taskId, newStatus);
        });
    };

    const handleDelete = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this task?')) return;
        setTasks(prev => prev.filter(t => t.id !== taskId));
        startTransition(async () => {
            await deleteTask(taskId);
        });
    };

    const openCreateModal = () => {
        setEditTask(null);
        setIsModalOpen(true);
    };

    const openEditModal = (task: any) => {
        setEditTask(task);
        setIsModalOpen(true);
    };

    const viewOptions: { id: ViewMode; label: string; icon: string }[] = [
        { id: 'board', label: 'Board', icon: '📋' },
        { id: 'calendar', label: 'Calendar', icon: '📅' },
        { id: 'timeline', label: 'Timeline', icon: '⏳' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', background: 'var(--sidebar-bg)', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
                    {viewOptions.map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setView(opt.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 16px',
                                borderRadius: 8,
                                border: 'none',
                                background: view === opt.id ? 'var(--bg-color)' : 'transparent',
                                color: view === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: view === opt.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            <span>{opt.icon}</span>
                            {opt.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={openCreateModal}
                    style={{
                        background: 'var(--accent-color)',
                        color: '#fff',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(24,144,255,0.3)'
                    }}
                >
                    <span style={{ fontSize: 18 }}>+</span> New Task
                </button>
            </div>

            {view === 'board' && (
                <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 24, minHeight: '600px' }}>
                    {STATUS_COLUMNS.map(col => {
                        const colTasks = tasks.filter(t => t.status === col.id);
                        return (
                            <div key={col.id} style={{ flex: 1, minWidth: 300, maxWidth: 400 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {col.label}
                                    </h3>
                                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: 10 }}>
                                        {colTasks.length}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {colTasks.map(task => (
                                        <div
                                            key={task.id}
                                            onClick={() => openEditModal(task)}
                                            style={{
                                                background: 'var(--sidebar-bg)',
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 12,
                                                padding: 16,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                                transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.transform = 'translateY(-2px)';
                                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
                                                e.currentTarget.style.borderColor = 'var(--accent-color)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                    {task.title}
                                                </h4>
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => handleDelete(e, task.id)}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 14, padding: '0 4px' }}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>

                                            {task.content && (
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {task.content}
                                                </p>
                                            )}

                                            {task.linkedContent && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '6px 10px', background: 'rgba(24,144,255,0.05)', borderRadius: 6, border: '1px solid rgba(24,144,255,0.1)' }}>
                                                    <span style={{ fontSize: 12 }}>📄</span>
                                                    <span style={{ fontSize: 11, fontWeight: 500, color: '#1890ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {task.linkedContent.title}
                                                    </span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, border: '1px solid var(--border-color)' }}>
                                                        {task.assignee?.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500 }}>
                                                            {task.assignee?.name || 'Unassigned'}
                                                        </span>
                                                        {task.dueDate && (
                                                            <span style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                                Due {new Date(task.dueDate).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <select
                                                    value={task.status}
                                                    onClick={e => e.stopPropagation()}
                                                    onChange={(e) => handleStatusUpdate(e, task.id)}
                                                    style={{
                                                        background: 'var(--bg-color)',
                                                        border: '1px solid var(--border-color)',
                                                        borderRadius: 6,
                                                        padding: '4px 8px',
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        color: 'var(--text-primary)',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {STATUS_COLUMNS.map(s => (
                                                        <option key={s.id} value={s.id}>{s.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}

                                    {colTasks.length === 0 && (
                                        <div style={{
                                            padding: '32px 16px',
                                            textAlign: 'center',
                                            border: '2px dashed var(--border-color)',
                                            borderRadius: 12,
                                            color: 'var(--text-secondary)',
                                            fontSize: 13,
                                            opacity: 0.5
                                        }}>
                                            No tasks here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {view === 'calendar' && (
                <TasksCalendarView tasks={tasks} onEditTask={openEditModal} />
            )}

            {view === 'timeline' && (
                <TasksTimelineView tasks={tasks} onEditTask={openEditModal} />
            )}

            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={() => { }}
                editTask={editTask}
                userOptions={userOptions}
            />
        </div>
    );
}
