"use client";
import { Suspense, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@web/components/ui/button';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { panelApi } from '../api/panel-api';
import { PanelWorkspace } from '../components/panel-workspace';
function Mirror() {
    const { token } = useParams<{ token: string }>();
    const valid = /^[A-Za-z0-9_-]{43}$/.test(token ?? '');
    const query = useQuery({ queryKey: ['panel-mirror-metadata', token], queryFn: ({ signal }) => panelApi.metadata(token, signal), enabled: valid, refetchInterval: 15_000, retry: false });
    const reader = useMemo(() => panelApi.mirror(token ?? ''), [token]);
    if (!valid || query.isError || (query.data && !query.data.views.length)) return <main className="min-h-screen space-y-4 bg-[var(--zyllen-bg-dark)] p-6 text-white"><h1 className="text-2xl font-semibold">{copy.title}</h1><p role="alert">{copy.mirrorUnavailable}</p>{valid && <Button variant="outline" onClick={() => { void query.refetch(); }}>{copy.retry}</Button>}</main>;
    if (!query.data) return <main className="min-h-screen p-6 text-white"><p role="status">{copy.loading}</p></main>;
    return <main className="min-h-screen bg-[var(--zyllen-bg-dark)] p-4 sm:p-6 lg:p-8"><PanelWorkspace views={query.data.views} reader={reader} /></main>;
}
export default function PanelMirrorScreen() { return <Suspense fallback={<p role="status">{copy.loading}</p>}><Mirror /></Suspense>; }
