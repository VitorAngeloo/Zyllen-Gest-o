import type { ProjectPlanning, ProjectPlanningStage, ProjectRoomSpecifications, ProjectServiceStatus, ScheduleType, ProjectLegacyRecord } from '@zyllen/shared';

/** View model adapted from cronograma-skyline/src/tipos.ts; never a database contract. */
export type ChronogramStage = ProjectPlanningStage | ProjectServiceStatus | 'UNKNOWN';
export type ChronogramService = ScheduleType | 'TRIP';
export type ChronogramView = 'agenda' | 'calendario' | 'projetos' | 'pendencias';
export type ChronogramMonth = number | 'all';
export type ChronogramTechnical = ProjectRoomSpecifications;
export interface ChronogramPending {
    id: string; type: string; responsible: string; deadline: string; detail: string; open: boolean;
    resolvedAt: string; resolvedBy: string;
    version?: number; createdAt?: string; createdBy?: string;
}
export interface ChronogramNote { id: string; date: string; author: string; text: string }
export interface ChronogramRecord {
    id: string;
    sourceId: string;
    kind: 'project' | 'schedule' | 'trip' | 'legacy';
    legacySource?: { name: string; sha256: string; importedAt: string; sourceId: string };
    legacy?: ProjectLegacyRecord;
    title: string; company: string; city: string; state: string; address: string;
    service: ChronogramService; stage: ChronogramStage;
    operationalStatus: ProjectServiceStatus | 'UNKNOWN';
    category: 'sala' | 'tela' | null;
    start: string; end: string; forecast: string; originalDate: string;
    completedDate: string; completionDateKnown: boolean;
    equipment: string[]; technical: ChronogramTechnical | null;
    people: string[]; notes: string; color: string; marker: string; mapsUrl: string;
    pending: ChronogramPending[]; annotations: ChronogramNote[];
    collaborationAvailable: boolean;
    actionsAvailable: boolean;
    planning: ProjectPlanning | null;
}
export interface ChronogramFilters {
    year: number; month: ChronogramMonth; category: 'all' | 'sala' | 'tela' | 'unknown';
    service: 'all' | ChronogramService; stage: 'all' | ChronogramStage; state: string; search: string;
}
export interface ChronogramSelection { id: string; kind: ChronogramRecord['kind'] }
export interface ChronogramAlert {
    id: string; record: ChronogramRecord; type: string; responsible: string; deadline: string; detail: string; automatic: boolean;
}
