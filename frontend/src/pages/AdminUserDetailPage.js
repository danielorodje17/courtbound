import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft, Mail, BookMarked, MessageSquare, TrendingUp,
  Trophy, Copy, Check, Crown, CircleDot,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const adminReq = (method, path, data) => {
  const token = localStorage.getItem("cb_admin_token");
  return axios({ method, url: `${API}/api${path}`, data, headers: { Authorization: `Bearer ${token}` } });
};

const TIER_CONFIG = {
  free:  { label: "Free",  bg: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  pro:   { label: "Pro",   bg: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  elite: { label: "Elite", bg: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
};

const OUTCOME_LABELS = {
  interested:        { label: "Interested",         color: "bg-blue-100 text-blue-700" },
  call_requested:    { label: "Call Requested",     color: "bg-purple-100 text-purple-700" },
  scholarship_offered: { label: "Scholarship Offered", color: "bg-green-100 text-green-700" },
  after_call:        { label: "After Call",         color: "bg-teal-100 text-teal-700" },
  after_visit:       { label: "After Visit",        color: "bg-indigo-100 text-indigo-700" },
  no_interest:       { label: "No Interest",        color: "bg-red-100 text-red-700" },
  second_follow_up:  { label: "2nd Follow-Up",      color: "bg-orange-100 text-orange-700" },
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return "—"; }
};
const relTime = (iso) => {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

function StatPill({ icon: Icon, label, value, color = "text-orange-500" }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
      <Icon className={`w-5 h-5 mx-auto mb-1.5 ${color}`} />
      <p className="text-2xl font-black text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{value ?? "—"}</p>
      <p className="text-xs text-slate-400 mt-0.5 font-semibold">{label}</p>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("timeline");

  const load = useCallback(async () => {
    try {
      const res = await adminReq("get", `/admin/users/${userId}/activity`);
      setData(res.data);
    } catch (e) {
      if (e?.response?.status === 401) navigate("/admin/login", { replace: true });
    }
    setLoading(false);
  }, [userId, navigate]);

  useEffect(() => {
    if (!localStorage.getItem("cb_admin_token")) { navigate("/admin/login", { replace: true }); return; }
    load();
  }, [load, navigate]);

  const copyPromoSummary = () => {
    if (!data) return;
    const { user, profile, stats } = data;
    const name = profile.full_name || user.name;
    const pos  = profile.primary_position || "Player";
    const team = profile.current_team || "";
    const text = [
      `${name} — ${pos}${team ? ` | ${team}` : ""}`,
      `Contacted ${stats.emails_sent} colleges, received ${stats.emails_received} replies (${stats.reply_rate}% reply rate).`,
      stats.positive_replies > 0
        ? `${stats.positive_replies} positive outcome${stats.positive_replies > 1 ? "s" : ""} including scholarship interest.`
        : "",
      profile.highlight_tape_url ? `Highlight: ${profile.highlight_tape_url}` : "",
      profile.bio ? `\n"${profile.bio}"` : "",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );
  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">User not found</div>
  );

  const { user, profile, stats, recent_emails, tracked_colleges, positive_colleges } = data;
  const tierCfg = TIER_CONFIG[user.subscription_tier] || TIER_CONFIG.free;

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }} className="min-h-screen bg-slate-50 p-6">
      {/* Back */}
      <button onClick={() => navigate("/admin")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Admin Dashboard
      </button>

      {/* Profile header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 flex flex-wrap items-start gap-5">
        {user.picture
          ? <img src={user.picture} alt="" className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 shadow" />
          : <div className="w-20 h-20 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 text-3xl font-black flex-shrink-0">
              {(user.name || "?")[0].toUpperCase()}
            </div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-3xl font-black uppercase text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
              {profile.full_name || user.name}
            </h1>
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${tierCfg.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${tierCfg.dot}`} />
              {tierCfg.label}
            </span>
          </div>
          <p className="text-sm text-slate-500">{user.email}</p>
          {profile.primary_position && <p className="text-sm text-slate-600 font-semibold mt-0.5">{profile.primary_position}{profile.current_team ? ` · ${profile.current_team}` : ""}</p>}
          {profile.bio && <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-lg italic">"{profile.bio}"</p>}
          <div className="flex gap-4 mt-3 text-xs text-slate-400">
            <span>Joined {fmtDate(user.created_at)}</span>
            <span>Last active {relTime(user.last_active)}</span>
          </div>
        </div>
        <button
          data-testid="copy-promo-btn"
          onClick={copyPromoSummary}
          className="flex items-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied!" : "Copy Promo Summary"}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatPill icon={Mail}          label="Emails Sent"      value={stats.emails_sent}      color="text-orange-500" />
        <StatPill icon={MessageSquare} label="Replies Received" value={stats.emails_received}  color="text-blue-500" />
        <StatPill icon={TrendingUp}    label="Reply Rate"       value={`${stats.reply_rate}%`}  color="text-green-500" />
        <StatPill icon={BookMarked}    label="Colleges Tracked" value={stats.colleges_tracked} color="text-purple-500" />
        <StatPill icon={Trophy}        label="Positive Outcomes" value={stats.positive_replies} color="text-yellow-500" />
      </div>

      {/* Positive replies highlight */}
      {positive_colleges.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
          <p className="text-xs font-bold uppercase tracking-wider text-green-700 mb-3 flex items-center gap-1.5">
            <Trophy className="w-4 h-4" /> Positive Outcomes — Great for Promotion
          </p>
          <div className="flex flex-wrap gap-2">
            {positive_colleges.map((c, i) => {
              const cfg = OUTCOME_LABELS[c.reply_outcome] || { label: c.reply_outcome, color: "bg-slate-100 text-slate-700" };
              return (
                <div key={i} className="bg-white border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{c.college_name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: "timeline", label: "Activity Timeline" },
          { id: "colleges", label: "All Colleges" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Timeline Tab */}
      {tab === "timeline" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Email Activity ({recent_emails.length})</p>
          </div>
          {recent_emails.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No emails yet</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recent_emails.map((e, i) => (
                <div key={i} data-testid={`timeline-email-${i}`} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${e.direction === "sent" ? "bg-orange-400" : "bg-green-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{e.subject || "(No subject)"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {e.direction === "sent" ? `To: ${e.coach_name || "Coach"}` : `From: ${e.coach_name || "Coach"}`} · {e.college_name || ""} · {fmtDate(e.created_at)}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0 ${e.direction === "sent" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                    {e.direction}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Colleges Tab */}
      {tab === "colleges" && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tracked Colleges ({tracked_colleges.length})</p>
          </div>
          {tracked_colleges.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No colleges tracked yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {["College", "Division", "Status", "Reply Outcome", "Follow-up", "Notes"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {tracked_colleges.map((t, i) => {
                    const outcomeCfg = t.reply_outcome ? (OUTCOME_LABELS[t.reply_outcome] || { label: t.reply_outcome, color: "bg-slate-100 text-slate-600" }) : null;
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{t.college_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{t.college_division}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full capitalize">{t.status || "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          {outcomeCfg
                            ? <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${outcomeCfg.color}`}>{outcomeCfg.label}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(t.follow_up_date)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{t.notes || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
