import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import Link from 'next/link';
import { Clapperboard, CheckCircle, Clock, Inbox, ChevronRight, User as UserIcon } from 'lucide-react';

const prisma = new PrismaClient();

// Define a common interface for the feed items
interface FeedItem {
    id: string;
    type: 'content' | 'task';
    action: 'created' | 'updated';
    title: string;
    userName: string;
    userPhoto: string | null;
    date: Date;
    link: string;
    icon: React.ReactNode;
    color: string;
}

export default async function FeedPage() {
    const currentUser = await requireAuth();
    const workspaceId = currentUser.activeWorkspaceId;
    if (!workspaceId) throw new Error('No active workspace');

    // Fetch the 50 most recently updated contents
    const contents = await prisma.content.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: {
            author: { select: { name: true, photo: true } },
            history: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { changedByUser: { select: { name: true, photo: true } } } as any
            } as any
        }
    });

    // Fetch the 50 most recently updated tasks
    const tasks = await prisma.task.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: 'desc' },
        take: 30,
        include: {
            creator: { select: { name: true, photo: true } },
            history: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                include: { changedByUser: { select: { name: true, photo: true } } } as any
            } as any
        }
    });

    // Normalize and aggregate into a single array
    const feedItems: FeedItem[] = [];
    const contentsAny = contents as any[];
    const tasksAny = tasks as any[];

    contentsAny.forEach(c => {
        // Determine if created or updated (within a 10-second margin)
        const isNew = Math.abs(c.updatedAt.getTime() - c.createdAt.getTime()) < 10000;

        // Use history to find who actually updated it if possible
        const lastHistory = c.history[0];

        // Correct logic: If brand new or no history, use author.
        // If history exists, use the updater (changedByUser) if we have the relation, 
        // otherwise fallback to the string name (changedBy) or author name.
        const displayUser = (isNew || !lastHistory)
            ? c.author?.name
            : (lastHistory.changedByUser?.name || lastHistory.changedBy || c.author?.name);

        // For photo: If brand new or no history, use author photo.
        // If history exists and we have a related user, ALWAYS use their photo (even if null).
        // Only if it's a legacy record (no changedByUser relation), fall back to author photo.
        const displayPhoto = (isNew || !lastHistory)
            ? c.author?.photo
            : (lastHistory.changedByUser ? lastHistory.changedByUser.photo : (lastHistory.changedBy ? null : c.author?.photo));

        feedItems.push({
            id: `content-${c.id}-${c.updatedAt.getTime()}`,
            type: 'content',
            action: isNew ? 'created' : 'updated',
            title: c.title,
            userName: displayUser || 'Someone',
            userPhoto: displayPhoto || null,
            date: c.updatedAt,
            link: `/content/${c.id}`,
            icon: <Clapperboard size={20} />,
            color: '#2eaadc'
        });
    });

    tasksAny.forEach(t => {
        const isNew = Math.abs(t.updatedAt.getTime() - t.createdAt.getTime()) < 10000;

        // Use history to find who actually updated it if possible
        const lastHistory = t.history[0];

        const displayUser = (isNew || !lastHistory)
            ? t.creator?.name
            : (lastHistory.changedByUser?.name || lastHistory.changedBy || t.creator?.name);

        const displayPhoto = (isNew || !lastHistory)
            ? t.creator?.photo
            : (lastHistory.changedByUser ? lastHistory.changedByUser.photo : (lastHistory.changedBy ? null : t.creator?.photo));

        feedItems.push({
            id: `task-${t.id}-${t.updatedAt.getTime()}`,
            type: 'task',
            action: isNew ? 'created' : 'updated',
            title: t.title,
            userName: displayUser || 'Someone',
            userPhoto: displayPhoto || null,
            date: t.updatedAt,
            link: `/tasks`,
            icon: <CheckCircle size={20} />,
            color: '#10b981'
        });
    });

    // Sort all items globally by date descending
    feedItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Take the top 50 overall
    const topFeedItems = feedItems.slice(0, 50);

    return (
        <div className="page-container fade-in" style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
            <div style={{ marginBottom: 40 }}>
                <h1 className="page-title" style={{ margin: 0, fontSize: '32px' }}>Activity Feed</h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '15px' }}>
                    Stay updated with the latest changes in your workspace.
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {topFeedItems.length === 0 ? (
                    <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'inline-block', padding: 24, borderRadius: '24px', background: 'rgba(55,53,47,0.03)', marginBottom: 24 }}>
                            <Inbox size={48} strokeWidth={1.5} />
                        </div>
                        <h3 style={{ marginBottom: 8, fontWeight: 600 }}>No activity found</h3>
                        <p>Actions like creating content or updating tasks will appear here.</p>
                    </div>
                ) : (
                    topFeedItems.map(item => {
                        const isRecent = (new Date().getTime() - item.date.getTime()) < 24 * 60 * 60 * 1000;
                        return (
                            <div key={item.id} className="feed-card-premium">
                                <div className="feed-icon-container" style={{ background: `${item.color}15`, color: item.color }}>
                                    {item.icon}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <span className="feed-type-tag" style={{ background: `${item.color}10`, color: item.color }}>
                                            {item.type}
                                        </span>
                                        {isRecent && <span className="new-activity-tag">NEW</span>}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <div style={{
                                            width: 20,
                                            height: 20,
                                            borderRadius: '50%',
                                            background: 'var(--border-color)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden'
                                        }}>
                                            {item.userPhoto ? (
                                                <img src={item.userPhoto} alt={item.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <UserIcon size={12} color="var(--text-secondary)" />
                                            )}
                                        </div>
                                        <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{item.userName}</span>
                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {item.action === 'created' ? 'published new' : 'refined the'} {item.type}
                                        </span>
                                    </div>

                                    <Link href={item.link} style={{ textDecoration: 'none', display: 'block' }}>
                                        <h3 className="hover-link" style={{
                                            margin: 0,
                                            fontSize: 17,
                                            fontWeight: 700,
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.4,
                                            letterSpacing: '-0.01em'
                                        }}>
                                            {item.title}
                                        </h3>
                                    </Link>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', fontSize: 12 }}>
                                            <Clock size={12} />
                                            {formatTimeAgo(item.date)}
                                        </div>
                                        <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--border-color)' }} />
                                        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                                            {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>

                                <Link href={item.link} style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    background: 'rgba(55,53,47,0.03)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-secondary)',
                                    transition: 'all 0.2s',
                                    textDecoration: 'none'
                                }} className="hover-icon-btn">
                                    <ChevronRight size={18} />
                                </Link>
                            </div>
                        );
                    })
                )}
            </div>

            <style>{`
                .hover-link { transition: color 0.2s; }
                .hover-link:hover { color: var(--accent-color) !important; }
                .hover-icon-btn:hover { 
                    background: var(--accent-color) !important; 
                    color: white !important;
                    transform: translateX(4px);
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
