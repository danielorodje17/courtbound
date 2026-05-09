import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import CoachOnboardingModal from "../../components/coach/CoachOnboardingModal";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, BookmarkPlus, Bell, TrendingUp, ChevronRight, Star, Film, Shield, AlertCircle, CheckCircle, Calendar, Award, BarChart2, Eye, MessageSquare, X, KeyRound, Globe, Download } from "lucide-react";

const PERIOD_COLORS = {
  contact: "bg-green-500",
  evaluation: "bg-amber-500",
  dead: "bg-red-500",
  quiet: "bg-slate-400",
};

const PERIOD_LABELS = {
  contact: "Contact Period",
  evaluation: "Evaluation Period",
  dead: "Dead Period",
  quiet: "Quiet Period",
};

function MatchBadge({ score }) {
  const color = score >= 80 ? "bg-green-600" : score >= 60 ? "bg-blue-600" : "bg-slate-600";
  return (
    <span className={`${color} text-white text-xs font-black px-2 py-0.5 rounded-full`}>{score}%</span>
  );
}

function PlayerCard({ player, onSave, onView }) {
  const isNew = player.updated_at && new Date(player.updated_at) > new Date(Date.now() - 7 * 86400000);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-blue-700/50 transition-all group" data-testid="player-card">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {(player.full_name || "?")[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-sm">{player.full_name}</h3>
              {isNew && <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">NEW</span>}
            </div>
            <p className="text-slate-400 text-xs">{player.position}{player.secondary_position ? ` / ${player.secondary_position}` : ""} · {player.height_ft || "—"}</p>
          </div>
        </div>
        <MatchBadge score={player.match_score} />
      </div>
      <div className="flex gap-3 text-xs text-slate-400 mb-3 flex-wrap">
        {player.club_team && <span className="bg-slate-800 px-2 py-0.5 rounded-full">{player.club_team}</span>}
        {player.expected_graduation && <span className="bg-slate-800 px-2 py-0.5 rounded-full">Grad {player.expected_graduation}</span>}
        {player.hometown && <span className="bg-slate-800 px-2 py-0.5 rounded-full">{player.hometown}</span>}
      </div>
      {(player.ppg || player.rpg || player.apg) && (
        <div className="flex gap-4 text-xs mb-3">
          {player.ppg && <span><strong className="text-white">{player.ppg}</strong><span className="text-slate-500"> PPG</span></span>}
          {player.rpg && <span><strong className="text-white">{player.rpg}</strong><span className="text-slate-500"> RPG</span></span>}
          {player.apg && <span><strong className="text-white">{player.apg}</strong><span className="text-slate-500"> APG</span></span>}
        </div>
      )}
      {player.highlight_tape_url && (
        <div className="flex items-center gap-1 text-xs text-blue-400 mb-3">
          <Film className="w-3 h-3" /> Highlight reel available
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(player)}
          data-testid="save-player-btn"
          className={`flex-1 text-xs font-bold py-2 rounded-lg transition-colors border ${
            player.is_saved ? "border-blue-600 text-blue-400 bg-blue-600/10" : "border-slate-700 text-slate-400 hover:border-blue-600 hover:text-blue-400"
          }`}>
          <BookmarkPlus className="w-3.5 h-3.5 inline mr-1" />
          {player.is_saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={() => onView(player.user_id)}
          data-testid="view-profile-btn"
          className="flex-1 text-xs font-bold py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          View Profile <ChevronRight className="w-3.5 h-3.5 inline" />
        </button>
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const { coach, coachReq, updateCoach } = useCoachAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // 2FA nudge banner — show only for email/password coaches who haven't dismissed it
  const isGoogleCoach = localStorage.getItem("cb_coach_auth_method") === "google";
  const [show2FABanner, setShow2FABanner] = useState(() => {
    if (isGoogleCoach) return false;
    return !localStorage.getItem("cb_coach_2fa_dismissed");
  });

  const dismiss2FA = () => {
    localStorage.setItem("cb_coach_2fa_dismissed", "1");
    setShow2FABanner(false);
  };

  // Show onboarding wizard if not completed and not previously dismissed
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!coach) return false;
    if (coach.onboarding_completed) return false;
    if (localStorage.getItem(`cb_coach_onboarding_dismissed_${coach.id}`)) return false;
    return true;
  });

  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    coachReq("get", "/dashboard")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    coachReq("get", "/analytics")
      .then(r => setAnalytics(r.data))
      .catch(() => {});
  }, []);

  const handleSave = async (player) => {
    setSavingId(player.user_id);
    try {
      if (player.is_saved) {
        await coachReq("delete", `/players/${player.user_id}/save`);
      } else {
        await coachReq("post", `/players/${player.user_id}/save`, { list_name: "Watch List" });
      }
      setData(prev => ({
        ...prev,
        recommended: prev.recommended.map(p =>
          p.user_id === player.user_id ? { ...p, is_saved: !p.is_saved } : p
        ),
      }));
    } catch {}
    setSavingId(null);
  };

  const isVerified = coach?.verification_status === "verified";
  const onboarding = data?.onboarding_steps || {};
  const onboardingSteps = [
    { key: "email_verified", label: "Verify your institutional email", done: isVerified, action: null },
    { key: "prefs_set", label: "Set recruiting preferences", done: !!onboarding.prefs_set, action: () => navigate("/coach/settings") },
    { key: "player_saved", label: "Save your first player", done: (data?.stats?.saved_count || 0) > 0, action: () => navigate("/coach/players") },
    { key: "profile_viewed", label: "View a player's full profile", done: !!onboarding.profile_viewed, action: () => navigate("/coach/players") },
    { key: "search_done", label: "Run a player search", done: !!onboarding.search_done, action: () => navigate("/coach/players") },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;
  const allOnboarded = onboardingDone === onboardingSteps.length;

  const currentPeriod = data?.current_period;

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav notifCount={data?.stats?.unread_notifications || 0} />

      {/* Onboarding wizard modal */}
      {showOnboarding && (
        <CoachOnboardingModal
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* Pending verification banner */}
        {!isVerified && (
          <div className="mb-6 bg-amber-900/30 border border-amber-700/50 rounded-xl p-4 flex items-start gap-3" data-testid="pending-verification-banner">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 font-bold text-sm">Account Pending Verification</p>
              <p className="text-amber-300/70 text-xs mt-0.5">Your account is under review. Full player access unlocks within 48 hours. You can browse the platform in the meantime.</p>
            </div>
          </div>
        )}

        {/* 2FA nudge banner — email/password coaches only, dismissible */}
        {show2FABanner && isVerified && (
          <div data-testid="2fa-nudge-banner" className="mb-6 bg-blue-950/50 border border-blue-800/60 rounded-xl p-4 flex items-start gap-3">
            <KeyRound className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-blue-200 font-bold text-sm">Secure your account with 2FA</p>
              <p className="text-blue-300/70 text-xs mt-0.5">Add two-factor authentication to protect your recruiting data. Set it up in your Supabase account settings.</p>
            </div>
            <button onClick={dismiss2FA} data-testid="2fa-nudge-dismiss" className="text-blue-500 hover:text-blue-300 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Onboarding checklist */}
        {!allOnboarded && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-5" data-testid="onboarding-checklist">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Getting Started — {onboardingDone}/5 Complete</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-blue-400 font-semibold hidden sm:block">Complete all 5 for Elite Recruiter badge</span>
                <button
                  onClick={() => setShowOnboarding(true)}
                  data-testid="reopen-wizard-btn"
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold border border-blue-700/50 px-3 py-1 rounded-lg transition-colors hover:bg-blue-900/20"
                >
                  Setup Wizard
                </button>
              </div>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full mb-4">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(onboardingDone / 5) * 100}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {onboardingSteps.map(s => (
                <button
                  key={s.key}
                  onClick={s.action || undefined}
                  disabled={!s.action || s.done}
                  data-testid={`checklist-${s.key}`}
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg text-left transition-colors ${
                    s.done
                      ? "text-green-400 cursor-default"
                      : s.action
                      ? "text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                      : "text-slate-500 cursor-default"
                  }`}>
                  {s.done
                    ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    : <div className="w-3.5 h-3.5 border border-slate-600 rounded-full flex-shrink-0" />}
                  <span>{s.label}</span>
                  {!s.done && s.action && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-50" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Elite Recruiter badge — shown when all steps done */}
        {allOnboarded && (
          <div className="mb-6 bg-gradient-to-r from-slate-900 to-blue-950/40 border border-blue-800/40 rounded-xl p-4 flex items-center gap-3" data-testid="elite-recruiter-badge">
            <div className="w-10 h-10 bg-blue-600/20 border border-blue-600/40 rounded-full flex items-center justify-center flex-shrink-0">
              <Award className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Elite Recruiter</p>
              <p className="text-slate-400 text-xs">You've completed all setup steps. Your portal is fully configured.</p>
            </div>
          </div>
        )}

        {/* 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Stats */}
          <div className="lg:col-span-3 space-y-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Quick Stats</h2>
            {[
              { label: "New Players This Week", value: data?.stats?.new_this_week ?? "—", icon: TrendingUp, color: "text-blue-400" },
              { label: "Saved Players", value: data?.stats?.saved_count ?? "—", icon: BookmarkPlus, color: "text-purple-400", action: () => navigate("/coach/board") },
              { label: "Unread Notifications", value: data?.stats?.unread_notifications ?? "—", icon: Bell, color: "text-amber-400", action: () => navigate("/coach/notifications") },
              { label: "Profiles Viewed (7d)", value: data?.stats?.profiles_viewed_this_week ?? "—", icon: Users, color: "text-green-400" },
            ].map(({ label, value, icon: Icon, color, action }) => (
              <button key={label} onClick={action} className={`w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors ${action ? "cursor-pointer" : "cursor-default"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-xs mb-1">{label}</p>
                    <p className={`text-2xl font-black ${color}`}>{loading ? "..." : value}</p>
                  </div>
                  <Icon className={`w-5 h-5 ${color} opacity-60`} />
                </div>
              </button>
            ))}

            {/* Current Period */}
            {currentPeriod && (
              <div className={`rounded-xl p-4 border ${
                currentPeriod.type === "contact" ? "bg-green-900/30 border-green-800/50" :
                currentPeriod.type === "dead" ? "bg-red-900/30 border-red-800/50" :
                currentPeriod.type === "evaluation" ? "bg-amber-900/30 border-amber-800/50" :
                "bg-slate-800 border-slate-700"
              }`}>
                <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Current Recruiting Period</p>
                <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-black mb-2 ${PERIOD_COLORS[currentPeriod.type]} text-white`}>
                  <Calendar className="w-3 h-3" /> {currentPeriod.label}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{currentPeriod.description}</p>
              </div>
            )}

            {/* Set Preferences CTA */}
            {!onboarding.prefs_set && (
              <button onClick={() => navigate("/coach/settings")}
                className="w-full bg-blue-600/20 border border-blue-700/50 text-blue-300 text-xs font-bold rounded-xl p-4 hover:bg-blue-600/30 transition-colors text-left">
                <Star className="w-4 h-4 mb-2" />
                <p>Set your recruiting preferences to see personalised match scores</p>
              </button>
            )}
          </div>

          {/* Centre: Recommended Players */}
          <div className="lg:col-span-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recommended Players</h2>
              <button onClick={() => navigate("/coach/players")} className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1">
                Search All <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-36 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
              </div>
            ) : (data?.recommended?.length || 0) === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm font-semibold">No players yet</p>
                <p className="text-slate-500 text-xs mt-1">Set your recruiting preferences to see matched players</p>
                <button onClick={() => navigate("/coach/settings")} className="mt-4 text-xs bg-blue-600 text-white font-bold px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors">
                  Set Preferences
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(data.recommended || []).map(p => (
                  <PlayerCard
                    key={p.user_id}
                    player={p}
                    onSave={handleSave}
                    onView={(id) => navigate(`/coach/players/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Activity Feed */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity Feed</h2>
              {(data?.activity?.length || 0) > 0 && (
                <button onClick={() => coachReq("patch", "/notifications/read-all")} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Mark all read</button>
              )}
            </div>
            <div className="space-y-2">
              {loading ? (
                [1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)
              ) : (data?.activity?.length || 0) === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center">
                  <Bell className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-xs">No activity yet. Start saving players to see updates here.</p>
                </div>
              ) : (
                (data.activity || []).map(a => (
                  <div key={a.id} className={`bg-slate-900 border rounded-xl p-3 text-xs ${a.is_read ? "border-slate-800" : "border-blue-800/50 bg-slate-900"}`}>
                    <p className={`font-semibold mb-0.5 ${a.is_read ? "text-slate-300" : "text-white"}`}>{a.title}</p>
                    {a.message && <p className="text-slate-500">{a.message}</p>}
                    <p className="text-slate-600 mt-1">{a.created_at ? new Date(a.created_at).toLocaleDateString() : ""}</p>
                  </div>
                ))
              )}
            </div>

            {/* Recruiting Calendar Preview */}
            <div className="mt-6">
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Recruiting Calendar ({coach?.division || "NAIA"})</h2>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                {(data?.recruiting_calendar || []).slice(0, 4).map((period, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${PERIOD_COLORS[period.type] || "bg-slate-500"}`} />
                    <div>
                      <p className="font-bold text-slate-300">{period.label}</p>
                      <p className="text-slate-600">{period.start?.slice(0, 10)} → {period.end?.slice(0, 10)}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-1 border-t border-slate-800 mt-2 flex gap-3 text-xs">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Contact</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Eval</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Dead</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Recruiting Activity Analytics ── */}
        <div className="border-t border-slate-800 pt-8 pb-4" data-testid="coach-analytics-section">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-white text-base flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-400" /> Recruiting Activity
            </h2>
            <button
              onClick={async () => {
                try {
                  const token = localStorage.getItem("cb_coach_token");
                  const r = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/coach/analytics/export`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "courtbound_analytics.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {}
              }}
              data-testid="export-analytics-csv-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {[
              { label: "Profile Views (All)", value: analytics?.views?.all_time ?? "—", icon: Eye, color: "text-blue-400" },
              { label: "Profile Views (7d)", value: analytics?.views?.last_7d ?? "—", icon: TrendingUp, color: "text-purple-400" },
              { label: "Programme Views (7d)", value: analytics?.programme_views?.last_7d ?? "—", icon: Globe, color: "text-cyan-400" },
              { label: "Programme Views (30d)", value: analytics?.programme_views?.last_30d ?? "—", icon: Globe, color: "text-teal-400" },
              { label: "Players Saved", value: analytics?.saves?.total ?? "—", icon: Star, color: "text-yellow-400" },
              { label: "Messages Sent", value: analytics?.messages_sent ?? "—", icon: MessageSquare, color: "text-green-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4" data-testid={`analytics-kpi`}>
                <Icon className={`w-4 h-4 ${color} mb-2`} />
                <p className="text-2xl font-black text-white">{value}</p>
                <p className="text-slate-500 text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            {/* 14-day views trend */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-bold text-slate-300 text-sm mb-4">Profile Views — Last 14 Days</h3>
              {analytics?.daily_views?.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={analytics.daily_views} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="coachViewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis hide allowDecimals={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 12 }} />
                    <Area type="monotone" dataKey="views" stroke="#3b82f6" fill="url(#coachViewsGrad)" strokeWidth={2} name="Views" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-slate-600 text-sm">No view data yet</div>
              )}
            </div>

            {/* Saves by list */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="font-bold text-slate-300 text-sm mb-4">Saves by List</h3>
              {analytics?.saves?.by_list?.length > 0 ? (
                <div className="space-y-3">
                  {analytics.saves.by_list.map(l => (
                    <div key={l.list}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium truncate">{l.list}</span>
                        <span className="text-slate-400 ml-2 flex-shrink-0">{l.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full">
                        <div className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${analytics.saves.total > 0 ? (l.count / analytics.saves.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 text-slate-600 text-sm">No saves yet</div>
              )}
            </div>
          </div>

          {/* Positions + Grad Years */}
          {(analytics?.top_positions?.length > 0 || analytics?.top_grad_years?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {analytics.top_positions?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="font-bold text-slate-300 text-sm mb-4">Top Saved Positions</h3>
                  <div className="space-y-2.5">
                    {analytics.top_positions.map(p => {
                      const max = analytics.top_positions[0]?.count || 1;
                      return (
                        <div key={p.position}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-bold">{p.position}</span>
                            <span className="text-slate-400">{p.count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(p.count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {analytics.top_grad_years?.length > 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h3 className="font-bold text-slate-300 text-sm mb-4">Top Saved Grad Years</h3>
                  <div className="space-y-2.5">
                    {analytics.top_grad_years.map(g => {
                      const max = Math.max(...analytics.top_grad_years.map(x => x.count), 1);
                      return (
                        <div key={g.year}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-300 font-bold">{g.year}</span>
                            <span className="text-slate-400">{g.count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${(g.count / max) * 100}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
