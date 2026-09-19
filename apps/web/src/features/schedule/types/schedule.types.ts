import type { ProjectServiceScheduleContext, TripScheduleContext } from '@zyllen/shared';

export interface Installer {
    id: string;
    name: string;
    email: string;
    sector: string | null;
    agendaColor: string | null;
    agendaActive: boolean | null;
}

export interface ScheduleInstaller {
    id: string;
    name: string;
    agendaColor: string | null;
}

export interface Schedule {
    id: string;
    title: string;
    type: string;
    status: string;
    startDate: string;
    endDate: string;
    address: string | null;
    notes: string | null;
    companyId: string | null;
    projectId: string | null;
    parentScheduleId: string | null;
    companyName: string | null;
    projectName: string | null;
    createdByName: string | null;
    installers: ScheduleInstaller[];
    projectService?: ProjectServiceScheduleContext | null;
    trip?: TripScheduleContext | null;
}

export type Tab = "agendamentos" | "calendario" | "instaladores";

export type CalendarSchedule = Omit<Schedule, 'parentScheduleId'>;

export type FormSchedule = Pick<Schedule, 'id' | 'title' | 'type' | 'status' | 'startDate' | 'endDate' | 'address' | 'notes' | 'companyId' | 'projectId' | 'installers' | 'projectService'>;

export type AgendaInstaller = Omit<Installer, 'email' | 'agendaActive'> & {
    agendaActive: boolean | number | string | null;
};

export interface Company {
    id: string;
    name: string;
}

export interface Project {
    id: string;
    name: string;
}

export interface ConflictRow {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    installerId: string;
    installerName: string;
}
