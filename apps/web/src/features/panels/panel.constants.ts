import { PANEL_IDS, type PanelId } from '@zyllen/shared';
export { PANEL_DEFAULT_ROTATION_SECONDS, PANEL_IDS, PANEL_MIRROR_REFRESH_MS, PANEL_PERMISSIONS, PANEL_PERMISSION_OPTIONS, PANEL_ROTATION_MS, PANEL_ROTATION_OPTIONS, type PanelId, type PanelRotationSeconds } from '@zyllen/shared';
export function isPanelId(value: unknown): value is PanelId { return PANEL_IDS.some(id => id === value); }
