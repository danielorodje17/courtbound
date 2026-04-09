import axios from "axios";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";
const TOKEN_KEY = "courtbound_session_token";

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export function apiRequest(method, url, data = null) {
  const token = getToken();
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return axios({ method, url: `${API}${url}`, ...(data && { data }), headers });
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await apiRequest("get", "/auth/me");
      setUser(data);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth, skip /auth/me — AuthCallback handles it
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try { await apiRequest("post", "/auth/logout"); } catch {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
