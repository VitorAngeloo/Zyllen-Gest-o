"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
function Redirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/dashboard'); }, [router]);
    return <p role="status">{copy.loading}</p>;
}
export default function PanelRedirectScreen() { return <Redirect />; }
