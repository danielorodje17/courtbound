import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../context/AuthContext";

export default function SupabaseAuthCallback() {
  const navigate = useNavigate();
  const { setToken, checkAuth } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const run = async () => {
      try {
        // Exchange the PKCE code for a Supabase session (supabase-js handles code_verifier)
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.href
        );

        if (error || !data?.session?.access_token) {
          console.error("Supabase code exchange failed:", error?.message);
          navigate("/login", { replace: true });
          return;
        }

        const accessToken = data.session.access_token;

        // Send access_token to our FastAPI backend to create a custom session
        const res = await apiRequest("post", "/auth/google-callback", {
          access_token: accessToken,
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

    run();
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
