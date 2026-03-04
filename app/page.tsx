import { login } from "../lib/auth";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const resolvedParams = await searchParams;
    const error = resolvedParams?.error as string | undefined;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-color)', padding: 24 }}>
            <div className="glass-card fade-in" style={{ width: 400, maxWidth: '100%', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: 'var(--accent-color)', borderRadius: 12, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, margin: '0 auto 16px' }}>
                    D
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>DigitalTeam OS</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: 14 }}>
                    Offline Content OS Workspace
                </p>

                {error && (
                    <div style={{ padding: 12, marginBottom: 16, background: 'rgba(255,77,79,0.1)', color: '#ff4d4f', borderRadius: 6, fontSize: 13, border: '1px solid rgba(255,77,79,0.2)' }}>
                        {error}
                    </div>
                )}

                <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Email</label>
                        <input
                            name="email"
                            type="email"
                            required
                            placeholder="admin@digitalteam.local"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-color)' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
                        <input
                            name="password"
                            type="password"
                            required
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: 6, background: 'var(--bg-color)' }}
                        />
                    </div>

                    <button
                        type="submit"
                        style={{
                            width: '100%',
                            padding: '12px',
                            marginTop: 8,
                            background: 'var(--text-primary)',
                            color: 'var(--bg-color)',
                            border: 'none',
                            borderRadius: 6,
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        Log In securely
                    </button>
                </form>

                <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Default Admin: admin@digitalteam.local / admin123
                </div>
            </div>
        </div>
    );
}
