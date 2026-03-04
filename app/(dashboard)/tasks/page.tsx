import { getTasks, getUserOptions } from '../../../lib/actions';
import { getCurrentUser } from '../../../lib/auth';
import TasksClient from './TasksClient';

export default async function TasksPage() {
    const tasks = await getTasks();
    const userOptions = await getUserOptions();
    const currentUser = await getCurrentUser();

    return (
        <div className="fade-in" style={{ padding: '24px 40px', width: '100%' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>Team Tasks</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                    {currentUser?.role === 'ADMIN'
                        ? "Comprehensive overview of all team assignments and schedules."
                        : "Your personal roadmap and assignments."}
                </p>
            </div>

            <TasksClient
                initialTasks={JSON.parse(JSON.stringify(tasks))}
                userOptions={JSON.parse(JSON.stringify(userOptions))}
                isAdmin={currentUser?.role === 'ADMIN'}
            />
        </div>
    );
}
