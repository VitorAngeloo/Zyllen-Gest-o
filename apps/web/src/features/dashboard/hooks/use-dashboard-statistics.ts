"use client";
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PanelId } from '@zyllen/shared';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { panelApi } from '@web/features/panels/api/panel-api';
import { datePeriod, localCalendarDate } from '@web/lib/date-period';

export function useDashboardStatistics(view: Extract<PanelId, 'projetos' | 'operacoes' | 'estoque'>) {
    const { user } = useAuth(), options = useAuthedFetch();
    const [now, setNow] = useState(Date.now);
    useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
    const reader = useMemo(() => panelApi.native(`account:${user?.id}`, options), [user?.id, options]);
    const period = view === 'estoque' ? null : datePeriod('30_DAYS', localCalendarDate(now), '', '');
    return useQuery({ queryKey: ['panel-statistics', reader.key, view, period?.start, period?.end],
        queryFn: ({ signal }) => reader.statistics({ view, source: 'ALL', ...(period ?? {}) }, signal),
        enabled: !!user, refetchInterval: 30_000 });
}
