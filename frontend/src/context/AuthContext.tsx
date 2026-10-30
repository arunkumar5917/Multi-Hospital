import React, { createContext, useContext, useEffect, useState } from "react";
import { Hospital, LoginResponse, User } from "../types";

export const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface AuthContextType {
  user: User | null;
  token: string | null;
  selectedHospital: Hospital | null;
  setSelectedHospital: (h: Hospital | null) => void;
  login: (data: LoginResponse, rememberMe: boolean) => void;
  logout: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("x7_token") || sessionStorage.getItem("x7_token");
  });
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("x7_user") || sessionStorage.getItem("x7_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [selectedHospital, setSelectedHospitalState] = useState<Hospital | null>(() => {
    try {
      const stored = localStorage.getItem("x7_selected_hospital");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSelectedHospital = (h: Hospital | null) => {
    setSelectedHospitalState(h);
    if (h) {
      localStorage.setItem("x7_selected_hospital", JSON.stringify(h));
    } else {
      localStorage.removeItem("x7_selected_hospital");
    }
  };

  const login = (data: LoginResponse, rememberMe: boolean) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem("x7_token", data.access_token);
    if (data.refresh_token) {
      storage.setItem("x7_refresh_token", data.refresh_token);
    }
    storage.setItem("x7_user", JSON.stringify(data.user));

    setToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("x7_token");
      localStorage.removeItem("x7_refresh_token");
      localStorage.removeItem("x7_user");
      sessionStorage.removeItem("x7_token");
      sessionStorage.removeItem("x7_refresh_token");
      sessionStorage.removeItem("x7_user");
      setToken(null);
      setUser(null);
    }
  };

  const apiFetch = async (path: string, options: RequestInit = {}): Promise<Response> => {
    const currentToken = token || localStorage.getItem("x7_token") || sessionStorage.getItem("x7_token");
    const headers = new Headers(options.headers || {});

    if (currentToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    const fullUrl = path.startsWith("http") ? path : `${API_URL}${path}`;
    let resp = await fetch(fullUrl, { ...options, headers });

    // Handle token expiration & automatic refresh
    if (resp.status === 401 && (currentToken || localStorage.getItem("x7_refresh_token"))) {
      const refreshToken = localStorage.getItem("x7_refresh_token") || sessionStorage.getItem("x7_refresh_token");
      if (refreshToken) {
        try {
          const refreshResp = await fetch(`${API_URL}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });

          if (refreshResp.ok) {
            const refreshData = await refreshResp.json();
            const newToken = refreshData.access_token;
            if (localStorage.getItem("x7_token")) {
              localStorage.setItem("x7_token", newToken);
            } else {
              sessionStorage.setItem("x7_token", newToken);
            }
            setToken(newToken);
            headers.set("Authorization", `Bearer ${newToken}`);
            resp = await fetch(fullUrl, { ...options, headers });
          } else {
            await logout();
          }
        } catch {
          await logout();
        }
      }
    }

    return resp;
  };

  useEffect(() => {
    // Validate current token with /api/v1/auth/me on mount
    const verifySession = async () => {
      const activeToken = token || localStorage.getItem("x7_token") || sessionStorage.getItem("x7_token");
      if (!activeToken) {
        setIsLoading(false);
        return;
      }
      try {
        const resp = await fetch(`${API_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${activeToken}` },
        });
        if (resp.ok) {
          const userData = await resp.json();
          setUser(userData);
        } else {
          await logout();
        }
      } catch {
        // If offline or network issue, maintain state if cached user exists
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        selectedHospital,
        setSelectedHospital,
        login,
        logout,
        apiFetch,
        isAuthenticated: !!token && !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

