import { useState } from "react";
import { apiRequest } from "../context/AuthContext";
import { Sparkles, RefreshCw, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, Lightbulb, TrendingUp, Shield } from "lucide-react";

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  high:     { label: "High",     color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medium:   { label: "Medium",   color: "bg-yellow-100 text-yellow-700 border-yellow-200", dot: "bg-yellow-500" },
};

const IMPORTANCE_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function scoreColor(score) {
  if (score >= 80) return { ring: "#22c55e", text: "text-green-600",  bg: "bg-green-50",  label: "Excellent" };
  if (score >= 65) return { ring: "#f97316", text: "text-orange-500", bg: "bg-orange-50", label: "Good" };
  if (score >= 45) return { ring: "#eab308", text: "text-yellow-600", bg: "bg-yellow-50", label: "Developing" };
  return              { ring: "#ef4444", text: "text-red-600",    bg: "bg-red-50",    label: "Needs Work" };
}

function ScoreGauge({ score }) {
  const { ring, text, bg, label } = scoreColor(score);
  const r = 52, circ = 2 * Math.PI * r;
  const progress = circ - (circ * score) / 100;
  return (
    <div className={`flex flex-col items-center justify-center ${bg} rounded-2xl p-6 w-44 flex-shrink-0`}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={ring} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={progress}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
        <text x="60" y="56" textAnchor="middle" fontSize="26" fontWeight="900" fill="#0f172a" fontFamily="Barlow Condensed, sans-serif">{score}</text>
        <text x="60" y="74" textAnchor="middle" fontSize="11" fill="#64748b" fontFamily="Manrope, sans-serif">/ 100</text>
      </svg>
      <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${text}`}>{label}</p>
    </div>
  );
}

export default function RecruitmentScore() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checklistOpen, setChecklistOpen] = useState(false);

  const run = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiRequest("get", "/ai/profile-review");
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.detail || "Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const completed = data?.coach_checklist?.filter(i => i.completed).length ?? 0;
  const total = data?.coach_checklist?.length ?? 10;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="recruitment-score-section">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-900">
        <TrendingUp className="w-4 h-4 text-orange-400" />
        <h2 className="font-bold text-sm text-white uppercase tracking-widest">Recruitment Ready Score</h2>
        <button
          data-testid="run-profile-review-btn"
          onClick={run}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all disabled:opacity-60"
        >
          {loading
            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analysing...</>
            : <><Sparkles className="w-3.5 h-3.5" /> {data ? "Re-run" : "Analyse Profile"}</>}
        </button>
      </div>

      <div className="p-5">
        {/* Idle state */}
        {!data && !loading && !error && (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 text-orange-400" />
            </div>
            <p className="font-bold text-slate-800 text-base mb-1">Get Your Recruitment Score</p>
            <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
              AI analyses your profile against what college coaches actually look for — and tells you exactly what to improve.
            </p>
            <button
              data-testid="run-profile-review-btn-idle"
              onClick={run}
              className="mt-4 bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-slate-800 transition-all"
            >
              Run Analysis
            </button>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mb-4" />
            <p className="text-slate-500 text-sm">AI is reviewing your profile...</p>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div className="space-y-5">
            {/* Score + summary row */}
            <div className="flex gap-5 items-start flex-wrap sm:flex-nowrap">
              <ScoreGauge score={data.score} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-black text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
                    Grade: {data.grade}
                  </span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-3">{data.summary}</p>
                {/* Top actions */}
                {data.top_actions?.length > 0 && (
                  <div className="bg-slate-900 rounded-xl p-3.5">
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-2">Top Priority Actions</p>
                    <ol className="space-y-1.5">
                      {data.top_actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                          <span className="bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">{i + 1}</span>
                          {a}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>

            {/* Strengths + Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                </p>
                <ul className="space-y-2">
                  {data.strengths?.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" /> Improvements
                </p>
                <ul className="space-y-2.5">
                  {data.improvements?.map((item, i) => {
                    const cfg = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
                    return (
                      <li key={i}>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed pl-0.5">{item.suggestion}</p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Response Insights */}
            {data.response_insights && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
                <Shield className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-1">Response Pattern Insights</p>
                  <p className="text-xs text-slate-600 leading-relaxed">{data.response_insights}</p>
                </div>
              </div>
            )}

            {/* Coaches Checklist — collapsible */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                data-testid="checklist-toggle"
                onClick={() => setChecklistOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Coaches' Checklist</p>
                  <span className="bg-orange-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{completed}/{total}</span>
                </div>
                {checklistOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {checklistOpen && (
                <div className="p-4">
                  <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-700"
                      style={{ width: `${(completed / total) * 100}%` }}
                    />
                  </div>
                  <div className="space-y-2.5">
                    {[...(data.coach_checklist || [])].sort((a, b) =>
                      (IMPORTANCE_ORDER[a.importance] ?? 3) - (IMPORTANCE_ORDER[b.importance] ?? 3)
                    ).map((item, i) => (
                      <div key={i} className={`flex items-start gap-3 p-2.5 rounded-lg ${item.completed ? "bg-green-50" : "bg-slate-50"}`}
                        data-testid={`checklist-item-${i}`}>
                        {item.completed
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className={`text-xs font-semibold ${item.completed ? "text-slate-700" : "text-slate-500"}`}>{item.item}</p>
                            {item.importance === "critical" && !item.completed && (
                              <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">Critical</span>
                            )}
                          </div>
                          {!item.completed && item.tip && (
                            <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.tip}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
