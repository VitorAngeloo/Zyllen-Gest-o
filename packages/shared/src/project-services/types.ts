import type { ProjectServiceStatus, ProjectServiceType, ProjectStatisticsQuery } from './schemas';

export interface ProjectDashboardHighlight {
    id: string;
    projectId: string;
    name: string;
    companyName: string;
    type: ProjectServiceType;
    status: ProjectServiceStatus;
    markerName: string | null;
    urgency: number;
    color: string;
    relevant: boolean;
    startDate: string | null;
    endDate: string | null;
}

export interface ProjectStatistics {
    generatedAt: string;
    type: ProjectStatisticsQuery['type'];
    period: { start: string; end: string };
    current: {
        total: number;
        active: number;
        pending: number;
        scheduled: number;
        inProgress: number;
        done: number;
        cancelled: number;
    };
    completedInPeriod: number;
    cancelledInPeriod: number;
    dataQuality: { completedWithoutDate: number; cancelledWithoutDate: number; unclassified: number };
    highlights: ProjectDashboardHighlight[];
}

export interface ProjectServicePerson { id: string; name: string; sector?: string | null; agendaColor?: string | null; roleName?: string }
export interface ProjectServiceScheduleContext {
    id: string; projectId: string; urgency: number; color: string; requiresTravel: boolean;
    marker: { id: string; name: string } | null;
    contractors: { user: { id: string; name: string } }[];
}
export interface ProjectServiceRecord {
    id: string;
    projectId: string;
    name: string;
    company: { id: string; name: string };
    type: ProjectServiceType;
    status: ProjectServiceStatus;
    marker: { id: string; name: string } | null;
    followup: { id: string; code: string } | null;
    urgency: number;
    color: string;
    address: string | null;
    city: string | null;
    state: string | null;
    mapsUrl: string | null;
    notes: string | null;
    sectors: string[];
    requiresTravel: boolean;
    trip?: { id: string; title: string; status: string; originCity: string; originState: string; participantIds: string[] } | null;
    relevant: boolean;
    internalAssignees: ProjectServicePerson[];
    contractors: ProjectServicePerson[];
    schedule: { id: string; startDate: string; endDate: string } | null;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
    structureCycle?: { id: string; structureId: string; structureName: string; installationId: string } | null;
}
export interface ProjectServiceOptions {
    companies: { id: string; name: string; address: string | null; city: string | null; state: string | null }[];
    projects: { id: string; name: string; companyId: string; address: string | null; city: string | null; state: string | null; hasService: boolean }[];
    markers: { id: string; name: string }[];
    followups: { id: string; code: string; companyId: string; projectId: string | null; serviceId: string | null }[];
    internalUsers: ProjectServicePerson[];
    contractors: ProjectServicePerson[];
}
