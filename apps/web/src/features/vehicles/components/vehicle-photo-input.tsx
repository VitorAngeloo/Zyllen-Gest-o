"use client";
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { Button } from '@web/components/ui/button';

interface Props { label: string; value: File | null; onChange: (file: File | null) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean }

export function VehiclePhotoInput({ label, value, onChange, onBusyChange, disabled }: Props) {
    const camera = useRef<HTMLInputElement>(null);
    const gallery = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [error, setError] = useState('');
    const [converting, setConverting] = useState(false);
    useEffect(() => {
        if (!value) { setPreview(null); return; }
        const url = URL.createObjectURL(value);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [value]);
    const choose = async (file: File | undefined) => {
        if (!file) return;
        setError('');
        if (file.size > 40 * 1024 * 1024) { setError('A imagem é grande demais. Escolha uma foto de até 40 MB.'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            if (!file.type.startsWith('image/') && !/\.(heic|heif)$/i.test(file.name)) { setError('Escolha uma imagem JPG, PNG, WebP ou HEIC.'); return; }
            setConverting(true); onBusyChange?.(true);
            const url = URL.createObjectURL(file);
            try {
                const image = new Image(); image.src = url; await image.decode();
                const scale = Math.min(1, 2400 / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement('canvas');
                canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
                const context = canvas.getContext('2d');
                if (!context || !canvas.width || !canvas.height) throw new Error('Conversão indisponível');
                context.drawImage(image, 0, 0, canvas.width, canvas.height);
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
                if (!blob) throw new Error('Conversão indisponível');
                file = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
            } catch { setError('Não foi possível converter esta foto. Ajuste a câmera para JPG ou escolha uma imagem JPG, PNG ou WebP.'); return; }
            finally { URL.revokeObjectURL(url); setConverting(false); onBusyChange?.(false); }
        }
        if (file.size > 20 * 1024 * 1024) { setError('Use uma imagem de até 20 MB.'); return; }
        onChange(file);
    };
    return <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.025] p-4">
        <p className="text-sm font-medium text-white">{label} *</p>
        <div className="flex flex-wrap gap-2">
            <Button type="button" variant="highlight-outline" className="min-h-11" onClick={() => camera.current?.click()} disabled={disabled || converting}><Camera /> Tirar foto</Button>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => gallery.current?.click()} disabled={disabled || converting}><ImagePlus /> Escolher imagem</Button>
        </div>
        <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-label={`Tirar ${label.toLowerCase()}`} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
        <input ref={gallery} type="file" accept="image/*" className="sr-only" tabIndex={-1} aria-label={`Escolher ${label.toLowerCase()}`} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
        {value && <div className="flex flex-wrap items-center gap-3 rounded-md bg-white/[0.04] p-2">
            {preview && <img src={preview} alt="Prévia da foto selecionada" className="size-16 rounded object-cover" />}
            <span className="min-w-0 flex-1 truncate text-sm text-white">{value.name}</span>
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled} aria-label="Remover foto"><X /> Remover</Button>
        </div>}
        {error && <p role="alert" className="text-sm text-red-200">{error}</p>}
        {converting && <p role="status" className="text-sm text-[var(--zyllen-muted)]">Preparando a foto…</p>}
        <p className="text-xs text-[var(--zyllen-muted)]">No celular, “Tirar foto” abre a câmera traseira quando o navegador permitir. JPG, PNG ou WebP, até 20 MB; fotos HEIC são convertidas quando o aparelho permitir. Confira se o hodômetro está legível.</p>
    </div>;
}
