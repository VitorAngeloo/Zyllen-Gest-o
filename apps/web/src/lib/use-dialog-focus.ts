"use client";
import { useEffect, type RefObject } from 'react';

/** Keyboard containment and restoration for the project's custom Dialog. */
export function useDialogFocus(ref: RefObject<HTMLDivElement | null>, close: () => void, busy = false) {
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        ref.current?.focus({ preventScroll: true });
        return () => previous?.focus({ preventScroll: true });
    }, [ref]);
    useEffect(() => {
        const container = ref.current;
        const keydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') { event.preventDefault(); if (!busy) close(); }
            if (event.key !== 'Tab') return;
            const controls = [...(container?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]') ?? [])].filter(element => element.offsetParent !== null);
            const first = controls[0], last = controls.at(-1);
            if (!first) { event.preventDefault(); container?.focus(); }
            else if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        container?.addEventListener('keydown', keydown);
        return () => container?.removeEventListener('keydown', keydown);
    }, [ref, close, busy]);
}
