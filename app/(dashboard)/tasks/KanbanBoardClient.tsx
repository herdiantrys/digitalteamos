'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateTaskStatus, deleteTask } from '../../../lib/task-actions';
import { Calendar as CalendarIcon, Filter, Search, Plus, List as ListIcon, Columns, Clock, ChevronDown, CheckSquare, Layers, User, Trash2, Check, ExternalLink, CalendarDays, KanbanSquare, Table as TableIcon, GitCommit, CheckCircle2, Circle, Trello, LayoutList, Table2, Timer, X } from 'lucide-react';
import NewTaskModal from './NewTaskModal';
import TaskDetailModal from './TaskDetailModal';
import TaskCalendarView from './TaskCalendarView';
import TaskTimelineView from './TaskTimelineView';
import TaskTableView from './TaskTableView';
import LucideIcon from '../../../components/LucideIcon';

type User = { id: string; name: string; photo: string | null };
type Relation = { id: string; title: string; database: { name: string; icon: string | null; iconColor?: string | null } | null };

export default function KanbanBoardClient({
    tasks: initialTasks,
    users,
    relations,
    currentUser
}: {
    tasks: any[];
    users: User[];
    relations: Relation[];
    currentUser: any;
}) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'KANBAN' | 'LIST' | 'TABLE' | 'CALENDAR' | 'TIMELINE'>('KANBAN');
    const [filter, setFilter] = useState<'ALL' | 'MINE'>(() => currentUser.role === 'STAFF' ? 'MINE' : 'ALL');
    const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'CUSTOM'>(() => currentUser.role === 'STAFF' ? 'TODAY' : 'ALL');
    const [dateRange, setDateRange] = useState({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [defaultStatusForNew, setDefaultStatusForNew] = useState('TODO');
    const [selectedTask, setSelectedTask] = useState<any>(null);

    // Optimistic UI for drag & drop
    const [tasks, setTasks] = useState(initialTasks);
    const [isPending, startTransition] = useTransition();

    // Merge task edits from modal back into local state (optimistic)
    const handleTaskUpdate = (updatedTask: any) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        setSelectedTask((prev: any) => prev?.id === updatedTask.id ? { ...prev, ...updatedTask } : prev);
        // Sync server state in background (no visible reload)
        router.refresh();
    };

    const handleTaskCreated = (newTask: any) => {
        setTasks(prev => [newTask, ...prev]);
        router.refresh();
    };

    const handleDeleteTask = async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        if (selectedTask?.id === taskId) setSelectedTask(null);
        router.refresh();
    };

    const COLUMNS = [
        { id: 'TODO', title: 'To Do', icon: <Circle size={16} color="var(--text-secondary)" /> },
        { id: 'IN_PROGRESS', title: 'In Progress', icon: <Clock size={16} color="#3498db" /> },
        { id: 'DONE', title: 'Done', icon: <CheckCircle2 size={16} color="#2ecc71" /> },
        { id: 'CANCELED', title: 'Canceled', icon: <X size={16} color="#ff4d4f" /> }
    ];

    const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

    const visibleTasks = tasks.filter(t => {
        // 1. Assignee Filter
        if (filter !== 'ALL' && !t.assignees?.some((a: any) => a.id === currentUser.id)) return false;

        // 2. Date Filter
        if (dateFilter === 'ALL') return true;

        const today = startOfDay(new Date());
        const taskStart = t.startDate ? startOfDay(new Date(t.startDate)) : (t.dueDate ? startOfDay(new Date(t.dueDate)) : null);
        const taskEnd = t.dueDate ? startOfDay(new Date(t.dueDate)) : taskStart;

        // Note: For tasks without ANY date, we include them in ALL, but exclude them in TODAY/CUSTOM
        if (!taskStart || !taskEnd) return false;

        if (dateFilter === 'TODAY') {
            return taskStart <= today && taskEnd >= today;
        }

        if (dateFilter === 'CUSTOM') {
            const rangeStart = startOfDay(new Date(dateRange.start));
            const rangeEnd = startOfDay(new Date(dateRange.end));
            return taskStart <= rangeEnd && taskEnd >= rangeStart;
        }

        return true;
    });

    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        setTimeout(() => {
            const el = document.getElementById(`task-${taskId}`);
            if (el) el.style.opacity = '0.5';
        }, 0);
    };

    const handleDragEnd = (e: React.DragEvent, taskId: string) => {
        const el = document.getElementById(`task-${taskId}`);
        if (el) el.style.opacity = '1';
    };

    const handleDrop = (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === statusId) return;

        // Optimistic update
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: statusId, updatedAt: new Date() } : t));

        startTransition(async () => {
            try {
                await updateTaskStatus(taskId, statusId);
                // Sync server state after successful save
                router.refresh();
            } catch (err: any) {
                setTasks(initialTasks);
                console.error("Failed to update status", err);
                alert(err.message || "Failed to update status");
            }
        });
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <style>{`
                .kb-view-btn { transition: all 0.2s; }
                .kb-view-btn:hover { background: var(--hover-bg) !important; color: var(--text-primary) !important; }
                .kb-filter-btn { transition: all 0.15s; }
                .kb-filter-btn:hover { background: var(--hover-bg) !important; }
                .kb-col::-webkit-scrollbar { width: 4px; }
                .kb-col::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 8px; }
                .new-task-btn { transition: all 0.15s; }
                .new-task-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,92,246,0.4) !important; }
            `}</style>
            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, padding: '0 2px', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Assignee Filter Pills */}
                    <div style={{ display: 'flex', background: 'var(--sidebar-bg)', borderRadius: 10, padding: 4, border: '1px solid var(--border-color)', gap: 2 }}>
                        {(['ALL', 'MINE'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className="kb-filter-btn"
                                style={{
                                    padding: '7px 16px', fontSize: 13, fontWeight: 600, borderRadius: 7, border: 'none', cursor: 'pointer',
                                    background: filter === f ? 'var(--accent-color)' : 'transparent',
                                    color: filter === f ? '#fff' : 'var(--text-secondary)',
                                    boxShadow: filter === f ? '0 2px 8px rgba(46,170,220,0.35)' : 'none'
                                }}
                            >
                                {f === 'ALL' ? 'All Tasks' : 'My Tasks'}
                            </button>
                        ))}
                    </div>

                    {/* Date Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sidebar-bg)', borderRadius: 10, padding: '6px 12px', border: '1px solid var(--border-color)' }}>
                        <Filter size={14} color="var(--text-secondary)" />
                        <select
                            value={dateFilter}
                            onChange={(e: any) => setDateFilter(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="ALL">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="CUSTOM">Custom Range</option>
                        </select>

                        {dateFilter === 'CUSTOM' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 10, borderLeft: '1px solid var(--border-color)' }}>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, padding: '4px 8px' }}
                                />
                                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>→</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, padding: '4px 8px' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* View Switcher */}
                    <div style={{ display: 'flex', background: 'var(--sidebar-bg)', borderRadius: 10, padding: 4, border: '1px solid var(--border-color)', gap: 2 }}>
                        {([
                            { mode: 'KANBAN', icon: <Trello size={15} />, label: 'Board' },
                            { mode: 'LIST', icon: <LayoutList size={15} />, label: 'List' },
                            { mode: 'TABLE', icon: <Table2 size={15} />, label: 'Table' },
                            { mode: 'CALENDAR', icon: <CalendarIcon size={15} />, label: 'Calendar' },
                            { mode: 'TIMELINE', icon: <Timer size={15} />, label: 'Timeline' },
                        ] as const).map(({ mode, icon, label }) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                title={label}
                                className="kb-view-btn"
                                style={{
                                    padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer',
                                    background: viewMode === mode ? 'var(--bg-color)' : 'transparent',
                                    color: viewMode === mode ? 'var(--accent-color)' : 'var(--text-secondary)',
                                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600
                                }}
                            >
                                {icon}
                                <span style={{ display: viewMode === mode ? 'inline' : 'none' }}>{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => { setDefaultStatusForNew('TODO'); setIsNewModalOpen(true); }}
                    className="new-task-btn"
                    style={{
                        padding: '9px 20px', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                        color: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 7,
                        boxShadow: '0 4px 14px rgba(139,92,246,0.35)'
                    }}
                >
                    <Plus size={16} /> New Task
                </button>
            </div>

            {/* Board View */}
            {viewMode === 'KANBAN' && (
                <div style={{ display: 'flex', gap: 20, flex: 1, overflowX: 'auto', paddingBottom: 16 }}>
                    {COLUMNS.map(col => {
                        const colTasks = visibleTasks.filter(t => t.status === col.id);
                        const colColors: Record<string, { bg: string; border: string; accent: string }> = {
                            'TODO': { bg: 'rgba(255,255,255,0.015)', border: 'var(--border-color)', accent: 'var(--text-secondary)' },
                            'IN_PROGRESS': { bg: 'rgba(52,152,219,0.04)', border: 'rgba(52,152,219,0.25)', accent: '#3498db' },
                            'DONE': { bg: 'rgba(46,204,113,0.04)', border: 'rgba(46,204,113,0.25)', accent: '#2ecc71' },
                            'CANCELED': { bg: 'rgba(255,77,79,0.03)', border: 'rgba(255,77,79,0.2)', accent: '#ff4d4f' }
                        };
                        const cc = colColors[col.id];
                        return (
                            <div
                                key={col.id}
                                onDrop={(e) => handleDrop(e, col.id)}
                                onDragOver={handleDragOver}
                                style={{
                                    flex: '0 0 320px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: cc.bg,
                                    borderRadius: 16,
                                    padding: '16px 14px',
                                    border: `1px solid ${cc.border}`,
                                    maxHeight: '100%'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                        <span style={{ color: cc.accent }}>{col.icon}</span>
                                        {col.title}
                                        <span style={{ fontSize: 11, color: cc.accent, background: `${cc.accent}20`, padding: '2px 8px', borderRadius: 20, fontWeight: 700, border: `1px solid ${cc.accent}33` }}>
                                            {colTasks.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => { setDefaultStatusForNew(col.id); setIsNewModalOpen(true); }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 5, borderRadius: 6, transition: 'all 0.15s' }}
                                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                                    >
                                        <Plus size={15} />
                                    </button>
                                </div>

                                <div className="kb-col" style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto', paddingRight: 2 }}>
                                    {colTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onDragStart={handleDragStart}
                                            onDragEnd={handleDragEnd}
                                            currentUser={currentUser}
                                            onDetail={() => setSelectedTask(task)}
                                            onDelete={handleDeleteTask}
                                            startTransition={startTransition}
                                        />
                                    ))}
                                    {colTasks.length === 0 && (
                                        <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-secondary)', border: `1px dashed ${cc.border}`, borderRadius: 12, fontSize: 13 }}>
                                            <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.4 }}>·</div>
                                            Drop tasks here
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* List View */}
            {viewMode === 'LIST' && (
                <div className="glass-card" style={{ flex: 1, overflowY: 'auto', borderRadius: 16 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Task Title</th>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Assignee</th>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Due Date</th>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Priority</th>
                                <th style={{ padding: '16px', fontWeight: 600 }}>Relation</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>No tasks found</td>
                                </tr>
                            ) : visibleTasks.map(task => {
                                const canEditList = currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id);
                                return (
                                    <tr
                                        key={task.id}
                                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onClick={() => setSelectedTask(task)}
                                        onMouseEnter={e => canEditList && (e.currentTarget.style.background = 'var(--hover-bg)')}
                                        onMouseLeave={e => canEditList && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ padding: '16px', fontWeight: 600 }}>{task.title}</td>
                                        <td style={{ padding: '16px' }}>
                                            <StatusBadge status={task.status} />
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {task.assignees && task.assignees.length > 0 ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: -8 }}>
                                                    {task.assignees.map((a: any, idx: number) => (
                                                        <div key={a.id} title={a.name} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border-color)', border: '2px solid var(--bg-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, zIndex: task.assignees.length - idx, position: 'relative', marginLeft: idx > 0 ? -8 : 0 }}>
                                                            {a.photo ? <img src={a.photo} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : <span style={{ color: 'var(--text-secondary)' }}>Unassigned</span>}
                                        </td>
                                        <td style={{ padding: '16px', color: task.dueDate ? (new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? '#ff4d4f' : 'inherit') : 'var(--text-secondary)' }}>
                                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US') : '-'}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <PriorityBadge priority={task.priority} />
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {task.relatedItems && task.relatedItems.length > 0 ? (
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {task.relatedItems.map((rItem: any) => (
                                                        <span key={rItem.id} style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                            {rItem.database?.icon || '📄'} {rItem.title}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Table View */}
            {viewMode === 'TABLE' && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <TaskTableView
                        tasks={visibleTasks}
                        users={users}
                        currentUser={currentUser}
                        onDetail={setSelectedTask}
                    />
                </div>
            )}

            {/* Calendar View */}
            {viewMode === 'CALENDAR' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <TaskCalendarView
                        tasks={visibleTasks}
                        currentUser={currentUser}
                        onDetail={setSelectedTask}
                        onUpdate={handleTaskUpdate}
                        onNewTaskWithDate={(dateStr) => {
                            setDefaultStatusForNew('TODO');
                            setIsNewModalOpen(true);
                        }}
                    />
                </div>
            )}

            {/* Timeline View */}
            {viewMode === 'TIMELINE' && (
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <TaskTimelineView
                        tasks={visibleTasks}
                        users={users}
                        currentUser={currentUser}
                        onDetail={setSelectedTask}
                        onUpdate={handleTaskUpdate}
                    />
                </div>
            )}

            {isNewModalOpen && (
                <NewTaskModal
                    onClose={() => setIsNewModalOpen(false)}
                    users={users}
                    relations={relations}
                    defaultStatus={defaultStatusForNew}
                    onTaskCreated={handleTaskCreated}
                />
            )}

            {selectedTask && (
                <TaskDetailModal
                    task={selectedTask}
                    onClose={() => setSelectedTask(null)}
                    users={users}
                    relations={relations}
                    currentUser={currentUser}
                    onUpdate={handleTaskUpdate}
                    onDelete={handleDeleteTask}
                />
            )}
        </div>
    );
}

function TaskCard({ task, onDragStart, onDragEnd, currentUser, onDetail, onDelete, startTransition }: any) {
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE' && task.status !== 'CANCELED';
    const canEdit = currentUser.role === 'ADMIN' || task.assignees?.some((a: any) => a.id === currentUser.id);

    // Build the date display
    let dateDisplay = 'No date';
    if (task.startDate && task.dueDate && new Date(task.startDate).getTime() !== new Date(task.dueDate).getTime()) {
        dateDisplay = `${new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (task.dueDate) {
        dateDisplay = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    const statusAccent: Record<string, string> = {
        'TODO': 'var(--border-color)',
        'IN_PROGRESS': '#3498db',
        'DONE': '#2ecc71'
    };

    return (
        <div
            id={`task-${task.id}`}
            draggable={canEdit}
            onDragStart={(e) => canEdit && onDragStart(e, task.id)}
            onDragEnd={(e) => canEdit && onDragEnd(e, task.id)}
            onClick={() => onDetail()}
            style={{
                background: 'var(--bg-color)',
                border: '1px solid var(--border-color)',
                borderLeft: `3px solid ${statusAccent[task.status] || 'var(--border-color)'}`,
                borderRadius: 12,
                padding: '14px 16px',
                cursor: canEdit ? 'grab' : 'pointer',
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
            }}
            className="task-card"
        >
            <style>{`.task-card:hover { border-color: ${canEdit ? 'var(--accent-color)' : 'var(--border-color)'}; transform: ${canEdit ? 'translateY(-2px)' : 'none'}; box-shadow: 0 8px 20px rgba(0,0,0,0.08) !important; }`}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PriorityBadge priority={task.priority} />
                    {task.status === 'DONE' && <CheckCircle2 size={13} color="#2ecc71" />}
                </div>
                {canEdit && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this task?')) {
                                startTransition(async () => {
                                    try {
                                        await deleteTask(task.id);
                                        if (onDelete) onDelete(task.id);
                                    } catch (err: any) {
                                        alert(err.message || "Failed to delete task");
                                    }
                                });
                            }
                        }}
                        style={{
                            background: 'transparent', border: 'none',
                            color: 'var(--text-secondary)', cursor: 'pointer',
                            padding: 4, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 79, 0.12)'; e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0'; }}
                        className="task-delete-btn"
                        title="Delete task"
                    >
                        <Trash2 size={13} />
                    </button>
                )}
            </div>

            <div style={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.45, color: 'var(--text-primary)' }}>
                {task.title}
            </div>

            {task.relatedItems && task.relatedItems.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {task.relatedItems.map((rItem: any) => (
                        <div key={rItem.id} style={{
                            fontSize: 11, color: 'var(--text-secondary)',
                            display: 'flex', gap: 5, alignItems: 'center',
                            background: 'var(--sidebar-bg)', padding: '4px 9px', borderRadius: 7,
                            width: 'fit-content', border: '1px solid var(--border-color)'
                        }}>
                            <span style={{ display: 'flex', flexShrink: 0 }}>
                                {rItem.database?.icon ? <LucideIcon name={rItem.database.icon as any} size={11} color={rItem.database.iconColor || 'var(--text-primary)'} /> : '📄'}
                            </span>
                            <span style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{rItem.title}</span>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <div style={{
                    fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
                    color: isOverdue ? '#ff4d4f' : 'var(--text-secondary)',
                    fontWeight: isOverdue ? 700 : 500,
                    background: isOverdue ? 'rgba(255,77,79,0.08)' : 'transparent',
                    padding: isOverdue ? '2px 7px' : '0',
                    borderRadius: 6
                }}>
                    <Clock size={11} />
                    <span>{dateDisplay}</span>
                </div>

                {task.assignees && task.assignees.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        {task.assignees.map((a: any, idx: number) => (
                            <div key={a.id} title={`Assigned to ${a.name}`} style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sidebar-bg)', border: '2px solid var(--bg-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, zIndex: task.assignees.length - idx, position: 'relative', marginLeft: idx > 0 ? -8 : 0 }}>
                                {a.photo ? <img src={a.photo} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : a.name.substring(0, 2).toUpperCase()}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div title="Unassigned" style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: '1.5px dashed var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>?</div>
                )}
            </div>
        </div>
    );
}

// Show delete on task-card hover via CSS
const _taskCardStyle = typeof document !== 'undefined' && (() => {
    if (!document.querySelector('#task-card-style')) {
        const s = document.createElement('style');
        s.id = 'task-card-style';
        s.textContent = '.task-card:hover .task-delete-btn { opacity: 0.6 !important; } .task-card:active { cursor: grabbing !important; }';
        document.head.appendChild(s);
    }
})();

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { bg: string; color: string; label: string }> = {
        'DONE': { bg: 'rgba(46,204,113,0.12)', color: '#2ecc71', label: 'Done' },
        'IN_PROGRESS': { bg: 'rgba(52,152,219,0.12)', color: '#3498db', label: 'In Progress' },
        'TODO': { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', label: 'To Do' },
        'CANCELED': { bg: 'rgba(255,77,79,0.10)', color: '#ff4d4f', label: 'Canceled' }
    };
    const s = cfg[status] || cfg.TODO;
    return <span style={{ fontSize: 11, background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '0.02em', textDecoration: status === 'CANCELED' ? 'line-through' : 'none' }}>{s.label}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
    if (priority === 'HIGH') return <span style={{ fontSize: 10, background: 'rgba(255,77,79,0.12)', color: '#ff4d4f', padding: '3px 8px', borderRadius: 20, fontWeight: 800, letterSpacing: '0.04em' }}>↑ HIGH</span>;
    if (priority === 'LOW') return <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>↓ LOW</span>;
    return <span style={{ fontSize: 10, background: 'rgba(241,196,15,0.12)', color: '#f1c40f', padding: '3px 8px', borderRadius: 20, fontWeight: 700 }}>→ MED</span>;
}
