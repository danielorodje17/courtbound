import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, setToken, useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);
  const { checkAuth } = useAuth();

  useEffect(() => {
    // useRef prevents double execution under React StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const sessionId = hashParams.get("session_id");

    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }

    apiRequest("post", "/auth/session", { session_id: sessionId })
      .then(async ({ data }) => {
        if (data.session_token) {
          setToken(data.session_token);
        }
        await checkAuth();
        // Navigate to dashboard with clean URL (no hash)
        navigate("/dashboard", { replace: true });
      })
      .catch(() => navigate("/login", { replace: true }));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mx-auto mb-4" />
        <p className="text-slate-500 text-sm font-medium">Signing you in...</p>
      </div>
    </div>
  );
}
