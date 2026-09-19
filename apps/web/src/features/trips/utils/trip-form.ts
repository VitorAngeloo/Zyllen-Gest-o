import type { TripInput, TripRecord } from '@zyllen/shared';
import { localDateTime } from '@web/lib/date-time';

export type TripFormValues = Omit<TripInput, 'originState' | 'destinationState'> & { originState: string; destinationState: string };
export function tripFormValues(trip?: TripRecord): TripFormValues {
    return {
        title: trip?.title ?? '', originCity: trip?.originCity ?? '', originState: trip?.originState ?? '', destinationCity: trip?.destinationCity ?? '', destinationState: trip?.destinationState ?? '',
        startDate: localDateTime(trip?.startDate), endDate: localDateTime(trip?.endDate), notes: trip?.notes ?? '',
        installerIds: trip?.internalAssignees.map(user => user.id) ?? [], contractorIds: trip?.contractors.map(user => user.id) ?? [], serviceIds: trip?.services.map(service => service.id) ?? [], allowConflicts: false,
    };
}
