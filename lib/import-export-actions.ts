'use server';

import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { requireAuth } from './auth';

const prisma = new PrismaClient();

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT: Generate CSV string from all content + properties
// ──────────────────────────────────────────────────────────────────────────────
export async function exportContentCSV(): Promise<string> {
    await requireAuth();

    const contents = await prisma.content.findMany({
        include: { author: true },
        orderBy: { createdAt: 'desc' }
    });

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { order: 'asc' }
    });

    // Build header row
    const baseHeaders = ['title', 'author', 'createdAt'];
    const propHeaders = properties.map((p: any) => p.name);
    const headers = [...baseHeaders, ...propHeaders];

    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const rows: string[] = [headers.map(escape).join(',')];

    for (const c of contents) {
        let customFields: Record<string, any> = {};
        try { customFields = JSON.parse(c.customFields || '{}'); } catch { /* skip */ }

        const base = [c.title, c.author?.name ?? '', c.createdAt.toISOString()];
        const propValues = properties.map((p: any) => customFields[p.id] ?? '');

        rows.push([...base, ...propValues].map(escape).join(','));
    }

    return rows.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT: Generate Markdown string from all content
// ──────────────────────────────────────────────────────────────────────────────
export async function exportContentMarkdown(): Promise<string> {
    await requireAuth();

    const contents = await prisma.content.findMany({
        include: { author: true },
        orderBy: { createdAt: 'desc' }
    });

    const properties = await prisma.propertyDefinition.findMany({
        orderBy: { order: 'asc' }
    });

    const docs: string[] = [];

    for (const c of contents) {
        let customFields: Record<string, any> = {};
        try { customFields = JSON.parse(c.customFields || '{}'); } catch { /* skip */ }

        const frontmatter = [
            '---',
            `title: "${c.title.replace(/"/g, '\\"')}"`,
            `author: ${c.author?.name ?? 'Unknown'}`,
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

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────
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
    if (/tanggal|date|deadline|deadline|waktu|time|tayang|produksi/.test(n)) return 'DATE';
    if (/link|url|tautan|website/.test(n)) return 'URL';
    if (/jumlah|count|angka|number|durasi|duration|harga|price|biaya/.test(n)) return 'NUMBER';
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
            return clean.replace(/[^0-9.-]/g, '');
        case 'CHECKBOX':
            const truthy = /^(true|1|yes|ya|check|checked|v)$/i.test(clean);
            return truthy ? 'true' : 'false';
        case 'MULTI_SELECT':
            // Normalize to "Item 1, Item 2"
            return clean.split(/[,;|]/).map(s => s.trim()).filter(Boolean).join(', ');
        default:
            return clean;
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// Helper: auto-create missing properties, and for SELECT/MULTI_SELECT
// collect unique values from allRows and store them as options
// ──────────────────────────────────────────────────────────────────────────────
async function ensurePropertiesExist(
    headers: string[],
    propByName: Map<string, any>,
    allRows?: Record<string, string>[],   // optional: used to collect SELECT options
    updateExistingOptions = false          // also update options for existing empty-option props
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

        // Collect unique non-empty values from this column for SELECT/MULTI_SELECT/STATUS
        let optionsJson: string | null = null;
        if (allRows && (type === 'SELECT' || type === 'MULTI_SELECT' || type === 'STATUS')) {
            const valSet = new Set<string>();
            for (const row of allRows) {
                const cell = (row[header] || '').trim();
                if (!cell) continue;
                // MULTI_SELECT may have comma-separated items
                cell.split(/[,|;]/).map((s: string) => s.trim()).filter(Boolean).forEach(s => valSet.add(s));
            }
            if (valSet.size > 0) optionsJson = JSON.stringify([...valSet]);
        }

        if (!propByName.has(header)) {
            // Create new property
            maxOrder++;
            const newProp = await prisma.propertyDefinition.create({
                data: {
                    name: displayName,
                    type,
                    order: maxOrder,
                    ...(optionsJson ? { options: optionsJson } : {})
                }
            });
            propByName.set(header, newProp);
            propByName.set(displayName.toLowerCase(), newProp);
            propByName.set(slugify(displayName), newProp);
            created.push(`${displayName} (${type})`);
        } else if (updateExistingOptions && optionsJson) {
            // Update options for existing property - MERGE unique items
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
                    // Refresh in map
                    propByName.set(header, { ...existingProp, options: JSON.stringify(merged) });
                }
            }
        }
    }

    return { propByName, created };
}

// ──────────────────────────────────────────────────────────────────────────────
// IMPORT: Parse CSV and create/update content rows
// ──────────────────────────────────────────────────────────────────────────────
export async function importContentCSV(csvText: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const user = await requireAuth();

    const existingProps = await prisma.propertyDefinition.findMany();
    const propByName = new Map<string, any>(existingProps.map((p: any) => [p.name.toLowerCase().trim(), p]));

    // 1. Strip UTF-8 BOM (Excel adds this)
    const cleaned = csvText.replace(/^\uFEFF/, '').trim();

    // 2. Auto-detect delimiter: comma, semicolon, or tab
    const firstLine = cleaned.split(/\r?\n/)[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;
    const delimiter = semicolonCount > commaCount && semicolonCount >= tabCount ? ';'
        : tabCount > commaCount ? '\t'
            : ',';

    const lines = cleaned.split(/\r?\n/);
    if (lines.length < 2) return { imported: 0, skipped: 0, errors: ['File is empty or has no data rows.'] };

    // 3. Robust CSV field parser (handles quoted fields with embedded commas)
    const parseRow = (line: string): string[] => {
        const result: string[] = [];
        let inQuote = false;
        let cur = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
                else { inQuote = !inQuote; }
            } else if (ch === delimiter && !inQuote) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };

    // 4. Parse headers — strip BOM, quotes, and whitespace
    const rawHeaders = parseRow(lines[0]);
    const headers = rawHeaders.map(h => h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').toLowerCase().trim());

    // 5. Auto-create missing properties
    const { propByName: updatedProps, created } = await ensurePropertiesExist(headers, propByName as Map<string, any>);

    const errors: string[] = [];
    errors.push(`[DEBUG] ${lines.length - 1} data rows | Delimiter: "${delimiter === '\t' ? 'TAB' : delimiter}" | Headers: [${headers.join(', ')}]`);
    if (created.length > 0) {
        errors.push(`[INFO] Auto-created ${created.length} new properties: ${created.join(', ')}`);
    }

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        try {
            const values = parseRow(lines[i]);
            const row: Record<string, string> = {};
            headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });

            const title = row['title'] || row['judul'] || row['name'] || row['nama'];
            if (!title) { skipped++; continue; }

            const platform = row['platform'] || row['channel'] || row['sosmed'] || 'General';
            const rawStatus = (row['status'] || row['state'] || row['kondisi'] || '').toUpperCase();
            const status = ['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED'].includes(rawStatus) ? rawStatus : 'DRAFT';
            const caption = row['caption'] || row['konten'] || row['isi'] || row['deskripsi'] || row['description'];
            const mediaUrl = row['mediaurl'] || row['media'] || row['url'] || row['link'];

            // Map all columns that match a property (auto-created or pre-existing)
            const customFields: Record<string, any> = {};
            for (const [key, val] of Object.entries(row)) {
                if (!val || BUILT_IN_HEADERS.has(key)) continue;
                const prop = updatedProps.get(key);
                if (prop) customFields[(prop as any).id] = val;
            }

            await prisma.content.create({
                data: {
                    title,
                    platform,
                    status,
                    caption: caption || null,
                    mediaUrl: mediaUrl || null,
                    customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
                    authorId: user.id
                }
            });

            imported++;
        } catch (err: any) {
            errors.push(`Row ${i}: ${err.message}`);
        }
    }

    revalidatePath('/content');
    return { imported, skipped, errors };
}

// ──────────────────────────────────────────────────────────────────────────────
// ANALYZE: Parse a CSV/Markdown file and return a conflict/mapping preview
// without writing anything to the database
// ──────────────────────────────────────────────────────────────────────────────
export interface AnalyzedRow {
    index: number;         // row index in file
    title: string;
    platform: string;
    status: string;
    conflict: boolean;     // true if a content with same title already exists
    existingId?: string;   // id of the existing content
}

export interface HeaderMapping {
    header: string;          // raw lowercased header from CSV
    displayName: string;     // human-readable version
    isNew: boolean;          // will be auto-created if no existingPropId
    detectedType: string;    // predicted type
    isBuiltIn: boolean;      // system fields like title
    included: boolean;       // whether to import this column
    existingPropId?: string; // matched existing property ID
    sampleValue?: string;    // first non-empty value from this column
}

export interface AnalyzeResult {
    rows: AnalyzedRow[];
    columnMappings: HeaderMapping[];
    totalRows: number;
    conflictCount: number;
    newPropCount: number;
    existingProperties: { id: string; name: string; type: string }[];
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

export async function analyzeImportCSV(csvText: string): Promise<AnalyzeResult> {
    await requireAuth();

    const existingProps = await prisma.propertyDefinition.findMany({ orderBy: { name: 'asc' } });
    const propMap = new Map<string, any>();
    for (const p of existingProps as any[]) {
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugify(p.name), p);
    }

    const { headers, rows } = parseCsvLines(csvText);

    // Build column mappings
    const columnMappings: HeaderMapping[] = headers.map(h => {
        const isBuiltIn = BUILT_IN_HEADERS.has(h);
        const prop = propMap.get(h) || propMap.get(slugify(h));

        // Find first non-empty value for this header
        let sampleValue = '';
        for (const r of rows) {
            if (r[h]) { sampleValue = r[h]; break; }
        }

        return {
            header: h,
            displayName: h.split(' ').map((w: string) => (w.charAt(0).toUpperCase() + w.slice(1))).join(' '),
            isNew: !isBuiltIn && !prop,
            detectedType: prop ? prop.type : detectPropertyType(h),
            isBuiltIn,
            included: true,
            existingPropId: prop?.id,
            sampleValue: sampleValue.slice(0, 40) + (sampleValue.length > 40 ? '...' : '')
        };
    });

    // Find conflicts
    const existingTitles = await prisma.content.findMany({ select: { id: true, title: true } });
    const titleMap = new Map(existingTitles.map((c: any) => [c.title.toLowerCase().trim(), c.id]));

    const analyzedRows: AnalyzedRow[] = rows.map((row, idx) => {
        const title = (row['title'] || row['judul'] || row['name'] || row['nama'] || '').trim();
        const existingId = titleMap.get(title.toLowerCase()) as string | undefined;
        return {
            index: idx + 1,
            title: title || '(no title)',
            platform: row['platform'] || row['channel'] || row['sosmed'] || 'General',
            status: row['status'] || 'DRAFT',
            conflict: !!existingId,
            existingId,
        };
    });

    return {
        rows: analyzedRows,
        columnMappings,
        totalRows: analyzedRows.length,
        conflictCount: analyzedRows.filter(r => r.conflict).length,
        newPropCount: columnMappings.filter(m => m.isNew).length,
        existingProperties: existingProps.map((p: any) => ({ id: p.id, name: p.name, type: p.type }))
    };
}


// ──────────────────────────────────────────────────────────────────────────────
// EXECUTE: Import with per-row conflict resolution decision
// ──────────────────────────────────────────────────────────────────────────────
// ──────────────────────────────────────────────────────────────────────────────
// EXECUTE: Import with per-row conflict resolution decision
// ──────────────────────────────────────────────────────────────────────────────
export type ConflictResolution = 'replace' | 'add' | 'skip';

export interface ImportOptions {
    csvText: string;
    globalResolution: ConflictResolution;           // default for conflicts
    perRowResolutions: Record<number, ConflictResolution>; // overrides by row index
    columnMappings: {
        header: string;
        included: boolean;
        isBuiltIn?: boolean;
        existingPropId?: string;
        detectedType: string;
    }[];
}

export async function executeImportCSV(opts: ImportOptions): Promise<{ imported: number; replaced: number; skipped: number; errors: string[] }> {
    const user = await requireAuth();

    const existingProps = await prisma.propertyDefinition.findMany();
    const { headers, rows } = parseCsvLines(opts.csvText);

    // ── Build a mapping map from front-end options ────────────────────────────
    const mappingMap = new Map<string, typeof opts.columnMappings[0]>();
    for (const m of opts.columnMappings) {
        if (m.included) mappingMap.set(m.header.toLowerCase(), m);
    }

    // Identify which headers we need to ensure in DB
    const headersToEnsure = opts.columnMappings
        .filter(m => m.included && !m.isBuiltIn && !m.existingPropId)
        .map(m => m.header);

    // Initial prop map for ensurePropertiesExist
    const propMap = new Map<string, any>();
    for (const p of existingProps as any[]) {
        propMap.set(p.id, p);
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugify(p.name), p);
    }

    // Step 2: Ensure all headers have a corresponding property definition
    // (If mapping says existingPropId, we use that. Otherwise we ensure/create)
    const { propByName: updatedProps } = await ensurePropertiesExist(
        headersToEnsure, propMap, rows, true
    );

    // Final consolidated mapping for row-by-row processing
    // Maps CSV Header -> Property Definition object
    const finalMapping = new Map<string, any>();
    for (const m of opts.columnMappings) {
        if (!m.included || BUILT_IN_HEADERS.has(m.header)) continue;

        // If user specified an existing ID, use it
        if (m.existingPropId) {
            const prop = propMap.get(m.existingPropId);
            if (prop) finalMapping.set(m.header, { ...prop, type: m.detectedType || prop.type });
        } else {
            // Otherwise use what ensured/created
            const prop = updatedProps.get(m.header);
            if (prop) finalMapping.set(m.header, { ...prop, type: m.detectedType || prop.type });
        }
    }

    // ── Fetch existing content titles and users for matching ─────────────────
    const [existingTitles, allUsers] = await Promise.all([
        prisma.content.findMany({ select: { id: true, title: true } }),
        prisma.user.findMany({ select: { id: true, name: true, email: true } }) as Promise<{ id: string; name: string | null; email: string }[]>
    ]);
    const titleMap = new Map<string, string>(existingTitles.map((c: any) => [c.title.toLowerCase().trim(), c.id]));
    const userByName = new Map<string, string>(allUsers.map((u: any) => [(u.name || '').toLowerCase().trim(), u.id]));
    const userByEmail = new Map<string, string>(allUsers.map((u: any) => [(u.email || '').toLowerCase().trim(), u.id]));
    const errors: string[] = [];
    let imported = 0, replaced = 0, skipped = 0;

    // Debug: show which headers resolved to properties
    const resolvedLog = Array.from(finalMapping.entries()).map(([h, p]) => `${h}→${p.name}(${p.type})`);
    errors.push(`[DEBUG] ${rows.length} rows | Mapping: [${resolvedLog.join(', ')}]`);

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        const title = (row['title'] || row['judul'] || row['name'] || row['nama'] || '').trim();
        if (!title) { skipped++; continue; }

        const existingId = titleMap.get(title.toLowerCase());
        const resolution = existingId
            ? (opts.perRowResolutions[rowIdx + 1] ?? opts.globalResolution)
            : 'add';

        if (resolution === 'skip') { skipped++; continue; }

        const platform = row['platform'] || row['channel'] || row['sosmed'] || 'General';
        const rawStatus = (row['status'] || row['state'] || row['kondisi'] || '').toUpperCase();
        const status = ['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED'].includes(rawStatus) ? rawStatus : 'DRAFT';
        const caption = row['caption'] || row['konten'] || row['isi'] || row['deskripsi'] || row['description'] || undefined;
        const mediaUrl = row['mediaurl'] || row['media'] || row['url'] || row['link'] || undefined;

        // Build customFields ── using finalMapping (Property ID as key)
        const customFields: Record<string, string> = {};
        for (const [colHeader, prop] of finalMapping.entries()) {
            const val = row[colHeader];
            if (val === undefined || val === null || val === '') continue;

            let normalized = normalizeValue(String(val), prop.type);

            // Special Case: PERSON matching
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
                    data: {
                        title, caption, mediaUrl,
                        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : undefined,
                    }
                });
                replaced++;
            } else {
                await prisma.content.create({
                    data: {
                        title, caption, mediaUrl,
                        customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
                        authorId: user.id
                    }
                });
                imported++;
            }
        } catch (err: any) {
            errors.push(`Row ${rowIdx + 1} "${title}": ${err.message}`);
        }
    }

    revalidatePath('/content');
    revalidatePath('/settings');
    revalidatePath('/');
    return { imported, replaced, skipped, errors };
}





// ──────────────────────────────────────────────────────────────────────────────
// IMPORT: Parse Markdown (frontmatter blocks separated by ---)
// ──────────────────────────────────────────────────────────────────────────────
export async function importContentMarkdown(mdText: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const user = await requireAuth();

    const properties = await prisma.propertyDefinition.findMany();
    // Build a flexible header → prop map (same strategy as CSV)
    const slugifyLocal = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const propMap = new Map<string, any>();
    for (const p of properties as any[]) {
        propMap.set(p.name.toLowerCase().trim(), p);
        propMap.set(slugifyLocal(p.name), p);
    }

    // Split documents by --- separator
    const documents = mdText.split(/\n---\n/).filter(d => d.includes('---'));
    const errors: string[] = [];
    let imported = 0;
    let skipped = 0;

    for (const doc of documents) {
        try {
            // Extract frontmatter
            const fmMatch = doc.match(/^---\n([\s\S]*?)\n---/);
            if (!fmMatch) { skipped++; continue; }

            const frontmatterLines = fmMatch[1].split('\n');
            const meta: Record<string, string> = {};
            for (const line of frontmatterLines) {
                const idx = line.indexOf(':');
                if (idx === -1) continue;
                const key = line.slice(0, idx).trim().toLowerCase();
                const val = line.slice(idx + 1).trim().replace(/^"|"$/g, '');
                meta[key] = val;
            }

            const title = meta['title'] || meta['judul'] || meta['name'];
            if (!title) { skipped++; continue; }

            const platform = meta['platform'] || meta['channel'] || 'General';
            const rawStatus = (meta['status'] || '').toUpperCase();
            const status = ['DRAFT', 'REVIEW', 'SCHEDULED', 'PUBLISHED'].includes(rawStatus) ? rawStatus : 'DRAFT';

            // Extract body text
            const bodyMatch = doc.match(/---\n[\s\S]*?\n---\n([\s\S]*)/);
            const caption = meta['caption'] || meta['konten'] || meta['isi'] || meta['deskripsi'] || (bodyMatch ? bodyMatch[1].replace(/^#[^\n]+\n/, '').trim() : '');
            const mediaUrl = meta['mediaurl'] || meta['media'] || meta['url'] || meta['link'];

            // Map frontmatter keys to custom properties with normalization
            const customFields: Record<string, any> = {};
            for (const [key, val] of Object.entries(meta)) {
                if (BUILT_IN_HEADERS.has(key)) continue;

                // Robust lookup
                const prop = propMap.get(key) || propMap.get(slugifyLocal(key));
                if (prop && val) {
                    const normalized = normalizeValue(val, prop.type);
                    if (normalized !== '') customFields[prop.id] = normalized;
                }
            }

            await prisma.content.create({
                data: {
                    title,
                    platform,
                    status,
                    caption: caption || null,
                    mediaUrl: mediaUrl || null,
                    customFields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : null,
                    authorId: user.id
                }
            });

            imported++;
        } catch (err: any) {
            errors.push(`Document: ${err.message}`);
        }
    }

    revalidatePath('/content');
    return { imported, skipped, errors };
}

