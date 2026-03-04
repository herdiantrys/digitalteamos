import { requireAuth } from '../../../lib/auth';

export default async function ProjectsPage() {
    await requireAuth();

    return (
        <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 className="page-title" style={{ marginBottom: 0 }}>Projects</h1>
                <button className="btn-primary">New Project</button>
            </div>

            <div className="glass-card" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>▣</div>
                <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 8, color: 'var(--text-primary)' }}>No Projects Yet</h3>
                <p>Create a project to organize your team's campaigns and tasks.</p>
            </div>
        </div>
    );
}
