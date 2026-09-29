"use client";

import { useEffect, useRef, useState } from 'react';
import { isPanelId, PANEL_DEFAULT_ROTATION_SECONDS, PANEL_ROTATION_OPTIONS, type PanelId, type PanelRotationSeconds } from '../panel.constants';

function rotationSeconds(value: unknown): PanelRotationSeconds | undefined {
    const numeric = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
    return PANEL_ROTATION_OPTIONS.find(option => option === numeric);
}

export function usePanelRotation(userId: string | undefined, allowed: PanelId[], originalQuery: string, held: boolean, pathname: string) {
    const original = useRef(originalQuery), initialized = useRef<string | undefined>(undefined), allowedKey = allowed.join(',');
    const [selected, setSelected] = useState<PanelId>('atendimentos');
    const [paused, setPaused] = useState(false);
    const [intervalSeconds, setIntervalSeconds] = useState<PanelRotationSeconds>(PANEL_DEFAULT_ROTATION_SECONDS);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!userId || !allowedKey) { setReady(false); return; }
        const permitted = allowedKey.split(',') as PanelId[];
        if (initialized.current === userId) {
            setSelected(current => permitted.includes(current) ? current : permitted[0]);
            setReady(true);
            return;
        }
        const query = new URLSearchParams(original.current);
        let saved: { selected?: unknown; paused?: unknown; intervalSeconds?: unknown } = {};
        try { saved = JSON.parse(localStorage.getItem(`zyllen:personal-panel:${userId}`) ?? '{}') ?? {}; } catch { /* URL controls remain usable without storage. */ }
        const wanted = query.get('visao') ?? saved.selected;
        setSelected(isPanelId(wanted) && permitted.includes(wanted) ? wanted : permitted[0]);
        setPaused(query.has('pausado') ? query.get('pausado') === '1' : saved.paused === true);
        setIntervalSeconds(rotationSeconds(query.get('intervalo')) ?? rotationSeconds(saved.intervalSeconds) ?? PANEL_DEFAULT_ROTATION_SECONDS);
        initialized.current = userId;
        setReady(true);
    }, [userId, allowedKey]);

    useEffect(() => {
        if (!ready || !userId) return;
        const query = new URLSearchParams({ visao: selected, pausado: paused ? '1' : '0', intervalo: String(intervalSeconds) });
        window.history.replaceState(window.history.state, '', `${pathname}?${query}`);
        try { localStorage.setItem(`zyllen:personal-panel:${userId}`, JSON.stringify({ selected, paused, intervalSeconds })); } catch { /* Controls work in memory. */ }
    }, [ready, userId, selected, paused, intervalSeconds, pathname]);

    useEffect(() => {
        if (!ready || paused || held || allowedKey.split(',').length < 2) return;
        const timer = window.setInterval(() => {
            const ids = allowedKey.split(',') as PanelId[];
            setSelected(current => ids[(ids.indexOf(current) + 1) % ids.length]);
        }, intervalSeconds * 1_000);
        return () => window.clearInterval(timer);
    }, [ready, paused, held, selected, allowedKey, intervalSeconds]);

    const select = (id: PanelId) => {
        if (!held && allowed.includes(id)) { setSelected(id); setPaused(true); }
    };
    const setRotationSeconds = (value: number) => {
        const valid = rotationSeconds(value);
        if (valid) setIntervalSeconds(valid);
    };
    return { selected, paused, intervalSeconds, ready, select, setPaused, setRotationSeconds };
}
