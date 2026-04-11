import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../context/AuthContext";
import { Target, Mail, RefreshCw, BookOpen, Phone, Check, Pencil, X, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

const GOAL_META = [
  { key: "emails_sent",  label: "Emails Sent",   icon: Mail,       color: "#f97316", bg: "bg-orange-50",  ring: "bg-orange-500" },
  { key: "follow_ups",   label: "Follow-Ups",     icon: RefreshCw,  color: "#8b5cf6", bg: "bg-purple-50",  ring: "bg-purple-500" },
  { key: "new_tracks",   label: "New Colleges",   icon: BookOpen,   color: "#3b82f6", bg: "bg-blue-50",    ring: "bg-blue-500"   },
  { key: "calls",        label: "Coach Calls",    icon: Phone,      color: "#10b981", bg: "bg-emerald-50", ring: "bg-emerald-500" },
];

function achievementColor(pct) {
  if (pct === null) return "bg-slate-200 text-slate-500";
  if (pct >= 100) return "bg-emerald-500 text-white";
  if (pct >= 50)  return "bg-amber-400 text-white";
  return "bg-red-400 text-white";
}

function AchievementDot({ pct }) {
  if (pct === null) return <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" title="No goals set" />;
  if (pct >= 100)   return <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="All goals met" />;
  if (pct >= 50)    return <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title="Partial" />;
  return              <span className="w-2 h-2 rounded-full bg-red-400 inline-block" title="Goals missed" />;
}

export default function WeeklyGoalsWidget() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [draft, setDraft] = useState({ emails_sent: 0, follow_ups: 0, new_tracks: 0, calls: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [curRes, histRes] = await Promise.all([
        apiRequest("get", "/goals/current"),
        apiRequest("get", "/goals/history"),
      ]);
      setCurrent(curRes.data);
      setHistory(histRes.data);
    } catch (err) {
      console.error("Goals load error", err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // When opening the modal: if no goals set, pre-fill with suggestions; else use existing goals
  const openModal = () => {
    const noGoalsSet = current && Object.values(current.goals).every(v => v === 0);
    setDraft(noGoalsSet ? { ...current.suggestions } : { ...current.goals });
    setEditing(true);
  };

  const applySuggestions = () => setDraft({ ...current.suggestions });

  const saveGoals = async () => {
    setSaving(true);
    try {
      await apiRequest("put", "/goals/current", draft);
      await load();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const noGoalsSet = current && Object.values(current.goals).every(v => v === 0);
  const historyToShow = history.slice(1, 9);

  if (!current) return null;

  const suggestions = current.suggestions || {};
  const hasHistory = current.has_history;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="weekly-goals-widget">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-900">
        <Target className="w-4 h-4 text-orange-400" />
        <h2 className="font-bold text-sm text-white uppercase tracking-widest">Weekly Goals</h2>
        <span className="ml-auto text-xs text-slate-400 font-medium">{current.week_label}</span>
        <button
          data-testid="weekly-goals-edit-btn"
          onClick={openModal}
          className="ml-2 p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          title="Set goals"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-5">
        {noGoalsSet ? (
          /* Empty state — shows suggestion preview */
          <div className="text-center py-3">
            <Target className="w-9 h-9 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">No goals set for this week yet.</p>

            {/* Suggestion preview chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {GOAL_META.map(({ key, label, color }) => (
                <span
                  key={key}
                  className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600"
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: color }} />
                  {label}: <span className="font-black text-slate-800">{suggestions[key] ?? "—"}</span>
                </span>
              ))}
            </div>

            <p className="text-xs text-slate-400 mb-4 flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3 text-orange-400" />
              {hasHistory ? "Suggested based on your recent activity" : "Starter goals to get you going"}
            </p>

            <div className="flex gap-2 justify-center">
              <button
                data-testid="weekly-goals-use-suggestions-btn"
                onClick={async () => {
                  setSaving(true);
                  try {
                    await apiRequest("put", "/goals/current", suggestions);
                    await load();
                  } finally { setSaving(false); }
                }}
                disabled={saving}
                className="bg-orange-500 text-white text-sm font-bold uppercase tracking-wider px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-60 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {saving ? "Saving…" : "Use Suggestions"}
              </button>
              <button
                data-testid="weekly-goals-set-btn"
                onClick={openModal}
                className="border border-slate-200 text-slate-600 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Customise
              </button>
            </div>
          </div>
        ) : (
          /* Progress rows */
          <div className="space-y-4">
            {GOAL_META.map(({ key, label, icon: Icon, color, bg, ring }) => {
              const goal = current.goals[key] || 0;
              const done = current.progress[key] || 0;
              const pct = goal > 0 ? Math.min((done / goal) * 100, 100) : 0;
              const met = goal > 0 && done >= goal;
              if (goal === 0) return null;
              return (
                <div key={key} data-testid={`goal-row-${key}`}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className={`w-7 h-7 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 flex-1">{label}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">{done}</span>
                      <span className="text-xs text-slate-400">/ {goal}</span>
                      {met ? (
                        <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-emerald-600" />
                        </span>
                      ) : suggestions[key] > goal ? (
                        <span
                          title={`Suggested: ${suggestions[key]}`}
                          className="flex items-center gap-0.5 text-xs text-orange-400 cursor-help"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          {suggestions[key]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${ring}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* History toggle */}
        {historyToShow.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              data-testid="goals-history-toggle"
              onClick={() => setShowHistory(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors uppercase tracking-wide w-full"
            >
              {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              Achievement History
              <span className="ml-auto text-xs text-slate-400 normal-case tracking-normal font-normal">Last {historyToShow.length} weeks</span>
            </button>

            {showHistory && (
              <div className="mt-3 divide-y divide-slate-50">
                {historyToShow.map((week) => {
                  const noGoals = !week.goals || Object.values(week.goals).every(v => v === 0);
                  return (
                    <div key={week.week_start} className="py-2.5 flex items-center gap-3" data-testid={`history-week-${week.week_start}`}>
                      <AchievementDot pct={week.achievement_pct} />
                      <span className="text-xs text-slate-600 flex-1 font-medium">{week.week_label}</span>
                      {noGoals ? (
                        <span className="text-xs text-slate-400 italic">No goals set</span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {GOAL_META.map(({ key }) => {
                            const g = week.goals[key] || 0;
                            const p = week.progress[key] || 0;
                            const met = g > 0 && p >= g;
                            if (g === 0) return null;
                            return (
                              <span key={key} title={`${key.replace(/_/g, " ")}: ${p}/${g}`}
                                className={`text-xs font-bold px-1.5 py-0.5 rounded ${met ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                {p}/{g}
                              </span>
                            );
                          })}
                          {week.achievement_pct !== null && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${achievementColor(week.achievement_pct)}`}>
                              {week.achievement_pct}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Set Goals Modal */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          data-testid="goals-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setEditing(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-slate-900">
              <Target className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "1.1rem" }}>
                  Set Weekly Goals
                </h3>
                <p className="text-xs text-slate-400">{current.week_label}</p>
              </div>
              <button onClick={() => setEditing(false)} className="ml-auto text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Suggestion banner */}
            <div className="mx-5 mt-4 mb-1 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
              <p className="text-xs text-orange-700 flex-1">
                {hasHistory ? "Suggestions based on your last 4 weeks" : "Starter goals to get you going"}
              </p>
              <button
                data-testid="goals-apply-suggestions-btn"
                onClick={applySuggestions}
                className="text-xs font-bold text-orange-600 hover:text-orange-800 transition-colors whitespace-nowrap underline underline-offset-2"
              >
                Apply all
              </button>
            </div>

            <div className="p-5 pt-3 space-y-3">
              {GOAL_META.map(({ key, label, icon: Icon, color, bg }) => {
                const suggested = suggestions[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-slate-700">{label}</span>
                      <button
                        onClick={() => setDraft(d => ({ ...d, [key]: suggested }))}
                        className="ml-2 text-xs text-orange-500 hover:text-orange-700 font-medium transition-colors"
                        data-testid={`goal-suggest-${key}`}
                        title="Use suggestion"
                      >
                        <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />{suggested}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDraft(d => ({ ...d, [key]: Math.max(0, (d[key] || 0) - 1) }))}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
                      >−</button>
                      <input
                        data-testid={`goal-input-${key}`}
                        type="number"
                        min="0"
                        max="99"
                        value={draft[key] ?? 0}
                        onChange={e => setDraft(d => ({ ...d, [key]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-12 text-center font-bold text-slate-900 border border-slate-200 rounded-lg py-1 text-sm focus:outline-none focus:border-orange-400"
                      />
                      <button
                        onClick={() => setDraft(d => ({ ...d, [key]: (d[key] || 0) + 1 }))}
                        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold transition-colors"
                      >+</button>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-slate-400 pt-1">Set a goal to 0 to skip that metric.</p>
            </div>

            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                data-testid="goals-save-btn"
                onClick={saveGoals}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold uppercase tracking-wide transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Goals"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
