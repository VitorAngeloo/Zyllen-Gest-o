"use client";

import { useState, type FormEvent } from 'react';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { useAuthedFetch } from '@web/features/auth/context/auth-context';
import { projectServiceApi } from '../api/project-service-api';

export function ProjectMarkerSettings({ markers, onCreated }: {
    markers: { id: string; name: string }[];
    onCreated: () => Promise<unknown>;
}) {
    const options = useAuthedFetch();
    const [name, setName] = useState('');
    const [pending, setPending] = useState(false);
    const [message, setMessage] = useState('');

    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const value = name.trim();
        if (!value || pending) return;
        setPending(true);
        setMessage('');
        try {
            await projectServiceApi.marker(value, options);
            await onCreated();
            setName('');
            setMessage('Marcador disponível para os projetos.');
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Não foi possível criar o marcador.');
        } finally {
            setPending(false);
        }
    }

    return <details className="border-y border-white/10 py-3 text-sm text-[var(--zyllen-muted)]">
        <summary className="w-fit cursor-pointer text-xs hover:text-white">Configurações de projetos</summary>
        <div className="mt-4 max-w-lg space-y-3">
            <p>Marcadores ajudam a identificar projetos. Cadastre novos nomes aqui; no formulário, apenas escolha um marcador existente.</p>
            <form autoComplete="off" onSubmit={create} className="flex flex-wrap items-end gap-2">
                <label className="min-w-48 flex-1 space-y-1 text-xs">Novo marcador
                    <Input autoComplete="off" maxLength={100} value={name} onChange={event => setName(event.target.value)} />
                </label>
                <Button type="submit" size="sm" variant="outline" disabled={!name.trim() || pending}>{pending ? 'Salvando...' : 'Adicionar marcador'}</Button>
            </form>
            <p className="text-xs">{markers.length ? `Cadastrados: ${markers.map(item => item.name).join(', ')}` : 'Nenhum marcador cadastrado.'}</p>
            {message && <p role="status" className="text-xs text-white">{message}</p>}
        </div>
    </details>;
}
