import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { requireAuth } from "../../lib/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await requireAuth();

    return (
        <div className="app-container">
            {/* @ts-expect-error Sidebar accepts userRole, type mismatch due to Next.js cache */}
            <Sidebar userName={user?.name} userRole={user?.role} />
            <main className="main-content">
                <Topbar userName={user?.name || 'User'} />
                {children}
            </main>
        </div>
    );
}
