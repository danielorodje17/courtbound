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
  Download, Upload,
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
  // Colleges contacts tab
  const [contacts, setContacts] = useState([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const [contactFilter, setContactFilter] = useState("all");
  const [inlineEdit, setInlineEdit] = useState(null);
  const [inlineValue, setInlineValue] = useState("");
  const [inlineNameValue, setInlineNameValue] = useState("");
  const [inlineLvValue, setInlineLvValue] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineDone, setInlineDone] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  // College edit modal
  const [editCollege, setEditCollege] = useState(null); // full college object
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  // Bulk college import
  const [bulkImportResult, setBulkImportResult] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false); // {`${college_id}-${coach_name}`: true}
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

  const exportContacts = async (filterType) => {
    const token = localStorage.getItem("cb_admin_token");
    const API = process.env.REACT_APP_BACKEND_URL;
    const res = await fetch(`${API}/api/admin/colleges-contacts/export?filter=${filterType}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courtbound_contacts_${filterType}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("cb_admin_token");
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/admin/colleges-contacts/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setImportResult(data);
      if (data.updated > 0) {
        // Refresh the contacts list
        setContactsLoaded(false);
        await loadContacts();
      }
    } catch {
      setImportResult({ ok: false, error: "Upload failed. Check file format." });
    }
    setImporting(false);
    e.target.value = "";
  };

  const [confirmDeleteCoach, setConfirmDeleteCoach] = useState(null);
  const [deletingCoach, setDeletingCoach] = useState(false);

  const deleteCoach = async () => {
    if (!confirmDeleteCoach) return;
    setDeletingCoach(true);
    try {
      await adminReq("delete", `/admin/colleges/${confirmDeleteCoach.college_id}/coaches`, {
        coach_name: confirmDeleteCoach.coach_name,
      });
      setContacts(prev => prev.filter(c =>
        !(c.college_id === confirmDeleteCoach.college_id && c.coach_name === confirmDeleteCoach.coach_name)
      ));
      setConfirmDeleteCoach(null);
    } catch {}
    setDeletingCoach(false);
  };

  const openEditCollege = async (college_id) => {
    try {
      // fetch full college from public API
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/colleges/${college_id}`);
      const data = await res.json();
      setEditCollege(data);
      setEditForm({
        name: data.name || "",
        location: data.location || "",
        state: data.state || "",
        division: data.division || "",
        conference: data.conference || "",
        region: data.region || "USA",
        foreign_friendly: data.foreign_friendly ? "yes" : "no",
        scholarship_info: data.scholarship_info || "",
        acceptance_rate: data.acceptance_rate || "",
        notable_alumni: data.notable_alumni || "",
        ranking: data.ranking ?? "",
        website: data.website || "",
        image_url: data.image_url || "",
        coaches: JSON.parse(JSON.stringify(data.coaches || [])),
      });
    } catch {}
  };

  const saveEditCollege = async () => {
    if (!editCollege) return;
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        foreign_friendly: editForm.foreign_friendly === "yes",
        ranking: editForm.ranking !== "" ? Number(editForm.ranking) : null,
      };
      await adminReq("patch", `/admin/colleges/${editCollege.id}/details`, payload);
      // Refresh contacts list
      setContactsLoaded(false);
      await loadContacts();
      setEditSaved(true);
      setTimeout(() => { setEditSaved(false); setEditCollege(null); }, 1500);
    } catch {}
    setEditSaving(false);
  };

  const handleBulkCollegeImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkImporting(true);
    setBulkImportResult(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("cb_admin_token");
      const API = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${API}/api/admin/colleges/bulk-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setBulkImportResult(data);
      if (data.created > 0 || data.updated > 0) {
        setContactsLoaded(false);
        await loadContacts();
      }
    } catch {
      setBulkImportResult({ ok: false, error: "Upload failed. Check file format." });
    }
    setBulkImporting(false);
    e.target.value = "";
  };

  const exportBulkColleges = async () => {
    const token = localStorage.getItem("cb_admin_token");
    const API = process.env.REACT_APP_BACKEND_URL;
    const res = await fetch(`${API}/api/admin/colleges/bulk-export`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `courtbound_colleges_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadContacts = async () => {
    if (contactsLoaded) return;
    try {
      const res = await adminReq("get", "/admin/colleges-contacts");
      setContacts(res.data);
      setContactsLoaded(true);
    } catch {}
  };

  const saveInlineEmail = async () => {
    if (!inlineEdit) return;
    if (!inlineValue.trim() && !inlineNameValue.trim() && !inlineLvValue.trim()) return;
    setInlineSaving(true);
    try {
      await adminReq("patch", `/admin/colleges/${inlineEdit.college_id}/coach-email`, {
        coach_name:     inlineEdit.coach_name,
        new_coach_name: inlineNameValue.trim() || undefined,
        new_email:      inlineValue.trim() || undefined,
        last_verified:  inlineLvValue.trim() || undefined,
      });
      const key = `${inlineEdit.college_id}-${inlineEdit.coach_name}`;
      const finalName  = inlineNameValue.trim() || inlineEdit.coach_name;
      const finalEmail = inlineValue.trim() || inlineEdit.current_email;
      const finalLv    = inlineLvValue.trim() || inlineEdit.last_verified || "";
      setContacts(prev => prev.map(c =>
        c.college_id === inlineEdit.college_id && c.coach_name === inlineEdit.coach_name
          ? { ...c, coach_name: finalName, email: finalEmail, last_verified: finalLv, suspicious: false }
          : c
      ));
      setInlineDone(prev => ({ ...prev, [key]: true }));
      setInlineEdit(null);
      setInlineValue("");
      setInlineNameValue("");
      setInlineLvValue("");
    } catch {}
    setInlineSaving(false);
  };

  const applyEmailFix = async (r) => {    if (!emailFixValue.trim()) return;
    setEmailFixSaving(true);
    try {
      await adminReq("patch", `/admin/colleges/${r.college_id}/coach-email`, {
        coach_name: r.coach_name,
        new_email: emailFixValue.trim(),
      });
      // also auto-mark the report as fixed
      await adminReq("patch", `/admin/reports/${r.id}`, {
        status: "fixed",
        admin_response: `Email updated to ${emailFixValue.trim()}. Bounced emails removed from user history.`,
      });
      setReports(prev => prev.map(rep => rep.id === r.id
        ? { ...rep, status: "fixed", admin_response: `Email updated to ${emailFixValue.trim()}. Bounced emails removed from user history.` }
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
          { id: "colleges",  label: "Colleges" },
          { id: "settings",  label: "Settings" },
        ].map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === "colleges") loadContacts(); }}
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

      {/* ── COLLEGES TAB ─────────────────────────────────────── */}
      {activeTab === "colleges" && (() => {
        const suspiciousPatterns = ["athletics@","info@","admin@","basketball@","sports@","recruiting@","coaches@","contact@"];
        const isSuspicious = (email) => !email || suspiciousPatterns.some(p => email.toLowerCase().startsWith(p));

        const filtered = contacts.filter(c => {
          const matchSearch = !contactSearch || c.college_name.toLowerCase().includes(contactSearch.toLowerCase()) || c.coach_name.toLowerCase().includes(contactSearch.toLowerCase()) || c.email.toLowerCase().includes(contactSearch.toLowerCase());
          const matchFilter = contactFilter === "all" || (contactFilter === "suspicious" && isSuspicious(c.email)) || (contactFilter === "ok" && !isSuspicious(c.email));
          return matchSearch && matchFilter;
        });

        const suspiciousCount = contacts.filter(c => isSuspicious(c.email)).length;

        return (
          <div>
            {/* Bulk College Import/Export */}
            <div className="flex items-center gap-2 mb-5 flex-wrap p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide mr-2">Colleges:</span>
              <button data-testid="export-colleges-btn" onClick={exportBulkColleges}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-all">
                <Download className="w-3.5 h-3.5" /> Export All Colleges
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {bulkImporting ? "Importing..." : "Import / Add Colleges"}
                <input type="file" accept=".csv" className="hidden" onChange={handleBulkCollegeImport} disabled={bulkImporting} />
              </label>
              <span className="text-xs text-slate-400">Empty college_id = add new college. Existing id = update.</span>
            </div>

            {bulkImportResult && (
              <div data-testid="bulk-import-result" className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border flex flex-wrap items-center gap-4 ${bulkImportResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                {bulkImportResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span><strong>{bulkImportResult.created}</strong> added, <strong>{bulkImportResult.updated}</strong> updated, <strong>{bulkImportResult.skipped}</strong> skipped</span>
                    {bulkImportResult.errors?.length > 0 && <span className="text-xs text-amber-700">{bulkImportResult.errors[0]}</span>}
                  </>
                ) : <span>{bulkImportResult.error}</span>}
                <button onClick={() => setBulkImportResult(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
              </div>
            )}

            {/* Stats bar */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-black text-slate-900">{contacts.length}</span>
                <span className="text-slate-500 ml-1">total coaches</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-black text-amber-700">{suspiciousCount}</span>
                <span className="text-amber-600 ml-1">suspicious emails</span>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
                <span className="font-black text-green-700">{contacts.length - suspiciousCount}</span>
                <span className="text-green-600 ml-1">verified-looking</span>
              </div>
            </div>

            {/* Export / Import toolbar */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <button
                data-testid="export-suspicious-btn"
                onClick={() => exportContacts("suspicious")}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Export Suspicious ({suspiciousCount})
              </button>
              <button
                data-testid="export-all-btn"
                onClick={() => exportContacts("all")}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-900 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Export All
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                {importing ? "Importing..." : "Import CSV"}
                <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
              </label>
              <span className="text-xs text-slate-400">Edit the exported CSV, then import to bulk-update</span>
            </div>

            {/* Import result banner */}
            {importResult && (
              <div data-testid="import-result" className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold border flex flex-wrap items-center gap-4 ${importResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                {importResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>Import complete — <strong>{importResult.updated}</strong> updated, <strong>{importResult.skipped}</strong> skipped, <strong>{importResult.emails_deleted}</strong> bounced email{importResult.emails_deleted !== 1 ? "s" : ""} deleted</span>
                    {importResult.errors?.length > 0 && (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        {importResult.errors.length} row error(s): {importResult.errors[0]}
                      </span>
                    )}
                  </>
                ) : (
                  <span>{importResult.error || "Import failed"}</span>
                )}
                <button onClick={() => setImportResult(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-xs">Dismiss</button>
              </div>
            )}

            {/* Filters */}
            <div className="flex gap-2 mb-4 flex-wrap items-center">
              <input
                data-testid="contact-search"
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                placeholder="Search college, coach or email..."
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 focus:ring-2 focus:ring-orange-400 outline-none bg-white"
              />
              {["all","suspicious","ok"].map(f => (
                <button key={f} onClick={() => setContactFilter(f)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${contactFilter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-800"}`}>
                  {f === "suspicious" ? `Suspicious (${suspiciousCount})` : f === "ok" ? "OK" : "All"}
                </button>
              ))}
              <span className="text-xs text-slate-400 ml-2">Showing {filtered.length} records</span>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">College</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Division</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Coach</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Last Verified</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((c, i) => {
                      const key = `${c.college_id}-${c.coach_name}`;
                      const suspicious = isSuspicious(c.email);
                      const done = inlineDone[key];
                      const isEditing = inlineEdit?.college_id === c.college_id && inlineEdit?.coach_name === c.coach_name;
                      return (
                        <tr key={i} className={suspicious && !done ? "bg-amber-50" : ""}>
                          <td className="px-4 py-3 font-semibold text-slate-800 text-xs max-w-[180px] truncate">{c.college_name}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{c.division}</td>
                          <td className="px-4 py-3 text-xs text-slate-700">{c.coach_name}<br/><span className="text-slate-400">{c.coach_title}</span></td>
                          <td className="px-4 py-3">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <input
                                  data-testid={`inline-name-input-${i}`}
                                  type="text"
                                  value={inlineNameValue}
                                  onChange={e => setInlineNameValue(e.target.value)}
                                  placeholder="Coach name..."
                                  className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-52 focus:ring-2 focus:ring-orange-400 outline-none"
                                />
                                <div className="flex items-center gap-2">
                                  <input
                                    data-testid={`inline-email-input-${i}`}
                                    type="email"
                                    value={inlineValue}
                                    onChange={e => setInlineValue(e.target.value)}
                                    placeholder="Email address..."
                                    className="border border-orange-300 rounded-lg px-2 py-1 text-xs w-52 focus:ring-2 focus:ring-orange-400 outline-none"
                                    autoFocus
                                    onKeyDown={e => e.key === "Enter" && saveInlineEmail()}
                                  />
                                  <button onClick={saveInlineEmail} disabled={inlineSaving}
                                    className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded hover:bg-green-700 disabled:opacity-60">
                                    {inlineSaving ? "..." : "Save"}
                                  </button>
                                  <button onClick={() => { setInlineEdit(null); setInlineNameValue(""); setInlineValue(""); setInlineLvValue(""); }}
                                    className="text-slate-400 text-xs hover:text-slate-600">✕</button>
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs text-slate-500 font-semibold w-24 flex-shrink-0">Last Verified:</label>
                                  <input
                                    data-testid={`inline-lv-input-${i}`}
                                    type="date"
                                    value={inlineLvValue}
                                    onChange={e => setInlineLvValue(e.target.value)}
                                    className="border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-orange-400 outline-none"
                                  />
                                  <button onClick={() => setInlineLvValue(new Date().toISOString().slice(0,10))}
                                    className="text-xs text-green-600 font-semibold hover:text-green-800">Today</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                {suspicious && !done ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-semibold">
                                    <AlertTriangle className="w-3 h-3" /> {c.email || "No email"}
                                  </span>
                                ) : (
                                  <span className={`text-xs font-mono ${done ? "text-green-600 font-semibold" : "text-slate-600"}`}>
                                    {done ? "✓ " : ""}{c.email || "—"}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const lv = c.last_verified;
                              if (!lv) return <span className="text-xs text-red-500 font-semibold">Never</span>;
                              const days = Math.floor((Date.now() - new Date(lv)) / 86400000);
                              const color = days > 180 ? "text-amber-600" : "text-green-600";
                              return <span className={`text-xs font-semibold ${color}`}>{lv}<br/><span className="text-slate-400 font-normal">{days}d ago</span></span>;
                            })()}
                          </td>
                          <td className="px-4 py-3">
                            {!isEditing && (
                              <div className="flex items-center gap-2">
                                <button
                                  data-testid={`edit-contact-${i}`}
                                  onClick={() => { setInlineEdit({ college_id: c.college_id, coach_name: c.coach_name, current_email: c.email, last_verified: c.last_verified }); setInlineNameValue(c.coach_name); setInlineValue(c.email); setInlineLvValue(c.last_verified || ""); }}
                                  className="text-xs text-orange-600 hover:text-orange-800 font-bold transition-colors"
                                >
                                  Edit Coach
                                </button>
                                <span className="text-slate-200">|</span>
                                <button
                                  data-testid={`edit-college-${i}`}
                                  onClick={() => openEditCollege(c.college_id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors"
                                >
                                  Edit College
                                </button>
                                <span className="text-slate-200">|</span>
                                <button
                                  data-testid={`delete-coach-${i}`}
                                  onClick={() => setConfirmDeleteCoach({ college_id: c.college_id, coach_name: c.coach_name, college_name: c.college_name })}
                                  className="text-xs text-red-400 hover:text-red-600 font-bold transition-colors"
                                  title="Delete coach"
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
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

      {/* ── EDIT COLLEGE MODAL ───────────────────────────────── */}
      {editCollege && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-black text-slate-900 text-lg uppercase" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
                Edit College
              </h3>
              <button onClick={() => setEditCollege(null)} className="text-slate-400 hover:text-slate-700"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Basic fields */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: "name", label: "College Name", full: true },
                  { key: "location", label: "Location (City, State)" },
                  { key: "state", label: "State" },
                  { key: "division", label: "Division" },
                  { key: "conference", label: "Conference" },
                  { key: "region", label: "Region (USA / Europe)" },
                  { key: "acceptance_rate", label: "Acceptance Rate" },
                  { key: "ranking", label: "Ranking #" },
                  { key: "website", label: "Website URL" },
                  { key: "image_url", label: "Image URL" },
                ].map(f => (
                  <div key={f.key} className={f.full ? "col-span-2" : ""}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">{f.label}</label>
                    <input type="text" value={editForm[f.key] ?? ""} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Notable Alumni</label>
                  <input type="text" value={editForm.notable_alumni ?? ""} onChange={e => setEditForm(p => ({ ...p, notable_alumni: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Scholarship Info</label>
                  <textarea rows={2} value={editForm.scholarship_info ?? ""} onChange={e => setEditForm(p => ({ ...p, scholarship_info: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">UK Friendly</label>
                  <select value={editForm.foreign_friendly} onChange={e => setEditForm(p => ({ ...p, foreign_friendly: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white">
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              {/* Image preview */}
              {editForm.image_url && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Image Preview</label>
                  <img src={editForm.image_url.startsWith("/static/") ? `${process.env.REACT_APP_BACKEND_URL}${editForm.image_url}` : editForm.image_url} alt="preview" className="h-24 rounded-lg object-cover border border-slate-200" onError={e => e.target.style.display="none"} />
                </div>
              )}

              {/* Logo upload */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Upload Logo / Image</label>
                <p className="text-xs text-slate-400 mb-2">Upload PNG or JPG from the college website. This replaces the placeholder image.</p>
                <label className="flex items-center gap-2 w-fit px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wide rounded-lg cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5" />
                  Choose Image File
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !editCollege) return;
                      const formData = new FormData();
                      formData.append("file", file);
                      try {
                        const token = localStorage.getItem("cb_admin_token");
                        const API = process.env.REACT_APP_BACKEND_URL;
                        const res = await fetch(`${API}/api/admin/colleges/${editCollege.id}/upload-image`, {
                          method: "POST",
                          headers: { Authorization: `Bearer ${token}` },
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setEditForm(p => ({ ...p, image_url: data.image_url }));
                        }
                      } catch {}
                      e.target.value = "";
                    }}
                  />
                </label>
                {editForm.image_url?.startsWith("/static/") && (
                  <p className="text-xs text-green-600 font-semibold mt-1">Custom logo uploaded</p>
                )}
              </div>

              {/* Coaches */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Coaches</label>
                {(editForm.coaches || []).map((coach, ci) => (
                  <div key={ci} className="grid grid-cols-2 gap-2 p-3 border border-slate-100 rounded-lg mb-2 bg-slate-50">
                    <input placeholder="Name" value={coach.name || ""} onChange={e => { const c=[...editForm.coaches]; c[ci]={...c[ci],name:e.target.value}; setEditForm(p=>({...p,coaches:c})); }}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <input placeholder="Title" value={coach.title || ""} onChange={e => { const c=[...editForm.coaches]; c[ci]={...c[ci],title:e.target.value}; setEditForm(p=>({...p,coaches:c})); }}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <input placeholder="Email" value={coach.email || ""} onChange={e => { const c=[...editForm.coaches]; c[ci]={...c[ci],email:e.target.value}; setEditForm(p=>({...p,coaches:c})); }}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <input placeholder="Phone" value={coach.phone || ""} onChange={e => { const c=[...editForm.coaches]; c[ci]={...c[ci],phone:e.target.value}; setEditForm(p=>({...p,coaches:c})); }}
                      className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400 outline-none" />
                    <div className="col-span-2 flex items-center gap-2">
                      <label className="text-xs text-slate-500 font-semibold w-28 flex-shrink-0">Last Verified:</label>
                      <input type="date" value={coach.last_verified || ""} onChange={e => { const c=[...editForm.coaches]; c[ci]={...c[ci],last_verified:e.target.value}; setEditForm(p=>({...p,coaches:c})); }}
                        className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:ring-1 focus:ring-orange-400 outline-none flex-1" />
                      <button type="button" onClick={() => { const c=[...editForm.coaches]; c[ci]={...c[ci],last_verified:new Date().toISOString().slice(0,10)}; setEditForm(p=>({...p,coaches:c})); }}
                        className="text-xs text-green-600 font-semibold hover:text-green-800 whitespace-nowrap">Mark Today</button>
                    </div>
                    <button onClick={() => setEditForm(p => ({ ...p, coaches: p.coaches.filter((_,ii) => ii!==ci) }))}
                      className="col-span-2 text-xs text-red-500 hover:text-red-700 text-left font-semibold">Remove coach</button>
                  </div>
                ))}
                <button onClick={() => setEditForm(p => ({ ...p, coaches: [...(p.coaches||[]), {name:"",title:"Head Coach",email:"",phone:""}] }))}
                  className="text-xs text-orange-600 hover:text-orange-800 font-bold">+ Add Coach</button>
              </div>

              <div className="flex gap-3 pt-2">
                <button data-testid="save-college-btn" onClick={saveEditCollege} disabled={editSaving}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black text-sm uppercase tracking-wider rounded-xl py-3 transition-all disabled:opacity-60">
                  {editSaving ? "Saving..." : editSaved ? "Saved!" : "Save Changes"}
                </button>
                <button onClick={() => setEditCollege(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider rounded-xl py-3 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE COACH CONFIRM MODAL ───────────────────────── */}
      {confirmDeleteCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-lg uppercase" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Delete Coach</h3>
                <p className="text-xs text-slate-500">This removes the coach from the college</p>
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
              <p className="text-sm font-bold text-red-800">{confirmDeleteCoach.coach_name}</p>
              <p className="text-xs text-red-600">{confirmDeleteCoach.college_name}</p>
            </div>
            <div className="flex gap-3">
              <button data-testid="confirm-delete-coach-btn" onClick={deleteCoach} disabled={deletingCoach}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl py-3 transition-colors disabled:opacity-60">
                {deletingCoach ? "Deleting..." : "Delete Coach"}
              </button>
              <button onClick={() => setConfirmDeleteCoach(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm uppercase tracking-wider rounded-xl py-3">
                Cancel
              </button>
            </div>
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
