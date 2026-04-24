import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { useAuth } from "../context/AuthContext";
import { useTheme, DIVISION_THEME } from "../context/ThemeContext";
import { Trophy, Mail, BookOpen, TrendingUp, ChevronRight, Bell, Plus, AlertTriangle, Clock, Calendar, CheckCircle, BarChart2, Newspaper, ArrowUp, ArrowDown, Minus } from "lucide-react";
import WeeklyGoalsWidget from "../components/WeeklyGoalsWidget";
import ActivityHeatmap from "../components/ActivityHeatmap";
import TrialBanner from "../components/TrialBanner";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const statusColors = {
  interested: "bg-blue-100 text-blue-700",
  contacted: "bg-orange-100 text-orange-700",
  replied: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700"
};

const scoreColor = (s) => s >= 75 ? "#10b981" : s >= 50 ? "#f97316" : s >= 25 ? "#3b82f6" : "#94a3b8";

const DIVISION_COLORS = ["#f97316", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow text-xs">
      <p className="text-slate-500 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name === "sent" ? "Sent" : "Received"}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { division } = useTheme();
  const theme = DIVISION_THEME[division] || DIVISION_THEME.mens;
  const [stats, setStats] = useState(null);
  const [tracked, setTracked] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [digest, setDigest] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, trackedRes, alertsRes, analyticsRes, digestRes, heatmapRes] = await Promise.all([
        apiRequest("get", "/dashboard/stats"),
        apiRequest("get", "/my-colleges"),
        apiRequest("get", "/dashboard/alerts"),
        apiRequest("get", "/dashboard/analytics"),
        apiRequest("get", "/dashboard/weekly-digest"),
        apiRequest("get", "/dashboard/heatmap"),
      ]);
      setStats(statsRes.data);
      setTracked(trackedRes.data);
      setAlerts(alertsRes.data);
      setAnalytics(analyticsRes.data);
      setDigest(digestRes.data);
      setHeatmap(heatmapRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Colleges Tracked", value: stats?.tracked_colleges ?? 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50", route: "/colleges?view=tracked" },
    { label: "Emails Sent", value: stats?.emails_sent ?? 0, icon: Mail, color: "text-orange-600", bg: "bg-orange-50", route: "/communications" },
    { label: "Responses Received", value: stats?.emails_received ?? 0, icon: Bell, color: "text-green-600", bg: "bg-green-50", route: "/responses" },
    { label: "Response Rate", value: stats ? (stats.emails_sent > 0 ? `${Math.round((stats.emails_received / stats.emails_sent) * 100)}%` : "0%") : "—", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50", route: "/responses" }
  ];

  const totalAlerts = alerts ? (alerts.overdue_followups.length + alerts.upcoming_followups.length + alerts.upcoming_deadlines.length) : 0;

  // Filter activity data to only show last 14 days for cleaner chart
  const activityData = analytics?.activity?.slice(-14).map(d => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  })) || [];

  const hasActivity = activityData.some(d => d.sent > 0 || d.received > 0);
  const funnel = analytics?.funnel;
  const funnelData = funnel ? [
    { name: "Tracked", value: funnel.tracked, fill: "#3b82f6" },
    { name: "Contacted", value: funnel.contacted, fill: "#f97316" },
    { name: "Replied", value: funnel.replied, fill: "#10b981" },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Trial / Upgrade Banner */}
      <TrialBanner user={user} />

      {/* Header Banner */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1768554630751-6448593749eb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxlbXB0eSUyMGluZG9vciUyMGJhc2tldGJhbGwlMjBjb3VydHxlbnwwfHx8fDE3NzUyNDU5MjF8MA&ixlib=rb-4.1.0&q=85"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 p-8">
          <span className="text-xs tracking-[0.2em] uppercase font-bold" style={{ color: theme.accent }}>Recruitment Dashboard</span>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: theme.fontHeading, textTransform: "uppercase" }}>
            Your Scholarship Tracker
          </h1>
          <p className="text-white/60 mt-1">{division === "womens" ? "Women's" : "European"} | Basketball Scholarship Tracker</p>
          <div className="flex gap-3 mt-5">
            <button
              data-testid="dashboard-find-colleges-btn"
              onClick={() => navigate("/colleges")}
              className="text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 transition-all text-sm flex items-center gap-2"
              style={{ background: theme.accent }}
            >
              <Plus className="w-4 h-4" /> Find Colleges
            </button>
            <button
              data-testid="dashboard-compose-btn"
              onClick={() => navigate("/compose")}
              className="bg-white/10 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 hover:bg-white/20 transition-all text-sm flex items-center gap-2 border border-white/20"
            >
              <Mail className="w-4 h-4" /> Draft Email
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid — clickable */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            data-testid={`stat-card-${card.label.toLowerCase().replace(/ /g, "-")}`}
            onClick={() => navigate(card.route)}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer group"
          >
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-sm text-slate-500 mt-0.5 flex items-center gap-1 group-hover:text-orange-500 transition-colors">
              {card.label} <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Goals */}
      <WeeklyGoalsWidget />

      {/* Weekly Digest */}
      {digest && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="weekly-digest-widget">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-900">
            <Newspaper className="w-4 h-4 text-orange-400" />
            <h2 className="font-bold text-sm text-white uppercase tracking-widest">Weekly Digest</h2>
            <span className="ml-auto text-xs text-slate-400 font-medium">{digest.week_label}</span>
          </div>
          <div className="p-5">
            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {/* Emails sent */}
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-semibold uppercase tracking-wide mb-1">Emails Sent</p>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">{digest.emails_sent_this_week}</span>
                  {digest.emails_sent_this_week > digest.emails_sent_last_week ? (
                    <span className="flex items-center text-xs text-emerald-600 font-bold mb-0.5 gap-0.5"><ArrowUp className="w-3 h-3" /> vs last week</span>
                  ) : digest.emails_sent_this_week < digest.emails_sent_last_week ? (
                    <span className="flex items-center text-xs text-red-500 font-bold mb-0.5 gap-0.5"><ArrowDown className="w-3 h-3" /> vs last week</span>
                  ) : (
                    <span className="flex items-center text-xs text-slate-400 font-bold mb-0.5 gap-0.5"><Minus className="w-3 h-3" /> vs last week</span>
                  )}
                </div>
              </div>
              {/* Responses */}
              <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">Responses In</p>
                <span className="text-2xl font-bold text-slate-900">{digest.responses_this_week}</span>
              </div>
              {/* New tracked */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide mb-1">New Colleges</p>
                <span className="text-2xl font-bold text-slate-900">{digest.new_colleges_tracked}</span>
              </div>
              {/* Overdue */}
              <div className={`${digest.overdue_followups > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"} border rounded-lg p-3`}>
                <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${digest.overdue_followups > 0 ? "text-red-600" : "text-slate-500"}`}>Overdue</p>
                <span className={`text-2xl font-bold ${digest.overdue_followups > 0 ? "text-red-600" : "text-slate-900"}`}>{digest.overdue_followups}</span>
              </div>
            </div>

            {/* Top college */}
            {digest.top_college && (
              <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3 mb-4">
                <Trophy className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Top Progress College</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{digest.top_college.name}</p>
                </div>
                <span className="text-sm font-black text-orange-500 flex-shrink-0">{digest.top_college.progress_score}%</span>
              </div>
            )}

            {/* Recommended action */}
            <div
              className="flex items-start gap-3 bg-orange-500 rounded-lg px-4 py-3 cursor-pointer hover:bg-orange-600 transition-colors"
              data-testid="digest-recommended-action"
              onClick={() => navigate(digest.recommended_link)}
            >
              <CheckCircle className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-orange-100 font-semibold uppercase tracking-wide">Recommended Action</p>
                <p className="text-sm text-white font-semibold mt-0.5">{digest.recommended_action}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-white flex-shrink-0 mt-0.5" />
            </div>
          </div>
        </div>
      )}

      {/* Priority Actions Widget */}
      {alerts && totalAlerts > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="priority-actions-widget">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-red-50">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="font-bold text-sm text-red-700 uppercase tracking-widest">Priority Actions</h2>
            <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{totalAlerts}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {alerts.overdue_followups.map(a => (
              <div
                key={a.college_id + "fo"}
                data-testid="alert-overdue-followup"
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/colleges/${a.college_id}`)}
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                  <p className="text-xs text-red-500 font-medium">Follow-up overdue — was due {new Date(a.date).toLocaleDateString("en-GB")}</p>
                </div>
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">Overdue</span>
              </div>
            ))}
            {alerts.upcoming_followups.map(a => {
              const days = daysUntil(a.date);
              return (
                <div
                  key={a.college_id + "fu"}
                  data-testid="alert-upcoming-followup"
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/colleges/${a.college_id}`)}
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-xs text-orange-500 font-medium">Follow-up due {days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`}</p>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                    {days === 0 ? "Today" : `${days}d`}
                  </span>
                </div>
              );
            })}
            {alerts.upcoming_deadlines.map((a, i) => {
              const days = daysUntil(a.deadline);
              return (
                <div
                  key={a.college_id + a.type + i}
                  data-testid="alert-deadline"
                  className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/colleges/${a.college_id}`)}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-xs text-blue-600 font-medium">{a.type} deadline — {new Date(a.deadline).toLocaleDateString("en-GB")}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0">
                    {days === 0 ? "Today" : `${days}d`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {alerts && totalAlerts === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-3" data-testid="no-alerts-banner">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">No urgent actions needed — you're on top of your recruitment!</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracked Colleges */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              My Colleges
            </h2>
            <button onClick={() => navigate("/colleges")} className="text-sm font-semibold hover:opacity-75 flex items-center gap-1" style={{ color: theme.accent }}>
              Browse all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {tracked.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No colleges tracked yet.</p>
              <button onClick={() => navigate("/colleges")} className="mt-3 font-semibold text-sm" style={{ color: theme.accent }}>
                Find colleges to target →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tracked.slice(0, 6).map((t) => {
                const fuDays = daysUntil(t.follow_up_date);
                return (
                  <div
                    key={t.id}
                    data-testid={`tracked-college-${t.college?.name}`}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/colleges/${t.college_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate">{t.college?.name}</p>
                        <p className="text-xs text-slate-500 truncate">{t.college?.location} · {t.college?.division}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {t.follow_up_date && fuDays !== null && fuDays <= 7 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${fuDays < 0 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                            <Clock className="w-2.5 h-2.5" />
                            {fuDays < 0 ? "Overdue" : fuDays === 0 ? "Today" : `${fuDays}d`}
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${statusColors[t.status] || "bg-slate-100 text-slate-600"}`}>
                          {t.status}
                        </span>
                      </div>
                    </div>
                    {/* Progress Score Bar */}
                    {t.progress_score !== undefined && (
                      <div className="mt-2.5 flex items-center gap-2 pl-14">
                        <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            data-testid={`progress-bar-${t.college?.name}`}
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${t.progress_score}%`, backgroundColor: scoreColor(t.progress_score) }}
                          />
                        </div>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: scoreColor(t.progress_score) }}>
                          {t.progress_score}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Emails */}
        <div className="bg-white border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Recent Emails
            </h2>
            <button onClick={() => navigate("/communications")} className="text-sm font-semibold hover:opacity-75 flex items-center gap-1" style={{ color: theme.accent }}>
              All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {(!stats?.recent_emails || stats.recent_emails.length === 0) ? (
            <div className="p-6 text-center">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No emails logged yet.</p>
              <button onClick={() => navigate("/compose")} className="mt-2 font-semibold text-sm" style={{ color: theme.accent }}>
                Draft your first email →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stats.recent_emails.map((email) => (
                <div key={email.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${email.direction === "sent" ? "bg-orange-400" : "bg-green-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{email.subject}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{email.direction === "sent" ? "Sent" : "Received"} · {new Date(email.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      {analytics && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="analytics-section">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100">
            <BarChart2 className="w-4 h-4 text-slate-500" />
            <h2 className="font-bold text-sm text-slate-700 uppercase tracking-widest">Recruitment Analytics</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* Email Activity Chart */}
            <div className="lg:col-span-2 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">Email Activity — Last 14 Days</p>
              {hasActivity ? (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={activityData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="sent" name="sent" stroke="#f97316" strokeWidth={2} fill="url(#sentGrad)" />
                    <Area type="monotone" dataKey="received" name="received" stroke="#10b981" strokeWidth={2} fill="url(#recvGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
                  No email activity in the last 14 days
                </div>
              )}
              <div className="flex items-center gap-5 mt-2">
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Sent</span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Received</span>
              </div>
            </div>

            {/* Funnel + Division */}
            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Recruitment Funnel</p>
                <div className="space-y-2">
                  {funnelData.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600 font-medium">{item.name}</span>
                        <span className="font-bold text-slate-800">{item.value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: funnelData[0].value > 0 ? `${(item.value / funnelData[0].value) * 100}%` : "0%",
                            backgroundColor: item.fill
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {analytics.division_breakdown?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">By Division</p>
                  <div className="space-y-1.5">
                    {analytics.division_breakdown.slice(0, 4).map((d, i) => (
                      <div key={d.division} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DIVISION_COLORS[i % DIVISION_COLORS.length] }} />
                          <span className="text-slate-600 truncate max-w-24">{d.division}</span>
                        </span>
                        <span className="font-bold text-slate-800">{d.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recruiting Activity Heatmap */}
      <ActivityHeatmap data={heatmap} />

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: "AI Message Composer", desc: "Draft personalised emails to coaches with AI", action: () => navigate("/compose"), icon: "✍️", color: "border-orange-200 hover:border-orange-400" },
          { title: "AI Match", desc: "Find your best-fit colleges with AI analysis", action: () => navigate("/ai-match"), icon: "🎯", color: "border-purple-200 hover:border-purple-400" },
          { title: "Response Tracker", desc: "Log coach replies and get AI follow-up advice", action: () => navigate("/responses"), icon: "📬", color: "border-green-200 hover:border-green-400" },
          { title: "Strategy Advisor", desc: "Get AI-powered recruitment strategy tips", action: () => navigate("/strategy"), icon: "💡", color: "border-blue-200 hover:border-blue-400" },
        ].map((item) => (
          <button
            key={item.title}
            data-testid={`quick-action-${item.title.toLowerCase().replace(/ /g, "-")}`}
            onClick={item.action}
            className={`bg-white border-2 ${item.color} rounded-lg p-5 text-left hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="font-bold text-slate-900 mt-2 text-sm" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>{item.title}</p>
            <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
