import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import Link from 'next/link';

const prisma = new PrismaClient();

import { redirect } from 'next/navigation';

export default async function DashboardPage() {
    const user = await requireAuth();
    const anyUser = user as any;

    // If still no workspace after layout provisioning, redirect to trigger a
    // fresh request cycle so the provisioning in layout.tsx can complete.
    if (!anyUser.activeWorkspaceId) redirect('/dashboard');
    const workspaceId: string = anyUser.activeWorkspaceId;

    // Fetch Aggregated Metrics
    const totalUsers = await prisma.workspaceMember.count({
        where: { workspaceId }
    });

    // Content Metrics


    // Content Metrics
    const totalContent = await prisma.content.count({
        where: { workspaceId }
    });

    // Fetch Recent Activity (Limit to 5)
    const recentContentRaw = await prisma.content.findMany({
        where: { workspaceId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { author: { select: { id: true, name: true } } }
    });

    return (
        <div className="fade-in" style={{ padding: '0 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
                <div>
                    <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Dashboard Overview</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name}. Here&apos;s what&apos;s happening.</p>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border-color)' }}>
                    System Local Time: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Top Level Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 32 }}>

                <MetricCard
                    title="Total Content"
                    value={totalContent}
                    subtitle="Management assets"
                    icon="📝"
                    link="/content"
                    color="hsl(210, 100%, 65%)"
                />



                <MetricCard
                    title="Team Members"
                    value={totalUsers}
                    subtitle="Active across the OS"
                    icon="👥"
                    link="/settings"
                    color="hsl(30, 90%, 55%)"
                />

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>


                {/* Recent Content List */}
                <div className="glass-card" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Recent Content</h3>
                        <Link href="/content" style={{ fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>View All →</Link>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {recentContentRaw.length === 0 ? (
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '24px 0', textAlign: 'center' }}>No content found.</div>
                        ) : recentContentRaw.map((content: any) => (
                            <div key={content.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: 8, background: 'var(--sidebar-bg)', border: '1px solid transparent', transition: 'border-color 0.2s' }} className="hover-border">
                                <div>
                                    <div style={{ fontWeight: 500, marginBottom: 4 }}>{content.title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <span>By {content.author.name}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

        </div>
    );
}

// --- Helper Components ---

function MetricCard({ title, value, subtitle, icon, link, color }: { title: string, value: number, subtitle: string, icon: string, link: string, color: string }) {
    return (
        <Link href={link} className="glass-card" style={{ padding: 24, display: 'block', textDecoration: 'none', color: 'inherit', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s, box-shadow 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-secondary)' }}>{title}</div>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `color-mix(in srgb, ${color} 15%, transparent)`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    {icon}
                </div>
            </div>
            <div style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</div>

            {/* Subtle background glow */}
            <div style={{ position: 'absolute', bottom: -20, right: -20, width: 100, height: 100, background: color, filter: 'blur(50px)', opacity: 0.1, zIndex: 0, borderRadius: '50%' }} />
        </Link>
    );
}

function StatusBadge({ status }: { status: string }) {
    let bg = 'rgba(255,255,255,0.1)';
    let color = 'var(--text-primary)';

    if (status === 'DONE' || status === 'COMPLETED' || status === 'PUBLISHED') {
        bg = 'rgba(39, 174, 96, 0.15)';
        color = '#2ecc71';
    } else if (status === 'IN_PROGRESS' || status === 'ACTIVE') {
        bg = 'rgba(41, 128, 185, 0.15)';
        color = '#3498db';
    } else if (status === 'DRAFT') {
        bg = 'rgba(241, 196, 15, 0.15)';
        color = '#f1c40f';
    }

    return (
        <span style={{
            fontSize: 11,
            padding: '4px 8px',
            borderRadius: 12,
            background: bg,
            color: color,
            fontWeight: 600,
            letterSpacing: '0.05em'
        }}>
            {status.replace('_', ' ')}
        </span>
    );
}
