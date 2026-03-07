'use client';

import { useRef, useEffect, RefObject } from 'react';

/**
 * Adds smooth middle-mouse or left-click pan scrolling to a scrollable container.
 * Pan only starts when the initial mousedown target is the background canvas
 * (not a task bar, button, input, or any interactive element).
 *
 * @param scrollRef - ref to the scrollable container element
 * @param isActive  - pass false to disable panning (e.g. during resize/drag)
 */
export function useTimelinePan(
    scrollRef: RefObject<HTMLDivElement | null>,
    isActive = true
) {
    const panRef = useRef<{
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
        active: boolean;
    } | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el || !isActive) return;

        const INTERACTIVE = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL']);
        const CANVAS_CLASSES = new Set([
            // Broad background cells / drop zones
            'timeline-row', 'timeline-row-item',
        ]);

        /** Returns true if e.target is part of the background canvas,
         *  not a task/content bar or interactive element */
        const isCanvasTarget = (e: MouseEvent): boolean => {
            let node = e.target as HTMLElement | null;
            while (node && node !== el) {
                const tag = node.tagName;
                if (INTERACTIVE.has(tag)) return false;
                // Draggable bars have draggable=true
                if (node.getAttribute('draggable') === 'true') return false;
                // Left sticky panel (title cell) – don't pan from there
                if (node.getAttribute('data-nopan') === 'true') return false;
                node = node.parentElement;
            }
            return true;
        };

        const onMouseDown = (e: MouseEvent) => {
            // Only left-button (0) or middle-button (1)
            if (e.button !== 0 && e.button !== 1) return;
            if (!isCanvasTarget(e)) return;

            panRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                scrollLeft: el.scrollLeft,
                scrollTop: el.scrollTop,
                active: false,
            };
            // Don't prevent default yet — let onclick still work if user just clicks
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!panRef.current) return;
            const dx = e.clientX - panRef.current.startX;
            const dy = e.clientY - panRef.current.startY;

            // Activate pan once we move more than 4px
            if (!panRef.current.active && Math.hypot(dx, dy) < 4) return;
            panRef.current.active = true;

            e.preventDefault();   // prevent text selection
            el.style.cursor = 'grabbing';
            el.style.userSelect = 'none';

            // Smooth momentum-free immediate pan
            el.scrollLeft = panRef.current.scrollLeft - dx;
            el.scrollTop = panRef.current.scrollTop - dy;
        };

        const onMouseUp = () => {
            if (!panRef.current) return;
            const wasPanning = panRef.current.active;
            panRef.current = null;
            el.style.cursor = '';
            el.style.userSelect = '';
            if (wasPanning) {
                // Suppress the click that fires after mouseup when panning
                const absorb = (ev: MouseEvent) => { ev.stopPropagation(); ev.preventDefault(); };
                window.addEventListener('click', absorb, { capture: true, once: true });
            }
        };

        const onMouseLeave = () => {
            if (panRef.current?.active) {
                panRef.current = null;
                el.style.cursor = '';
                el.style.userSelect = '';
            }
        };

        el.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        el.addEventListener('mouseleave', onMouseLeave);

        return () => {
            el.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mouseleave', onMouseLeave);
            el.style.cursor = '';
            el.style.userSelect = '';
        };
    }, [scrollRef, isActive]);
}
