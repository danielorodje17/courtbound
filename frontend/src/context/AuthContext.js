import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = loading, false = not auth
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data } = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(data);
    } catch {
      // Try token from localStorage as fallback
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const { data } = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true
          });
          setUser(data);
        } catch {
          localStorage.removeItem("access_token");
          setUser(false);
        }
      } else {
        setUser(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { email, password }, { withCredentials: true });
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    setUser(data);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await axios.post(`${API}/auth/register`, { name, email, password }, { withCredentials: true });
    if (data.access_token) localStorage.setItem("access_token", data.access_token);
    setUser(data);
    return data;
  };

  const logout = async () => {
    await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    localStorage.removeItem("access_token");
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function apiRequest(method, url, data = null) {
  const token = localStorage.getItem("access_token");
  const config = {
    method,
    url: `${API}${url}`,
    withCredentials: true,
    ...(data && { data }),
    ...(token && { headers: { Authorization: `Bearer ${token}` } })
  };
  return axios(config);
}
