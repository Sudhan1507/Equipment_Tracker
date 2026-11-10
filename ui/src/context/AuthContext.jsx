import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const response = await api.get("/api/auth/me");
      const payload = response.data?.data ?? response.data;
      const currentUser = payload.user ?? payload;
      setUser(currentUser || null);
      return currentUser || null;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  async function login(email, password) {
    // Backend must set the JWT in a Secure/HttpOnly/SameSite cookie.
    await api.post("/api/auth/login", { email, password });
    const currentUser = await refreshUser();
    if (!currentUser) {
      throw new Error("Login succeeded but /api/auth/me could not load the user. Check cookie/CORS settings.");
    }
    return currentUser;
  }

  async function logout() {
    // No logout endpoint was provided. Clear client state; cookie expires/clears on server policy.
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      isDemo: Boolean(user?.__demo),
      login,
      logout,
      refreshUser,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
