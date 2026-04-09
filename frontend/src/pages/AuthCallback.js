import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, setToken, useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  useEffect(() => {
    // Session_id may arrive in the URL hash or as a query param
    const hashParams = new URLSearchParams(window.location.hash.replace("#", ""));
    const searchParams = new URLSearchParams(window.location.search);
    const sessionId = hashParams.get("session_id") || searchParams.get("session_id");

    if (!sessionId) {
      navigate("/login");
      return;
    }

    apiRequest("post", "/auth/session", { session_id: sessionId })
      .then(async ({ data }) => {
        // Store the token in localStorage so all subsequent requests use it
        if (data.session_token) {
          setToken(data.session_token);
        }
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
