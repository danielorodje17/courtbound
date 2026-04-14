import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Sparkles, ChevronRight, Trophy, AlertCircle, RefreshCw, Clock } from "lucide-react";

const FIT_CONFIG = {
  excellent_fit: { label: "Excellent Fit", bg: "bg-emerald-50", border: "border-emerald-200", badge: "bg-emerald-500", pctColor: "text-emerald-600", headerBg: "bg-emerald-500" },
  good_fit:      { label: "Good Fit",      bg: "bg-orange-50",  border: "border-orange-200",  badge: "bg-orange-500",  pctColor: "text-orange-600",  headerBg: "bg-orange-500"  },
  possible_fit:  { label: "Possible Fit",  bg: "bg-blue-50",    border: "border-blue-200",    badge: "bg-blue-500",    pctColor: "text-blue-600",    headerBg: "bg-blue-500"    },
};

function CollegeCard({ college, config, navigate }) {
  return (
    <div
      data-testid={`ai-match-card-${college.name?.toLowerCase().replace(/\s+/g, "-")}`}
      className={`${config.bg} border ${config.border} rounded-lg p-4 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer`}
      onClick={() => navigate(`/colleges/${college.id}`)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-slate-900 text-sm leading-tight">{college.name}</p>
        <span className={`${config.badge} text-white text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0`}>
          {college.pct}%
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{college.division}</p>
      <p className="text-xs text-slate-600 leading-relaxed">{college.why}</p>
      <div className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-orange-500 transition-colors">
        View college <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

function FitSection({ title, colleges, config, navigate }) {
  if (!colleges || colleges.length === 0) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className={`${config.headerBg} px-5 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-white" />
          <h2 className="font-black text-white text-sm uppercase tracking-widest">{config.label}</h2>
        </div>
        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
          {colleges.length} college{colleges.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {colleges.map((c, i) => (
          <CollegeCard key={c.id || i} college={c} config={config} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

export default function AIMatchPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState("");
  const [lastRunAt, setLastRunAt] = useState(null);

  // Load persisted results on mount
  useEffect(() => {
    apiRequest("get", "/ai/match/saved")
      .then(res => {
        if (res.data?.results) {
          setResults(res.data.results);
          setLastRunAt(res.data.run_at);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSaved(false));
  }, []);

  const runMatch = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("get", "/ai/match");
      setResults(res.data.results);
      setLastRunAt(res.data.run_at);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const totalFound = results
    ? (results.excellent_fit?.length || 0) + (results.good_fit?.length || 0) + (results.possible_fit?.length || 0)
    : 0;

  return (
    <div className="space-y-8" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/60 to-slate-900" />
        <div className="relative z-10 p-8">
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-purple-400">AI-Powered Analysis</span>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            AI College Match
          </h1>
          <p className="text-white/60 mt-1 max-w-xl">
            Your saved player profile is analysed against all 90+ colleges in our database. Get personalised Excellent, Good, and Possible fit ratings with AI reasoning.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              data-testid="ai-match-run-btn"
              onClick={runMatch}
              disabled={loading || loadingSaved}
              className="bg-purple-600 text-white font-bold uppercase tracking-wider rounded-lg px-6 py-2.5 hover:bg-purple-700 transition-all text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Analysing colleges...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> {results ? "Re-run Analysis" : "Run AI Match Analysis"}</>
              )}
            </button>
            <button
              onClick={() => navigate("/profile")}
              className="bg-white/10 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 hover:bg-white/20 transition-all text-sm border border-white/20"
            >
              Update Profile
            </button>
          </div>
          {lastRunAt && !loading && (
            <div className="flex items-center gap-1.5 mt-3 text-white/40 text-xs">
              <Clock className="w-3.5 h-3.5" />
              Last analysed: {new Date(lastRunAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center" data-testid="ai-match-loading">
          <div className="w-14 h-14 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mx-auto mb-5" />
          <p className="font-bold text-slate-800 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Analysing Your Fit
          </p>
          <p className="text-slate-500 text-sm mt-2">
            AI is comparing your profile against all colleges. This takes 10-20 seconds...
          </p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-3" data-testid="ai-match-error">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">{error}</p>
            {error.includes("profile") && (
              <button onClick={() => navigate("/profile")} className="mt-2 text-orange-500 font-semibold text-sm hover:text-orange-600">
                Complete your profile →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-3.5 flex items-center gap-3" data-testid="ai-match-summary">
            <Sparkles className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <p className="text-sm text-purple-700 font-medium">
              AI found <span className="font-black">{totalFound} colleges</span> across all fit categories based on your profile.
              Click any college to view details and start tracking.
            </p>
          </div>

          <FitSection
            title="Excellent Fit"
            colleges={results.excellent_fit}
            config={FIT_CONFIG.excellent_fit}
            navigate={navigate}
          />
          <FitSection
            title="Good Fit"
            colleges={results.good_fit}
            config={FIT_CONFIG.good_fit}
            navigate={navigate}
          />
          <FitSection
            title="Possible Fit"
            colleges={results.possible_fit}
            config={FIT_CONFIG.possible_fit}
            navigate={navigate}
          />
        </>
      )}

      {/* Empty / Intro state */}
      {!results && !loading && !error && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center" data-testid="ai-match-intro">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-500" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Ready to Find Your Best Colleges?
          </h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Make sure your <button onClick={() => navigate("/profile")} className="text-orange-500 font-semibold hover:underline">player profile</button> is up to date, then click "Run AI Match Analysis" above.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 max-w-sm mx-auto text-center">
            {Object.entries(FIT_CONFIG).map(([key, cfg]) => (
              <div key={key} className={`${cfg.bg} ${cfg.border} border rounded-lg py-2 px-3`}>
                <p className={`font-black text-lg ${cfg.pctColor}`}></p>
                <p className="text-xs text-slate-600 font-semibold">{cfg.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
