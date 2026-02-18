"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@web/lib/api-client";

export type UserType = "internal" | "external" | "contractor";

interface InternalUser {
    id: string;
    name: string;
    email: string;
    role: { id: string; name: string };
    type: "internal";
}

interface ExternalUser {
    id: string;
    name: string;
    email: string;
    company?: { id: string; name: string };
    type: "external";
}

interface ContractorUser {
    id: string;
    name: string;
    email: string;
    type: "contractor";
}

type User = InternalUser | ExternalUser | ContractorUser;

interface AuthContextType {
    user: User | null;
    token: string | null;
    permissions: string[];
    userType: UserType | null;
    isLoading: boolean;
    login: (email: string, password: string, type?: UserType) => Promise<UserType>;
    logout: () => void;
    hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [permissions, setPermissions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const authHeaders = useCallback(
        (t: string) => ({ headers: { Authorization: `Bearer ${t}` } }),
        []
    );

    const logout = useCallback(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("userType");
        setUser(null);
        setToken(null);
        setPermissions([]);
    }, []);

    // Listen for forced logout from api-client (token refresh failure)
    useEffect(() => {
        const handler = () => logout();
        window.addEventListener("auth:logout", handler);
        return () => window.removeEventListener("auth:logout", handler);
    }, [logout]);

    // Listen for token refresh from api-client and sync state
    useEffect(() => {
        const handler = (e: Event) => {
            const newToken = (e as CustomEvent).detail?.accessToken;
            if (newToken) {
                setToken(newToken);
            }
        };
        window.addEventListener("auth:token-refreshed", handler);
        return () => window.removeEventListener("auth:token-refreshed", handler);
    }, []);

    const loadUser = useCallback(async (accessToken: string) => {
        try {
            const me = await apiClient.get<{ data: User }>("/auth/me", authHeaders(accessToken));
            const userData = me.data;
            setUser(userData);
            setToken(accessToken);

            // Only load permissions for internal users
            if (userData.type === "internal") {
                try {
                    const permsRes = await apiClient.get<{ data: string[] }>(
                        "/auth/me/permissions",
                        authHeaders(accessToken)
                    );
                    setPermissions(permsRes.data);
                } catch {
                    setPermissions([]);
                }
            } else {
                setPermissions([]);
            }
        } catch {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userType");
            setUser(null);
            setToken(null);
            setPermissions([]);
        }
    }, [authHeaders]);

    useEffect(() => {
        const saved = localStorage.getItem("accessToken");
        if (saved) {
            loadUser(saved).finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [loadUser]);

    const login = async (email: string, password: string, type: UserType = "internal"): Promise<UserType> => {
        // Determine the correct login endpoint
        const endpoints: Record<UserType, string> = {
            internal: "/auth/login",
            external: "/clients/login",
            contractor: "/register/contractor/login",
        };

        const res = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: User;
        }>(endpoints[type], { email, password });

        localStorage.setItem("accessToken", res.accessToken);
        localStorage.setItem("refreshToken", res.refreshToken);
        localStorage.setItem("userType", type);
        setToken(res.accessToken);
        setUser(res.user);

        // Load permissions only for internal users
        if (type === "internal") {
            try {
                const permsRes = await apiClient.get<{ data: string[] }>(
                    "/auth/me/permissions",
                    authHeaders(res.accessToken)
                );
                setPermissions(permsRes.data);
            } catch {
                setPermissions([]);
            }
        } else {
            setPermissions([]);
        }

        return type;
    };

    const hasPermission = (perm: string) => permissions.includes(perm);

    const userType: UserType | null = user?.type ?? null;

    return (
        <AuthContext.Provider value={{ user, token, permissions, userType, isLoading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}

export function useAuthedFetch() {
    const { token } = useAuth();
    return React.useMemo(() => ({
        headers: token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>),
    }), [token]);
}
