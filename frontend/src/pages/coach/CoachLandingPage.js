import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Shield, Search, Users, BarChart2, Trophy, ChevronRight, CheckCircle, Star } from "lucide-react";

export default function CoachLandingPage() {
  const navigate = useNavigate();

  const features = [
    { icon: Search, title: "Search UK Prospects", desc: "Filter by position, height, graduation year, academic score and playing level. 200+ verified UK player profiles." },
    { icon: Shield, title: "Verified Players Only", desc: "Every player profile is linked to a real CourtBound account. Stats, highlight reels, and academic info verified." },
    { icon: Users, title: "Recruiting Board", desc: "Kanban-style pipeline. Move prospects from Watch List through to Committed — just like a CRM." },
    { icon: BarChart2, title: "Match Scoring", desc: "Every player gets a % match against your recruiting preferences. Stop browsing, start targeting." },
    { icon: Trophy, title: "Free for Coaches", desc: "The CourtBound Coach Portal is completely free for verified US college coaches. No subscription required." },
    { icon: Star, title: "NCAA Compliant", desc: "Built-in recruiting calendar, compliance banners on messaging, and division-specific contact period reminders." },
  ];

  const steps = [
    { n: "1", title: "Create your account", desc: "Sign up with your institutional email. Most .edu domains are auto-verified instantly." },
    { n: "2", title: "Set recruiting preferences", desc: "Tell us the positions, grad years, height ranges and academic minimums you're looking for." },
    { n: "3", title: "Discover UK prospects", desc: "Browse your personalised feed of matched players, sorted by fit score." },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-lg tracking-tight">CourtBound <span className="text-blue-400">for Coaches</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/coach/login" className="text-slate-400 hover:text-white text-sm font-semibold transition-colors">Sign In</Link>
          <button onClick={() => navigate("/coach/register")} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors">
            Register Free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-950/60 border border-blue-800/50 text-blue-300 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
          <Shield className="w-3 h-3" /> Free for Verified US College Coaches
        </div>
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight">
          Recruit UK Basketball<br />
          <span className="text-blue-400">From Your Desk.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          The only platform built specifically for US college coaches to discover, evaluate, and contact elite UK basketball prospects. English-speaking, NCAA-eligible, and actively looking for US programmes.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/coach/register")}
            data-testid="coach-register-cta"
            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-4 rounded-xl text-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
          >
            Start Recruiting Free <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/coach/login")}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-8 py-4 rounded-xl text-lg transition-colors border border-slate-700"
          >
            Returning Coach? Sign In
          </button>
        </div>
        <p className="text-slate-500 text-sm mt-4">Institutional email auto-verified in seconds. No credit card required.</p>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800">
        <h2 className="text-2xl font-black text-center mb-12 text-slate-100">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s) => (
            <div key={s.n} className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-xl mx-auto mb-4">{s.n}</div>
              <h3 className="font-bold text-white mb-2">{s.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800">
        <h2 className="text-2xl font-black text-center mb-12 text-slate-100">Built for the Modern College Recruiter</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-700 transition-colors">
              <f.icon className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="font-bold text-white mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-slate-800 text-center">
        <h2 className="text-3xl font-black mb-4">Ready to find your next UK recruit?</h2>
        <p className="text-slate-400 mb-8">Join verified coaches from D2, NAIA, and JUCO programmes already using CourtBound.</p>
        <button
          onClick={() => navigate("/coach/register")}
          className="bg-blue-600 hover:bg-blue-500 text-white font-black px-10 py-4 rounded-xl text-lg transition-all hover:scale-105 inline-flex items-center gap-2"
        >
          Create Free Coach Account <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-slate-500">
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Free forever for coaches</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> Auto-verified .edu emails</span>
          <span className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-500" /> NCAA compliance tools built in</span>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-8 text-center text-slate-600 text-sm">
        <p>CourtBound Coach Portal · <Link to="/privacy" className="hover:text-slate-400">Privacy Policy</Link> · <Link to="/terms" className="hover:text-slate-400">Terms</Link></p>
        <p className="mt-2"><Link to="/" className="hover:text-slate-400">← Player-facing app</Link></p>
      </footer>
    </div>
  );
}
