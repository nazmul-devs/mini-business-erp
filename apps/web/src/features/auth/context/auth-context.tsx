"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AuthUser, LoginInput, RegisterInput, AuthResponse } from "@erp/shared";
import { api } from "@/lib/api";
import { authStorage } from "@/lib/auth-storage";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const storedToken = authStorage.getToken();
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get<{ success: boolean; data: AuthUser }>("/api/auth/me", storedToken);
      if (response.success && response.data) {
        setUser(response.data);
        setToken(storedToken);
        authStorage.setUser(response.data);
      }
    } catch {
      authStorage.clear();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = authStorage.getUser();
    const savedToken = authStorage.getToken();

    if (savedToken && savedUser) {
      setUser(savedUser);
      setToken(savedToken);
      setIsLoading(false);
      refreshUser();
    } else if (savedToken) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [refreshUser]);

  const login = async (input: LoginInput): Promise<AuthUser> => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/login", input);
    const { token: newToken, user: newUser } = response.data;

    authStorage.setToken(newToken);
    authStorage.setUser(newUser);
    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  const register = async (input: RegisterInput): Promise<AuthUser> => {
    const response = await api.post<{ success: boolean; data: AuthResponse }>("/api/auth/register", input);
    const { token: newToken, user: newUser } = response.data;

    authStorage.setToken(newToken);
    authStorage.setUser(newUser);
    setToken(newToken);
    setUser(newUser);

    return newUser;
  };

  const logout = async (): Promise<void> => {
    try {
      if (token) {
        await api.post("/api/auth/logout", {}, token).catch(() => {});
      }
    } finally {
      authStorage.clear();
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
