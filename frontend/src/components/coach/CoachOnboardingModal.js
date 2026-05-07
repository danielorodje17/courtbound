import { useState, useEffect, useCallback } from "react";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { toast } from "sonner";
import {
  X, ChevronRight, ChevronLeft, Search, BookmarkPlus,
  CheckCircle, SlidersHorizontal, Users, Trophy, Star, Zap, ArrowRight,
} from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "G", "F"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];

function StepDots({ current, total }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current ? "w-6 h-2 bg-blue-500" : i < current ? "w-2 h-2 bg-blue-700" : "w-2 h-2 bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

export default function CoachOnboardingModal({ onComplete, onSkip }) {
  const { coach, coachReq, updateCoach } = useCoachAuth();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — recruiting preferences
  const [prefs, setPrefs] = useState({
    positions: coach?.recruiting_prefs?.positions || [],
    grad_years: coach?.recruiting_prefs?.grad_years || [],
    min_height_cm: coach?.recruiting_prefs?.min_height_cm || "",
    min_ppg: coach?.recruiting_prefs?.min_ppg || "",
  });

  // Step 2 — player search
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set());

  const fetchPlayers = useCallback(async (q = "") => {
    setLoadingPlayers(true);
    try {
      const params = new URLSearchParams({ sort: "match", limit: "6" });
      if (q.trim()) params.set("search", q.trim());
      const r = await coachReq("get", `/players?${params}`);
      setPlayers(r.data.players || []);
    } catch {}
    setLoadingPlayers(false);
  }, [coachReq]);

  useEffect(() => {
    if (step === 2) fetchPlayers("");
  }, [step, fetchPlayers]);

  const togglePref = (field, value) => {
    setPrefs(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const savePrefsAndNext = async () => {
    setSaving(true);
    try {
      const body = {
        recruiting_prefs: {
          ...prefs,
          min_height_cm: prefs.min_height_cm !== "" ? Number(prefs.min_height_cm) : null,
          min_ppg: prefs.min_ppg !== "" ? Number(prefs.min_ppg) : null,
        },
        onboarding_steps: { ...(coach?.onboarding_steps || {}), prefs_set: true },
      };
      const r = await coachReq("patch", "/auth/profile", body);
      updateCoach(r.data);
      setStep(2);
    } catch {
      toast.error("Failed to save preferences");
    }
    setSaving(false);
  };

  const handleSavePlayer = async (player) => {
    if (savedIds.has(player.user_id)) return;
    try {
      await coachReq("post", `/players/${player.user_id}/save`, { list_name: "Watch List" });
      setSavedIds(prev => new Set([...prev, player.user_id]));
      if (!hasSaved) setHasSaved(true);
      toast.success(`${player.full_name} saved to your board!`);
    } catch {
      toast.error("Failed to save player");
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const r = await coachReq("patch", "/auth/profile", { onboarding_completed: true });
      updateCoach(r.data);
    } catch {}
    setSaving(false);
    onComplete();
  };

  const handleSkip = () => {
    if (coach?.id) localStorage.setItem(`cb_coach_onboarding_dismissed_${coach.id}`, "1");
    onSkip();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" data-testid="onboarding-modal">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <StepDots current={step} total={4} />
          <button
            onClick={handleSkip}
            data-testid="onboarding-skip-btn"
            className="flex items-center gap-1.5 text-slate-500 hover:text-white text-xs font-semibold transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Skip for now
          </button>
        </div>

        <div className="px-6 py-8 min-h-[420px] flex flex-col">

          {/* ── Step 0: Welcome ── */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center flex-1 justify-center">
              <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/40 rounded-2xl flex items-center justify-center mb-5">
                <Trophy className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Welcome, {coach?.full_name?.split(" ")[0] || "Coach"}!
              </h2>
              <p className="text-slate-400 text-sm mb-8 max-w-md leading-relaxed">
                Your CourtBound Coach Portal is ready. Let's set up your recruiting profile in 3 quick steps.
              </p>
              <div className="grid grid-cols-3 gap-3 w-full mb-8">
                {[
                  { icon: SlidersHorizontal, label: "Set Preferences", desc: "Tell us what you look for" },
                  { icon: Users, label: "Find Players", desc: "Search our database" },
                  { icon: Star, label: "Build Your Board", desc: "Save recruits to lists" },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <div key={i} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-white text-xs font-bold mb-0.5">{label}</p>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                data-testid="onboarding-start-btn"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
              >
                Let's Get Started <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── Step 1: Recruiting Preferences ── */}
          {step === 1 && (
            <div className="flex flex-col flex-1">
              <div className="mb-5">
                <h2 className="text-xl font-black text-white mb-1">What are you looking for?</h2>
                <p className="text-slate-400 text-sm">Your preferences power personalised match scores across all players.</p>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Target Positions</label>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map(pos => (
                    <button key={pos} type="button" onClick={() => togglePref("positions", pos)}
                      data-testid={`onboarding-pos-${pos}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                        prefs.positions.includes(pos)
                          ? "border-blue-500 bg-blue-600/20 text-blue-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}>
                      {pos}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Target Graduation Years</label>
                <div className="flex flex-wrap gap-2">
                  {GRAD_YEARS.map(yr => (
                    <button key={yr} type="button" onClick={() => togglePref("grad_years", yr)}
                      data-testid={`onboarding-yr-${yr}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                        prefs.grad_years.includes(yr)
                          ? "border-purple-500 bg-purple-600/20 text-purple-300"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}>
                      {yr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min Height (cm)</label>
                  <input type="number" placeholder="e.g. 185" value={prefs.min_height_cm}
                    onChange={e => setPrefs(p => ({ ...p, min_height_cm: e.target.value }))}
                    data-testid="onboarding-min-height"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min PPG</label>
                  <input type="number" step="0.1" placeholder="e.g. 10" value={prefs.min_ppg}
                    onChange={e => setPrefs(p => ({ ...p, min_ppg: e.target.value }))}
                    data-testid="onboarding-min-ppg"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800">
                <button onClick={() => setStep(0)} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkip} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Skip</button>
                  <button onClick={savePrefsAndNext} disabled={saving}
                    data-testid="onboarding-save-prefs-btn"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                    {saving ? "Saving..." : <><span>Save &amp; Continue</span><ChevronRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Find Your First Player ── */}
          {step === 2 && (
            <div className="flex flex-col flex-1">
              <div className="mb-4">
                <h2 className="text-xl font-black text-white mb-1">Find your first recruit</h2>
                <p className="text-slate-400 text-sm">
                  {hasSaved
                    ? "Player saved! You can save more or continue to finish setup."
                    : "Search our player database and save one player to continue."}
                </p>
              </div>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchPlayers(searchQuery)}
                  placeholder="Search by name, club, position..."
                  data-testid="onboarding-player-search"
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-10 pr-24 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button onClick={() => fetchPlayers(searchQuery)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg transition-colors">
                  Search
                </button>
              </div>

              <div className="flex-1 overflow-y-auto min-h-[180px] max-h-[260px] pr-1">
                {loadingPlayers ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse" />)}
                  </div>
                ) : players.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-500 text-sm py-8">
                    No players found. Try a different search term.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {players.map(player => (
                      <div key={player.user_id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          savedIds.has(player.user_id)
                            ? "border-blue-700/60 bg-blue-900/20"
                            : "border-slate-700 bg-slate-800 hover:border-slate-600"
                        }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {(player.full_name || "?")[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-xs font-bold truncate">{player.full_name}</p>
                            <p className="text-slate-400 text-xs">{player.position} · {player.expected_graduation || "—"}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleSavePlayer(player)}
                          disabled={savedIds.has(player.user_id)}
                          data-testid={`onboarding-save-${player.user_id}`}
                          className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ml-2 ${
                            savedIds.has(player.user_id)
                              ? "bg-blue-600/20 text-blue-400 border border-blue-600/40 cursor-default"
                              : "bg-slate-700 hover:bg-blue-600 text-slate-300 hover:text-white border border-slate-600 hover:border-blue-600"
                          }`}>
                          {savedIds.has(player.user_id)
                            ? <><CheckCircle className="w-3.5 h-3.5" /> Saved</>
                            : <><BookmarkPlus className="w-3.5 h-3.5" /> Save</>}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-slate-400 hover:text-white text-sm font-semibold transition-colors">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button onClick={handleSkip} className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Skip</button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={!hasSaved}
                    data-testid="onboarding-continue-btn"
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors">
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Complete ── */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center flex-1 justify-center">
              <div className="w-20 h-20 bg-green-600/20 border border-green-600/40 rounded-full flex items-center justify-center mb-5">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Your portal is ready!</h2>
              <p className="text-slate-400 text-sm mb-7 max-w-md leading-relaxed">
                Setup complete. Here's everything you can do now:
              </p>
              <div className="grid grid-cols-3 gap-3 w-full mb-8">
                {[
                  { icon: Users, label: "Search Players", desc: "500+ profiles" },
                  { icon: Star, label: "Recruiting Board", desc: "Manage your lists" },
                  { icon: Zap, label: "AI Summaries", desc: "Instant player analysis" },
                ].map(({ icon: Icon, label, desc }, i) => (
                  <div key={i} className="bg-slate-800/60 border border-green-700/30 rounded-xl p-3 text-center">
                    <Icon className="w-5 h-5 text-green-400 mx-auto mb-1.5" />
                    <p className="text-white text-xs font-bold">{label}</p>
                    <p className="text-slate-500 text-xs">{desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={handleComplete}
                disabled={saving}
                data-testid="onboarding-complete-btn"
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
              >
                {saving ? "Setting up..." : <><span>Go to Dashboard</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
