import { SetMetadata } from '@nestjs/common';

export const PERMISSION_KEY = 'permission';

/**
 * Decorator to set the required permission for an endpoint.
 * Format: 'screen.action' (e.g., 'inventory.bipar_entrada', 'approvals.approve')
 */
export const RequirePermission = (permission: string) =>
    SetMetadata(PERMISSION_KEY, permission);
