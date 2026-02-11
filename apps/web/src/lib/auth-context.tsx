"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@web/lib/api-client";

interface User {
    id: string;
    name: string;
    email: string;
    role: { id: string; name: string };
    type: "internal";
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    permissions: string[];
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
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

    const loadUser = useCallback(async (accessToken: string) => {
        try {
            const me = await apiClient.get<{ user: User }>("/auth/me", authHeaders(accessToken));
            const permsRes = await apiClient.get<{ data: { screen: string; action: string }[] }>(
                "/auth/me/permissions",
                authHeaders(accessToken)
            );
            setUser(me.user);
            setToken(accessToken);
            setPermissions(permsRes.data.map((p) => `${p.screen}.${p.action}`));
        } catch {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
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

    const login = async (email: string, password: string) => {
        const res = await apiClient.post<{
            accessToken: string;
            refreshToken: string;
            user: User;
        }>("/auth/login", { email, password });
        localStorage.setItem("accessToken", res.accessToken);
        localStorage.setItem("refreshToken", res.refreshToken);
        setToken(res.accessToken);
        setUser(res.user);
        // Load permissions
        const permsRes = await apiClient.get<{ data: { screen: string; action: string }[] }>(
            "/auth/me/permissions",
            authHeaders(res.accessToken)
        );
        setPermissions(permsRes.data.map((p) => `${p.screen}.${p.action}`));
    };

    const logout = () => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setToken(null);
        setPermissions([]);
    };

    const hasPermission = (perm: string) => permissions.includes(perm);

    return (
        <AuthContext.Provider value={{ user, token, permissions, isLoading, login, logout, hasPermission }}>
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
    return {
        headers: token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>),
    };
}
