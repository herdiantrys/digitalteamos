import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '../../../lib/auth';

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Only admins can upload images.' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File too large. Max 5MB.' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Sanitize filename
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const safeName = `template-img-${Date.now()}.${ext}`;
        const uploadDir = join(process.cwd(), 'public', 'uploads');

        await mkdir(uploadDir, { recursive: true });
        await writeFile(join(uploadDir, safeName), buffer);

        const url = `/uploads/${safeName}`;
        return NextResponse.json({ url });
    } catch (err: any) {
        console.error('[upload-image]', err);
        return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
    }
}
