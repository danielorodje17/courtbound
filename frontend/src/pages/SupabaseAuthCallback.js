import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth, apiRequest, setToken } from "../context/AuthContext";

export default function SupabaseAuthCallback() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleSession = async (session) => {
      if (hasProcessed.current || !session?.access_token) return;
      hasProcessed.current = true;
      try {
        const res = await apiRequest("post", "/auth/google-callback", {
          access_token: session.access_token,
        });
        if (res.data?.session_token) {
          setToken(res.data.session_token);
          await checkAuth();
          navigate("/dashboard", { replace: true });
        } else {
          navigate("/login", { replace: true });
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        navigate("/login", { replace: true });
      }
    };

    // Listen for SIGNED_IN or INITIAL_SESSION (implicit flow fires one of these)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handleSession(session);
      }
    });

    // Fallback: check if session already exists (handles timing race)
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    // Timeout: if nothing fires within 8s, go back to login
    const timeout = setTimeout(() => {
      if (!hasProcessed.current) {
        console.error("Auth callback timeout - no session received");
        navigate("/login", { replace: true });
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-50"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm font-medium">Signing you in…</p>
      </div>
    </div>
  );
}
