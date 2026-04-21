import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users, Mail, BookMarked, TrendingUp, RefreshCw, LogOut,
  Star, CircleDot, ArrowUpRight, ChevronUp, ChevronDown, ShieldCheck,
  Flag, Clock, CheckCircle2, AlertTriangle, XCircle, ChevronRight, Settings, Globe, Trash2,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const adminReq = async (method, path, data) => {
  const token = localStorage.getItem("cb_admin_token");
  return axios({
    method,
    url: `${API}/api${path}`,
    data,
    headers: { Authorization: `Bearer ${token}` },
  });
};

const TIER_CONFIG = {
  free:  { label: "Free",  bg: "bg-slate-100 text-slate-600",    dot: "bg-slate-400",  bar: "#94a3b8" },
  pro:   { label: "Pro",   bg: "bg-orange-100 text-orange-700",  dot: "bg-orange-500", bar: "#f97316" },
  elite: { label: "Elite", bg: "bg-purple-100 text-purple-700",  dot: "bg-purple-500", bar: "#a855f7" },
};

function StatCard({ icon: Icon, label, value, sub, color = "text-orange-500" }) {
  return (
    <div data-testid={`stat-card-${label.replace(/\s+/g, "-").toLowerCase()}`}
      className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-3xl font-black text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{value ?? "—"}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.free;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function TierSelect({ userId, current, onChange }) {
  const [saving, setSaving] = useState(false);
  const handle = async (e) => {
    setSaving(true);
    try {
      await adminReq("patch", `/admin/users/${userId}/subscription`, { subscription_tier: e.target.value });
      onChange(userId, e.target.value);
    } catch {}
    setSaving(false);
  };
  return (
    <select
      data-testid={`tier-select-${userId}`}
      value={current}
      onChange={handle}
      disabled={saving}
      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-semibold focus:ring-2 focus:ring-orange-500 outline-none disabled:opacity-60 cursor-pointer"
    >
      <option value="free">Free</option>
      <option value="pro">Pro</option>
      <option value="elite">Elite</option>
    </select>
  );
}

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
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : fmtDate(iso);
};

export default function AdminPage() {
  const navigate  = useNavigate();
  const [stats, setStats]     = useState(null);
  const [users, setUsers]     = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [sort, setSort]       = useState({ key: "created_at", dir: "desc" });
  const [search, setSearch]   = useState("");
  const [refreshedAt, setRefreshedAt] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: "fixed", message: "" });
  const [appSettings, setAppSettings] = useState({ show_european: true });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // {user_id, name, email}
  const [deleting, setDeleting] = useState(false);
  const [fixingEmail, setFixingEmail] = useState(null); // report id
  const [emailFixValue, setEmailFixValue] = useState("");
  const [emailFixSaving, setEmailFixSaving] = useState(false);
  const [emailFixDone, setEmailFixDone] = useState(null); // report id
  const adminEmail = localStorage.getItem("cb_admin_email") || "Admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, uRes, rRes, setRes] = await Promise.all([
        adminReq("get", "/admin/stats"),
        adminReq("get", "/admin/users"),
        adminReq("get", "/admin/reports"),
        adminReq("get", "/admin/settings"),
      ]);
      setStats(sRes.data);
      setUsers(uRes.data);
      setReports(rRes.data);
      setAppSettings(setRes.data);
      setRefreshedAt(new Date());
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.removeItem("cb_admin_token");
        navigate("/admin/login", { replace: true });
      }
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("cb_admin_token")) {
      navigate("/admin/login", { replace: true });
      return;
    }
    load();
  }, [load, navigate]);

  const logout = async () => {
    try { await adminReq("post", "/admin/logout"); } catch {}
    localStorage.removeItem("cb_admin_token");
    localStorage.removeItem("cb_admin_email");
    navigate("/admin/login", { replace: true });
  };

  const updateTier = (userId, tier) =>
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, subscription_tier: tier } : u));

  const saveSettings = async (newVal) => {
    setSavingSettings(true);
    try {
      await adminReq("patch", "/admin/settings", { show_european: newVal });
      setAppSettings(prev => ({ ...prev, show_european: newVal }));
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch {}
    setSavingSettings(false);
  };

  const deleteUser = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await adminReq("delete", `/admin/users/${confirmDelete.user_id}`);
      setUsers(prev => prev.filter(u => u.user_id !== confirmDelete.user_id));
      setConfirmDelete(null);
    } catch {}
    setDeleting(false);
  };

  const applyEmailFix = async (r) => {
    if (!emailFixValue.trim()) return;
    setEmailFixSaving(true);
    try {
      await adminReq("patch", `/admin/colleges/${r.college_id}/coach-email`, {
        coach_name: r.coach_name,
        new_email: emailFixValue.trim(),
      });
      // also auto-mark the report as fixed
      await adminReq("patch", `/admin/reports/${r.id}`, {
        status: "fixed",
        admin_response: `Email updated to ${emailFixValue.trim()}`,
      });
      setReports(prev => prev.map(rep => rep.id === r.id
        ? { ...rep, status: "fixed", admin_response: `Email updated to ${emailFixValue.trim()}` }
        : rep
      ));
      setEmailFixDone(r.id);
      setFixingEmail(null);
      setEmailFixValue("");
    } catch {}
    setEmailFixSaving(false);
  };

  const toggleSort = (key) =>
    setSort(s => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" });

  const SortIcon = ({ k }) => {
    if (sort.key !== k) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sort.dir === "asc" ? <ChevronUp className="w-3 h-3 text-orange-500" /> : <ChevronDown className="w-3 h-3 text-orange-500" />;
  };

  const filteredUsers = users
    .filter(u => {
      const q = search.toLowerCase();
      return !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sort.key] ?? ""; const bv = b[sort.key] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });

  const subData = stats
    ? Object.entries(stats.subscriptions).map(([name, value]) => ({
        name: TIER_CONFIG[name]?.label || name, value,
        color: TIER_CONFIG[name]?.bar || "#94a3b8",
      }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }} className="min-h-screen bg-slate-50 p-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Admin Dashboard</span>
          </div>
          <h1 className="text-4xl font-black uppercase text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            CourtBound
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Signed in as <span className="font-semibold text-slate-600">{adminEmail}</span>
            {refreshedAt && <> · Updated {relTime(refreshedAt.toISOString())}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <button data-testid="admin-refresh-btn" onClick={load}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button data-testid="admin-logout-btn" onClick={logout}
            className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold text-sm px-4 py-2.5 rounded-xl transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {[
          { id: "overview",  label: "Overview" },
          { id: "users",     label: `Users (${users.length})` },
          { id: "reports",   label: `Reports${reports.filter(r => r.status === "pending").length > 0 ? ` (${reports.filter(r => r.status === "pending").length})` : ""}` },
          { id: "settings",  label: "Settings" },
        ].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === t.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      {activeTab === "overview" && (<>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users}      label="Total Users"      value={stats?.users?.total}       sub={`+${stats?.users?.new_7d ?? 0} this week`} />
        <StatCard icon={TrendingUp} label="Active (7 days)"  value={stats?.users?.active_7d}   sub={`${stats?.users?.active_30d ?? 0} active last 30d`} color="text-blue-500" />
        <StatCard icon={Mail}       label="Emails Sent"      value={stats?.emails?.total_sent} sub={`+${stats?.emails?.sent_7d ?? 0} this week`} color="text-green-500" />
        <StatCard icon={BookMarked} label="Colleges Tracked" value={stats?.colleges_tracked}   sub="across all users" color="text-purple-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Signup Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">New Signups — Last 30 Days</p>
          {stats?.signup_trend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={stats.signup_trend} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={d => d.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#f97316" }} />
                <Line type="monotone" dataKey="signups" stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-44 flex items-center justify-center text-slate-400 text-sm">No signup data for the last 30 days</div>
          )}
        </div>

        {/* Subscription Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Subscription Breakdown</p>
          <div className="space-y-4 mt-2">
            {subData.length > 0 ? subData.map(d => {
              const total = subData.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <div key={d.name}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-bold text-slate-700">{d.name}</span>
                    <span className="text-sm font-black text-slate-900">{d.value} <span className="text-xs text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                  </div>
                </div>
              );
            }) : <p className="text-slate-400 text-sm text-center pt-8">No data yet</p>}
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Total Users</span>
            <span className="text-xl font-black text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{stats?.users?.total ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Email Activity */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Emails Sent — Last 14 Days</p>
        {stats?.email_trend?.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={stats.email_trend} margin={{ top: 2, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={d => d.slice(5)} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "none", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "#94a3b8" }} itemStyle={{ color: "#22c55e" }} />
              <Bar dataKey="emails" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">No email activity yet</div>
        )}
      </div>

      {/* Two-col: Top Colleges + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Top 10 Most Tracked Colleges</p>
          {stats?.top_colleges?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.top_colleges.map((c, i) => {
                const pct = Math.round((c.count / stats.top_colleges[0].count) * 100);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-300 w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-semibold text-slate-700 truncate">{c.name}</span>
                        <span className="text-xs font-black text-slate-900 ml-2 flex-shrink-0">{c.count}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-sm text-center pt-6">No tracking data yet</p>
          )}
        </div>

        <div className="space-y-3">
          {[
            { icon: ArrowUpRight, label: "New users this month",  value: stats?.users?.new_30d ?? 0,   note: "last 30 days",          color: "text-orange-500" },
            { icon: Mail,         label: "Replies received",      value: stats?.emails?.total_received ?? 0, note: "from coaches",   color: "text-blue-500" },
            { icon: CircleDot,    label: "Active users (30d)",    value: stats?.users?.active_30d ?? 0, note: "logged in last 30 days", color: "text-green-500" },
            { icon: Star,         label: "Avg emails per user",   value: stats?.users?.total ? Math.round((stats.emails.total_sent / stats.users.total) * 10) / 10 : 0, note: "all-time average", color: "text-purple-500" },
          ].map(({ icon: Icon, label, value, note, color }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <p className="text-sm font-bold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{note}</p>
                </div>
              </div>
              <span className="text-2xl font-black text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            All Users <span className="text-slate-900 font-black ml-1">{filteredUsers.length}</span>
          </p>
          <input
            data-testid="admin-user-search"
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none w-60"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  { key: "name", label: "User" },
                  { key: "subscription_tier", label: "Tier" },
                  { key: "created_at", label: "Joined" },
                  { key: "last_active", label: "Last Active" },
                  { key: "emails_sent", label: "Emails" },
                  { key: "colleges_tracked", label: "Tracked" },
                  { key: null, label: "Change Tier" },
                  { key: null, label: "" },
                ].map(col => (
                  <th key={col.label}
                    onClick={() => col.key && toggleSort(col.key)}
                    className={`text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap select-none ${col.key ? "cursor-pointer hover:text-slate-600" : ""}`}
                  >
                    <span className="flex items-center gap-1">{col.label}{col.key && <SortIcon k={col.key} />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">
                  {search ? "No users match your search" : "No users yet"}
                </td></tr>
              ) : filteredUsers.map((u, idx) => (
                <tr key={u.user_id || u.email || idx} data-testid={`user-row-${u.user_id}`} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {u.picture
                        ? <img src={u.picture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-black flex-shrink-0">
                            {(u.name || u.email || "?")[0].toUpperCase()}
                          </div>
                      }
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate max-w-[160px]">{u.name || "—"}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><TierBadge tier={u.subscription_tier} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{relTime(u.last_active)}</td>
                  <td className="px-4 py-3"><span className="font-bold text-slate-800">{u.emails_sent}</span><span className="text-xs text-slate-400 ml-1">sent</span></td>
                  <td className="px-4 py-3"><span className="font-bold text-slate-800">{u.colleges_tracked}</span><span className="text-xs text-slate-400 ml-1">colleges</span></td>
                  <td className="px-4 py-3"><TierSelect userId={u.user_id} current={u.subscription_tier} onChange={updateTier} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        data-testid={`view-user-btn-${u.user_id}`}
                        onClick={() => navigate(`/admin/users/${u.user_id}`)}
                        className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-bold transition-colors"
                      >
                        View <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        data-testid={`delete-user-btn-${u.user_id}`}
                        onClick={() => setConfirmDelete({ user_id: u.user_id, name: u.name, email: u.email })}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>)}

      {/* ── USERS TAB ──────────────────────────────────────────── */}
      {activeTab === "users" && (
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            All Users <span className="text-slate-900 font-black ml-1">{filteredUsers.length}</span>
          </p>
          <input data-testid="admin-user-search" type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..." className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none w-60" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[
                  { key: "name", label: "User" }, { key: "subscription_tier", label: "Tier" },
                  { key: "created_at", label: "Joined" }, { key: "last_active", label: "Last Active" },
                  { key: "emails_sent", label: "Emails" }, { key: "colleges_tracked", label: "Tracked" },
                  { key: null, label: "Change Tier" }, { key: null, label: "" },
                ].map(col => (
                  <th key={col.label} onClick={() => col.key && toggleSort(col.key)}
                    className={`text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap select-none ${col.key ? "cursor-pointer hover:text-slate-600" : ""}`}>
                    <span className="flex items-center gap-1">{col.label}{col.key && <SortIcon k={col.key} />}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.length === 0
                ? <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">{search ? "No users match" : "No users yet"}</td></tr>
                : filteredUsers.map((u, idx) => (
                  <tr key={u.user_id || u.email || idx} data-testid={`user-row-${u.user_id}`} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.picture ? <img src={u.picture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                          : <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-black flex-shrink-0">{(u.name || u.email || "?")[0].toUpperCase()}</div>}
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 truncate max-w-[160px]">{u.name || "—"}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><TierBadge tier={u.subscription_tier} /></td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{relTime(u.last_active)}</td>
                    <td className="px-4 py-3"><span className="font-bold text-slate-800">{u.emails_sent}</span><span className="text-xs text-slate-400 ml-1">sent</span></td>
                    <td className="px-4 py-3"><span className="font-bold text-slate-800">{u.colleges_tracked}</span><span className="text-xs text-slate-400 ml-1">colleges</span></td>
                    <td className="px-4 py-3"><TierSelect userId={u.user_id} current={u.subscription_tier} onChange={updateTier} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button data-testid={`view-user-btn-${u.user_id}`} onClick={() => navigate(`/admin/users/${u.user_id}`)}
                          className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-800 font-bold transition-colors">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          data-testid={`delete-user-btn-${u.user_id}`}
                          onClick={() => setConfirmDelete({ user_id: u.user_id, name: u.name, email: u.email })}
                          className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* ── REPORTS TAB ───────────────────────────────────────── */}
      {activeTab === "reports" && (() => {
        const REPORT_STATUS = {
          pending:      { label: "Pending",      color: "bg-yellow-100 text-yellow-700", icon: Clock },
          investigating:{ label: "Investigating", color: "bg-blue-100 text-blue-700",    icon: AlertTriangle },
          fixed:        { label: "Fixed",        color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
          invalid:      { label: "Not Valid",    color: "bg-slate-100 text-slate-600",   icon: XCircle },
        };
        const submitResolve = async (reportId) => {
          try {
            await adminReq("patch", `/admin/reports/${reportId}`, {
              status: resolveForm.status,
              admin_response: resolveForm.message,
            });
            setReports(prev => prev.map(r => r.id === reportId
              ? { ...r, status: resolveForm.status, admin_response: resolveForm.message }
              : r
            ));
            setResolvingId(null);
            setResolveForm({ status: "fixed", message: "" });
          } catch {}
        };

        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {reports.length} total · {reports.filter(r => r.status === "pending").length} pending
              </p>
            </div>
            {reports.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl py-14 text-center text-slate-400">
                <Flag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reports submitted yet</p>
              </div>
            ) : reports.map(r => {
              const sCfg = REPORT_STATUS[r.status] || REPORT_STATUS.pending;
              const SIcon = sCfg.icon;
              return (
                <div key={r.id} data-testid={`report-card-${r.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex items-start justify-between gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${sCfg.color}`}>
                          <SIcon className="w-3 h-3" /> {sCfg.label}
                        </span>
                        <span className="text-xs text-slate-400">{fmtDate(r.created_at)}</span>
                      </div>
                      <p className="font-bold text-slate-800">{r.college_name} {r.coach_name ? `— ${r.coach_name}` : ""}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold">{r.user_name}</span> ({r.user_email}) · Issue: <span className="font-semibold">{r.issue_type}</span>
                      </p>
                      {r.correct_info && <p className="text-xs text-slate-600 mt-1.5 bg-slate-50 rounded px-2 py-1.5"><span className="font-semibold">Suggested info:</span> {r.correct_info}</p>}
                      {r.notes && <p className="text-xs text-slate-500 mt-1 italic">"{r.notes}"</p>}
                      {r.admin_response && (
                        <div className="mt-2 bg-green-50 border border-green-200 rounded px-3 py-2 text-xs text-green-800">
                          <span className="font-bold">Admin response sent:</span> {r.admin_response}
                        </div>
                      )}
                    </div>
                    {r.status === "pending" || r.status === "investigating" ? (
                      <div className="flex gap-2 flex-shrink-0">
                        {(r.issue_type?.toLowerCase().includes("email") || r.correct_info?.includes("@")) && (
                          <button
                            data-testid={`fix-email-btn-${r.id}`}
                            onClick={() => { setFixingEmail(r.id); setEmailFixValue(r.correct_info || ""); setResolvingId(null); }}
                            className="flex-shrink-0 text-xs bg-green-600 text-white font-bold px-3 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-1"
                          >
                            Fix Email
                          </button>
                        )}
                        <button
                          data-testid={`resolve-btn-${r.id}`}
                          onClick={() => { setResolvingId(r.id); setResolveForm({ status: "fixed", message: "" }); setFixingEmail(null); }}
                          className="flex-shrink-0 text-xs bg-slate-900 text-white font-bold px-3 py-2 rounded-lg hover:bg-slate-700 transition-all"
                        >
                          Respond
                        </button>
                      </div>
                    ) : emailFixDone === r.id ? (
                      <span className="text-xs text-green-600 font-bold">Email Fixed</span>
                    ) : null}
                  </div>

                  {/* Inline fix-email form */}
                  {fixingEmail === r.id && (
                    <div className="border-t border-green-100 p-5 bg-green-50 space-y-3">
                      <p className="text-xs font-bold text-green-800 uppercase tracking-wide">
                        Update coach email — {r.coach_name || r.college_name}
                      </p>
                      <div className="flex gap-2">
                        <input
                          data-testid={`fix-email-input-${r.id}`}
                          type="email"
                          value={emailFixValue}
                          onChange={e => setEmailFixValue(e.target.value)}
                          placeholder="Enter correct email address..."
                          className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none bg-white"
                        />
                        <button
                          data-testid={`confirm-fix-email-${r.id}`}
                          onClick={() => applyEmailFix(r)}
                          disabled={emailFixSaving || !emailFixValue.trim()}
                          className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-green-700 transition-all disabled:opacity-60"
                        >
                          {emailFixSaving ? "Saving..." : "Apply Fix"}
                        </button>
                        <button onClick={() => setFixingEmail(null)}
                          className="text-slate-500 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-100 transition-all">
                          Cancel
                        </button>
                      </div>
                      <p className="text-xs text-green-700">This updates the email in the database immediately and marks the report as fixed.</p>
                    </div>
                  )}

                  {/* Inline response form */}
                  {resolvingId === r.id && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        {["investigating", "fixed", "invalid"].map(s => (
                          <button key={s} onClick={() => setResolveForm(f => ({ ...f, status: s }))}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all capitalize ${resolveForm.status === s ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                      <textarea
                        data-testid={`report-message-${r.id}`}
                        value={resolveForm.message}
                        onChange={e => setResolveForm(f => ({ ...f, message: e.target.value }))}
                        rows={3}
                        placeholder="Message to user (optional — will appear as in-app notification if filled in)"
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none bg-white"
                      />
                      <div className="flex gap-2">
                        <button data-testid={`submit-resolve-${r.id}`} onClick={() => submitResolve(r.id)}
                          className="bg-orange-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-orange-600 transition-all">
                          Send & Update
                        </button>
                        <button onClick={() => setResolvingId(null)}
                          className="text-slate-500 font-bold text-xs px-4 py-2 rounded-lg hover:bg-slate-100 transition-all">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ── SETTINGS TAB ─────────────────────────────────────── */}
      {activeTab === "settings" && (
        <div className="max-w-xl">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600">App Settings</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-5" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
              Feature Flags
            </h2>

            {/* European Colleges Toggle */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">European Colleges</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Show or hide the 43 European basketball programme listings for all users.
                    Toggle off to keep the trial focused on US colleges only. All data is preserved — toggle back on to reinstate them instantly.
                  </p>
                  {!appSettings.show_european && (
                    <p className="text-xs font-semibold text-amber-600 mt-2">
                      Currently hidden from all users
                    </p>
                  )}
                </div>
              </div>
              <button
                data-testid="toggle-european-btn"
                onClick={() => saveSettings(!appSettings.show_european)}
                disabled={savingSettings}
                className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
                  appSettings.show_european ? "bg-green-500" : "bg-slate-300"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  appSettings.show_european ? "translate-x-6" : "translate-x-0"
                }`} />
              </button>
            </div>

            {settingsSaved && (
              <div data-testid="settings-saved-banner" className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold px-4 py-3 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
                Settings saved — changes are live for all users immediately.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                  Delete User Account
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-sm font-bold text-red-800">{confirmDelete.name || "Unknown"}</p>
              <p className="text-xs text-red-600">{confirmDelete.email}</p>
              <p className="text-xs text-red-600 mt-2">
                All their data will be permanently deleted — tracked colleges, sent emails, profile, goals, and templates.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                data-testid="confirm-delete-user-btn"
                onClick={deleteUser}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl py-3 transition-colors disabled:opacity-60"
              >
                {deleting ? "Deleting..." : "Yes, Delete Account"}
              </button>
              <button
                data-testid="cancel-delete-user-btn"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider rounded-xl py-3 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
