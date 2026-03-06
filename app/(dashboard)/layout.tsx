import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import { requireAuth } from "../../lib/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    let user = await requireAuth();

    // ── WORKSPACE PROVISIONING ────────────────────────────────────────────────
    // Goal: every user must end up with activeWorkspaceId pointing to a
    // workspace they share with the rest of the team.
    //
    // Edge cases handled:
    //  1. No activeWorkspaceId at all  → provision
    //  2. STAFF with a solo/personal workspace → migrate to admin's workspace
    //  3. STAFF already a member of a shared workspace → keep as-is

    const needsMigration = async () => {
        if (!user.activeWorkspaceId) return true;
        if (user.role === 'ADMIN') return false; // admins manage their own workspaces

        // For STAFF: check if their active workspace is a true team workspace
        // (i.e., has at least one other member besides themselves)
        const memberCount = await prisma.workspaceMember.count({
            where: { workspaceId: user.activeWorkspaceId }
        });
        return memberCount <= 1; // solo workspace → migrate
    };

    if (await needsMigration()) {
        // Find the first admin-owned workspace in the system
        const adminWorkspace = await prisma.workspace.findFirst({
            orderBy: { createdAt: 'asc' }
        });

        if (adminWorkspace) {
            // Ensure member record exists (upsert to avoid duplicate key errors)
            await prisma.workspaceMember.upsert({
                where: { workspaceId_userId: { workspaceId: adminWorkspace.id, userId: user.id } },
                create: { workspaceId: adminWorkspace.id, userId: user.id, role: 'MEMBER' },
                update: {}
            });
            user = await prisma.user.update({
                where: { id: user.id },
                data: { activeWorkspaceId: adminWorkspace.id }
            });
        } else if (user.role === 'ADMIN') {
            // No workspace yet at all — create one for the admin
            const newWorkspace = await prisma.workspace.create({
                data: {
                    name: `${user.name.split(' ')[0]}'s Workspace`,
                    members: { create: { userId: user.id, role: 'ADMIN' } }
                }
            });
            user = await prisma.user.update({
                where: { id: user.id },
                data: { activeWorkspaceId: newWorkspace.id }
            });
        }
        // If still no workspace (edge case: no admin workspace + STAFF user)
        // user will see a graceful empty state — no crash
    }

    // Fetch user's workspaces for the switcher
    const memberships = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: { workspace: true },
        orderBy: { workspace: { name: 'asc' } }
    });
    const workspaces = memberships.map(m => m.workspace);

    // Fetch databases for this workspace (for Sidebar)
    const databases = user.activeWorkspaceId
        ? await prisma.database.findMany({
            where: { workspaceId: user.activeWorkspaceId },
            select: { id: true, name: true, icon: true, iconColor: true },
            orderBy: { createdAt: 'asc' }
        })
        : [];

    return (
        <div className="app-container">
            <Sidebar
                userName={user.name}
                userRole={user.role}
                workspaces={workspaces}
                activeWorkspaceId={user.activeWorkspaceId}
                databases={databases}
            />
            <main className="main-content">
                <Topbar userName={user.name} userPhoto={user.photo} />
                {children}
            </main>
        </div>
    );
}
