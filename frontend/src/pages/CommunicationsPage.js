import { useState, useEffect } from "react";
import { apiRequest } from "../context/AuthContext";
import { Mail, Plus, Trash2, ChevronDown, ArrowUpRight, ArrowDownLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CommunicationsPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCollege, setFilterCollege] = useState("");
  const [filterDir, setFilterDir] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ college_id: "", direction: "sent", subject: "", body: "", coach_name: "", coach_email: "" });
  const [submitting, setSubmitting] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [emailsRes, collegesRes] = await Promise.all([
        apiRequest("get", "/emails"),
        apiRequest("get", "/my-colleges")
      ]);
      setEmails(emailsRes.data);
      setColleges(collegesRes.data);
    } catch {}
    setLoading(false);
  };

  const addEmail = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest("post", "/emails", form);
      setForm({ college_id: "", direction: "sent", subject: "", body: "", coach_name: "", coach_email: "" });
      setShowAdd(false);
      fetchAll();
    } catch {}
    setSubmitting(false);
  };

  const deleteEmail = async (id) => {
    await apiRequest("delete", `/emails/${id}`);
    setEmails(prev => prev.filter(e => e.id !== id));
  };

  const filtered = emails.filter(e => {
    if (filterCollege && e.college_id !== filterCollege) return false;
    if (filterDir && e.direction !== filterDir) return false;
    if (search && !e.subject?.toLowerCase().includes(search.toLowerCase()) && !e.coach_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getCollegeName = (college_id) => {
    const c = colleges.find(c => c.college_id === college_id);
    return c?.college?.name || "Unknown College";
  };

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Communication Log</span>
          <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Email History
          </h1>
          <p className="text-slate-500 mt-1">{emails.length} total emails tracked</p>
        </div>
        <button
          data-testid="add-email-btn"
          onClick={() => navigate("/compose")}
          className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Log Email
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            data-testid="email-search-input"
            type="text"
            placeholder="Search emails..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>
        <div className="relative">
          <select
            data-testid="email-college-filter"
            value={filterCollege}
            onChange={e => setFilterCollege(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-7 text-slate-700"
          >
            <option value="">All Colleges</option>
            {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.college?.name}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="flex gap-2">
          {["", "sent", "received"].map(d => (
            <button
              key={d || "all"}
              data-testid={`filter-direction-${d || "all"}`}
              onClick={() => setFilterDir(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filterDir === d ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              {d || "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Add Email manually */}
      {showAdd && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-5">
          <h3 className="font-bold text-slate-900 mb-4 text-sm uppercase tracking-wide">Log Email Manually</h3>
          <form onSubmit={addEmail} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">College</label>
              <select value={form.college_id} onChange={e => setForm({...form, college_id: e.target.value})} required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                <option value="">Select college...</option>
                {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.college?.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Direction</label>
              <select value={form.direction} onChange={e => setForm({...form, direction: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                <option value="sent">Sent</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Subject</label>
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required placeholder="Email subject..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Coach Name</label>
              <input value={form.coach_name} onChange={e => setForm({...form, coach_name: e.target.value})} placeholder="Coach name..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Coach Email</label>
              <input value={form.coach_email} onChange={e => setForm({...form, coach_email: e.target.value})} placeholder="coach@college.edu" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Body</label>
              <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={4} placeholder="Email body..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-60">{submitting ? "Saving..." : "Save Email"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Emails List */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No emails found. Start by composing your first email!</p>
          <button onClick={() => navigate("/compose")} className="mt-3 bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-orange-600 transition-all">
            Compose Email
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(email => (
            <div key={email.id} data-testid={`email-item-${email.id}`} className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:shadow-sm transition-all">
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedEmail(expandedEmail === email.id ? null : email.id)}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${email.direction === "sent" ? "bg-orange-50" : "bg-green-50"}`}>
                  {email.direction === "sent"
                    ? <ArrowUpRight className="w-4 h-4 text-orange-500" />
                    : <ArrowDownLeft className="w-4 h-4 text-green-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{email.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {email.direction === "sent" ? "To:" : "From:"} {email.coach_name || "Coach"} · {getCollegeName(email.college_id)} · {new Date(email.created_at).toLocaleDateString("en-GB")}
                  </p>
                </div>
                <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${email.direction === "sent" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                  {email.direction}
                </span>
                <button
                  data-testid={`delete-email-${email.id}`}
                  onClick={(e) => { e.stopPropagation(); deleteEmail(email.id); }}
                  className="ml-2 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {expandedEmail === email.id && email.body && (
                <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                  <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{email.body}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
