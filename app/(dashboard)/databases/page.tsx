import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../../../lib/auth';
import { getDatabases } from '../../../lib/database-actions';
import DatabasesClient from './DatabasesClient';

const prisma = new PrismaClient();

export default async function DatabasesPage() {
    const user = await requireAuth();
    const databases = await getDatabases();

    return (
        <div className="page-container fade-in" style={{ maxWidth: '100%', padding: '24px 40px' }}>
            <DatabasesClient databases={databases} isAdmin={user.role === 'ADMIN'} />
        </div>
    );
}
