// ============================================
// Zyllen Gestão — Shared Types
// ============================================

// ── Asset Status ──
export enum AssetStatus {
    ATIVO = 'ATIVO',
    EM_USO = 'EM_USO',
    EM_MANUTENCAO = 'EM_MANUTENCAO',
    BAIXADO = 'BAIXADO',
}

// ── Approval Status ──
export enum ApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    EXECUTED = 'EXECUTED',
}

// ── Ticket Status ──
export enum TicketStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    WAITING_CLIENT = 'WAITING_CLIENT',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

// ── Ticket Priority ──
export enum TicketPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

// ── Maintenance Status ──
export enum MaintenanceStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    CLOSED = 'CLOSED',
}

// ── Purchase Order Status ──
export enum PurchaseOrderStatus {
    DRAFT = 'DRAFT',
    APPROVED = 'APPROVED',
    ORDERED = 'ORDERED',
    PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
    RECEIVED = 'RECEIVED',
    CANCELLED = 'CANCELLED',
}

// ── Author Type (for ticket messages) ──
export enum AuthorType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL',
}

// ── API Response Types ──
export interface ApiResponse<T = unknown> {
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T = unknown> {
    data: T[];
    total: number;
    offset: number;
    limit: number;
}

// ── Pagination Params ──
export interface PaginationParams {
    offset?: number;
    limit?: number;
}
