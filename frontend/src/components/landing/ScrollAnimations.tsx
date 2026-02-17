'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Returns a progress value (0 to 1) representing how far an element
 * has scrolled through the viewport. 0 = element just entering from below,
 * 1 = element fully past the top of the viewport.
 *
 * The progress is computed on every scroll frame, enabling
 * frame-by-frame, Apple-style scroll-driven animations.
 */
export function useScrollProgress(options?: { offset?: number }) {
    const ref = useRef<HTMLDivElement>(null);
    const [progress, setProgress] = useState(0);
    const offset = options?.offset ?? 0;

    const handleScroll = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const windowH = window.innerHeight;

        // raw = 0 when element's top is at bottom of viewport
        // raw = 1 when element's top is at top of viewport
        const raw = 1 - (rect.top - offset) / windowH;
        setProgress(Math.max(0, Math.min(1, raw)));
    }, [offset]);

    useEffect(() => {
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [handleScroll]);

    return { ref, progress };
}

/**
 * Specialized hook for exit-only sections (like hero). Returns how far
 * the user has scrolled past the element (0 = at top, 1 = element fully
 * scrolled out of view). Never starts invisible.
 */
export function useScrollExit() {
    const ref = useRef<HTMLDivElement>(null);
    const [exitProgress, setExitProgress] = useState(0);

    const handleScroll = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elHeight = rect.height;
        if (elHeight === 0) return;

        // 0 when element bottom is at or below bottom of viewport (fully visible)
        // 1 when element bottom is at top of viewport (fully scrolled past)
        const raw = 1 - rect.bottom / (elHeight + window.innerHeight * 0.2);
        setExitProgress(Math.max(0, Math.min(1, raw)));
    }, []);

    useEffect(() => {
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('resize', handleScroll);
        };
    }, [handleScroll]);

    return { ref, exitProgress };
}

/** Easing function: ease-out cubic */
export function easeOut(t: number) {
    return 1 - Math.pow(1 - t, 3);
}

/** Easing function: ease-in-out cubic */
export function easeInOut(t: number) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Clamp and remap a value from one range to another */
export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
    const clamped = Math.max(inMin, Math.min(inMax, value));
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
}
