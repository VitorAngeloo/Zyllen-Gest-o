"use client";
import { useId, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useAuthedFetch } from '@web/features/auth/context/auth-context';
import { Button } from '@web/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@web/components/ui/dialog';
import { PROJECT_SERVICE_COPY as copy, PROJECTS_AGENDA_COPY as workspaceCopy } from '@web/lib/brand-voice';
import { useDialogFocus } from '@web/lib/use-dialog-focus';
import { projectServiceApi } from '../api/project-service-api';
import { ProjectServiceFormDialog } from './project-service-form-dialog';

function LoadingDialog({ error, retry, onClose }: { error: boolean; retry: () => void; onClose: () => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useDialogFocus(ref, onClose);
    return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <DialogHeader><DialogTitle id={titleId}>{copy.details}</DialogTitle></DialogHeader>
        <DialogBody>{error ? <div role="alert" className="space-y-3"><p>{workspaceCopy.projectError}</p><Button onClick={retry}>{copy.retry}</Button></div>
            : <p role="status">{workspaceCopy.loadingProject}</p>}<Button className="mt-4" variant="outline" onClick={onClose}>{copy.cancel}</Button></DialogBody>
    </DialogContent></Dialog>;
}

export function ProjectServiceDialog({ id, onClose }: { id?: string; onClose: () => void }) {
    const { user, hasPermission } = useAuth();
    const options = useAuthedFetch();
    const client = useQueryClient();
    const enabled = !!user && hasPermission('schedule.view');
    const record = useQuery({ queryKey: ['project-services', 'detail', user?.id, id],
        queryFn: ({ signal }) => projectServiceApi.detail(id!, { ...options, signal }), enabled: enabled && !!id, staleTime: 0 });
    const choices = useQuery({ queryKey: ['project-service-options', user?.id],
        queryFn: ({ signal }) => projectServiceApi.options({ ...options, signal }), enabled });
    if (!enabled) return null;
    if ((id && (!record.data || !record.isFetchedAfterMount)) || !choices.data || record.isError || choices.isError) return <LoadingDialog error={record.isError || choices.isError}
        onClose={onClose} retry={() => { if (id) void record.refetch(); void choices.refetch(); }} />;
    return <ProjectServiceFormDialog key={id ?? 'new'} editing={id ? record.data : undefined} choices={choices.data} options={options} onClose={onClose}
        onSaved={async () => { await Promise.all(['project-services', 'project-service-options', 'schedules', 'projects', 'trips', 'trip-options', 'operations-statistics', 'project-statistics']
            .map(key => client.invalidateQueries({ queryKey: [key] }))); }} />;
}
