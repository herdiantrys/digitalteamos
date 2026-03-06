'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BlockNoteEditor, PartialBlock } from '@blocknote/core';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { PenLine, FileDown, Expand, Shrink, Clock, Check } from 'lucide-react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import ReactMarkdown from 'react-markdown';

interface MarkdownEditorProps {
    value: string;
    onChange: (val: string) => void;
    contentTitle?: string;
    isSaving?: boolean;
    /** Evaluated header template string (with placeholders already substituted) */
    headerContent?: string;
    /** Evaluated footer template string (with placeholders already substituted) */
    footerContent?: string;
    disabled?: boolean;
}

export default function MarkdownEditor({ value, onChange, contentTitle, isSaving, headerContent, footerContent, disabled }: MarkdownEditorProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isExportingPDF, setIsExportingPDF] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);
    const visualHeaderRef = useRef<HTMLDivElement>(null);
    const visualFooterRef = useRef<HTMLDivElement>(null);

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
    const handleEditorChange = useCallback(async () => {
        const markdown = await editor.blocksToMarkdownLossy(editor.document);
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

        setIsExportingPDF(true);

        // Wait for React to re-render without borders/backgrounds before capturing
        setTimeout(async () => {
            try {
                const html2pdf = (await import('html2pdf.js')).default;
                const worker = html2pdf();

                // Pre-capture Header & Footer as images for repetition on every page
                let headerImg: string | null = null;
                let footerImg: string | null = null;
                let headerH = 0;
                let footerH = 0;

                if (visualHeaderRef.current) {
                    const canvas = await (worker as any).set({ html2canvas: { scale: 2 } }).from(visualHeaderRef.current).toCanvas().get('canvas');
                    headerImg = canvas.toDataURL('image/jpeg', 0.95);
                    headerH = (canvas.height * 190) / canvas.width; // approx mm
                }
                if (visualFooterRef.current) {
                    const canvas = await (worker as any).set({ html2canvas: { scale: 2 } }).from(visualFooterRef.current).toCanvas().get('canvas');
                    footerImg = canvas.toDataURL('image/jpeg', 0.95);
                    footerH = (canvas.height * 190) / canvas.width; // approx mm
                }

                const opt = {
                    margin: [headerContent ? 25 : 15, 10, footerContent ? 25 : 18, 10] as [number, number, number, number],
                    filename: `${contentTitle || 'content'}.pdf`,
                    image: { type: 'jpeg' as const, quality: 0.98 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
                };

                // Generate main content PDF
                const finalWorker = html2pdf()
                    .set(opt)
                    .from(printRef.current!)
                    .toPdf()
                    .get('pdf')
                    .then((pdf: any) => {
                        const totalPages: number = pdf.internal.getNumberOfPages();
                        const pageW: number = pdf.internal.pageSize.getWidth();
                        const pageH: number = pdf.internal.pageSize.getHeight();

                        for (let i = 1; i <= totalPages; i++) {
                            pdf.setPage(i);

                            // 1. Draw repeated Header if available
                            if (headerImg) {
                                pdf.addImage(headerImg, 'JPEG', 10, 5, 190, headerH);
                            }

                            // 2. Draw repeated Footer if available
                            if (footerImg) {
                                const footY = pageH - footerH - 12;
                                pdf.addImage(footerImg, 'JPEG', 10, footY, 190, footerH);
                            }

                            // 3. Draw Page Information
                            pdf.setFontSize(8);
                            pdf.setTextColor(150, 150, 150);

                            pdf.text(
                                `Page ${i} of ${totalPages}`,
                                pageW - 10,
                                pageH - 6,
                                { align: 'right' }
                            );
                            if (contentTitle) {
                                pdf.text(contentTitle, 10, pageH - 6, { align: 'left' });
                            }
                        }
                    });

                await (finalWorker as any).save();
            } catch (err) {
                console.error("PDF Export failed:", err);
            } finally {
                setIsExportingPDF(false);
            }
        }, 150);
    };

    const toolbarStyle: React.CSSProperties = {
        display: 'flex', flexWrap: 'wrap', gap: 2,
        padding: '8px 12px',
        background: 'var(--sidebar-bg)',
        borderBottom: '1px solid var(--border-color)',
        borderRadius: '10px 10px 0 0',
    };

    /* Shared banner style: aligns with BlockNote editor's 24px internal padding */
    const bannerBase: React.CSSProperties = {
        padding: '10px 24px',
        fontSize: 12,
        lineHeight: 1.5,
        fontFamily: 'inherit',
        color: '#444',
    };

    const editorContent = (
        <div style={isFullscreen ? {
            position: 'fixed', inset: 0, zIndex: 999999,
            background: '#f0f2f5', // Modern doc-view background
            display: 'flex', flexDirection: 'column',
            padding: '40px 20px',
            overflowY: 'auto', fontFamily: 'inherit',
            margin: 0
        } : { display: 'flex', flexDirection: 'column', fontFamily: 'inherit', background: 'transparent' }}>
            {/* ── Page Simulation Container (A4 style) ── */}
            <div style={{
                maxWidth: 850, width: '100%', margin: '0 auto',
                display: 'flex', flexDirection: 'column',
                boxShadow: isFullscreen ? '0 10px 30px rgba(0,0,0,0.1)' : 'none',
                background: 'var(--bg-color)',
                borderRadius: 10,
                overflow: 'hidden',
                flexShrink: 0
            }}>
                {/* ── Top Toolbar ── */}
                <div style={toolbarStyle}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PenLine size={14} strokeWidth={2.5} /> Content Editor
                    </div>

                    {/* PDF & Fullscreen Controls */}
                    <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button
                            onClick={handlePDF}
                            title="Download as PDF (A4) — includes header & footer"
                            style={{
                                padding: '5px 14px', fontSize: 12, borderRadius: 6,
                                border: 'none', background: '#e46f2bff', color: '#fff',
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

                {/* ── Header Zone (visual page header, outside printRef) ── */}
                {headerContent && (
                    <div ref={visualHeaderRef} className="doc-header-section" style={{
                        background: isExportingPDF ? 'transparent' : 'var(--sidebar-bg)',
                        borderLeft: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderRight: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderBottom: isExportingPDF ? 'none' : '2px dashed var(--border-color)',
                        padding: '10px 24px 8px',
                    }}>
                        {!isExportingPDF && <div className="pdf-hide-label" style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, opacity: 0.6 }}>Header</div>}
                        <div className="markdown-render" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                            <ReactMarkdown>{headerContent}</ReactMarkdown>
                        </div>
                    </div>
                )}

                {/* ── BlockNote Editor Panel (this is what gets printed) ── */}
                <div
                    ref={printRef}
                    style={{
                        display: 'flex', flexDirection: 'column', gap: 0,
                        borderLeft: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderRight: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderTop: 'none',
                        borderBottom: footerContent || isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderRadius: headerContent || footerContent || isExportingPDF ? 0 : '0 0 10px 10px',
                        overflowY: 'auto', minHeight: isFullscreen ? 0 : 480,
                        flex: isFullscreen ? 1 : undefined,
                        background: isExportingPDF ? 'transparent' : 'var(--bg-color)',
                        paddingTop: 16,
                        paddingBottom: 16,
                    }}
                    className="custom-scrollbar"
                >
                    {/* BlockNote styles */}
                    <style>{`
                        .bn-container { font-family: inherit; }
                        .bn-editor { padding-left: 24px !important; padding-right: 24px !important; }
                        .markdown-render p { margin: 0 0 4px; }
                        .markdown-render h1, .markdown-render h2, .markdown-render h3 { margin: 4px 0; }
                        .markdown-render strong { font-weight: 700; }
                        .markdown-render em { font-style: italic; }
                        .markdown-render hr { border: none; border-top: 1px solid #ccc; margin: 6px 0; }
                        /* Limit images in header/footer to max 20% of A4 content width */
                        .doc-header-section img, .doc-footer-section img,
                        .pdf-header-ghost img, .pdf-footer-ghost img {
                            max-width: 20% !important;
                            height: auto !important;
                            object-fit: contain;
                            vertical-align: middle;
                        }
                    `}</style>
                    <BlockNoteView editor={editor} onChange={handleEditorChange} theme="light" editable={!disabled} />

                    {/* ── Ghost Footer for PDF only ── */}
                    {footerContent && (
                        <div className="pdf-footer-ghost" style={{ display: 'none', ...bannerBase, marginBottom: 12, borderTop: '1px solid #bbb', paddingTop: 8 }}>
                            <ReactMarkdown>{footerContent}</ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* ── Footer Zone (visual page footer, outside printRef) ── */}
                {footerContent && (
                    <div ref={visualFooterRef} className="doc-footer-section" style={{
                        background: isExportingPDF ? 'transparent' : 'var(--sidebar-bg)',
                        borderLeft: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderRight: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderTop: isExportingPDF ? 'none' : '2px dashed var(--border-color)',
                        borderBottom: isExportingPDF ? 'none' : '1px solid var(--border-color)',
                        borderRadius: isFullscreen || isExportingPDF ? 0 : '0 0 10px 10px',
                        padding: '8px 24px 10px',
                    }}>
                        {!isExportingPDF && <div className="pdf-hide-label" style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4, opacity: 0.6 }}>Footer</div>}
                        <div className="markdown-render" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                            <ReactMarkdown>{footerContent}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* Status bar */}
            <div style={{ maxWidth: 850, width: '100%', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', fontSize: 11, color: 'var(--text-secondary)', padding: '4px 4px 0' }}>
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
