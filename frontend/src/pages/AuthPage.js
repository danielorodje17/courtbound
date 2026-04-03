import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Trophy } from "lucide-react";

function formatError(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(formatError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Left: Form */}
      <div className="flex-1 flex flex-col justify-center px-8 py-12 bg-white max-w-xl">
        {/* Logo */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "0.05em" }}>
              COURTBOUND
            </span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            {mode === "login" ? "Welcome Back" : "Start Your Journey"}
          </h1>
          <p className="text-slate-500 text-base">
            {mode === "login"
              ? "Sign in to your scholarship tracker"
              : "Create your account to start finding your US college"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "register" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <input
                data-testid="auth-name-input"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 p-3 text-slate-900 outline-none transition-all"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              data-testid="auth-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 p-3 text-slate-900 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                data-testid="auth-password-input"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 p-3 pr-11 text-slate-900 outline-none transition-all"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div data-testid="auth-error" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            data-testid="auth-submit-button"
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-6 py-3 hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            data-testid="auth-mode-toggle"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-orange-500 font-semibold hover:text-orange-600"
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>

      {/* Right: Hero Image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1638569774366-e221b95e3512?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMjV8MHwxfHNlYXJjaHwzfHxiYXNrZXRiYWxsJTIwY29sbGVnZSUyMHBsYXllcnxlbnwwfHx8fDE3NzUyNDU5MTd8MA&ixlib=rb-4.1.0&q=85"
          alt="Basketball"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/50" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="mb-4">
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-400">England Under-18</span>
          </div>
          <h2 className="text-4xl font-bold mb-3" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Your Path to a US<br />Basketball Scholarship
          </h2>
          <p className="text-white/70 text-base max-w-sm">
            Track colleges, connect with coaches, and get AI-powered help to land your dream scholarship.
          </p>
        </div>
      </div>
    </div>
  );
}
