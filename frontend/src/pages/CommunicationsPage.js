import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../context/AuthContext";
import { Mail, Plus, Trash2, ChevronDown, ArrowUpRight, ArrowDownLeft, Search, Send, CheckSquare, Square, X, Upload, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CommunicationsPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState([]);
  const [allColleges, setAllColleges] = useState([]);
  const [trackedColleges, setTrackedColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCollege, setFilterCollege] = useState("");
  const [filterDir, setFilterDir] = useState("");
  const [search, setSearch] = useState("");
  const [expandedEmail, setExpandedEmail] = useState(null);

  // CSV import state
  const [showCSV, setShowCSV] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);
  const fileInputRef = useRef(null);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkForm, setBulkForm] = useState({ subject: "", body: "", direction: "sent", sent_date: "", coach_name: "" });
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkSuccess, setBulkSuccess] = useState("");

  // Single email state
  const [showSingle, setShowSingle] = useState(false);
  const [singleForm, setSingleForm] = useState({ college_id: "", direction: "sent", subject: "", body: "", coach_name: "", coach_email: "" });
  const [singleSubmitting, setSingleSubmitting] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [emailsRes, trackedRes, allRes] = await Promise.all([
        apiRequest("get", "/emails"),
        apiRequest("get", "/my-colleges"),
        apiRequest("get", "/colleges")
      ]);
      setEmails(emailsRes.data);
      setTrackedColleges(trackedRes.data);
      setAllColleges(allRes.data);
    } catch {}
    setLoading(false);
  };

  const deleteEmail = async (id) => {
    await apiRequest("delete", `/emails/${id}`);
    setEmails(prev => prev.filter(e => e.id !== id));
  };

  const submitCSV = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    setCsvResult(null);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      const { data } = await axios.post(`${API}/emails/import-csv`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setCsvResult({ success: true, ...data });
      fetchAll();
    } catch (err) {
      setCsvResult({ success: false, message: err.response?.data?.detail || "Import failed. Check your CSV format." });
    }
    setCsvImporting(false);
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    if (!bulkSelected.size) return;
    setBulkSubmitting(true);
    try {
      const { data } = await apiRequest("post", "/emails/bulk", {
        college_ids: [...bulkSelected],
        direction: bulkForm.direction,
        subject: bulkForm.subject,
        body: bulkForm.body,
        coach_name: bulkForm.coach_name,
        sent_date: bulkForm.sent_date ? new Date(bulkForm.sent_date).toISOString() : ""
      });
      setBulkSuccess(`Done! Logged for ${data.inserted} colleges.`);
      setBulkSelected(new Set());
      setBulkForm({ subject: "", body: "", direction: "sent", sent_date: "", coach_name: "" });
      fetchAll();
      setTimeout(() => { setBulkSuccess(""); setShowBulk(false); }, 3000);
    } catch {}
    setBulkSubmitting(false);
  };

  const submitSingle = async (e) => {
    e.preventDefault();
    setSingleSubmitting(true);
    try {
      await apiRequest("post", "/emails", singleForm);
      setSingleForm({ college_id: "", direction: "sent", subject: "", body: "", coach_name: "", coach_email: "" });
      setShowSingle(false);
      fetchAll();
    } catch {}
    setSingleSubmitting(false);
  };

  const toggleBulkCollege = (id) => {
    setBulkSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const selectAll = () => {
    const visible = filteredBulkColleges.map(c => c.id);
    const allSelected = visible.every(id => bulkSelected.has(id));
    if (allSelected) {
      setBulkSelected(prev => { const s = new Set(prev); visible.forEach(id => s.delete(id)); return s; });
    } else {
      setBulkSelected(prev => new Set([...prev, ...visible]));
    }
  };

  const filtered = emails.filter(e => {
    if (filterCollege && e.college_id !== filterCollege) return false;
    if (filterDir && e.direction !== filterDir) return false;
    if (search && !e.subject?.toLowerCase().includes(search.toLowerCase()) && !e.coach_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredBulkColleges = allColleges.filter(c =>
    !bulkSearch || c.name.toLowerCase().includes(bulkSearch.toLowerCase()) || c.location.toLowerCase().includes(bulkSearch.toLowerCase())
  );

  const getCollegeName = (college_id) => {
    const c = allColleges.find(c => c.id === college_id);
    return c?.name || "Unknown College";
  };

  // Build college map for filter dropdown from emails
  const emailCollegeIds = [...new Set(emails.map(e => e.college_id))];
  const filterCollegeOptions = emailCollegeIds.map(id => ({ id, name: getCollegeName(id) })).sort((a,b) => a.name.localeCompare(b.name));

  const divisionBadge = {
    "Division I": "bg-orange-100 text-orange-700",
    "Division II": "bg-blue-100 text-blue-700",
    "NAIA": "bg-purple-100 text-purple-700",
    "JUCO": "bg-green-100 text-green-700",
  };

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Communication Log</span>
          <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Email History
          </h1>
          <p className="text-slate-500 mt-1">{emails.length} total emails · {emails.filter(e=>e.direction==="sent").length} sent · {emails.filter(e=>e.direction==="received").length} received</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            data-testid="csv-import-btn"
            onClick={() => { setShowCSV(true); setShowBulk(false); setShowSingle(false); }}
            className="bg-blue-600 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-blue-700 transition-all flex items-center gap-2"
          >
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button
            data-testid="bulk-import-btn"
            onClick={() => { setShowBulk(true); setShowSingle(false); setShowCSV(false); }}
            className="bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Bulk Import
          </button>
          <button
            data-testid="add-single-email-btn"
            onClick={() => { setShowSingle(true); setShowBulk(false); setShowCSV(false); }}
            className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-orange-600 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Log Single
          </button>
        </div>
      </div>

      {/* ── CSV IMPORT PANEL ──────────────────────────────────────────────────── */}
      {showCSV && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Import from CSV
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">
                Upload your communications CSV. Colleges not in the app will be added automatically. Exact dates are preserved.
              </p>
            </div>
            <button onClick={() => { setShowCSV(false); setCsvResult(null); setCsvFile(null); }} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Expected format */}
          <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4 text-xs text-slate-600">
            <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Expected CSV columns:</p>
            <p className="font-mono text-slate-500 leading-relaxed">College Name · Date (YYYY-MM-DD) · Type · Coach Name · Coach Email · Assistant Coach Name · Assistant Coach Email · Subject · Notes · Follow Up Needed (yes/no) · Follow Up Date (YYYY-MM-DD)</p>
          </div>

          {/* Drop zone */}
          <div
            data-testid="csv-dropzone"
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${csvFile ? "border-blue-400 bg-blue-50" : "border-slate-300 hover:border-blue-400 hover:bg-blue-50/50"}`}
          >
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            {csvFile ? (
              <div>
                <p className="font-semibold text-blue-700 text-sm">{csvFile.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{(csvFile.size / 1024).toFixed(1)} KB · Click to change</p>
              </div>
            ) : (
              <div>
                <p className="text-slate-600 text-sm font-medium">Click to select your CSV file</p>
                <p className="text-xs text-slate-400 mt-0.5">or drag and drop</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              data-testid="csv-file-input"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { setCsvFile(e.target.files[0] || null); setCsvResult(null); }}
            />
          </div>

          {/* Result */}
          {csvResult && (
            <div data-testid="csv-import-result" className={`mt-4 p-4 rounded-lg border ${csvResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              {csvResult.success ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-green-700 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" /> {csvResult.message}
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-2xl font-bold text-green-600">{csvResult.emails_added}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Emails Logged</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-2xl font-bold text-blue-600">{csvResult.colleges_added}</p>
                      <p className="text-xs text-slate-500 mt-0.5">New Colleges Added</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border border-green-100">
                      <p className="text-2xl font-bold text-slate-400">{csvResult.duplicates_skipped}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Duplicates Skipped</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-red-700 text-sm font-medium">{csvResult.message}</p>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button type="button" onClick={() => { setShowCSV(false); setCsvResult(null); setCsvFile(null); }} className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">
              {csvResult?.success ? "Close" : "Cancel"}
            </button>
            <button
              data-testid="csv-import-submit-btn"
              onClick={submitCSV}
              disabled={!csvFile || csvImporting}
              className="flex-1 bg-blue-600 text-white font-bold uppercase tracking-wider rounded-lg py-2.5 text-sm hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {csvImporting ? "Importing..." : "Import CSV"}
            </button>
          </div>
        </div>
      )}

      {/* ── BULK IMPORT PANEL ─────────────────────────────────────────────────── */}
      {showBulk && (
        <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-bold text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Bulk Email Import
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">Select all colleges you sent the same email to, then fill in the email details below.</p>
            </div>
            <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* College Picker */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Select Colleges ({bulkSelected.size} selected)
                  </span>
                  <button onClick={selectAll} className="text-xs text-orange-500 font-semibold hover:text-orange-600">
                    {filteredBulkColleges.every(c => bulkSelected.has(c.id)) ? "Deselect All" : "Select All"}
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    data-testid="bulk-college-search"
                    type="text"
                    placeholder="Search colleges..."
                    value={bulkSearch}
                    onChange={e => setBulkSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
                {filteredBulkColleges.map(college => (
                  <div
                    key={college.id}
                    data-testid={`bulk-college-${college.name}`}
                    onClick={() => toggleBulkCollege(college.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer border-b border-slate-50 hover:bg-orange-50 transition-colors ${bulkSelected.has(college.id) ? "bg-orange-50" : ""}`}
                  >
                    {bulkSelected.has(college.id)
                      ? <CheckSquare className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      : <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{college.name}</p>
                      <p className="text-xs text-slate-400 truncate">{college.location}</p>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${divisionBadge[college.division] || "bg-slate-100 text-slate-600"}`}>
                      {college.division?.replace("Division ", "D")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Form */}
            <form onSubmit={submitBulk} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Direction</label>
                  <select
                    data-testid="bulk-direction-select"
                    value={bulkForm.direction}
                    onChange={e => setBulkForm({...bulkForm, direction: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    <option value="sent">Sent by me</option>
                    <option value="received">Received from coach</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date Sent</label>
                  <input
                    data-testid="bulk-date-input"
                    type="date"
                    value={bulkForm.sent_date}
                    onChange={e => setBulkForm({...bulkForm, sent_date: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Subject *</label>
                <input
                  data-testid="bulk-subject-input"
                  type="text"
                  required
                  value={bulkForm.subject}
                  onChange={e => setBulkForm({...bulkForm, subject: e.target.value})}
                  placeholder="e.g. Basketball Scholarship Enquiry - England U18"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Email Body *</label>
                <textarea
                  data-testid="bulk-body-input"
                  required
                  rows={7}
                  value={bulkForm.body}
                  onChange={e => setBulkForm({...bulkForm, body: e.target.value})}
                  placeholder="Paste the email you sent to all these colleges..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>
              {bulkSuccess && (
                <div data-testid="bulk-success-msg" className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3 font-medium">
                  {bulkSuccess}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowBulk(false)} className="px-4 py-2.5 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 flex-shrink-0">
                  Cancel
                </button>
                <button
                  data-testid="bulk-submit-btn"
                  type="submit"
                  disabled={bulkSubmitting || bulkSelected.size === 0 || !bulkForm.subject || !bulkForm.body}
                  className="flex-1 bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg py-2.5 text-sm hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {bulkSubmitting ? "Importing..." : `Import for ${bulkSelected.size} College${bulkSelected.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SINGLE EMAIL PANEL ────────────────────────────────────────────────── */}
      {showSingle && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Log Single Email</h3>
            <button onClick={() => setShowSingle(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={submitSingle} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">College</label>
              <select value={singleForm.college_id} onChange={e => setSingleForm({...singleForm, college_id: e.target.value})} required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                <option value="">Select college...</option>
                {allColleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Direction</label>
              <select value={singleForm.direction} onChange={e => setSingleForm({...singleForm, direction: e.target.value})} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                <option value="sent">Sent</option>
                <option value="received">Received</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Subject</label>
              <input value={singleForm.subject} onChange={e => setSingleForm({...singleForm, subject: e.target.value})} required placeholder="Email subject..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Coach Name</label>
              <input value={singleForm.coach_name} onChange={e => setSingleForm({...singleForm, coach_name: e.target.value})} placeholder="Coach name..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Coach Email</label>
              <input value={singleForm.coach_email} onChange={e => setSingleForm({...singleForm, coach_email: e.target.value})} placeholder="coach@college.edu" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-slate-500 font-medium block mb-1">Body</label>
              <textarea value={singleForm.body} onChange={e => setSingleForm({...singleForm, body: e.target.value})} rows={4} placeholder="Email body..." className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
            </div>
            <div className="md:col-span-2 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowSingle(false)} className="px-4 py-2 text-sm border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={singleSubmitting} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 disabled:opacity-60">{singleSubmitting ? "Saving..." : "Save Email"}</button>
            </div>
          </form>
        </div>
      )}

      {/* ── FILTERS ───────────────────────────────────────────────────────────── */}
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
            {filterCollegeOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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

      {/* ── EMAIL LIST ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-4">No emails found. Import your existing emails using Bulk Import!</p>
          <button onClick={() => setShowBulk(true)} className="bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-slate-800 transition-all">
            Bulk Import Emails
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
