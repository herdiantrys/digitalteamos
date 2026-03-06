'use client';

import { useState } from 'react';
import {
    exportDatabaseCSV,
    exportDatabaseMarkdown,
    analyzeDatabaseImportCSV,
    executeDatabaseImportCSV,
    importDatabaseMarkdown,
    type AnalyzeResult,
    type HeaderMapping,
    type AnalyzedRow,
    type ConflictResolution,
} from '../../../../lib/database-import-export-actions';
import { X, ArrowUpDown, Download, Upload, FileSpreadsheet, FileText, UploadCloud, AlertTriangle, Check, ArrowLeft, CheckCircle2 } from 'lucide-react';

type Tab = 'export' | 'import';

function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
}

const RESOLUTION_COLORS: Record<ConflictResolution, { bg: string; color: string }> = {
    replace: { bg: 'rgba(250,173,20,0.12)', color: '#faad14' },
    add: { bg: 'rgba(24,144,255,0.12)', color: '#1890ff' },
    skip: { bg: 'rgba(120,120,120,0.12)', color: '#888' },
};

export default function DatabaseImportExportPanel({ databaseId, userRole }: { databaseId: string; userRole?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    if (userRole !== 'ADMIN') return null;

    if (!isOpen) return (
        <button onClick={() => setIsOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 8, fontSize: 13, fontWeight: 500,
            border: '1px solid var(--border-color)', background: 'var(--sidebar-bg)',
            color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.15s'
        }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-color)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--sidebar-bg)')}
        >
            <span style={{ display: 'flex' }}><ArrowUpDown size={14} strokeWidth={2.5} /></span> Import / Export
        </button>
    );

    return (
        <>
            <div onClick={() => setIsOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }} />
            <PanelContent databaseId={databaseId} onClose={() => setIsOpen(false)} />
        </>
    );
}

function PanelContent({ databaseId, onClose }: { databaseId: string; onClose: () => void }) {
    const [tab, setTab] = useState<Tab>('export');

    return (
        <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            zIndex: 501, width: 640, maxWidth: '95vw', maxHeight: '90vh',
            background: 'var(--bg-color)', border: '1px solid var(--border-color)',
            borderRadius: 16, overflow: 'hidden',
            boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideUp 0.2s ease'
        }}>
            <style>{`@keyframes slideUp{from{opacity:0;transform:translate(-50%,-46%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', flexShrink: 0 }}>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Import / Export</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Transfer data via CSV or Markdown</div>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
            </div>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--sidebar-bg)', flexShrink: 0 }}>
                {(['export', 'import'] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: '10px', fontSize: 13, fontWeight: tab === t ? 700 : 400,
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: tab === t ? 'var(--text-primary)' : 'var(--text-secondary)',
                        borderBottom: tab === t ? '2px solid var(--text-primary)' : '2px solid transparent',
                        transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                    }}>{t === 'export' ? <><Download size={14} /> Export</> : <><Upload size={14} /> Import</>}</button>
                ))}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {tab === 'export' ? <ExportTab databaseId={databaseId} /> : <ImportWizard databaseId={databaseId} />}
            </div>
        </div>
    );
}

function ExportTab({ databaseId }: { databaseId: string }) {
    const [loading, setLoading] = useState(false);
    const handleCSV = async () => { setLoading(true); try { downloadFile(await exportDatabaseCSV(databaseId), `database-${Date.now()}.csv`, 'text/csv;charset=utf-8;'); } finally { setLoading(false); } };
    const handleMD = async () => { setLoading(true); try { downloadFile(await exportDatabaseMarkdown(databaseId), `database-${Date.now()}.md`, 'text/markdown'); } finally { setLoading(false); } };

    const ExportCard = ({ icon, title, desc, onClick }: any) => (
        <div onClick={!loading ? onClick : undefined} style={{
            display: 'flex', alignItems: 'center', gap: 16, padding: 16,
            background: 'var(--sidebar-bg)', borderRadius: 10,
            border: '1px solid var(--border-color)', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'border-color 0.2s', opacity: loading ? 0.6 : 1
        }}
            onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--border-color)')}
        >
            <span style={{ display: 'flex', color: 'var(--text-secondary)' }}>{icon}</span>
            <div><div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</div></div>
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', display: 'flex' }}><Download size={14} /></span>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Download all items and properties in this database.</p>
            <ExportCard icon={<FileSpreadsheet size={28} strokeWidth={1.5} />} title="Export as CSV" desc="Spreadsheet-compatible. All columns including custom properties." onClick={handleCSV} />
            <ExportCard icon={<FileText size={28} strokeWidth={1.5} />} title="Export as Markdown" desc="Each item as a document with YAML frontmatter." onClick={handleMD} />
            {loading && <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Generating…</div>}
        </div>
    );
}

type WizardStep = 'upload' | 'review' | 'done';

function ImportWizard({ databaseId }: { databaseId: string }) {
    const [step, setStep] = useState<WizardStep>('upload');
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [fileText, setFileText] = useState('');
    const [fileName, setFileName] = useState('');
    const [isMarkdown, setIsMarkdown] = useState(false);
    const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
    const [globalRes, setGlobalRes] = useState<ConflictResolution>('skip');
    const [perRowRes, setPerRowRes] = useState<Record<number, ConflictResolution>>({});
    const [colMappings, setColMappings] = useState<HeaderMapping[]>([]);
    const [result, setResult] = useState<{ imported: number; replaced: number; skipped: number; errors: string[] } | null>(null);

    const handleFile = async (file: File) => {
        const text = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase();
        const md = ext === 'md' || ext === 'markdown';
        setFileText(text); setFileName(file.name); setIsMarkdown(md);
        if (md) { setStep('review'); setAnalysis(null); return; }
        setLoading(true);
        try {
            const res = await analyzeDatabaseImportCSV(databaseId, text);
            setAnalysis(res); setColMappings(res.columnMappings); setStep('review');
        } finally { setLoading(false); }
    };

    const handleExecute = async () => {
        setLoading(true);
        try {
            if (isMarkdown) {
                const r = await importDatabaseMarkdown(databaseId, fileText);
                setResult({ imported: r.imported, replaced: 0, skipped: r.skipped ?? 0, errors: r.errors ?? [] });
            } else {
                const r = await executeDatabaseImportCSV(databaseId, { csvText: fileText, globalResolution: globalRes, perRowResolutions: perRowRes, columnMappings: colMappings });
                setResult(r);
            }
            setStep('done');
        } finally { setLoading(false); }
    };

    const reset = () => { setStep('upload'); setFileText(''); setFileName(''); setAnalysis(null); setResult(null); setPerRowRes({}); setColMappings([]); };

    if (step === 'upload') return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Upload a <strong>CSV</strong> or <strong>.md</strong> file. Columns are auto-matched to properties.</div>
            <label
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '40px 24px', borderRadius: 12, gap: 10,
                    border: `2px dashed ${dragOver ? 'rgba(255,255,255,0.5)' : 'var(--border-color)'}`,
                    background: dragOver ? 'rgba(255,255,255,0.04)' : 'var(--sidebar-bg)',
                    cursor: 'pointer', transition: 'all 0.2s'
                }}
            >
                <input type="file" accept=".csv,.md,.markdown" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                <span style={{ display: 'flex', color: 'var(--text-secondary)' }}><UploadCloud size={36} strokeWidth={1.5} /></span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{loading ? 'Analyzing file…' : 'Drop file here or click to browse'}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Accepted: .csv · .md · .markdown</span>
            </label>
            <div style={{ background: 'var(--sidebar-bg)', borderRadius: 8, padding: 12, fontSize: 11, color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                <div><strong style={{ color: 'var(--text-primary)' }}>CSV:</strong> <code>title,PropertyName,...</code></div>
                <div style={{ marginTop: 4 }}><strong style={{ color: 'var(--text-primary)' }}>Markdown:</strong> YAML frontmatter with <code>title:</code> + property keys</div>
            </div>
        </div>
    );

    if (step === 'review') {
        const conflicts = analysis ? analysis.rows.filter(r => r.conflict) : [];
        const conflictCount = conflicts.length;
        const PROP_TYPES = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'PERSON', 'CHECKBOX', 'URL', 'STATUS'];

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, background: 'var(--sidebar-bg)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <span style={{ display: 'flex', color: 'var(--text-secondary)' }}>{isMarkdown ? <FileText size={20} strokeWidth={1.5} /> : <FileSpreadsheet size={20} strokeWidth={1.5} />}</span>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{fileName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                            {analysis ? `${analysis.totalRows} rows` : 'Markdown'} ·{' '}
                            {conflictCount > 0
                                ? <span style={{ color: '#faad14' }}><AlertTriangle size={12} strokeWidth={3} style={{ display: 'inline' }} /> {conflictCount} conflict{conflictCount > 1 ? 's' : ''}</span>
                                : <span style={{ color: '#27ae60' }}><Check size={12} strokeWidth={3} style={{ display: 'inline' }} /> No conflicts</span>
                            }
                        </div>
                    </div>
                    <button onClick={reset} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>Change file</button>
                </div>

                {analysis && colMappings.length > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Column Mapping</div>
                        <div style={{ background: 'var(--sidebar-bg)', borderRadius: 10, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 500 }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <th style={th}>In</th>
                                            <th style={th}>Column & Sample</th>
                                            <th style={th}>Mapping To</th>
                                            <th style={th}>Type</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {colMappings.map((m, i) => (
                                            <tr key={m.header} style={{ borderBottom: i < colMappings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                                <td style={{ ...td, textAlign: 'center' }}>
                                                    <input type="checkbox" checked={m.included} onChange={e => setColMappings(prev => prev.map((c, ci) => ci === i ? { ...c, included: e.target.checked } : c))} style={{ accentColor: '#1890ff' }} />
                                                </td>
                                                <td style={td}>
                                                    <div style={{ fontWeight: 600, fontSize: 11 }}>{m.header}</div>
                                                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.7 }}>{m.sampleValue || '(empty)'}</div>
                                                </td>
                                                <td style={td}>
                                                    {m.isBuiltIn ? (
                                                        <span style={{ color: '#1890ff', fontWeight: 600, fontSize: 11 }}>System Field</span>
                                                    ) : (
                                                        <select value={m.existingPropId || 'NEW'} onChange={e => {
                                                            const propId = e.target.value;
                                                            setColMappings(prev => prev.map(cm => {
                                                                if (cm.header !== m.header) return cm;
                                                                if (propId === 'NEW') return { ...cm, existingPropId: undefined, isNew: true };
                                                                const found = analysis?.existingProperties.find(p => p.id === propId);
                                                                return { ...cm, existingPropId: propId, isNew: false, detectedType: found?.type || cm.detectedType };
                                                            }));
                                                        }} style={{ width: '100%', padding: '4px 6px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none' }}>
                                                            <option value="NEW">+ Create New Property</option>
                                                            <optgroup label="Existing Properties">
                                                                {analysis.existingProperties.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </optgroup>
                                                        </select>
                                                    )}
                                                </td>
                                                <td style={td}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <select value={m.detectedType} onChange={e => setColMappings(prev => prev.map((c, ci) => ci === i ? { ...c, detectedType: e.target.value } : c))} disabled={m.isBuiltIn}
                                                            style={{ padding: '4px 6px', fontSize: 11, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)', outline: 'none', opacity: m.isBuiltIn ? 0.5 : 1 }}>
                                                            {PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                        </select>
                                                        {m.isNew && !m.isBuiltIn && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#1890ff20', color: '#1890ff', fontWeight: 700 }}>NEW</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {conflictCount > 0 && (
                    <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conflict Resolution</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Default for all conflicts:</span>
                            {(['skip', 'replace', 'add'] as ConflictResolution[]).map(r => (
                                <button key={r} onClick={() => setGlobalRes(r)} style={{
                                    padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                                    border: `1px solid ${globalRes === r ? RESOLUTION_COLORS[r].color + '80' : 'var(--border-color)'}`,
                                    background: globalRes === r ? RESOLUTION_COLORS[r].bg : 'transparent',
                                    color: globalRes === r ? RESOLUTION_COLORS[r].color : 'var(--text-secondary)',
                                    fontWeight: globalRes === r ? 700 : 400, textTransform: 'capitalize'
                                }}>{r}</button>
                            ))}
                        </div>
                        <div style={{ background: 'var(--sidebar-bg)', borderRadius: 8, border: '1px solid var(--border-color)', maxHeight: 200, overflowY: 'auto' }}>
                            {conflicts.map((row: AnalyzedRow) => {
                                const cur = perRowRes[row.index] ?? globalRes;
                                return (
                                    <div key={row.index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: 'rgba(250,173,20,0.15)', color: '#faad14', fontWeight: 600, flexShrink: 0 }}>EXISTS</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 500, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                            {(['skip', 'replace', 'add'] as ConflictResolution[]).map(r => (
                                                <button key={r} onClick={() => setPerRowRes(prev => ({ ...prev, [row.index]: r }))} style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                                                    border: `1px solid ${cur === r ? RESOLUTION_COLORS[r].color + '80' : 'var(--border-color)'}`,
                                                    background: cur === r ? RESOLUTION_COLORS[r].bg : 'transparent',
                                                    color: cur === r ? RESOLUTION_COLORS[r].color : 'var(--text-secondary)',
                                                    fontWeight: cur === r ? 700 : 400
                                                }}>{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                    <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}><ArrowLeft size={14} /> Back</button>
                    <button onClick={handleExecute} disabled={loading} style={{
                        padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
                        background: loading ? 'rgba(255,255,255,0.1)' : 'var(--text-primary)',
                        color: 'var(--bg-color)', cursor: loading ? 'not-allowed' : 'pointer'
                    }}>{loading ? 'Importing…' : `Import ${analysis ? analysis.totalRows : ''} rows`}</button>
                </div>
            </div>
        );
    }

    if (step === 'done' && result) {
        const hasErrors = result.errors.length > 0;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: 20, borderRadius: 12, textAlign: 'center', background: hasErrors ? 'rgba(255,77,79,0.06)' : 'rgba(39,174,96,0.06)', border: `1px solid ${hasErrors ? 'rgba(255,77,79,0.3)' : 'rgba(39,174,96,0.3)'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: hasErrors ? '#ff4d4f' : '#27ae60' }}>
                        {hasErrors ? <AlertTriangle size={40} /> : <CheckCircle2 size={40} />}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{hasErrors ? 'Import completed with issues' : 'Import successful!'}</div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#27ae60' }}>{result.imported}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Added</div></div>
                        {result.replaced > 0 && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: '#faad14' }}>{result.replaced}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Replaced</div></div>}
                        <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-secondary)' }}>{result.skipped}</div><div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Skipped</div></div>
                    </div>
                </div>
                {hasErrors && (
                    <div style={{ background: 'rgba(255,77,79,0.06)', borderRadius: 8, padding: 12, border: '1px solid rgba(255,77,79,0.2)', maxHeight: 160, overflowY: 'auto' }}>
                        {result.errors.map((e, i) => <div key={i} style={{ fontSize: 12, color: '#ff4d4f', marginBottom: 4 }}>• {e}</div>)}
                    </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={reset} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>Import Another</button>
                </div>
            </div>
        );
    }

    return null;
}

const th = { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
const td = { padding: '7px 10px', verticalAlign: 'middle' as const };
