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
            // Support both new format { error: { message } } and legacy { message }
            const message =
                errorData?.error?.message ||
                errorData?.message ||
                response.statusText;
            throw new ApiError(response.status, message, errorData);
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
                // credentials: 'include' sends the httpOnly refresh_token cookie automatically.
                // Body fallback keeps compatibility with clients that still use localStorage.
                const refreshToken =
                    typeof window !== 'undefined'
                        ? localStorage.getItem('refreshToken')
                        : null;

                const res = await fetch(`${this.baseUrl}/auth/refresh`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // send httpOnly cookie
                    body: JSON.stringify(refreshToken ? { refreshToken } : {}),
                });

                if (!res.ok) return null;

                const data = await res.json();
                if (data.accessToken) {
                    localStorage.setItem('accessToken', data.accessToken);
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
            // Best-effort: ask backend to clear the httpOnly cookie
            fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}`,
                },
            }).catch(() => { /* ignore — logout is client-side regardless */ });

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

    /** Upload files using FormData (multipart/form-data) */
    async upload<T>(
        endpoint: string,
        formData: FormData,
        options?: Omit<RequestOptions, 'body'>,
    ): Promise<T> {
        const { headers, _retry, ...rest } = options || {};

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

        const config: RequestInit = {
            method: 'POST',
            body: formData,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
            ...rest,
        };
        // Do NOT set Content-Type — browser will set multipart boundary automatically

        const response = await fetch(`${this.baseUrl}${endpoint}`, config);

        if (response.status === 401 && !_retry) {
            const newToken = await this.tryRefresh();
            if (newToken) {
                return this.upload<T>(endpoint, formData, {
                    ...options,
                    _retry: true,
                    headers: { ...headers, Authorization: `Bearer ${newToken}` },
                });
            }
            this.forceLogout();
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message =
                errorData?.error?.message ||
                errorData?.message ||
                response.statusText;
            throw new ApiError(response.status, message, errorData);
        }

        return response.json();
    }
}

export class ApiError extends Error {
    status: number;
    data: unknown;
    details: unknown;

    constructor(status: number, message: string, data?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
        // Extract validation details from new { error: { details } } or legacy { errors }
        const d = data as Record<string, unknown> | undefined;
        this.details = (d?.error as Record<string, unknown> | undefined)?.details ?? d?.errors;
    }
}

export const apiClient = new ApiClient(API_BASE_URL);
