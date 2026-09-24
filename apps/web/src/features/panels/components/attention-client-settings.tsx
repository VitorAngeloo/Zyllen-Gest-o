"use client";

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Check, Plus, Search, UserRoundCheck, X } from 'lucide-react';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Input } from '@web/components/ui/input';
import { ApiError } from '@web/lib/api-client';
import { panelApi } from '../api/panel-api';

function attentionClientError(error: unknown, action: 'load' | 'save') {
    if (error instanceof ApiError && error.status === 404) return 'A seleção de clientes ainda não está disponível neste servidor.';
    return action === 'load' ? 'Não foi possível carregar a seleção salva. A busca no cadastro continua disponível.' : 'Não foi possível salvar a seleção. Tente novamente.';
}

export function AttentionClientSettings() {
    const { user } = useAuth();
    const options = useAuthedFetch();
    const client = useQueryClient();
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(timeout);
    }, [search]);
    const selectionKey = ['panel-attention-clients', user?.id, 'selection'] as const;
    const selection = useQuery({
        queryKey: selectionKey,
        queryFn: ({ signal }) => panelApi.attentionClients('', { ...options, signal }),
        enabled: !!user,
        staleTime: 30_000,
    });
    const directory = useQuery({
        queryKey: ['panel-company-options', debouncedSearch],
        queryFn: ({ signal }) => panelApi.companyOptions(debouncedSearch, { ...options, signal }),
        enabled: !!user && debouncedSearch.length >= 2,
        staleTime: 60_000,
    });
    const selectedIds = useMemo(() => selection.data?.selected.map(company => company.id) ?? [], [selection.data?.selected]);
    const visibleOptions = useMemo(() => (directory.data ?? []).filter(company => !selectedIds.includes(company.id)).slice(0, 8), [directory.data, selectedIds]);
    const update = useMutation({
        mutationFn: (companyIds: string[]) => panelApi.updateAttentionClients(companyIds, options),
        onSuccess: data => { client.setQueryData(selectionKey, data); },
    });
    const save = (companyIds: string[]) => { if (!update.isPending) update.mutate(companyIds); };
    const searchSettled = search.trim() === debouncedSearch;
    const selectionReady = !!selection.data && !selection.isError;
    const limitReached = selectedIds.length >= 12;
    return <section data-attention-client-settings aria-labelledby="attention-client-settings-title" className="relative overflow-hidden rounded-lg border border-[var(--zyllen-border)] bg-white/[0.025]">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[var(--zyllen-highlight)] via-[var(--zyllen-highlight)]/25 to-transparent" />
        <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--zyllen-highlight)]/35 bg-[var(--zyllen-highlight)]/10 text-[var(--zyllen-highlight)]"><UserRoundCheck className="h-5 w-5" /></span>
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--zyllen-muted)]">Curadoria do espelho</p><h2 id="attention-client-settings-title" className="mt-1 text-base font-semibold text-white">Clientes de atenção</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--zyllen-muted)]">Escolha os clientes que a equipe precisa acompanhar de perto. O espelho exibe nome, responsável e telefone, sem informações operacionais adicionais.</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-3 border-l-2 border-[var(--zyllen-highlight)] px-3 py-1.5"><div><p className="font-mono text-xl font-semibold tabular-nums text-white">{selectedIds.length}<span className="text-sm text-[var(--zyllen-muted)]">/12</span></p><p className="text-[10px] uppercase tracking-[0.12em] text-[var(--zyllen-muted)]">no espelho</p></div>{update.isPending ? <span role="status" className="text-xs text-[var(--zyllen-muted)]">Salvando…</span> : update.isSuccess ? <span role="status" className="flex items-center gap-1 text-xs text-[var(--zyllen-highlight)]"><Check className="h-3.5 w-3.5" />Salvo</span> : null}</div>
        </header>
        <div className="grid min-w-0 gap-0 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
            <div className="min-w-0 border-b border-white/10 p-4 sm:p-5 lg:border-b-0 lg:border-r lg:border-white/10">
                <div className="mb-3"><p className="text-xs font-semibold text-white">1. Localize no cadastro</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">Digite ao menos duas letras do nome ou do CNPJ.</p></div>
                <label className="relative block"><span className="sr-only">Pesquisar clientes cadastrados</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zyllen-muted)]" /><Input value={search} onChange={event => setSearch(event.target.value)} className="pl-9" placeholder="Nome ou CNPJ do cliente" autoComplete="off" /></label>
                {search.trim().length < 2 && <p className="mt-3 border-l-2 border-white/15 pl-3 text-xs leading-relaxed text-[var(--zyllen-muted)]">A busca usa o cadastro geral de clientes e não depende do carregamento da seleção.</p>}
                {search.trim().length >= 2 && (!searchSettled || directory.isFetching) && <p role="status" className="mt-3 text-xs text-[var(--zyllen-muted)]">Buscando clientes…</p>}
                {searchSettled && directory.isError && <div role="alert" className="mt-3 flex items-center justify-between gap-3 border-l-2 border-red-400 pl-3 text-xs text-red-200"><span>Não foi possível consultar o cadastro de clientes.</span><Button type="button" size="sm" variant="ghost" onClick={() => { void directory.refetch(); }}>Tentar novamente</Button></div>}
                {searchSettled && !directory.isFetching && !directory.isError && debouncedSearch.length >= 2 && visibleOptions.length > 0 && <ul aria-label="Resultados da pesquisa de clientes" className="mt-3 divide-y divide-white/10 border-y border-white/10">{visibleOptions.map(company => <li key={company.id} className="flex min-w-0 items-center gap-3 py-2.5"><Building2 className="h-4 w-4 shrink-0 text-[var(--zyllen-muted)]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{company.name}</p>{company.cnpj && <p className="truncate font-mono text-[10px] text-[var(--zyllen-muted)]">{company.cnpj}</p>}</div><Button type="button" size="icon" variant="highlight-ghost" className="h-8 w-8" title={selectionReady ? `Adicionar ${company.name}` : 'Aguarde a seleção salva ficar disponível'} aria-label={`Adicionar ${company.name}`} disabled={!selectionReady || update.isPending || limitReached} onClick={() => save([...selectedIds, company.id])}><Plus className="h-4 w-4" /></Button></li>)}</ul>}
                {searchSettled && !directory.isFetching && !directory.isError && debouncedSearch.length >= 2 && !visibleOptions.length && <p className="mt-3 text-xs text-[var(--zyllen-muted)]">Nenhum cliente disponível corresponde à busca.</p>}
            </div>
            <div className="min-w-0 p-4 sm:p-5">
                <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-white">2. Clientes exibidos no espelho</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">A alteração é salva ao adicionar ou remover.</p></div>{limitReached && <span className="shrink-0 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-200">Limite atingido</span>}</div>
                {selection.isLoading ? <div role="status" className="space-y-2 py-1"><div className="h-12 rounded-md bg-white/[0.04] motion-safe:animate-pulse" /><div className="h-12 rounded-md bg-white/[0.04] motion-safe:animate-pulse" /></div> : selection.isError ? <div role="alert" className="flex flex-col gap-3 border-l-2 border-red-400 bg-red-500/[0.035] px-3 py-3 text-xs text-red-200 sm:flex-row sm:items-center sm:justify-between"><span>{attentionClientError(selection.error, 'load')}</span><Button type="button" size="sm" variant="ghost" onClick={() => { void selection.refetch(); }}>Tentar novamente</Button></div> : selection.data?.selected.length ? <ul className="grid gap-2 sm:grid-cols-2">{selection.data.selected.map((company, index) => <li key={company.id} className="group flex min-w-0 items-center gap-3 rounded-md border border-white/10 bg-[var(--zyllen-bg-dark)] px-3 py-2.5"><span className="font-mono text-[10px] text-[var(--zyllen-highlight)]">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{company.name}</p><p className="truncate text-xs text-[var(--zyllen-muted)]">{company.contactName || company.contactPhone ? [company.contactName, company.contactPhone].filter(Boolean).join(' · ') : 'Contato não informado'}</p></div><Button type="button" size="sm" variant="ghost" className="h-8 w-8 shrink-0 p-0 text-[var(--zyllen-muted)] hover:text-white" aria-label={`Remover ${company.name}`} disabled={update.isPending} onClick={() => save(selectedIds.filter(id => id !== company.id))}><X className="h-4 w-4" /></Button></li>)}</ul> : <div className="border-l-2 border-white/15 px-3 py-3"><p className="text-sm text-white">Nenhum cliente selecionado.</p><p className="mt-1 text-xs text-[var(--zyllen-muted)]">Use a busca ao lado para montar esta visão do espelho.</p></div>}
                {update.isError && <p role="alert" className="mt-3 border-l-2 border-red-400 pl-3 text-xs text-red-200">{attentionClientError(update.error, 'save')}</p>}
            </div>
        </div>
    </section>;
}
