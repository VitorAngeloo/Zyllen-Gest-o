import type { VehicleCreateInput, VehicleInput, VehicleRecord, VehicleReservationCreateInput, VehicleReservationInput, VehicleReservationRecord, VehicleReservationQuery, VehicleStatistics, VehicleDashboard, VehicleDashboardQuery } from '@zyllen/shared';
import { apiClient, ApiError, type RequestOptions } from '@web/lib/api-client';

export function isVehicleServiceUnavailable(error: unknown): boolean {
    return error instanceof ApiError && error.status === 404;
}

export function shouldRetryVehicleQuery(failureCount: number, error: unknown): boolean {
    return failureCount < 1 && !isVehicleServiceUnavailable(error);
}

export const vehicleApi = {
    async options(options: RequestOptions) { return (await apiClient.get<{ data: { vehicles: VehicleRecord[]; responsibleUsers: { id: string; name: string }[]; reservationResponsibleUsers: { id: string; name: string }[] } }>('/vehicles/options', options)).data; },
    reservations(query: VehicleReservationQuery, options: RequestOptions) { return apiClient.get<{ data: VehicleReservationRecord[]; total: number; page: number; limit: number }>(`/vehicles/reservations?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`, options); },
    async statistics(options: RequestOptions) { return (await apiClient.get<{ data: VehicleStatistics }>('/vehicles/statistics', options)).data; },
    async dashboard(query: VehicleDashboardQuery, options: RequestOptions) { return (await apiClient.get<{ data: VehicleDashboard }>(`/vehicles/dashboard?${new URLSearchParams(Object.entries(query).map(([key, value]) => [key, String(value)]))}`, options)).data; },
    async operations(options: RequestOptions) { return (await apiClient.get<{ data: { inUse: VehicleReservationRecord[]; ready: VehicleReservationRecord[]; recent: VehicleReservationRecord[] } }>('/vehicles/operations', options)).data; },
    async checkout(id: string, form: FormData, options: RequestOptions) { return (await apiClient.upload<{ data: VehicleReservationRecord }>(`/vehicles/reservations/${id}/checkout`, form, options)).data; },
    async returnVehicle(id: string, form: FormData, options: RequestOptions) { return (await apiClient.upload<{ data: VehicleReservationRecord }>(`/vehicles/reservations/${id}/return`, form, options)).data; },
    async create(input: VehicleCreateInput, options: RequestOptions) { return (await apiClient.post<{ data: VehicleRecord }>('/vehicles', input, options)).data; },
    async update(id: string, input: VehicleInput, options: RequestOptions) { return (await apiClient.put<{ data: VehicleRecord }>(`/vehicles/${id}`, input, options)).data; },
    async reserve(input: VehicleReservationCreateInput, options: RequestOptions) { return (await apiClient.post<{ data: VehicleReservationRecord }>('/vehicles/reservations', input, options)).data; },
    async updateReservation(id: string, input: VehicleReservationInput, options: RequestOptions) { return (await apiClient.put<{ data: VehicleReservationRecord }>(`/vehicles/reservations/${id}`, input, options)).data; },
    async cancelReservation(id: string, options: RequestOptions) { return (await apiClient.put<{ data: VehicleReservationRecord }>(`/vehicles/reservations/${id}/cancel`, {}, options)).data; },
};
