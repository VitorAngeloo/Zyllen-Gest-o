/** Existing grants only. The future sector/role matrix is deliberately undecided. */
export const PROJECT_PLANNING_ACCESS = {
    view: 'schedule.view', history: 'schedule.view', createProject: 'schedule.create', editProject: 'schedule.update',
    createPending: 'schedule.update', editPending: 'schedule.update', resolvePending: 'schedule.update',
    annotate: 'schedule.update', cancel: 'schedule.update',
} as const;
export type ProjectPlanningAction = keyof typeof PROJECT_PLANNING_ACCESS;

/** Temporary restriction explicitly requested for the first operational release. */
export function canEnterProjectPlanning(user: { type: string; role?: { name: string } } | null | undefined) {
    return !!user && user.type === 'internal' && user.role?.name !== 'Internos';
}
