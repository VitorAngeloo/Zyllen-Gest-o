"use client";

import { useQuery } from "@tanstack/react-query";
import type { TicketSourceFilter } from "@zyllen/shared";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { ticketApi } from "../api/ticket-api";
import type { TicketReadSource } from '../types/ticket-read-source';

export function useTicketStatistics(source: TicketSourceFilter, period: { start: string; end: string } | null, reader?: TicketReadSource) {
    const { user, hasPermission } = useAuth();
    const options = useAuthedFetch();
    return useQuery({
        queryKey: ["tickets", "statistics", reader?.key ?? user?.id, source, period?.start, period?.end],
        queryFn: ({ signal }) => reader ? reader.statistics({ source, ...period! }, signal) : ticketApi.statistics({ source, ...period! }, { ...options, signal }),
        enabled: (!!reader || (!!user && hasPermission("tickets.view"))) && !!period,
        refetchInterval: 30_000,
    });
}
