import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { toast } from "sonner";
import { Trophy, Eye, EyeOff } from "lucide-react";

export default function CoachLoginPage() {
  const { login } = useCoachAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate("/coach/dashboard");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Login failed. Check your credentials.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/coach" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white tracking-tight">CourtBound <span className="text-blue-400">Coaches</span></span>
          </Link>
          <h1 className="text-2xl font-black text-white">Welcome back</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your coach portal</p>
        </div>

        <form onSubmit={handle} className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Institutional Email</label>
            <input
              data-testid="coach-login-email"
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="you@university.edu"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                data-testid="coach-login-password"
                type={showPw ? "text" : "password"}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-200">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            data-testid="coach-login-submit"
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black py-3 rounded-lg transition-colors"
          >
            {loading ? "Signing in..." : "Sign In to Coach Portal"}
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          New to CourtBound?{" "}
          <Link to="/coach/register" className="text-blue-400 hover:text-blue-300 font-semibold">Register as a coach</Link>
        </p>
        <p className="text-center text-slate-600 text-xs mt-4">
          <Link to="/login" className="hover:text-slate-400">← Player login</Link>
        </p>
      </div>
    </div>
  );
}
