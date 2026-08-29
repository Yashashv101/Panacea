import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import apiClient, { setAuthToken, setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return { role: payload.role ?? null, userId: payload.uid ?? null };
  } catch {
    return { role: null, userId: null };
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [role, setRole] = useState(null);
  const [userId, setUserId] = useState(null);

  const logout = useCallback(() => {
    setToken(null);
    setRole(null);
    setUserId(null);
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
    const decoded = decodeToken(data.token);
    setRole(decoded.role);
    setUserId(decoded.userId);
    return decoded.role;
  }, []);

  const value = useMemo(
    () => ({ token, role, userId, isAuthenticated: !!token, login, logout }),
    [token, role, userId, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
