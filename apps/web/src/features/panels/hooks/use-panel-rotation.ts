"use client";
import { useEffect, useRef, useState } from 'react';
import { isPanelId, PANEL_ROTATION_MS, type PanelId } from '../panel.constants';
export function usePanelRotation(userId: string | undefined, allowed: PanelId[], originalQuery: string, held: boolean, pathname: string) {
    const original = useRef(originalQuery), initialized = useRef<string | undefined>(undefined), allowedKey = allowed.join(',');
    const [selected, setSelected] = useState<PanelId>('atendimentos'), [paused, setPaused] = useState(false), [ready, setReady] = useState(false);
    useEffect(() => {
        if (!userId || !allowedKey) { setReady(false); return; }
        const permitted = allowedKey.split(',') as PanelId[];
        if (initialized.current === userId) {
            setSelected(current => permitted.includes(current) ? current : permitted[0]);
            setReady(true);
            return;
        }
        const query = new URLSearchParams(original.current);
        let saved: { selected?: unknown; paused?: unknown } = {};
        try { saved = JSON.parse(localStorage.getItem(`zyllen:personal-panel:${userId}`) ?? '{}') ?? {}; } catch { /* URL controls remain usable without storage. */ }
        const wanted = query.get('visao') ?? saved.selected;
        setSelected(isPanelId(wanted) && permitted.includes(wanted) ? wanted : permitted[0]);
        setPaused(query.has('pausado') ? query.get('pausado') === '1' : saved.paused === true);
        initialized.current = userId;
        setReady(true);
    }, [userId, allowedKey]);
    useEffect(() => {
        if (!ready || !userId) return;
        const query = new URLSearchParams({ visao: selected, pausado: paused ? '1' : '0' });
        window.history.replaceState(window.history.state, '', `${pathname}?${query}`);
        try { localStorage.setItem(`zyllen:personal-panel:${userId}`, JSON.stringify({ selected, paused })); } catch { /* Controls work in memory. */ }
    }, [ready, userId, selected, paused, pathname]);
    useEffect(() => {
        if (!ready || paused || held || allowedKey.split(',').length < 2) return;
        const timer = window.setInterval(() => { const ids = allowedKey.split(',') as PanelId[]; setSelected(current => ids[(ids.indexOf(current) + 1) % ids.length]); }, PANEL_ROTATION_MS);
        return () => window.clearInterval(timer);
    }, [ready, paused, held, selected, allowedKey]);
    const select = (id: PanelId) => { if (!held && allowed.includes(id)) { setSelected(id); setPaused(true); } };
    return { selected, paused, ready, select, setPaused };
}
