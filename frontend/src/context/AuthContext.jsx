import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import apiClient, { setAuthToken, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.role ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
    setAuthToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      window.location.assign("/login");
    });
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post("/auth/login", { email, password });
    setToken(data.token);
    setAuthToken(data.token);
    setRole(decodeRole(data.token));
    return decodeRole(data.token);
  }, []);

  const value = useMemo(
    () => ({ token, role, isAuthenticated: !!token, login, logout }),
    [token, role, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
