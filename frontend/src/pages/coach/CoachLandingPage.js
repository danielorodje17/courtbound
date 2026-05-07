import { useNavigate, Link } from "react-router-dom";
import { Shield, Search, Users, BarChart2, Trophy, ChevronRight, CheckCircle, Star, Zap, Target, Award, ArrowRight, Globe } from "lucide-react";

const FEATURES = [
  { icon: Search,    title: "Search 200+ UK Prospects",  desc: "Filter by position, height, graduation year, academic score and playing level. Every profile verified." },
  { icon: Target,    title: "Match Score Engine",        desc: "Every player gets a % fit against your recruiting prefs. Stop browsing — start targeting the right athletes." },
  { icon: Users,     title: "Recruiting Board",          desc: "CRM-style pipeline. Move prospects from Watch List to Offer to Committed. Full notes and tagging." },
  { icon: Zap,       title: "AI Player Summaries",       desc: "Instant one-line AI scouting notes for every player profile. Built with Claude." },
  { icon: Award,     title: "Free for Coaches",          desc: "The CourtBound Coach Portal is completely free for verified US college coaches. No subscription, no catch." },
  { icon: Shield,    title: "NCAA Compliant",            desc: "Built-in recruiting calendar, compliance banners, and division-specific contact period reminders." },
];

const STEPS = [
  { n: "01", title: "Create Your Account",       desc: "Sign up with your institutional email. Most .edu domains are auto-verified instantly — no waiting." },
  { n: "02", title: "Set Recruiting Preferences", desc: "Tell us the positions, grad years, height ranges and academic minimums. We handle the targeting." },
  { n: "03", title: "Discover UK Recruits",       desc: "Browse your personalised match feed of UK basketball prospects, sorted by fit score." },
];

const STATS = [
  { value: "200+", label: "Verified UK Players" },
  { value: "15",   label: "Divisions Supported" },
  { value: "Free", label: "Forever for Coaches" },
];

export default function CoachLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Sticky Nav ── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.5)]">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-base tracking-tight uppercase">
              CourtBound <span className="text-blue-400">Coaches</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              to="/coach/login"
              data-testid="nav-login-link"
              className="text-slate-400 hover:text-white text-sm font-semibold transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <button
              onClick={() => navigate("/coach/register")}
              data-testid="nav-register-btn"
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-5 py-2.5 rounded-lg transition-all hover:-translate-y-0.5 shadow-[0_0_16px_rgba(59,130,246,0.3)] hover:shadow-[0_0_24px_rgba(59,130,246,0.5)] uppercase tracking-widest"
            >
              Register Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-20 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-orange-500/8 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-black px-4 py-2 rounded-full mb-8 uppercase tracking-[0.15em]">
            <Shield className="w-3 h-3" /> Free for Verified US College Coaches
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-100 to-slate-400">
              Recruit UK
            </span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-blue-500">
              Basketball.
            </span>
          </h1>

          <p className="text-slate-400 text-lg max-w-2xl mb-10 leading-relaxed">
            The only platform built for US college coaches to discover, evaluate, and contact elite UK basketball prospects.
            English-speaking, NCAA-eligible, and actively seeking US programmes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button
              onClick={() => navigate("/coach/register")}
              data-testid="hero-register-button"
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-lg transition-all hover:-translate-y-1 shadow-[0_0_24px_rgba(59,130,246,0.35)] hover:shadow-[0_0_36px_rgba(59,130,246,0.6)] flex items-center justify-center gap-2 uppercase tracking-widest text-sm"
            >
              Start Recruiting Free <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/coach/login")}
              data-testid="hero-login-button"
              className="bg-transparent border-2 border-slate-700 hover:border-slate-400 text-white font-bold px-8 py-4 rounded-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2 uppercase tracking-wider text-sm"
            >
              Returning Coach? Sign In
            </button>
          </div>

          <p className="text-slate-500 text-sm flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> .edu auto-verified in seconds</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> No credit card required</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Free forever</span>
          </p>
        </div>
      </section>

      {/* ── Stats Ribbon ── */}
      <div className="relative -skew-y-1 bg-blue-950/30 border-y border-blue-800/40 overflow-hidden">
        <div className="skew-y-1 max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-3 gap-4 divide-x divide-blue-800/30">
            {STATS.map(s => (
              <div key={s.label} className="text-center px-4">
                <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-tight">{s.value}</p>
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="mb-14">
          <p className="text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-3">The Process</p>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
              Up and Recruiting in Minutes
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative bg-slate-900/40 border border-slate-800 rounded-xl p-8 overflow-hidden group hover:border-blue-700/60 transition-all duration-300 hover:-translate-y-1">
              {/* Big background number */}
              <span className="absolute -bottom-4 -right-2 text-9xl font-black text-slate-800/60 select-none leading-none">{s.n}</span>
              <div className="relative">
                <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/40 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-600/30 transition-colors">
                  <span className="text-blue-400 font-black text-sm">{s.n}</span>
                </div>
                <h3 className="text-lg font-black text-white mb-2 uppercase tracking-tight">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="mb-14">
          <p className="text-orange-400 text-xs font-black uppercase tracking-[0.2em] mb-3">Platform Features</p>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white to-slate-400">
              Built for the Modern Recruiter
            </span>
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              data-testid="feature-card"
              className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 overflow-hidden group hover:border-blue-500/50 hover:bg-slate-800/60 transition-all duration-300 hover:-translate-y-1 relative"
            >
              {/* Hover glow corner */}
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-full blur-2xl transition-all duration-300 -translate-y-8 translate-x-8" />
              <div className="relative">
                <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-lg flex items-center justify-center mb-5 group-hover:border-blue-600/50 group-hover:bg-blue-600/10 transition-all duration-300">
                  <f.icon className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors duration-300" />
                </div>
                <h3 className="font-black text-white mb-2 text-sm uppercase tracking-tight">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative overflow-hidden bg-blue-950/20 border-t border-slate-800">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-500/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <p className="text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4">Get Started Today</p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-100 to-slate-400">
              Your Next Star Recruit
            </span>
            <br />
            <span className="text-orange-400">Is Waiting.</span>
          </h2>
          <p className="text-slate-400 mb-10 text-lg max-w-xl mx-auto">
            Join verified coaches from D1, D2, NAIA, and JUCO programmes already discovering UK talent on CourtBound.
          </p>
          <button
            onClick={() => navigate("/coach/register")}
            data-testid="bottom-register-button"
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-12 py-5 rounded-lg text-base transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(59,130,246,0.4)] hover:shadow-[0_0_50px_rgba(59,130,246,0.7)] inline-flex items-center gap-3 uppercase tracking-widest"
          >
            Create Free Coach Account <ArrowRight className="w-5 h-5" />
          </button>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Free forever for coaches</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> Auto-verified .edu emails</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-green-500" /> NCAA compliance tools built in</span>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-800/60 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Trophy className="w-3 h-3 text-white" />
            </div>
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">CourtBound Coach Portal</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-600">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
            <Link to="/" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <Globe className="w-3 h-3" /> Player App
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
