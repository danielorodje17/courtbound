import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Shield, Trophy, Users, Star, ChevronRight, ArrowLeft, GraduationCap, TrendingUp, Ruler, BookOpen, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

function cm_to_ft(cm) {
  if (!cm) return null;
  const totalInches = Math.round(cm / 2.54);
  return `${Math.floor(totalInches / 12)}'${totalInches % 12}"`;
}

function SlugBadge({ text, color = "blue" }) {
  const cls = {
    blue: "bg-blue-600/20 text-blue-300 border-blue-600/40",
    purple: "bg-purple-600/20 text-purple-300 border-purple-600/40",
    green: "bg-green-600/20 text-green-300 border-green-600/40",
  }[color] || "bg-slate-700 text-slate-300 border-slate-600";
  return (
    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cls}`}>{text}</span>
  );
}

export default function CoachProgramPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [programme, setProgramme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/coach/public/${slug}`)
      .then(r => setProgramme(r.data))
      .catch(err => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
        <Trophy className="w-12 h-12 text-slate-600" />
        <h1 className="text-2xl font-black">Programme Not Found</h1>
        <p className="text-slate-400 text-sm">This coach programme page doesn't exist or hasn't been set up yet.</p>
        <Link to="/coach" className="text-blue-400 hover:text-blue-300 text-sm font-semibold flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to CourtBound for Coaches
        </Link>
      </div>
    );
  }

  const prefs = programme?.recruiting_prefs || {};
  const hasPrefs = prefs.positions?.length || prefs.grad_years?.length || prefs.min_height_cm || prefs.min_ppg || prefs.min_gpa;

  return (
    <div className="min-h-screen bg-slate-950 text-white" data-testid="coach-program-page">

      {/* Nav */}
      <nav className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/coach" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-sm tracking-tight">CourtBound <span className="text-blue-400">Coaches</span></span>
          </Link>
          <button
            onClick={() => navigate("/login")}
            data-testid="player-cta-nav"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 border border-blue-700/50 px-3 py-1.5 rounded-lg transition-colors"
          >
            Player? Sign in
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Programme Header */}
        <div className="mb-10" data-testid="programme-header">
          <div className="flex items-start gap-5">
            {/* Institution Logo Placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-2xl flex-shrink-0 border border-blue-600/30">
              {(programme.institution_name || "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/30 border border-green-700/40 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Verified Coach
                </span>
                {programme.division && (
                  <span className="text-xs font-bold text-blue-300 bg-blue-900/30 border border-blue-700/40 px-2 py-0.5 rounded-full">
                    {programme.division}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-black text-white mb-1" data-testid="institution-name">
                {programme.institution_name}
              </h1>
              <p className="text-slate-400 text-sm">
                Coach: <span className="text-slate-200 font-semibold">{programme.coach_name}</span>
                {programme.primary_sport && <> · <span>{programme.primary_sport}</span></>}
                {programme.conference && <> · <span>{programme.conference}</span></>}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: About + Recruiting Needs */}
          <div className="lg:col-span-2 space-y-8">

            {/* About */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" data-testid="programme-about">
              <h2 className="font-black text-white text-lg mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" /> About This Programme
              </h2>
              {programme.bio ? (
                <p className="text-slate-300 text-sm leading-relaxed">{programme.bio}</p>
              ) : (
                <p className="text-slate-500 text-sm italic">
                  {programme.institution_name} is actively recruiting UK basketball talent through CourtBound. Contact the coach via CourtBound to learn more about their programme.
                </p>
              )}
            </div>

            {/* Recruiting Needs */}
            {hasPrefs && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6" data-testid="recruiting-needs">
                <h2 className="font-black text-white text-lg mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" /> Current Recruiting Needs
                </h2>

                {prefs.positions?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Looking for Positions</p>
                    <div className="flex flex-wrap gap-2">
                      {prefs.positions.map(pos => (
                        <SlugBadge key={pos} text={pos} color="blue" />
                      ))}
                    </div>
                  </div>
                )}

                {prefs.grad_years?.length > 0 && (
                  <div className="mb-5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Graduation Years</p>
                    <div className="flex flex-wrap gap-2">
                      {prefs.grad_years.map(yr => (
                        <SlugBadge key={yr} text={yr} color="purple" />
                      ))}
                    </div>
                  </div>
                )}

                {(prefs.min_height_cm || prefs.min_ppg || prefs.min_gpa) && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Minimum Requirements</p>
                    <div className="grid grid-cols-3 gap-3">
                      {prefs.min_height_cm && (
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <Ruler className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white font-black text-sm">{cm_to_ft(prefs.min_height_cm)}</p>
                          <p className="text-slate-500 text-xs">Min Height</p>
                        </div>
                      )}
                      {prefs.min_ppg && (
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <TrendingUp className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white font-black text-sm">{prefs.min_ppg}+</p>
                          <p className="text-slate-500 text-xs">Min PPG</p>
                        </div>
                      )}
                      {prefs.min_gpa && (
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <GraduationCap className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                          <p className="text-white font-black text-sm">{prefs.min_gpa}+</p>
                          <p className="text-slate-500 text-xs">Min GPA</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: CTA card */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-blue-950 to-slate-900 border border-blue-800/50 rounded-2xl p-6 text-center" data-testid="player-cta-card">
              <div className="w-14 h-14 bg-blue-600/20 border border-blue-600/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="font-black text-white text-lg mb-2">Are you a UK player?</h3>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                Create your free CourtBound profile and get discovered by coaches like {programme.coach_name?.split(" ")[0]}.
              </p>
              <button
                onClick={() => navigate("/login")}
                data-testid="player-register-cta"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black px-4 py-3 rounded-xl text-sm transition-all hover:scale-105"
              >
                Create Free Profile <ChevronRight className="w-4 h-4" />
              </button>
              <p className="text-slate-500 text-xs mt-3">Free forever for players</p>
            </div>

            {/* Quick facts */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quick Facts</p>
              <div className="space-y-2.5 text-sm">
                {programme.division && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Division</span>
                    <span className="text-white font-semibold">{programme.division}</span>
                  </div>
                )}
                {programme.conference && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Conference</span>
                    <span className="text-white font-semibold">{programme.conference}</span>
                  </div>
                )}
                {programme.primary_sport && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sport</span>
                    <span className="text-white font-semibold">{programme.primary_sport}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Status</span>
                  <span className="text-green-400 font-semibold">Actively Recruiting</span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <Link to="/coach" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                Powered by CourtBound
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
