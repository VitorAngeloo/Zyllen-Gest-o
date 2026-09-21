"use client";
import { useRef, useState } from 'react';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { Button } from '@web/components/ui/button';
import { useDialogFocus } from '@web/lib/use-dialog-focus';

const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function PhotoDialog({ label, path, onClose }: { label: string; path: string; onClose: () => void }) {
    const [failed, setFailed] = useState(false);
    const content = useRef<HTMLDivElement>(null);
    useDialogFocus(content, onClose);
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent ref={content} tabIndex={-1} role="dialog" aria-modal="true" aria-label={label} className="max-w-4xl outline-none">
        <DialogHeader><DialogTitle>{label}</DialogTitle></DialogHeader>
        <DialogBody className="space-y-4">
            {failed ? <p role="alert" className="text-sm text-red-200">Não foi possível carregar a foto. Confira sua sessão e tente novamente.</p>
                : <img src={`${apiBase}${path}`} alt={label} onError={() => setFailed(true)} className="mx-auto max-h-[65vh] w-auto max-w-full rounded-md object-contain" />}
            <div className="flex justify-end"><Button type="button" variant="outline" onClick={onClose}>Fechar</Button></div>
        </DialogBody>
    </DialogContent></Dialog>;
}

export function VehiclePhotoViewer({ label, path }: { label: string; path: string | null | undefined }) {
    const [open, setOpen] = useState(false);
    if (!path) return null;
    return <>
        <Button type="button" size="sm" variant="highlight-ghost" onClick={() => setOpen(true)}>{label}</Button>
        {open && <PhotoDialog label={label} path={path} onClose={() => setOpen(false)} />}
    </>;
}
