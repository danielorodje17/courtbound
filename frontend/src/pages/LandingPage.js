import { useNavigate } from "react-router-dom";
import { Sparkles, Mail, TrendingUp, BarChart2, BookOpen, ArrowRight, Trophy, Zap } from "lucide-react";

const HERO_IMG = "https://images.unsplash.com/photo-1677617586882-2b494292ebbe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxlbXB0eSUyMGluZG9vciUyMGJhc2tldGJhbGwlMjBjb3VydCUyMGRhcmt8ZW58MHx8fHwxNzc2MzcwMTc4fDA&ixlib=rb-4.1.0&q=85";

const TICKER_ITEMS = [
  "274 US COLLEGES TRACKED",
  "43 EURO-FRIENDLY PROGRAMS",
  "AI-POWERED MATCHING",
  "INSTANT EMAIL DRAFTING",
  "RESPONSE TRACKER",
  "RECRUITMENT READY SCORE",
  "BUILT FOR EUROPEAN PLAYERS",
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI College Matching",
    desc: "Your stats, height, and position analysed against 274 US programs. Get Excellent, Good, and Possible fit ratings with honest AI reasoning.",
    span: "md:col-span-2 lg:col-span-4 lg:row-span-2",
    accent: true,
  },
  {
    icon: Mail,
    title: "AI Email Drafting",
    desc: "7 email types — Initial Outreach, Follow-Up, After Call, After Visit, and more. Personalised to the coach and college in seconds.",
    span: "md:col-span-2 lg:col-span-4",
  },
  {
    icon: TrendingUp,
    title: "Recruitment Ready Score",
    desc: "Know exactly where your profile stands. 10-item coaches' checklist + AI-powered gap analysis.",
    span: "md:col-span-1 lg:col-span-2",
  },
  {
    icon: BarChart2,
    title: "Response Tracker",
    desc: "Log every reply. AI next steps for every outcome — Interested, Offer Received, After Visit.",
    span: "md:col-span-1 lg:col-span-2",
  },
];

const STEPS = [
  { n: "01", title: "Build Your Profile", body: "Name, stats, academic grades, and a highlight tape link. Takes under 3 minutes." },
  { n: "02", title: "Run AI Match", body: "See your top college fits instantly — with honest percentage scores and real challenges flagged." },
  { n: "03", title: "Contact Coaches", body: "Draft personalised emails, track every reply, and follow up with AI strategy at every step." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const goLogin = () => navigate("/login");

  return (
    <div style={{ fontFamily: "Manrope, sans-serif", background: "#0A0A0A", color: "#fff", overflowX: "hidden" }}>

      {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
      <header style={{ fontFamily: "Barlow Condensed, sans-serif" }}
        className="fixed top-0 w-full z-50 bg-slate-900/70 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
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

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section
        data-testid="landing-hero"
        className="relative min-h-screen flex items-center justify-center pt-14"
        style={{
          backgroundImage: `url(${HERO_IMG})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #0A0A0A 100%)" }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-orange-400 mb-6">
            Built for European Basketball Players
          </p>
          <h1
            className="text-6xl sm:text-7xl md:text-8xl font-black uppercase leading-none text-white mb-6"
            style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "-0.02em" }}
          >
            Cross the Pond.<br />
            <span className="text-orange-500">Own the Paint.</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-xl mx-auto mb-10 leading-relaxed">
            The AI recruitment engine that matches you with US college basketball scholarships — and keeps you organised from first email to signed offer.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              data-testid="landing-cta-primary"
              onClick={goLogin}
              className="flex items-center gap-3 bg-orange-500 hover:bg-orange-400 text-white font-bold uppercase tracking-widest px-8 py-4 rounded text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(249,115,22,0.4)]"
              style={{ fontFamily: "Barlow Condensed, sans-serif" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign In with Google — It's Free
            </button>
            <button
              data-testid="landing-cta-secondary"
              onClick={goLogin}
              className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              See how it works <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {/* Proof line */}
          <p className="mt-8 text-xs text-slate-500 uppercase tracking-widest">No credit card required</p>
        </div>
      </section>

      {/* ── TICKER ────────────────────────────────────────────────────── */}
      <div className="py-5 border-y border-white/10 bg-slate-900/50 overflow-hidden">
        <div className="flex whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-4 mx-8 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              <span className="w-1 h-1 rounded-full bg-orange-500 flex-shrink-0" />
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES BENTO ────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-24 py-24">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-3">What You Get</p>
          <h2
            className="text-4xl md:text-5xl font-black uppercase text-white mb-12 leading-none"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Everything you need.<br />Nothing you don't.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {FEATURES.map(({ icon: Icon, title, desc, span, accent }) => (
              <div
                key={title}
                data-testid={`feature-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
                className={`${span} p-8 rounded border transition-all duration-300 hover:-translate-y-1 ${
                  accent
                    ? "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/60"
                    : "bg-slate-900/60 border-white/10 hover:border-orange-500/30"
                }`}
              >
                <div className={`w-10 h-10 rounded flex items-center justify-center mb-5 ${accent ? "bg-orange-500" : "bg-white/5"}`}>
                  <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-orange-400"}`} />
                </div>
                <h3
                  className="text-2xl font-black uppercase text-white mb-3 leading-tight"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-24 py-24 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500 mb-3">Getting Started</p>
          <h2
            className="text-4xl md:text-5xl font-black uppercase text-white mb-16 leading-none"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            See value in<br /><span className="text-orange-500">5 minutes.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map(({ n, title, body }) => (
              <div key={n} data-testid={`step-${n}`} className="flex flex-col gap-4">
                <span
                  className="text-7xl font-black text-white/10 leading-none select-none"
                  style={{ fontFamily: "Barlow Condensed, sans-serif" }}
                >
                  {n}
                </span>
                <div className="w-8 h-0.5 bg-orange-500" />
                <h3 className="text-xl font-black uppercase text-white" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-12 lg:px-24 py-32 border-t border-white/10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-orange-500" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">Start for Free</p>
          </div>
          <h2
            className="text-5xl md:text-6xl font-black uppercase text-white mb-6 leading-none"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Your scholarship<br />campaign starts now.
          </h2>
          <p className="text-slate-400 mb-10 text-lg max-w-md mx-auto">Sign in with Google and build your profile in under 5 minutes. Your first AI college matches are waiting.</p>
          <button
            data-testid="landing-cta-final"
            onClick={goLogin}
            className="inline-flex items-center gap-3 bg-orange-500 hover:bg-orange-400 text-white font-black uppercase tracking-widest px-10 py-5 rounded text-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(249,115,22,0.4)]"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Get Started — It's Free <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 bg-orange-500 rounded flex items-center justify-center">
            <Trophy className="w-3 h-3 text-white" />
          </div>
          <span className="font-black text-white text-xs uppercase tracking-widest" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>CourtBound</span>
        </div>
        <p className="text-xs text-slate-600">Built for European basketball players pursuing US college scholarships.</p>
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
