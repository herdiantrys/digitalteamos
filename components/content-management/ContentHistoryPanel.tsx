'use client';

import { useState, useEffect, useTransition } from 'react';
import { getContentHistory, restoreContentHistory } from '../../lib/history-actions';
import { History, RotateCcw, Clock, User, ChevronRight, AlertTriangle } from 'lucide-react';

type HistoryEntry = {
    id: string;
    snapshot: string;
    changedBy: string | null;
    changeDesc: string | null;
    createdAt: string;
};

function timeAgo(date: string) {
    const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
}

function formatDate(date: string) {
    return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

export default function ContentHistoryPanel({ contentId, onRestored }: {
    contentId: string;
    onRestored?: () => void;
}) {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        getContentHistory(contentId).then(data => {
            if (!cancelled) {
                setHistory(data as HistoryEntry[]);
                setLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [contentId, restoreMsg]);

    const handleRestore = (entry: HistoryEntry) => {
        setConfirmId(null);
        startTransition(async () => {
            try {
                await restoreContentHistory(entry.id);
                setRestoreMsg(`Restored to version: "${entry.changeDesc ?? formatDate(entry.createdAt)}"`);
                onRestored?.();
            } catch (e) {
                setRestoreMsg('Restore failed. Please try again.');
            }
        });
    };

    const selectedEntry = selectedId ? history.find(h => h.id === selectedId) : null;
    const selectedSnap = selectedEntry ? JSON.parse(selectedEntry.snapshot) : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 0 14px 0', borderBottom: '1px solid var(--border-color)' }}>
                <History size={16} color="#007aff" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Change History</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-secondary)', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: 10 }}>
                    {history.length} version{history.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Restore success/error toast */}
            {restoreMsg && (
                <div style={{
                    padding: '10px 14px', borderRadius: 8, background: restoreMsg.startsWith('Restored') ? 'rgba(52,199,89,0.1)' : 'rgba(255,77,79,0.1)',
                    color: restoreMsg.startsWith('Restored') ? '#34c759' : '#ff4d4f',
                    border: `1px solid ${restoreMsg.startsWith('Restored') ? '#34c75940' : '#ff4d4f40'}`,
                    fontSize: 13, marginTop: 12
                }}>
                    {restoreMsg}
                    <button onClick={() => setRestoreMsg(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, color: 'inherit' }}>✕</button>
                </div>
            )}

            {isPending && (
                <div style={{ padding: '10px 14px', marginTop: 12, borderRadius: 8, background: 'rgba(0,122,255,0.08)', color: '#007aff', fontSize: 13 }}>
                    ⏳ Restoring…
                </div>
            )}

            {/* Two-column layout: list + preview */}
            <div style={{ display: 'flex', gap: 0, flex: 1, overflow: 'hidden', marginTop: 14 }}>

                {/* Left: History list */}
                <div style={{ width: 240, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border-color)', paddingRight: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {loading && (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</div>
                    )}
                    {!loading && history.length === 0 && (
                        <div style={{ padding: '32px 8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                            <History size={24} strokeWidth={1.5} style={{ marginBottom: 8, opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                            No history yet.<br />
                            <span style={{ fontSize: 11, opacity: 0.7 }}>Changes will appear here after editing.</span>
                        </div>
                    )}
                    {history.map((entry, idx) => {
                        const isSelected = selectedId === entry.id;
                        const isFirst = idx === 0;
                        return (
                            <div
                                key={entry.id}
                                onClick={() => setSelectedId(isSelected ? null : entry.id)}
                                style={{
                                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                    background: isSelected ? 'rgba(0,122,255,0.1)' : 'var(--sidebar-bg)',
                                    border: isSelected ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
                                    transition: 'all 0.15s', position: 'relative'
                                }}
                            >
                                {isFirst && (
                                    <span style={{ position: 'absolute', top: -1, right: 8, fontSize: 9, fontWeight: 700, background: '#34c759', color: '#fff', padding: '1px 6px', borderRadius: 6 }}>LATEST</span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                    <Clock size={11} color={isSelected ? '#007aff' : 'var(--text-secondary)'} />
                                    <span style={{ fontSize: 11, color: isSelected ? '#007aff' : 'var(--text-secondary)', fontWeight: 600 }}>{timeAgo(entry.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {entry.changeDesc ?? 'Content change'}
                                </div>
                                {entry.changedBy && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <User size={10} color="var(--text-secondary)" />
                                        <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{entry.changedBy}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Right: Preview panel */}
                <div style={{ flex: 1, overflowY: 'auto', paddingLeft: 16 }}>
                    {!selectedEntry && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', gap: 8, opacity: 0.5 }}>
                            <ChevronRight size={28} strokeWidth={1.5} />
                            <span style={{ fontSize: 13 }}>Select a version to preview</span>
                        </div>
                    )}

                    {selectedEntry && selectedSnap && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Meta */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{selectedEntry.changeDesc ?? 'Content change'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{formatDate(selectedEntry.createdAt)} · by {selectedEntry.changedBy ?? 'Unknown'}</div>
                                </div>

                                {/* Restore button */}
                                {confirmId !== selectedEntry.id ? (
                                    <button
                                        onClick={() => setConfirmId(selectedEntry.id)}
                                        disabled={isPending}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 6,
                                            padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                                            background: 'rgba(0,122,255,0.1)', color: '#007aff',
                                            border: '1px solid rgba(0,122,255,0.25)',
                                            fontSize: 12, fontWeight: 700
                                        }}
                                    >
                                        <RotateCcw size={13} /> Restore this version
                                    </button>
                                ) : (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#f39c12', padding: '4px 10px', borderRadius: 8, background: 'rgba(243,156,18,0.08)', border: '1px solid rgba(243,156,18,0.2)' }}>
                                            <AlertTriangle size={11} /> Overwrite current?
                                        </div>
                                        <button onClick={() => handleRestore(selectedEntry)} disabled={isPending} style={{
                                            padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8,
                                            background: '#007aff', color: '#fff', border: 'none', cursor: 'pointer'
                                        }}>Yes, restore</button>
                                        <button onClick={() => setConfirmId(null)} style={{
                                            padding: '6px 10px', fontSize: 12, borderRadius: 8,
                                            background: 'var(--sidebar-bg)', color: 'var(--text-secondary)',
                                            border: '1px solid var(--border-color)', cursor: 'pointer'
                                        }}>Cancel</button>
                                    </div>
                                )}
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                            {/* Snapshot preview */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4 }}>Title</div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', padding: '8px 12px', background: 'var(--sidebar-bg)', borderRadius: 6 }}>{selectedSnap.title}</div>
                                </div>

                                {selectedSnap.caption && (
                                    <div>
                                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 4 }}>Caption / Content</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, padding: '8px 12px', background: 'var(--sidebar-bg)', borderRadius: 6, whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto' }}>
                                            {selectedSnap.caption}
                                        </div>
                                    </div>
                                )}

                                {selectedSnap.customFields && (() => {
                                    const fields = JSON.parse(selectedSnap.customFields) as Record<string, string>;
                                    const entries = Object.entries(fields);
                                    if (entries.length === 0) return null;
                                    return (
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>Properties</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                {entries.map(([k, v]) => (
                                                    <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                                                        <span style={{ color: 'var(--text-secondary)', minWidth: 80, flexShrink: 0, fontSize: 11 }}>{k.slice(0, 8)}…</span>
                                                        <span style={{ color: 'var(--text-primary)', background: 'var(--sidebar-bg)', padding: '2px 8px', borderRadius: 4 }}>{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
