// ============================================
// Zyllen Gestão — API Client
// ============================================

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {},
    ): Promise<T> {
        const { body, headers, ...rest } = options;

        const config: RequestInit = {
            ...rest,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                response.status,
                errorData.message || response.statusText,
                errorData,
            );
        }

        // Handle empty responses (204)
        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    async post<T>(
        endpoint: string,
        body?: unknown,
        options?: RequestOptions,
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'POST', body });
    }

    async put<T>(
        endpoint: string,
        body?: unknown,
        options?: RequestOptions,
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'PUT', body });
    }

    async patch<T>(
        endpoint: string,
        body?: unknown,
        options?: RequestOptions,
    ): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
    }

    async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export class ApiError extends Error {
    status: number;
    data: unknown;

    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
