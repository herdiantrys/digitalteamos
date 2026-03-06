'use client';

import { useState, useTransition } from 'react';
import { updateTaskStatus, deleteTask } from '../../../lib/task-actions';
import { Calendar as CalendarIcon, Filter, Search, Plus, List as ListIcon, Columns, Clock, ChevronDown, CheckSquare, Layers, User, Trash2, Check, ExternalLink, CalendarDays, KanbanSquare, Table as TableIcon, GitCommit, CheckCircle2, Circle, Trello, LayoutList, Table2, Timer } from 'lucide-react';
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

    // Merge task edits from modal back into local state
    const handleTaskUpdate = (updatedTask: any) => {
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        setSelectedTask((prev: any) => prev?.id === updatedTask.id ? { ...prev, ...updatedTask } : prev);
    };

    const handleTaskCreated = (newTask: any) => {
        setTasks(prev => [newTask, ...prev]);
    };

    const handleDeleteTask = async (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        if (selectedTask?.id === taskId) setSelectedTask(null);
    };

    const COLUMNS = [
        { id: 'TODO', title: 'To Do', icon: <Circle size={16} color="var(--text-secondary)" /> },
        { id: 'IN_PROGRESS', title: 'In Progress', icon: <Clock size={16} color="#3498db" /> },
        { id: 'DONE', title: 'Done', icon: <CheckCircle2 size={16} color="#2ecc71" /> }
    ];

    const startOfDay = (d: Date) => { const c = new Date(d); c.setHours(0, 0, 0, 0); return c; };

    const visibleTasks = tasks.filter(t => {
        // 1. Assignee Filter
        if (filter !== 'ALL' && t.assigneeId !== currentUser.id) return false;

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
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>

                    {/* Assignee Filter */}
                    <div style={{ display: 'flex', background: 'var(--sidebar-bg)', borderRadius: 8, padding: 4, border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setFilter('ALL')}
                            style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer', background: filter === 'ALL' ? 'var(--bg-color)' : 'transparent', color: filter === 'ALL' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: filter === 'ALL' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            All Tasks
                        </button>
                        <button
                            onClick={() => setFilter('MINE')}
                            style={{ padding: '6px 12px', fontSize: 13, fontWeight: 500, borderRadius: 6, border: 'none', cursor: 'pointer', background: filter === 'MINE' ? 'var(--bg-color)' : 'transparent', color: filter === 'MINE' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: filter === 'MINE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            My Tasks
                        </button>
                    </div>

                    {/* Date Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--sidebar-bg)', borderRadius: 8, padding: '4px 8px', border: '1px solid var(--border-color)' }}>
                        <Filter size={14} color="var(--text-secondary)" />
                        <select
                            value={dateFilter}
                            onChange={(e: any) => setDateFilter(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500, outline: 'none', cursor: 'pointer' }}
                        >
                            <option value="ALL">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="CUSTOM">Custom Range</option>
                        </select>

                        {dateFilter === 'CUSTOM' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingLeft: 8, borderLeft: '1px solid var(--border-color)' }}>
                                <input
                                    type="date"
                                    value={dateRange.start}
                                    onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, padding: '4px 6px' }}
                                />
                                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>-</span>
                                <input
                                    type="date"
                                    value={dateRange.end}
                                    onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                    style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, padding: '4px 6px' }}
                                />
                            </div>
                        )}
                    </div>

                    {/* View Switcher */}
                    <div style={{ display: 'flex', background: 'var(--sidebar-bg)', borderRadius: 8, padding: 4, border: '1px solid var(--border-color)' }}>
                        <button
                            onClick={() => setViewMode('KANBAN')}
                            style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'KANBAN' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'KANBAN' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'KANBAN' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <Trello size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('LIST')}
                            title="List view"
                            style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'LIST' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'LIST' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'LIST' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <LayoutList size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('TABLE')}
                            title="Table view"
                            style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'TABLE' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'TABLE' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'TABLE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <Table2 size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('CALENDAR')}
                            title="Calendar view"
                            style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'CALENDAR' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'CALENDAR' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'CALENDAR' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <CalendarIcon size={16} />
                        </button>
                        <button
                            onClick={() => setViewMode('TIMELINE')}
                            title="Timeline view"
                            style={{ padding: '6px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: viewMode === 'TIMELINE' ? 'var(--bg-color)' : 'transparent', color: viewMode === 'TIMELINE' ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: viewMode === 'TIMELINE' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <Timer size={16} />
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <button
                        onClick={() => { setDefaultStatusForNew('TODO'); setIsNewModalOpen(true); }}
                        className="btn-primary"
                        style={{ padding: '6px 16px', fontSize: 13 }}
                    >
                        <Plus size={16} /> New Task
                    </button>
                </div>
            </div>

            {/* Board View */}
            {viewMode === 'KANBAN' && (
                <div style={{ display: 'flex', gap: 24, flex: 1, overflowX: 'auto', paddingBottom: 16 }}>
                    {COLUMNS.map(col => {
                        const colTasks = visibleTasks.filter(t => t.status === col.id);
                        return (
                            <div
                                key={col.id}
                                onDrop={(e) => handleDrop(e, col.id)}
                                onDragOver={handleDragOver}
                                style={{
                                    flex: '0 0 340px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    background: 'rgba(55,53,47,0.02)',
                                    borderRadius: 16,
                                    padding: 16,
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700 }}>
                                        {col.icon} {col.title}
                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>{colTasks.length}</span>
                                    </div>
                                    <button
                                        onClick={() => { setDefaultStatusForNew(col.id); setIsNewModalOpen(true); }}
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 4 }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-bg)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto' }}>
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
                                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-color)', borderRadius: 12, fontSize: 13 }}>
                                            No tasks yet
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
                                const canEditList = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;
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
                                            {task.assignee ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                                                        {task.assignee.photo ? <img src={task.assignee.photo} alt={task.assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : task.assignee.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <span>{task.assignee.name}</span>
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
                                            {task.relatedItem ? (
                                                <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                    {task.relatedItem.database?.icon || '📄'} {task.relatedItem.title}
                                                </span>
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
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <TaskCalendarView
                        tasks={visibleTasks}
                        currentUser={currentUser}
                        onDetail={setSelectedTask}
                        onUpdate={handleTaskUpdate}
                        onNewTaskWithDate={(dateStr) => {
                            // Can pre-fill date if NewTaskModal supports it, fallback to default behavior first
                            setDefaultStatusForNew('TODO');
                            setIsNewModalOpen(true);
                            // We would need to pass date into NewTaskModal if we want pre-fill
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
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
    const canEdit = currentUser.role === 'ADMIN' || task.assigneeId === currentUser.id;

    // Build the date display
    let dateDisplay = 'No date';
    if (task.startDate && task.dueDate && new Date(task.startDate).getTime() !== new Date(task.dueDate).getTime()) {
        dateDisplay = `${new Date(task.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (task.dueDate) {
        dateDisplay = new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    // Determine left border color based on status
    const statusColors: any = {
        'TODO': 'transparent',
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
                borderLeft: `3px solid ${statusColors[task.status] || 'var(--border-color)'}`,
                borderRadius: 12,
                padding: '16px 18px',
                cursor: canEdit ? 'grab' : 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                position: 'relative',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
            }}
            className="task-card"
        >
            <style>{`.task-card:active { cursor: grabbing !important; } .task-card:hover { border-color: ${canEdit ? 'var(--text-secondary)' : 'var(--border-color)'}; transform: ${canEdit ? 'translateY(-2px)' : 'none'}; box-shadow: 0 8px 16px rgba(0,0,0,0.05); }`}</style>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PriorityBadge priority={task.priority} />
                    {task.status === 'DONE' && <CheckCircle2 size={14} color="#2ecc71" />}
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
                            opacity: 0.5, transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 77, 79, 0.1)'; e.currentTarget.style.color = '#ff4d4f'; e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0.5'; }}
                        title="Delete task"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
            </div>

            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, color: 'var(--text-primary)' }}>
                {task.title}
            </div>

            {task.relatedItem && (
                <div style={{
                    fontSize: 11, color: 'var(--text-secondary)',
                    display: 'flex', gap: 6, alignItems: 'center',
                    background: 'var(--sidebar-bg)', padding: '4px 8px', borderRadius: 6,
                    width: 'fit-content', border: '1px solid var(--border-color)'
                }}>
                    <span style={{ display: 'flex', flexShrink: 0 }}>
                        {task.relatedItem.database?.icon ? <LucideIcon name={task.relatedItem.database.icon as any} size={12} color={task.relatedItem.database.iconColor || 'var(--text-primary)'} /> : '📄'}
                    </span>
                    <span style={{ maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{task.relatedItem.title}</span>
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <div style={{
                    fontSize: 11, display: 'flex', alignItems: 'center', gap: 5,
                    color: isOverdue ? '#ff4d4f' : 'var(--text-secondary)',
                    fontWeight: isOverdue ? 700 : 500
                }}>
                    <Clock size={12} />
                    <span style={{ letterSpacing: '0.02em' }}>{dateDisplay}</span>
                </div>

                {task.assignee ? (
                    <div title={`Assigned to ${task.assignee.name}`} style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--sidebar-bg)', border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>
                        {task.assignee.photo ? <img src={task.assignee.photo} alt={task.assignee.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : task.assignee.name.substring(0, 2).toUpperCase()}
                    </div>
                ) : (
                    <div title="Unassigned" style={{ width: 24, height: 24, borderRadius: '50%', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                        ?
                    </div>
                )}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'DONE') return <span style={{ fontSize: 11, background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>Done</span>;
    if (status === 'IN_PROGRESS') return <span style={{ fontSize: 11, background: 'rgba(52, 152, 219, 0.15)', color: '#3498db', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>In Progress</span>;
    return <span style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 8, fontWeight: 700 }}>To Do</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
    if (priority === 'HIGH') return <span style={{ fontSize: 10, background: 'rgba(255, 77, 79, 0.15)', color: '#ff4d4f', padding: '4px 8px', borderRadius: 8, fontWeight: 800 }}>HIGH</span>;
    if (priority === 'LOW') return <span style={{ fontSize: 10, background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 8, fontWeight: 700 }}>LOW</span>;
    return <span style={{ fontSize: 10, background: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', padding: '4px 8px', borderRadius: 8, fontWeight: 700 }}>MED</span>;
}
