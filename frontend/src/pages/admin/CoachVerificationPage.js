import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertCircle, Search,
  ExternalLink, ArrowLeft, Users, Trophy, RefreshCw, MessageSquare,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const adminReq = (method, path, data) => {
  const token = localStorage.getItem("cb_admin_token");
  return axios({ method, url: `${API}/api${path}`, data, headers: { Authorization: `Bearer ${token}` } });
};

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
};

const isOverdue = (created_at) => {
  if (!created_at) return false;
  return Date.now() - new Date(created_at).getTime() > 48 * 3600 * 1000;
};

const isNonEdu = (email = "") => !email.toLowerCase().endsWith(".edu");

function StatCard({ icon: Icon, label, value, color = "text-slate-700", urgent }) {
  return (
    <div className={`bg-white border rounded-xl p-5 ${urgent && value > 0 ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <Icon className={`w-4 h-4 ${urgent && value > 0 ? "text-red-500" : color}`} />
      </div>
      <p className={`text-3xl font-black ${urgent && value > 0 ? "text-red-600" : "text-slate-900"}`}
        style={{ fontFamily: "Barlow Condensed, sans-serif" }}>{value ?? "—"}</p>
    </div>
  );
}

function ActionModal({ coach, action, onClose, onConfirm, loading }) {
  const [message, setMessage] = useState("");
  const needsMessage = action === "reject" || action === "request_info";
  const config = {
    approve:      { title: "Approve Coach", btn: "Approve", btnClass: "bg-green-600 hover:bg-green-500", icon: CheckCircle2, iconClass: "text-green-500" },
    reject:       { title: "Reject Application", btn: "Reject", btnClass: "bg-red-600 hover:bg-red-500", icon: XCircle, iconClass: "text-red-500" },
    request_info: { title: "Request More Info", btn: "Send Request", btnClass: "bg-amber-600 hover:bg-amber-500", icon: MessageSquare, iconClass: "text-amber-500" },
  }[action];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <config.icon className={`w-6 h-6 ${config.iconClass}`} />
          <h3 className="font-black text-slate-900 text-lg">{config.title}</h3>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 mb-4">
          <p className="font-bold text-slate-800 text-sm">{coach.full_name}</p>
          <p className="text-xs text-slate-500">{coach.institution_name} · {coach.division}</p>
          <p className="text-xs text-slate-500">{coach.email}</p>
        </div>
        {needsMessage && (
          <div className="mb-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              {action === "reject" ? "Reason for rejection *" : "Information needed *"}
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder={action === "reject" ? "e.g. Could not verify institutional affiliation..." : "e.g. Please provide your official faculty ID..."}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none"
            />
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-lg hover:bg-slate-50 transition-colors text-sm">
            Cancel
          </button>
          <button
            data-testid={`modal-${action}-confirm`}
            onClick={() => onConfirm(message)}
            disabled={loading || (needsMessage && !message.trim())}
            className={`flex-1 text-white font-bold py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60 ${config.btnClass}`}
          >
            {loading ? "Processing..." : config.btn}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoachVerificationPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [data, setData] = useState({ pending: [], verified: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { coach, action }
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminReq("get", "/coach/admin/queue");
      setData(r.data);
    } catch (err) {
      if (err.response?.status === 401) navigate("/admin/login");
      else toast.error("Failed to load queue");
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!localStorage.getItem("cb_admin_token")) { navigate("/admin/login"); return; }
    load();
  }, [load, navigate]);

  const handleAction = async (message) => {
    if (!modal) return;
    setActionLoading(true);
    try {
      await adminReq("patch", `/coach/admin/verify/${modal.coach.id}`, { action: modal.action, message });
      const labels = { approve: "approved", reject: "rejected", request_info: "info requested" };
      toast.success(`Coach ${labels[modal.action]} successfully`);
      setModal(null);
      await load();
    } catch {
      toast.error("Action failed. Please try again.");
    }
    setActionLoading(false);
  };

  const filteredVerified = (data.verified || []).filter(c =>
    !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.institution_name?.toLowerCase().includes(search.toLowerCase())
  );

  const { stats = {} } = data;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>
      {modal && (
        <ActionModal
          coach={modal.coach}
          action={modal.action}
          onClose={() => setModal(null)}
          onConfirm={handleAction}
          loading={actionLoading}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/admin")} className="text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900 text-sm uppercase tracking-wide">Coach Verification Queue</span>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Clock} label="Total Pending" value={stats.total_pending} />
          <StatCard icon={AlertCircle} label="Overdue (>48h)" value={stats.overdue} urgent color="text-red-500" />
          <StatCard icon={CheckCircle2} label="Approved This Week" value={stats.approved_week} color="text-green-500" />
          <StatCard icon={XCircle} label="Rejected This Week" value={stats.rejected_week} color="text-red-500" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          <button
            data-testid="tab-pending"
            onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === "pending" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Pending Queue
            {stats.total_pending > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs font-black rounded-full px-1.5 py-0.5 leading-none">{stats.total_pending}</span>
            )}
          </button>
          <button
            data-testid="tab-verified"
            onClick={() => setTab("verified")}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${tab === "verified" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}
          >
            Verified Coaches
          </button>
        </div>

        {/* ── PENDING TAB ── */}
        {tab === "pending" && (
          loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent" />
            </div>
          ) : data.pending?.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-16 text-center">
              <ShieldCheck className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-slate-800">Queue is clear</p>
              <p className="text-sm text-slate-400 mt-1">No pending coach applications</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.pending.map(coach => {
                const overdue = isOverdue(coach.created_at);
                const nonEdu = isNonEdu(coach.email);
                return (
                  <div
                    key={coach.id}
                    data-testid="pending-coach-row"
                    className={`bg-white border rounded-xl p-5 ${overdue ? "border-red-200" : "border-slate-200"}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-black text-slate-900 text-sm">{coach.full_name}</h3>
                          {overdue && (
                            <span data-testid="overdue-badge" className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 text-xs text-slate-500">
                          <span><strong className="text-slate-700">Institution:</strong> {coach.institution_name}</span>
                          <span><strong className="text-slate-700">Division:</strong> {coach.division}</span>
                          <span><strong className="text-slate-700">Role:</strong> {coach.job_title || "—"}</span>
                          <span>
                            <strong className="text-slate-700">Email:</strong>{" "}
                            <span className={nonEdu ? "text-amber-600 font-semibold" : ""}>{coach.email}</span>
                          </span>
                          <span><strong className="text-slate-700">Registered:</strong> {fmtDate(coach.created_at)}</span>
                          {coach.institution_website && (
                            <span>
                              <a href={coach.institution_website} target="_blank" rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1 inline-flex">
                                <ExternalLink className="w-3 h-3" /> Verify website
                              </a>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          data-testid="btn-approve"
                          onClick={() => setModal({ coach, action: "approve" })}
                          className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          data-testid="btn-request-info"
                          onClick={() => setModal({ coach, action: "request_info" })}
                          className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Request Info
                        </button>
                        <button
                          data-testid="btn-reject"
                          onClick={() => setModal({ coach, action: "reject" })}
                          className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── VERIFIED COACHES TAB ── */}
        {tab === "verified" && (
          <>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                data-testid="verified-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or institution..."
                className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-slate-900 outline-none"
              />
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-900 border-t-transparent" />
              </div>
            ) : filteredVerified.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">{search ? "No results found" : "No verified coaches yet"}</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Name", "Institution", "Division", "Email", "Verified", "Last Active"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredVerified.map((coach, i) => (
                      <tr key={coach.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${i % 2 === 0 ? "" : "bg-slate-50/30"}`}>
                        <td className="px-4 py-3 font-semibold text-slate-800">{coach.full_name}</td>
                        <td className="px-4 py-3 text-slate-600">{coach.institution_name}</td>
                        <td className="px-4 py-3 text-slate-600">{coach.division}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{coach.email}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(coach.verified_at)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(coach.last_active)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
