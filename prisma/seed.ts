import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const staffPassword = await bcrypt.hash('staff123', 10);

    const users = [
        { email: 'admin@digitalteam.local', name: 'Admin (Creator)', role: 'ADMIN', password: adminPassword },
        { email: 'staff1@digitalteam.local', name: 'Staff Member 1', role: 'STAFF', password: staffPassword },
        { email: 'staff2@digitalteam.local', name: 'Staff Member 2', role: 'STAFF', password: staffPassword },
        { email: 'staff3@digitalteam.local', name: 'Staff Member 3', role: 'STAFF', password: staffPassword },
    ];

    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: { password: u.password },
            create: u,
        });
    }

    console.log('Seeded users with default passwords (admin123 / staff123).');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
