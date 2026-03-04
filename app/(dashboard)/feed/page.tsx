import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import Link from 'next/link';
import { Clapperboard, CheckCircle, FolderOpen, Inbox } from 'lucide-react';

const prisma = new PrismaClient();

// Define a common interface for the feed items
interface FeedItem {
    id: string;
    type: 'content' | 'task' | 'project';
    action: 'created' | 'updated';
    title: string;
    user: string;
    date: Date;
    link: string;
    icon: React.ReactNode;
}

export default async function FeedPage() {
    await requireAuth();

    // Fetch the 50 most recently updated contents
    const contents = await prisma.content.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: { author: { select: { name: true } } }
    });

    // Fetch the 50 most recently updated tasks
    const tasks = await prisma.task.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50,
        include: { assignee: { select: { name: true } }, project: { select: { name: true } } }
    });

    // Fetch the 50 most recently updated projects
    const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 50,
    });

    // Normalize and aggregate into a single array
    const feedItems: FeedItem[] = [];

    contents.forEach(c => {
        // Determine if created or updated (within a 5-second margin)
        const isNew = Math.abs(c.updatedAt.getTime() - c.createdAt.getTime()) < 5000;
        feedItems.push({
            id: `content-${c.id}`,
            type: 'content',
            action: isNew ? 'created' : 'updated',
            title: c.title,
            user: c.author?.name || 'Unknown',
            date: c.updatedAt,
            link: `/content/${c.id}`,
            icon: <Clapperboard size={20} />
        });
    });

    tasks.forEach(t => {
        const isNew = Math.abs(t.updatedAt.getTime() - t.createdAt.getTime()) < 5000;
        let titleStr = t.title;
        if (t.project) titleStr += ` (Project: ${t.project.name})`;
        feedItems.push({
            id: `task-${t.id}`,
            type: 'task',
            action: isNew ? 'created' : 'updated',
            title: titleStr,
            user: t.assignee?.name || 'System',
            date: t.updatedAt,
            link: '/tasks',
            icon: <CheckCircle size={20} />
        });
    });

    projects.forEach(p => {
        const isNew = Math.abs(p.updatedAt.getTime() - p.createdAt.getTime()) < 5000;
        feedItems.push({
            id: `project-${p.id}`,
            type: 'project',
            action: isNew ? 'created' : 'updated',
            title: p.name,
            user: 'System', // Projects don't have an owner in the current schema
            date: p.updatedAt,
            link: '/projects',
            icon: <FolderOpen size={20} />
        });
    });

    // Sort all items globally by date descending
    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Take the top 100 overall
    const topFeedItems = feedItems.slice(0, 100);

    return (
        <div className="page-container fade-in" style={{ padding: '24px 40px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 className="page-title" style={{ marginBottom: 32 }}>Activity Feed</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topFeedItems.length === 0 ? (
                    <div className="glass-card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'inline-block', padding: 24, borderRadius: '50%', background: 'rgba(55,53,47,0.05)', marginBottom: 24 }}>
                            <Inbox size={48} color="var(--text-secondary)" />
                        </div>
                        <h3 style={{ marginBottom: 8 }}>No activity yet</h3>
                        <p>When tasks, content, or projects are created or updated, they will appear here.</p>
                    </div>
                ) : (
                    topFeedItems.map(item => (
                        <div key={item.id} className="glass-card feed-item" style={{
                            padding: '16px 20px',
                            display: 'flex',
                            gap: 16,
                            alignItems: 'flex-start',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            cursor: 'pointer'
                        }}>
                            <div style={{
                                fontSize: 24,
                                background: 'rgba(255,255,255,0.05)',
                                padding: 12,
                                borderRadius: 12,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {item.icon}
                            </div>

                            <div style={{ flex: 1, paddingTop: 4 }}>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.user}</span>
                                    {' '}
                                    {item.action === 'created' ? (
                                        <span style={{ color: '#52c41a' }}>created a new {item.type}</span>
                                    ) : (
                                        <span style={{ color: '#1890ff' }}>updated {item.type === 'content' ? 'content' : `a ${item.type}`}</span>
                                    )}
                                </div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
                                    <Link href={item.link} className="hover-link" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                        {item.title}
                                    </Link>
                                </h3>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {formatTimeAgo(item.date)} • {new Date(item.date).toLocaleDateString()} at {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <Link href={item.link} style={{
                                padding: '6px 12px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: 6,
                                fontSize: 12,
                                color: 'var(--text-primary)',
                                textDecoration: 'none',
                                fontWeight: 500,
                                marginTop: 4
                            }}>
                                View ↗
                            </Link>
                        </div>
                    ))
                )}
            </div>

            <style>{`
                .feed-item:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    border-color: rgba(255,255,255,0.15);
                }
                .hover-link:hover {
                    color: #1890ff !important;
                }
            `}</style>
        </div>
    );
}

// Simple time ago formatter
function formatTimeAgo(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " mins ago";
    return Math.floor(seconds) + " secs ago";
}
