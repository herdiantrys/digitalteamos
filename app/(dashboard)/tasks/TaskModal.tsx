'use client';

import { useState, useEffect, useTransition } from 'react';
import { createTask, updateTask, searchContent } from '../../../lib/actions';

export default function TaskModal({
    isOpen,
    onClose,
    onSave,
    editTask = null,
    userOptions = []
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    editTask?: any;
    userOptions?: any[];
}) {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState('TODO');
    const [assigneeId, setAssigneeId] = useState('');
    const [contentId, setContentId] = useState('');
    const [dueDate, setDueDate] = useState('');

    const [contentSearch, setContentSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (editTask) {
            setTitle(editTask.title || '');
            setContent(editTask.content || '');
            setStatus(editTask.status || 'TODO');
            setAssigneeId(editTask.assigneeId || '');
            setContentId(editTask.contentId || '');
            setDueDate(editTask.dueDate ? new Date(editTask.dueDate).toISOString().split('T')[0] : '');
            setContentSearch(editTask.linkedContent?.title || '');
        } else {
            setTitle('');
            setContent('');
            setStatus('TODO');
            setAssigneeId('');
            setContentId('');
            setDueDate(new Date().toISOString().split('T')[0]);
            setContentSearch('');
        }
    }, [editTask, isOpen]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (contentSearch.length > 1 && !contentId) {
                setIsSearching(true);
                const results = await searchContent(contentSearch);
                setSearchResults(results);
                setIsSearching(false);
            } else {
                setSearchResults([]);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [contentSearch, contentId]);

    const handleSave = () => {
        if (!title) return alert('Title is required');

        startTransition(async () => {
            const data = { title, content, status, assigneeId, contentId, dueDate };
            if (editTask) {
                await updateTask(editTask.id, data);
            } else {
                await createTask(data);
            }
            onSave();
            onClose();
        });
    };

    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div style={{ background: 'var(--bg-color)', width: '100%', maxWidth: 500, borderRadius: 16, padding: 32, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border-color)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: 20, fontWeight: 700 }}>{editTask ? 'Edit Task' : 'Create New Task'}</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Title</label>
                        <input
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Description</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder="Add more details..."
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none', minHeight: 80, resize: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Status</label>
                            <select
                                value={status}
                                onChange={e => setStatus(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none' }}
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="REVIEW">Review</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={e => setDueDate(e.target.value)}
                                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Assignee</label>
                        <select
                            value={assigneeId}
                            onChange={e => setAssigneeId(e.target.value)}
                            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none' }}
                        >
                            <option value="">Unassigned</option>
                            {userOptions.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div style={{ position: 'relative' }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Link to Content</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                value={contentSearch}
                                onChange={e => { setContentSearch(e.target.value); if (contentId) setContentId(''); }}
                                placeholder="Search content..."
                                style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', color: 'var(--text-primary)', outline: 'none' }}
                            />
                            {contentId && (
                                <button onClick={() => { setContentId(''); setContentSearch(''); }} style={{ background: 'transparent', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 14 }}>✕</button>
                            )}
                        </div>
                        {searchResults.length > 0 && !isSearching && !contentId && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: 8, marginTop: 4, zIndex: 10, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                                {searchResults.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => { setContentId(c.id); setContentSearch(c.title); setSearchResults([]); }}
                                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-color)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--sidebar-bg)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        {c.title}
                                    </div>
                                ))}
                            </div>
                        )}
                        {isSearching && <div style={{ position: 'absolute', right: 40, top: 38, fontSize: 11, opacity: 0.5 }}>Searching...</div>}
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 32 }}>
                    <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isPending}
                        style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--accent-color)', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: isPending ? 0.7 : 1 }}
                    >
                        {isPending ? 'Saving...' : (editTask ? 'Update Task' : 'Create Task')}
                    </button>
                </div>
            </div>
        </div>
    );
}
