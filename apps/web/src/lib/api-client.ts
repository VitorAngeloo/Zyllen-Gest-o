// ============================================
// Zyllen Gestão — API Client (with auto-refresh)
// ============================================

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface RequestOptions extends Omit<RequestInit, 'body'> {
    body?: unknown;
    _retry?: boolean;
}

class ApiClient {
    private baseUrl: string;
    private refreshPromise: Promise<string | null> | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {},
    ): Promise<T> {
        const { body, headers, _retry, ...rest } = options;

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

        // Auto-refresh on 401 (skip for auth/login endpoints)
        if (
            response.status === 401 &&
            !_retry &&
            !endpoint.startsWith('/auth/login') &&
            !endpoint.startsWith('/auth/refresh') &&
            !endpoint.startsWith('/clients/login') &&
            !endpoint.startsWith('/register/contractor/login')
        ) {
            const newToken = await this.tryRefresh();
            if (newToken) {
                return this.request<T>(endpoint, {
                    ...options,
                    _retry: true,
                    headers: {
                        ...headers,
                        Authorization: `Bearer ${newToken}`,
                    },
                });
            }
            // Refresh failed — force logout
            this.forceLogout();
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new ApiError(
                response.status,
                errorData.message || response.statusText,
                errorData,
            );
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return response.json();
    }

    /** Attempt token refresh, deduplicating concurrent calls */
    private async tryRefresh(): Promise<string | null> {
        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = (async () => {
            try {
                const refreshToken =
                    typeof window !== 'undefined'
                        ? localStorage.getItem('refreshToken')
                        : null;
                if (!refreshToken) return null;

                const res = await fetch(`${this.baseUrl}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken }),
                });

                if (!res.ok) return null;

                const data = await res.json();
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
                    if (data.refreshToken) {
                        localStorage.setItem('refreshToken', data.refreshToken);
                    }
                    // Notify auth context of the new token
                    window.dispatchEvent(new CustomEvent('auth:token-refreshed', {
                        detail: { accessToken: data.accessToken },
                    }));
                    return data.accessToken as string;
                }
                return null;
            } catch {
                return null;
            } finally {
                this.refreshPromise = null;
            }
        })();

        return this.refreshPromise;
    }

    private forceLogout() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.dispatchEvent(new Event('auth:logout'));
        }
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
