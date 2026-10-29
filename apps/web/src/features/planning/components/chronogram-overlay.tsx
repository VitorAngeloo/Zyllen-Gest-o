"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import styles from './chronogram-overlay.module.css';

/** Scoped presentation for the existing, authorized dialogs. Their forms and focus guards stay intact. */
export function ChronogramOverlay({ children, onClose }: { children: (close: () => void) => ReactNode; onClose: () => void }) {
    const [phase, setPhase] = useState<'entering' | 'open' | 'closing'>('entering');
    const closing = useRef(false), closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useLayoutEffect(() => {
        const previous = document.body.style.paddingRight;
        const gutter = window.innerWidth - document.documentElement.clientWidth;
        if (gutter > 0) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + gutter}px`;
        return () => { document.body.style.paddingRight = previous; };
    }, []);
    useEffect(() => {
        const timer = window.setTimeout(() => setPhase(current => current === 'entering' ? 'open' : current), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 240);
        return () => { window.clearTimeout(timer); if (closeTimer.current) clearTimeout(closeTimer.current); };
    }, []);
    const close = useCallback(() => {
        if (closing.current) return;
        closing.current = true; setPhase('closing');
        closeTimer.current = setTimeout(onClose, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180);
    }, [onClose]);
    return <div className={styles.host} data-planning-overlay={phase} onKeyDownCapture={event => {
        if (closing.current) { event.preventDefault(); event.stopPropagation(); }
    }}>{children(close)}</div>;
}
