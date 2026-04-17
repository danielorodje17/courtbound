import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Trophy, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/login`, { email, password });
      localStorage.setItem("cb_admin_token", res.data.token);
      localStorage.setItem("cb_admin_email", res.data.email);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid credentials. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-slate-950 px-4"
      style={{ fontFamily: "Manrope, sans-serif" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center mb-3 shadow-lg shadow-orange-500/30">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <h1
            className="text-3xl font-black uppercase text-white tracking-wide"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            CourtBound
          </h1>
          <div className="flex items-center gap-1.5 mt-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Admin Access</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
          <h2 className="text-lg font-black text-white mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Sign In
          </h2>
          <p className="text-xs text-slate-500 mb-6">Enter your admin credentials to continue</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                data-testid="admin-email-input"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@courtbound.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  data-testid="admin-password-input"
                  type={showPw ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div
                data-testid="admin-login-error"
                className="flex items-start gap-2.5 bg-red-950/50 border border-red-800/50 rounded-xl px-4 py-3"
              >
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </div>
            )}

            <button
              data-testid="admin-login-submit"
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider rounded-xl py-3 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg shadow-orange-500/20"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-700 mt-5">
          Credentials set in backend/.env
        </p>
      </div>
    </div>
  );
}
