"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TicketStatus, type TicketSourceFilter } from "@zyllen/shared";
import { useAuth, useAuthedFetch } from "@web/features/auth/context/auth-context";
import { ticketApi } from "../api/ticket-api";
import type { TicketReadSource } from '../types/ticket-read-source';

export function useTicketDashboard(isManagerOrAdmin: boolean, source: TicketSourceFilter = "ALL", reader?: TicketReadSource) {
    const { user, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const enabled = !!reader || (!!user && hasPermission("tickets.view")), identity = reader?.key ?? user?.id;
    const [now, setNow] = useState(Date.now);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, [enabled]);

    const open = useQuery({
        queryKey: ["tickets", "dashboard", TicketStatus.OPEN, identity, source],
        queryFn: ({ signal }) => reader ? reader.list(TicketStatus.OPEN, source, signal) : ticketApi.listActive(TicketStatus.OPEN, { ...options, signal }, undefined, source),
        enabled,
        refetchInterval: 15_000,
    });
    const inProgress = useQuery({
        queryKey: ["tickets", "dashboard", TicketStatus.IN_PROGRESS, identity, isManagerOrAdmin, source],
        queryFn: ({ signal }) => reader ? reader.list(TicketStatus.IN_PROGRESS, source, signal) : ticketApi.listActive(TicketStatus.IN_PROGRESS, { ...options, signal }, isManagerOrAdmin ? undefined : user?.id, source),
        enabled,
        refetchInterval: 15_000,
    });
    const detail = useQuery({
        queryKey: ["tickets", "dashboard-detail", selectedId, identity],
        queryFn: ({ signal }) => reader ? reader.detail(selectedId!, signal) : ticketApi.detail(selectedId!, { ...options, signal }),
        enabled: enabled && !!selectedId,
        staleTime: 0,
        refetchInterval: 15_000,
    });

    return { now, selectedId, setSelectedId, open, inProgress, detail };
}
