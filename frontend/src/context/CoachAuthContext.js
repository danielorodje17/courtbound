import { useState, createContext, useContext, useEffect } from "react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;
const TOKEN_KEY = "cb_coach_token";

const CoachAuthContext = createContext(null);

export function CoachAuthProvider({ children }) {
  const [coach, setCoach] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    axios.get(`${API}/api/coach/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setCoach(r.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const r = await axios.post(`${API}/api/coach/auth/login`, { email, password });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setCoach(r.data.coach);
    return r.data;
  };

  const register = async (data) => {
    const r = await axios.post(`${API}/api/coach/auth/register`, data);
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setCoach(r.data.coach);
    return r.data;
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      axios.post(`${API}/api/coach/auth/logout`, {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    localStorage.removeItem(TOKEN_KEY);
    setCoach(null);
  };

  const coachReq = (method, path, data) => {
    const token = localStorage.getItem(TOKEN_KEY);
    return axios({ method, url: `${API}/api/coach${path}`, data, headers: { Authorization: `Bearer ${token}` } });
  };

  const updateCoach = (updates) => setCoach(prev => ({ ...prev, ...updates }));

  return (
    <CoachAuthContext.Provider value={{ coach, loading, login, register, logout, coachReq, updateCoach }}>
      {children}
    </CoachAuthContext.Provider>
  );
}

export function useCoachAuth() {
  return useContext(CoachAuthContext);
}
