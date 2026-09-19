import { PANEL_IDS, type PanelId } from '@zyllen/shared';
export { PANEL_IDS, PANEL_PERMISSIONS, PANEL_ROTATION_MS, type PanelId } from '@zyllen/shared';
export function isPanelId(value: unknown): value is PanelId { return PANEL_IDS.some(id => id === value); }
