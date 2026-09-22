import type { ScheduleStatus } from '../schedule';
import type { ProjectDashboardHighlight, ProjectServiceType } from '../project-services';

export interface TripPerson { id: string; name: string; agendaColor?: string | null }
export interface TripScheduleContext {
    id: string;
    originCity: string; originState: string; destinationCity: string; destinationState: string;
    contractors?: TripPerson[];
}
export interface TripServiceChoice {
    id: string; name: string; companyName: string; address: string | null; type: ProjectServiceType; tripId: string | null;
}
export interface TripRecord extends TripScheduleContext {
    title: string; interstate: boolean; notes: string | null;
    status: ScheduleStatus; startDate: string; endDate: string;
    startedAt: string | null; completedAt: string | null; cancelledAt: string | null;
    scheduleId: string; internalAssignees: TripPerson[]; contractors: TripPerson[];
    services: TripServiceChoice[];
    createdAt: string;
}
export interface TripOptions { internalUsers: TripPerson[]; contractors: TripPerson[]; services: TripServiceChoice[] }

export interface OperationServiceHighlight extends ProjectDashboardHighlight { completedAt: string | null }
export interface OperationTripHighlight extends TripScheduleContext {
    title: string; startDate: string; endDate: string; serviceCount: number;
}
export interface OperationsStatistics {
    generatedAt: string; period: { start: string; end: string };
    installationsCompleted: number; removalsCompleted: number;
    tripsPlanned: number; tripsCompleted: number;
    current: { plannedTrips: number; tripsInProgress: number };
    dataQuality: { servicesCompletedWithoutDate: number; tripsCompletedWithoutDate: number; travelWithoutBooking: number; unclassified: number };
    nextInstallations: OperationServiceHighlight[]; relevantInstallations: OperationServiceHighlight[];
    latestInstallations: OperationServiceHighlight[]; latestRemovals: OperationServiceHighlight[];
    nextInterstateTrips: OperationTripHighlight[];
}
