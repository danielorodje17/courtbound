import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const sessionId = params.get("session_id");

    if (!sessionId) {
      navigate("/login");
      return;
    }

    apiRequest("post", "/auth/session", { session_id: sessionId })
      .then(async () => {
        await checkAuth();
        navigate("/dashboard");
      })
      .catch(() => navigate("/login"));
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
