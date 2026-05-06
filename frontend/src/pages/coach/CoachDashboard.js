import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Users, BookmarkPlus, Bell, TrendingUp, ChevronRight, Star, Film, Shield, AlertCircle, CheckCircle, Calendar } from "lucide-react";

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

  useEffect(() => {
    coachReq("get", "/dashboard")
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
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
    { key: "email_verified", label: "Verify your institutional email", done: isVerified },
    { key: "prefs_set", label: "Set recruiting preferences", done: !!onboarding.prefs_set },
    { key: "player_saved", label: "Save your first player", done: (data?.stats?.saved_count || 0) > 0 },
    { key: "profile_viewed", label: "View a player's full profile", done: !!onboarding.profile_viewed },
    { key: "search_done", label: "Run a player search", done: !!onboarding.search_done },
  ];
  const onboardingDone = onboardingSteps.filter(s => s.done).length;
  const allOnboarded = onboardingDone === onboardingSteps.length;

  const currentPeriod = data?.current_period;

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav notifCount={data?.stats?.unread_notifications || 0} />

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

        {/* Onboarding checklist */}
        {!allOnboarded && (
          <div className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-sm">Getting Started — {onboardingDone}/5 Complete</h3>
              <span className="text-xs text-blue-400 font-semibold">Complete all 5 for Elite Recruiter badge</span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full mb-4">
              <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(onboardingDone / 5) * 100}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {onboardingSteps.map(s => (
                <div key={s.key} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${s.done ? "text-green-400" : "text-slate-400"}`}>
                  {s.done ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <div className="w-3.5 h-3.5 border border-slate-600 rounded-full flex-shrink-0" />}
                  <span>{s.label}</span>
                </div>
              ))}
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
      </div>
    </div>
  );
}
