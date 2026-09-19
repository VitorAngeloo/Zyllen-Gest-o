

export enum AuthorType {
    INTERNAL = 'INTERNAL',
    EXTERNAL = 'EXTERNAL',
}

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

export interface PaginationParams {
    offset?: number;
    limit?: number;
}
