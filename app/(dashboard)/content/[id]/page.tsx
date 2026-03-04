import { notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { getContentById } from '../../../../lib/content-actions';
import ContentDetailClient from './ContentDetailClient';

const prisma = new PrismaClient();

export default async function ContentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const content = await getContentById(id);

    if (!content) {
        notFound();
    }

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { order: 'asc' }
    });

    const users = await prisma.user.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    const userOptionsRaw = JSON.stringify(users.map(u => u.name));

    return (
        <div className="page-container fade-in" style={{ padding: 0, height: '100%', overflow: 'hidden' }}>
            <ContentDetailClient
                initialContent={JSON.parse(JSON.stringify(content))}
                properties={JSON.parse(JSON.stringify(properties))}
                userOptionsRaw={userOptionsRaw}
            />
        </div>
    );
}
