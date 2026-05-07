import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CoachAuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleSession = async (session) => {
      if (hasProcessed.current || !session?.access_token) return;
      hasProcessed.current = true;

      try {
        const user = session.user;
        const res = await axios.post(`${API}/api/coach/auth/google`, {
          google_email: user.email,
          google_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          google_id: user.id,
        });

        // Existing coach — log in
        localStorage.setItem("cb_coach_token", res.data.token);
        localStorage.setItem("cb_coach_auth_method", "google");
        navigate("/coach/dashboard", { replace: true });
      } catch (err) {
        if (err.response?.status === 404) {
          // Parse the detail — FastAPI returns it as a string when using json.dumps
          let detail = err.response.data?.detail;
          if (typeof detail === "string") {
            try { detail = JSON.parse(detail); } catch {}
          }
          if (detail?.needs_registration) {
            sessionStorage.setItem("coach_google_prefill", JSON.stringify(detail.prefill));
            navigate("/coach/register?prefill=true", { replace: true });
            return;
          }
        }
        navigate("/coach/login", { replace: true });
      }
    };

    // Listen for PKCE exchange completion
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        handleSession(session);
      }
    });

    // Fallback: session may already be ready
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
    });

    const timeout = setTimeout(() => {
      if (!hasProcessed.current) navigate("/coach/login", { replace: true });
    }, 20000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm font-medium">Signing you in…</p>
      </div>
    </div>
  );
}
