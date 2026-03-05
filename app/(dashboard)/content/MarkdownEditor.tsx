'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { PenLine, FileDown, Expand, Shrink, Clock, Check } from 'lucide-react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

interface MarkdownEditorProps {
    value: string;
    onChange: (val: string) => void;
    contentTitle?: string;
    isSaving?: boolean;
}

export default function MarkdownEditor({ value, onChange, contentTitle, isSaving }: MarkdownEditorProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // Track initialization to avoid loop re-renders when setting initial content
    const [initialContentStr] = useState(value);

    // Initialize BlockNote editor
    const editor = useCreateBlockNote({});

    // Load initial content exactly once
    useEffect(() => {
        async function loadContent() {
            if (initialContentStr) {
                const blocks = await editor.tryParseMarkdownToBlocks(initialContentStr);
                editor.replaceBlocks(editor.document, blocks);
            }
        }
        loadContent();
    }, [editor, initialContentStr]);

    // Handle saving changes back to markdown string
    // useMemo + useCallback pattern to debounce/limit strict updates
    const handleEditorChange = useCallback(async () => {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
        // Only trigger onChange if the actual content changed, avoiding empty loops
        // blocknote markdown has slight formatting differences so we check stripped length roughly
        if (markdown.trim() !== value.trim()) {
            onChange(markdown);
        }
    }, [editor, onChange, value]);

    // Handle Esc key for fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const handlePDF = async () => {
        if (typeof window === 'undefined' || !printRef.current) return;
        const html2pdf = (await import('html2pdf.js')).default;

        const opt = {
            margin: [15, 15, 15, 15] as [number, number, number, number],
            filename: `${contentTitle || 'content'}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
        };

        html2pdf().set(opt).from(printRef.current).save();
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex', flexWrap: 'wrap', gap: 2,
        padding: '8px 12px',
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--border-color)',
        borderRadius: '10px 10px 0 0',
    };

    const editorContent = (
        <div style={isFullscreen ? {
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'var(--bg-color)',
            display: 'flex', flexDirection: 'column',
            padding: '24px 40px',
            overflow: 'hidden', fontFamily: 'inherit',
            margin: 0
        } : { display: 'flex', flexDirection: 'column', fontFamily: 'inherit' }}>

            {/* ── Top Toolbar ── */}
            <div style={toolbarStyle}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PenLine size={14} strokeWidth={2.5} /> Unified Editor
                </div>

                {/* PDF & Fullscreen Controls */}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                        onClick={handlePDF}
                        title="Download as PDF (A4)"
                        style={{
                            padding: '5px 14px', fontSize: 12, borderRadius: 6,
                            border: 'none', background: '#e74c3c', color: '#fff',
                            cursor: 'pointer', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'opacity 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                        <FileDown size={14} /> PDF
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        title="Toggle Fullscreen (Esc to exit)"
                        style={{
                            padding: '5px 14px', fontSize: 12, borderRadius: 6,
                            border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-primary)',
                            cursor: 'pointer', fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 5,
                            transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--border-color)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-color)'}
                    >
                        {isFullscreen ? <><Shrink size={14} /> Exit Fullscreen</> : <><Expand size={14} /> Fullscreen</>}
                    </button>
                </div>
            </div>

            {/* ── BlockNote Editor Pane ── */}
            <div
                ref={printRef}
                style={{
                    display: 'flex', flexDirection: 'column', gap: 0,
                    border: '1px solid var(--border-color)',
                    borderTop: 'none', borderRadius: '0 0 10px 10px',
                    overflowY: 'auto', minHeight: isFullscreen ? 0 : 480,
                    flex: isFullscreen ? 1 : undefined,
                    background: 'var(--bg-color)',
                    paddingTop: 16,
                    paddingBottom: 32
                }}
                className="custom-scrollbar"
            >
                {contentTitle && (
                    <div style={{ margin: '0 54px 24px', paddingBottom: 16, borderBottom: '2px solid var(--border-color)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>DigitalTeam — Content</div>
                        <h1 style={{ fontSize: '2.2em', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>{contentTitle}</h1>
                    </div>
                )}

                {/* 
                  BlockNote applies its own Mantine theme scoping.
                  We overwrite some basic styles to blend into our light/dark mode seamlessly.
                */}
                <style>{`
                    .bn-container { font-family: inherit; }
                    .bn-editor { padding-left: 24px !important; padding-right: 24px !important; }
                `}</style>
                <BlockNoteView editor={editor} onChange={handleEditorChange} theme="light" />
            </div>

            {/* Status bar */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--text-secondary)', padding: '4px 4px 0' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isSaving ? <><Clock size={12} /> Saving...</> : <><Check size={12} className="text-green-500" /> Saved</>}
                </span>
            </div>
        </div>
    );

    if (isFullscreen && typeof document !== 'undefined') {
        return createPortal(editorContent, document.body);
    }

    return editorContent;
}
