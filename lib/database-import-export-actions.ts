'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

const BUILT_IN_HEADERS = new Set([
    'title', 'judul', 'name', 'nama',
    'caption', 'konten', 'isi', 'description', 'deskripsi',
    'mediaurl', 'media', 'url', 'link'
]);

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function detectPropertyType(header: string): string {
    const n = header.toLowerCase();
    if (/status|state|kondisi|tahap/.test(n)) return 'STATUS';
    if (/editor|penulis|perekam|desain|author|pic|penanggung|assignee|creator/.test(n)) return 'PERSON';
    if (/tags|label|kategori|category|topik|topic/.test(n)) return 'MULTI_SELECT';
    if (/jenis|tipe|type|sosmed|platform|channel|unit|bulan|month|place|lokasi|tempat/.test(n)) return 'SELECT';
    if (/tanggal|date|deadline|waktu|time|tayang|produksi/.test(n)) return 'DATE';
    if (/link|url|tautan|website/.test(n)) return 'URL';
    if (/harga|price|biaya|currency|rp|usd|uang/.test(n)) return 'CURRENCY';
    if (/persen|percent|persentase|percentage|rate/.test(n)) return 'PERCENT';
    if (/jumlah|count|angka|number|durasi|duration/.test(n)) return 'NUMBER';
    if (/done|selesai|active|aktif|check/.test(n)) return 'CHECKBOX';
    return 'TEXT';
}

function normalizeValue(v: string, type: string): string {
    if (!v) return '';
    const clean = v.trim();
    switch (type) {
        case 'DATE':
            const d = new Date(clean);
            return isNaN(d.getTime()) ? clean : d.toISOString().split('T')[0];
        case 'NUMBER':
        case 'CURRENCY':
        case 'PERCENT':
            return clean.replace(/[^0-9.-]/g, '');
        case 'CHECKBOX':
            return /^(true|1|yes|ya|check|checked|v)$/i.test(clean) ? 'true' : 'false';
        case 'MULTI_SELECT':
            return clean.split(/[,;|]/).map(s => s.trim()).filter(Boolean).join(', ');
        default:
            return clean;
    }
}

function parseCsvLines(csvText: string): { headers: string[]; rows: Record<string, string>[]; delimiter: string } {
    const cleaned = csvText.replace(/^\uFEFF/, '').trim();
    const firstLine = cleaned.split(/\r?\n/)[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter = semicolonCount > commaCount && semicolonCount >= tabCount ? ';'
        : tabCount > commaCount ? '\t' : ',';

    const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let inQuote = false, cur = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else { inQuote = !inQuote; }
            } else if (ch === delimiter && !inQuote) { result.push(cur.trim()); cur = ''; }
            else { cur += ch; }
        }
        result.push(cur.trim());
        return result;
    };

    const lines = cleaned.split(/\r?\n/);
    const rawHeaders = parseRow(lines[0]);
    const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').toLowerCase().trim());
    const rows: Record<string, string>[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = parseRow(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = (vals[idx] ?? '').trim(); });
        rows.push(row);
    }
    return { headers, rows, delimiter };
}

async function ensureDbPropertiesExist(
    headers: string[],
    propByName: Map<string, any>,
    databaseId: string,
    workspaceId: string,
    allRows?: Record<string, string>[],
    updateExistingOptions = false,
): Promise<{ propByName: Map<string, any>; created: string[] }> {
    const created: string[] = [];
    let maxOrder = 0;
    for (const [, p] of propByName) {
        if ((p as any).order > maxOrder) maxOrder = (p as any).order;
    }

    for (const header of headers) {
        if (BUILT_IN_HEADERS.has(header)) continue;
        const type = propByName.has(header) ? (propByName.get(header) as any).type : detectPropertyType(header);
        const displayName = header.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        let optionsJson: string | null = null;
        if (allRows && (type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS')) {
            const valSet = new Set<string>();
            for (const row of allRows) {
                const cell = (row[header] || '').trim();
                if (!cell) continue;
                cell.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean).forEach(s => valSet.add(s));
            }
            if (valSet.size > 0) optionsJson = JSON.stringify([...valSet]);
        }

        if (!propByName.has(header)) {
            maxOrder++;
            const newProp = await prisma.propertyDefinition.create({
                data: {
                    name: displayName, type, order: maxOrder,
                    workspaceId, databaseId,
                    ...(optionsJson ? { options: optionsJson } : {}),
                }
            });
            propByName.set(header, newProp);
            propByName.set(displayName.toLowerCase(), newProp);
            propByName.set(slugify(displayName), newProp);
            created.push(`${displayName} (${type})`);
        } else if (updateExistingOptions && optionsJson) {
            const existingProp = propByName.get(header) as any;
            if (type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS') {
                const currentOptions: string[] = existingProp.options ? JSON.parse(existingProp.options) : [];
                const importedOptions: string[] = JSON.parse(optionsJson);
                const merged = [...new Set([...currentOptions, ...importedOptions])];
                if (merged.length > currentOptions.length) {
                    await prisma.propertyDefinition.update({
                        where: { id: existingProp.id },
                        data: { options: JSON.stringify(merged) }
                    });
                    propByName.set(header, { ...existingProp, options: JSON.stringify(merged) });
                }
            }
        }
    }
    return { propByName, created };
}

// ── EXPORT ────────────────────────────────────────────────────────────────────

export async function exportDatabaseCSV(databaseId: string): Promise<string> {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can export data.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const contents = await prisma.content.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        include: { author: true },
        orderBy: { createdAt: 'desc' }
    });
    const properties = await prisma.propertyDefinition.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { order: 'asc' }
    });

    const baseHeaders = ['title', 'author', 'createdAt'];
    const propHeaders = properties.map((p: any) => p.name);
    const headers = [...baseHeaders, ...propHeaders];
    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows: string[] = [headers.map(escape).join(',')];

    for (const c of contents) {
        let customFields: Record<string, any> = {};
        try { customFields = JSON.parse(c.customFields || '{}'); } catch { /* skip */ }
        const base = [c.title, (c.author as any)?.name ?? '', c.createdAt.toISOString()];
        const propValues = properties.map((p: any) => customFields[p.id] ?? '');
        rows.push([...base, ...propValues].map(escape).join(','));
    }
    return rows.join('\n');
}

export async function exportDatabaseMarkdown(databaseId: string): Promise<string> {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can export data.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const contents = await prisma.content.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        include: { author: true },
        orderBy: { createdAt: 'desc' }
    });
    const properties = await prisma.propertyDefinition.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { order: 'asc' }
    });

    const docs: string[] = [];
    for (const c of contents) {
        let customFields: Record<string, any> = {};
        try { customFields = JSON.parse(c.customFields || '{}'); } catch { /* skip */ }
        const frontmatter = [
            '---',
            `title: "${c.title.replace(/"/g, '\\"')}"`,
            `author: ${(c.author as any)?.name ?? 'Unknown'}`,
            `createdAt: ${c.createdAt.toISOString()}`,
            ...properties.map((p: any) => `${p.name}: ${customFields[p.id] ?? ''}`),
            '---',
            '',
            `# ${c.title}`,
            '',
            c.caption ? `${c.caption}\n` : '',
        ].join('\n');
        docs.push(frontmatter);
    }
    return docs.join('\n\n---\n\n');
}

// ── ANALYZE ───────────────────────────────────────────────────────────────────

export interface AnalyzedRow { index: number; title: string; conflict: boolean; existingId?: string; }
export interface HeaderMapping {
    header: string; displayName: string; isNew: boolean; detectedType: string;
    isBuiltIn: boolean; included: boolean; existingPropId?: string; sampleValue?: string;
}
export interface AnalyzeResult {
    rows: AnalyzedRow[]; columnMappings: HeaderMapping[];
    totalRows: number; conflictCount: number; newPropCount: number;
    existingProperties: { id: string; name: string; type: string }[];
}
export type ConflictResolution = 'replace' | 'add' | 'skip';
export interface ImportOptions {
    csvText: string;
    globalResolution: ConflictResolution;
    perRowResolutions: Record<number, ConflictResolution>;
    columnMappings: { header: string; included: boolean; isBuiltIn?: boolean; existingPropId?: string; detectedType: string; }[];
}

export async function analyzeDatabaseImportCSV(databaseId: string, csvText: string): Promise<AnalyzeResult> {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can perform import analysis.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const existingProps = await prisma.propertyDefinition.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        orderBy: { name: 'asc' }
    });
    const propMap = new Map<string, any>();
    for (const p of existingProps as any[]) {
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugify(p.name), p);
    }

    const { headers, rows } = parseCsvLines(csvText);
    const columnMappings: HeaderMapping[] = headers.map(h => {
        const isBuiltIn = BUILT_IN_HEADERS.has(h);
        const prop = propMap.get(h) || propMap.get(slugify(h));
        let sampleValue = '';
        for (const r of rows) { if (r[h]) { sampleValue = r[h]; break; } }
        return {
            header: h,
            displayName: h.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
            isNew: !isBuiltIn && !prop,
            detectedType: prop ? prop.type : detectPropertyType(h),
            isBuiltIn, included: true,
            existingPropId: prop?.id,
            sampleValue: sampleValue.slice(0, 40) + (sampleValue.length > 40 ? '...' : '')
        };
    });

    const existingTitles = await prisma.content.findMany({
        where: { databaseId, workspaceId: user.activeWorkspaceId },
        select: { id: true, title: true }
    });
    const titleMap = new Map(existingTitles.map((c: any) => [c.title.toLowerCase().trim(), c.id]));
    const analyzedRows: AnalyzedRow[] = rows.map((row, idx) => {
        const title = (row['title'] || row['judul'] || row['name'] || row['nama'] || '').trim();
        const existingId = titleMap.get(title.toLowerCase()) as string | undefined;
        return { index: idx + 1, title: title || '(no title)', conflict: !!existingId, existingId };
    });

    return {
        rows: analyzedRows, columnMappings, totalRows: analyzedRows.length,
        conflictCount: analyzedRows.filter(r => r.conflict).length,
        newPropCount: columnMappings.filter(m => m.isNew).length,
        existingProperties: existingProps.map((p: any) => ({ id: p.id, name: p.name, type: p.type }))
    };
}

// ── EXECUTE CSV ───────────────────────────────────────────────────────────────

export async function executeDatabaseImportCSV(databaseId: string, opts: ImportOptions): Promise<{ imported: number; replaced: number; skipped: number; errors: string[] }> {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can execute data import.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const existingProps = await prisma.propertyDefinition.findMany({ where: { databaseId, workspaceId: user.activeWorkspaceId } });
    const { rows } = parseCsvLines(opts.csvText);

    const propMap = new Map<string, any>();
    for (const p of existingProps as any[]) {
        propMap.set(p.id, p);
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugify(p.name), p);
    }

    const headersToEnsure = opts.columnMappings
        .filter(m => m.included && !m.isBuiltIn && !m.existingPropId)
        .map(m => m.header);

    const { propByName: updatedProps } = await ensureDbPropertiesExist(
        headersToEnsure, propMap, databaseId, user.activeWorkspaceId, rows, true
    );

    const finalMapping = new Map<string, any>();
    for (const m of opts.columnMappings) {
        if (!m.included || BUILT_IN_HEADERS.has(m.header)) continue;
        if (m.existingPropId) {
            const prop = propMap.get(m.existingPropId);
            if (prop) finalMapping.set(m.header, { ...prop, type: m.detectedType || prop.type });
        } else {
            const prop = updatedProps.get(m.header);
            if (prop) finalMapping.set(m.header, { ...prop, type: m.detectedType || prop.type });
        }
    }

    const [existingTitles, allUsers] = await Promise.all([
        prisma.content.findMany({ where: { databaseId, workspaceId: user.activeWorkspaceId }, select: { id: true, title: true } }),
        prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true } }) as Promise<{ id: string; name: string | null; email: string }[]>
    ]);
    const titleMap = new Map<string, string>(existingTitles.map((c: any) => [c.title.toLowerCase().trim(), c.id]));
    const userByName = new Map<string, string>(allUsers.map(u => [(u.name || '').toLowerCase().trim(), u.id]));
    const userByEmail = new Map<string, string>(allUsers.map(u => [(u.email || '').toLowerCase().trim(), u.id]));
    const errors: string[] = [];
    let imported = 0, replaced = 0, skipped = 0;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const title = (row['title'] || row['judul'] || row['name'] || row['nama'] || '').trim();
        if (!title) { skipped++; continue; }

        const existingId = titleMap.get(title.toLowerCase());
        const resolution = existingId ? (opts.perRowResolutions[rowIdx + 1] ?? opts.globalResolution) : 'add';
        if (resolution === 'skip') { skipped++; continue; }

        const caption = row['caption'] || row['konten'] || row['isi'] || row['deskripsi'] || row['description'] || undefined;
        const mediaUrl = row['mediaurl'] || row['media'] || undefined;

        const customFields: Record<string, string> = {};
        for (const [colHeader, prop] of finalMapping.entries()) {
            const val = row[colHeader];
            if (!val) continue;
            let normalized = normalizeValue(String(val), prop.type);
            if (prop.type === 'PERSON') {
                const search = String(val).toLowerCase().trim();
                const matchedId = userByEmail.get(search) || userByName.get(search);
                if (matchedId) normalized = matchedId;
            }
            if (normalized !== '') customFields[prop.id] = normalized;
        }

        try {
            if (resolution === 'replace' && existingId) {
                await prisma.content.update({
                    where: { id: existingId },
                    data: { title, caption, mediaUrl, customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : undefined }
                });
                replaced++;
            } else {
                await prisma.content.create({
                    data: {
                        title, caption, mediaUrl,
                        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
                        authorId: user.id,
                        workspaceId: user.activeWorkspaceId,
                        databaseId,
                    }
                });
                imported++;
            }
        } catch (err: any) {
            errors.push(`Row ${rowIdx + 1} "${title}": ${err.message}`);
        }
    }

    revalidatePath(`/databases/${databaseId}`);
    return { imported, replaced, skipped, errors };
}

// ── IMPORT MARKDOWN ───────────────────────────────────────────────────────────

export async function importDatabaseMarkdown(databaseId: string, mdText: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const user = await requireAuth();
    if (user.role !== 'ADMIN') throw new Error('Only admins can import data.');
    if (!user.activeWorkspaceId) throw new Error('No active workspace');

    const properties = await prisma.propertyDefinition.findMany({ where: { databaseId, workspaceId: user.activeWorkspaceId } });
    const propMap = new Map<string, any>();
    for (const p of properties as any[]) {
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugify(p.name), p);
    }

    const documents = mdText.split(/\n---\n/).filter(d => d.includes('---'));
    const errors: string[] = [];
    let imported = 0, skipped = 0;

    for (const doc of documents) {
        try {
            const fmMatch = doc.match(/^---\n([\s\S]*?)\n---/);
            if (!fmMatch) { skipped++; continue; }

            const meta: Record<string, string> = {};
            for (const line of fmMatch[1].split('\n')) {
                const idx = line.indexOf(':');
                if (idx === -1) continue;
                meta[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
            }

            const title = meta['title'] || meta['judul'] || meta['name'];
            if (!title) { skipped++; continue; }

            const bodyMatch = doc.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
            const caption = meta['caption'] || meta['konten'] || meta['isi'] || (bodyMatch ? bodyMatch[1].replace(/^#[^\n]+\n/, '').trim() : '');
            const mediaUrl = meta['mediaurl'] || meta['media'] || meta['url'] || meta['link'];

            const customFields: Record<string, any> = {};
            for (const [key, val] of Object.entries(meta)) {
                if (BUILT_IN_HEADERS.has(key)) continue;
                const prop = propMap.get(key) || propMap.get(slugify(key));
                if (prop && val) {
                    const normalized = normalizeValue(val, prop.type);
                    if (normalized !== '') customFields[prop.id] = normalized;
                }
            }

            await prisma.content.create({
                data: {
                    title, caption: caption || null, mediaUrl: mediaUrl || null,
                    customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
                    authorId: user.id,
                    workspaceId: user.activeWorkspaceId,
                    databaseId,
                }
            });
            imported++;
        } catch (err: any) {
            errors.push(`Document: ${err.message}`);
        }
    }

    revalidatePath(`/databases/${databaseId}`);
    return { imported, skipped, errors };
}
