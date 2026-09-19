"use client";
import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { Skeleton } from '@web/components/ui/skeleton';
import { TRIP_COPY as copy } from '@web/lib/brand-voice';

interface Props { loading: boolean; enabled: boolean; failed: boolean; onClose: () => void; onRetry: () => void }
export function TripDialogFeedback({ loading, enabled, failed, onClose, onRetry }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const previous = document.activeElement as HTMLElement | null;
        ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
        return () => previous?.focus();
    }, []);
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent ref={ref} role="dialog" aria-modal="true" aria-label={copy.details} className="max-w-md" onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key === 'Tab') {
            const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');
            const first = buttons?.[0], last = buttons?.[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
    }}><DialogHeader><DialogTitle>{copy.details}</DialogTitle></DialogHeader><DialogBody>{loading ? <Skeleton className="h-32" /> : <p role="alert" className="text-sm text-red-200">{enabled ? copy.detailError : copy.noAccess}</p>}</DialogBody><DialogFooter><Button variant="outline" onClick={onClose}>{copy.close}</Button>{failed && <Button onClick={onRetry}>{copy.retry}</Button>}</DialogFooter></DialogContent></Dialog>;
}
