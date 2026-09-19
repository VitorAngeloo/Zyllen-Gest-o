"use client";
import { useState } from 'react';
import { MonitorUp } from 'lucide-react';
import { useAuth } from '@web/features/auth/context/auth-context';
import { MONITORING_PANEL_COPY as copy } from '@web/lib/brand-voice';
import { Button } from '@web/components/ui/button';
import { PANEL_IDS, PANEL_PERMISSIONS } from '../panel.constants';
import { PanelMirrorDialog } from './panel-mirror-dialog';

export function PanelMirrorSettings() {
    const { user, userType, hasPermission } = useAuth();
    const [open, setOpen] = useState(false);
    const views = userType === 'internal' ? PANEL_IDS.filter(id => hasPermission(PANEL_PERMISSIONS[id])) : [];
    if (!user || !views.length) return null;
    return <>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}><MonitorUp className="mr-2 h-4 w-4" />{copy.mirror}</Button>
        {open && <PanelMirrorDialog views={views} onClose={() => setOpen(false)} />}
    </>;
}
