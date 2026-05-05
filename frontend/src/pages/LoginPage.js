import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, apiRequest, setToken } from "../context/AuthContext";
import { supabase } from "../supabaseClient";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading, checkAuth } = useAuth();

  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    const redirectTo = window.location.origin + "/auth/callback";
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const endpoint = mode === "signup" ? "/auth/register" : "/auth/login";
      const payload = mode === "signup"
        ? { email, password, name }
        : { email, password };

      const res = await apiRequest("post", endpoint, payload);
      if (res.data?.session_token) {
        setToken(res.data.session_token);
        await checkAuth();
        navigate("/dashboard");
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Something went wrong. Please try again.");
    }
    setSubmitting(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 relative"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1546519638405-a2f9b51da64f?w=1600&q=80"
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
      </div>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6">
                <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M12 2a10 10 0 0 1 0 20" stroke="white" strokeWidth="1.5" fill="none"/>
                <path d="M2 12h20M12 2c-2.5 3-4 6.5-4 10s1.5 7 4 10" stroke="white" strokeWidth="1.5" fill="none"/>
              </svg>
            </div>
            <span
              className="text-2xl font-black text-slate-900"
              style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              CourtBound
            </span>
          </div>
          <h1
            className="text-3xl font-black text-slate-900"
            style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}
          >
            Your Scholarship<br />Tracker
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Track US college basketball scholarships,<br />manage coaches and draft winning emails.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">

          {/* Sign in / Sign up toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              data-testid="mode-signin-btn"
              onClick={() => { setMode("signin"); setError(""); }}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${mode === "signin" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Sign In
            </button>
            <button
              data-testid="mode-signup-btn"
              onClick={() => { setMode("signup"); setError(""); }}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${mode === "signup" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Create Account
            </button>
          </div>

          {/* Error */}
          {error && (
            <div data-testid="auth-error" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
              {error}
            </div>
          )}

          {/* Email / Password form */}
          <form onSubmit={handleEmailSubmit} className="space-y-3 mb-5">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Full Name</label>
                <input
                  data-testid="input-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Alex Thompson"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-orange-400 transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email</label>
              <input
                data-testid="input-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@school.ac.uk"
                required
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-orange-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Password</label>
              <div className="relative">
                <input
                  data-testid="input-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  required
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 pr-11 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-orange-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              data-testid="email-submit-btn"
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signup" ? "Create Account" : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-bold text-slate-400">OR</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Google */}
          <button
            onClick={handleGoogleLogin}
            data-testid="google-login-btn"
            className="flex items-center justify-center gap-3 w-full bg-white border-2 border-slate-200 rounded-xl py-3 px-5 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:shadow-md transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed">
            {mode === "signup"
              ? "14-day free trial included. No credit card required."
              : "Each account has its own private scholarship tracker."}
          </p>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Built for UK basketball players targeting US college scholarships
        </p>
      </div>
    </div>
  );
}
