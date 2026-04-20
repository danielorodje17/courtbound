import { useNavigate } from "react-router-dom";
import { ArrowRight, Trophy, CheckCircle2, X, TrendingUp, Mail, RefreshCw, BarChart2, Zap, Lock } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1677617586882-2b494292ebbe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxlbXB0eSUyMGluZG9vciUyMGJhc2tldGJhbGwlMjBjb3VydCUyMGRhcmt8ZW58MHx8fHwxNzc2MzcwMTc4fDA&ixlib=rb-4.1.0&q=85";

const PROCESS_STEPS = [
  { label: "Build Profile",    sub: "Stats, tape, academic" },
  { label: "AI Matching",      sub: "Right colleges, right fit" },
  { label: "Send Outreach",    sub: "AI-personalised emails" },
  { label: "Get Replies",      sub: "Track every response" },
  { label: "Land Offers",      sub: "Scholarship secured" },
];

const WHY_FAIL = [
  "They email the wrong schools",
  "Their messages sound generic",
  "They don't follow up properly",
  "They give up too early",
];

const FEATURES = [
  {
    icon: Mail,
    title: "Emails coaches actually reply to",
    body: "AI generates personalised emails tailored to each college — referencing their programme, playing style, and recruiting needs. No templates. No copy-paste. Every email reads like you wrote it yourself.",
  },
  {
    icon: TrendingUp,
    title: "Targets the right colleges",
    body: "Our AI matches your profile against 274 US programmes and shows your best-fit schools, your likelihood of interest, and exactly what to say to each coach.",
  },
  {
    icon: RefreshCw,
    title: "Handles follow-ups for you",
    body: "Most players lose opportunities by not following up. CourtBound tracks every message, tells you exactly when to follow up, and writes the follow-up email for you.",
  },
  {
    icon: BarChart2,
    title: "Tells you what to do next",
    body: "No confusion. No guessing. You'll always know who to contact, what to say, and where your best opportunities are — with AI-powered next steps after every reply.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate("/login");

  return (
    <div style={{ fontFamily: "Manrope, sans-serif", background: "#0A0A0A", color: "#fff", overflowX: "hidden" }}>

      {/* ── STICKY HEADER ─────────────────────────────────────────── */}
      <header
        style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm uppercase tracking-widest">CourtBound</span>
          </div>
          <button
            data-testid="landing-signin-header"
            onClick={goLogin}
            className="text-xs font-bold uppercase tracking-widest text-orange-400 hover:text-orange-300 transition-colors"
          >
            Sign In
          </button>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section
        data-testid="landing-hero"
        className="relative min-h-screen flex items-center justify-center pt-14"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        <div className="absolute inset-0 bg-black/70" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 50%, #0A0A0A 100%)" }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-400 mb-5">
            Built for European Basketball Players
          </p>
          <h1
            className="text-5xl sm:text-6xl md:text-7xl font-black uppercase leading-tight text-white mb-6"
            style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "-0.01em" }}
          >
            The System That Gets You<br />
            <span className="text-orange-500">Replies From US College Coaches</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-4 leading-relaxed">
            Most UK players send 100+ emails… and hear nothing back.
          </p>
          <p className="text-xl font-bold text-white mb-10">
            CourtBound changes that.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-testid="landing-cta-primary"
              onClick={goLogin}
              className="flex items-center gap-3 bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest px-8 py-4 rounded text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(249,115,22,0.45)]"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Start Free Trial
            </button>
          </div>
          <p className="mt-5 text-xs text-slate-500 uppercase tracking-widest">No credit card. No agency fees.</p>
        </div>
      </section>

      {/* ── PROCESS BAR ───────────────────────────────────────────── */}
      <section data-testid="process-bar" className="bg-slate-900/60 border-y border-white/10 py-10 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 text-center mb-8">How It Works</p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
            {PROCESS_STEPS.map(({ label, sub }, i) => (
              <div key={i} className="flex items-center gap-0 flex-1">
                <div className="flex flex-col items-center gap-2 flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all
                    ${i === 4 ? "bg-orange-500 border-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]" : "bg-white/10 border-white/20 text-slate-300"}`}
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    {i + 1}
                  </div>
                  <div className="text-center">
                    <p className={`text-xs font-black uppercase tracking-wider ${i === 4 ? "text-orange-400" : "text-white"}`}
                      style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{sub}</p>
                  </div>
                </div>
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden sm:block w-8 h-px bg-white/20 mx-2 flex-shrink-0" style={{ marginTop: "-20px" }}>
                    <ArrowRight className="w-3 h-3 text-orange-500/60 -mt-1.5 ml-2" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ──────────────────────────────────────────── */}
      <section data-testid="social-proof" className="px-6 py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 rounded-full px-4 py-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-orange-400">Real Results — Not Guesswork</span>
          </div>
          <blockquote
            className="text-3xl sm:text-4xl font-black uppercase text-white leading-tight mb-6"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            "We sent over 100 emails manually — <span className="text-slate-500">no replies.</span>"
          </blockquote>
          <blockquote
            className="text-3xl sm:text-4xl font-black uppercase text-white leading-tight mb-8"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            "Within the first week of using CourtBound, we received <span className="text-orange-500">multiple responses</span> from college coaches."
          </blockquote>
          <p className="text-slate-400 text-base max-w-lg mx-auto leading-relaxed">
            Even rejections gave clarity — because we were finally being seen.
          </p>
        </div>
      </section>

      {/* ── WHY ATHLETES FAIL ─────────────────────────────────────── */}
      <section className="px-6 py-20 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 mb-4">Why Most Athletes Fail</p>
              <h2
                className="text-4xl sm:text-5xl font-black uppercase text-white leading-tight mb-8"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                The System Is Stacked Against You
              </h2>
              <ul className="space-y-4 mb-8">
                {WHY_FAIL.map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <span className="text-slate-300 text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-white font-semibold">
                  CourtBound fixes all of this — <span className="text-orange-400">automatically.</span>
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "274", label: "US Colleges Tracked" },
                { n: "43",  label: "UK-Friendly Programs" },
                { n: "7",   label: "AI Email Types" },
                { n: "5min", label: "To Your First Match" },
              ].map(({ n, label }) => (
                <div key={label} className="bg-slate-900/60 border border-white/10 rounded-xl p-6 text-center">
                  <p className="text-4xl font-black text-orange-500 mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{n}</p>
                  <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES (plain English) ──────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-3 text-center">What CourtBound Does</p>
          <h2
            className="text-4xl sm:text-5xl font-black uppercase text-white text-center mb-16 leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            In Plain English
          </h2>
          <div className="space-y-6">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <div
                key={i}
                data-testid={`feature-${i}`}
                className="flex gap-6 items-start bg-slate-900/40 border border-white/10 rounded-xl p-7 hover:border-orange-500/30 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-orange-500/15 border border-orange-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3
                    className="text-xl font-black uppercase text-white mb-2"
                    style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENCY COMPARISON ─────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-4 text-center">A Smarter Alternative</p>
          <h2
            className="text-4xl sm:text-5xl font-black uppercase text-white text-center mb-12 leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Why Pay An Agency?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agency */}
            <div className="bg-red-950/30 border border-red-500/30 rounded-xl p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400 mb-4">Recruitment Agencies</p>
              <p
                className="text-5xl font-black text-red-400 mb-4"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                £3,000 – £10,000+
              </p>
              <ul className="space-y-2.5">
                {["You pay upfront, no guarantees", "Generic email templates used for all players", "Limited contact — slow response", "You're one of dozens they manage"].map(s => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-400">
                    <X className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            {/* CourtBound */}
            <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl p-8">
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400 mb-4">CourtBound</p>
              <p
                className="text-5xl font-black text-orange-400 mb-4"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                A fraction
              </p>
              <ul className="space-y-2.5">
                {["Same structure and strategy — in your hands", "Every email personalised by AI to each coach", "Instant — you move at your own pace", "Full visibility of every contact and reply"].map(s => (
                  <li key={s} className="flex items-start gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── REAL STORY ────────────────────────────────────────────── */}
      <section className="px-6 py-24 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-6">Built From Real Experience</p>
          <h2
            className="text-3xl sm:text-4xl font-black uppercase text-white mb-6 leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            This Isn't Theory
          </h2>
          <p className="text-base text-slate-400 leading-relaxed max-w-xl mx-auto mb-6">
            CourtBound was built by a UK parent going through this exact process — solving the problems you're facing right now. Every feature exists because we hit that wall ourselves.
          </p>
          <p className="text-base text-slate-300 font-semibold leading-relaxed max-w-xl mx-auto">
            Whether you're just starting or already emailing coaches, CourtBound gives you a clear, structured path to getting recruited.
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────── */}
      <section
        data-testid="final-cta"
        className="px-6 py-32 border-t border-white/10"
        style={{ background: "linear-gradient(180deg, #0A0A0A 0%, #1a0d00 100%)" }}
      >
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="text-5xl sm:text-6xl font-black uppercase text-white mb-4 leading-tight"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Your Advantage<br /><span className="text-orange-500">Starts Here</span>
          </h2>
          <p className="text-slate-400 mb-3 text-base">Get access. Start outreach. Get responses.</p>
          <div className="flex items-center justify-center gap-2 mb-8">
            <Lock className="w-3.5 h-3.5 text-slate-500" />
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">No Guesswork. No Agencies. Just Results.</p>
          </div>
          <button
            data-testid="landing-cta-final"
            onClick={goLogin}
            className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest px-10 py-5 rounded text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(249,115,22,0.5)]"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-slate-600 mt-4 uppercase tracking-widest">No credit card required</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
            <Trophy className="w-3 h-3 text-white" />
          </div>
          <span className="font-black text-white text-xs uppercase tracking-widest" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>CourtBound</span>
        </div>
        <p className="text-xs text-slate-600">Built to get you recruited.</p>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
