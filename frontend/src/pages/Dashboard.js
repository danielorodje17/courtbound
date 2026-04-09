import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Trophy, Mail, BookOpen, TrendingUp, ChevronRight, Bell, Plus, AlertTriangle, Clock, Calendar, CheckCircle } from "lucide-react";

const statusColors = {
  interested: "bg-blue-100 text-blue-700",
  contacted: "bg-orange-100 text-orange-700",
  replied: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700"
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [tracked, setTracked] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [statsRes, trackedRes, alertsRes] = await Promise.all([
        apiRequest("get", "/dashboard/stats"),
        apiRequest("get", "/my-colleges"),
        apiRequest("get", "/dashboard/alerts"),
      ]);
      setStats(statsRes.data);
      setTracked(trackedRes.data);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Colleges Tracked", value: stats?.tracked_colleges ?? 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Emails Sent", value: stats?.emails_sent ?? 0, icon: Mail, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Responses Received", value: stats?.emails_received ?? 0, icon: Bell, color: "text-green-600", bg: "bg-green-50" },
    { label: "Response Rate", value: stats ? (stats.emails_sent > 0 ? `${Math.round((stats.emails_received / stats.emails_sent) * 100)}%` : "0%") : "—", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" }
  ];

  const totalAlerts = alerts ? (alerts.overdue_followups.length + alerts.upcoming_followups.length + alerts.upcoming_deadlines.length) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header Banner */}
      <div className="relative rounded-xl overflow-hidden bg-slate-900">
        <img
          src="https://images.unsplash.com/photo-1768554630751-6448593749eb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwyfHxlbXB0eSUyMGluZG9vciUyMGJhc2tldGJhbGwlMjBjb3VydHxlbnwwfHx8fDE3NzUyNDU5MjF8MA&ixlib=rb-4.1.0&q=85"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 p-8">
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-400">Recruitment Dashboard</span>
          <h1 className="text-3xl font-bold text-white mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Your Scholarship Tracker
          </h1>
          <p className="text-white/60 mt-1">England Under-18 | Basketball Scholarship Tracker</p>
          <div className="flex gap-3 mt-5">
            <button
              data-testid="dashboard-find-colleges-btn"
              onClick={() => navigate("/colleges")}
              className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 hover:bg-orange-600 transition-all text-sm flex items-center gap-2"
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            data-testid={`stat-card-${card.label.toLowerCase().replace(/ /g, "-")}`}
            className="bg-white border border-slate-200 rounded-lg p-5 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            <div className="text-sm text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

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
            <button onClick={() => navigate("/colleges")} className="text-sm text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
              Browse all <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {tracked.length === 0 ? (
            <div className="p-8 text-center">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No colleges tracked yet.</p>
              <button onClick={() => navigate("/colleges")} className="mt-3 text-orange-500 font-semibold text-sm hover:text-orange-600">
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
                    className="flex items-center gap-4 p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/colleges/${t.college_id}`)}
                  >
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
            <button onClick={() => navigate("/communications")} className="text-sm text-orange-500 font-semibold hover:text-orange-600 flex items-center gap-1">
              All <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {(!stats?.recent_emails || stats.recent_emails.length === 0) ? (
            <div className="p-6 text-center">
              <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No emails logged yet.</p>
              <button onClick={() => navigate("/compose")} className="mt-2 text-orange-500 font-semibold text-sm hover:text-orange-600">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: "AI Message Composer", desc: "Draft personalised emails to coaches with AI", action: () => navigate("/compose"), icon: "✍️", color: "border-orange-200 hover:border-orange-400" },
          { title: "Response Tracker", desc: "Log coach replies and get AI follow-up advice", action: () => navigate("/responses"), icon: "📬", color: "border-green-200 hover:border-green-400" },
          { title: "Strategy Advisor", desc: "Get AI-powered recruitment strategy tips", action: () => navigate("/strategy"), icon: "🎯", color: "border-blue-200 hover:border-blue-400" },
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
