import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { getCollegeImage } from "../utils/collegeImages";
import { MapPin, Globe, Mail, Phone, Plus, Check, ArrowLeft, Pen, Clock, Calendar, AlertTriangle, ListChecks, MessageSquare, Trash2, Film, Info, Flag, X } from "lucide-react";

const ISSUE_TYPES = [
  "Wrong email address",
  "Coach no longer at this school",
  "Wrong coach name",
  "Wrong phone number",
  "Email bounced / undeliverable",
  "Other",
];

function ReportModal({ college, coach, onClose }) {
  const [issueType, setIssueType]   = useState("");
  const [correctInfo, setCorrectInfo] = useState("");
  const [notes, setNotes]           = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]             = useState(false);

  const submit = async () => {
    if (!issueType) return;
    setSubmitting(true);
    try {
      await apiRequest("post", "/reports/college", {
        college_id:   college.id || college._id || "",
        college_name: college.name,
        coach_name:   coach?.name || "",
        issue_type:   issueType,
        correct_info: correctInfo,
        notes,
      });
      setDone(true);
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-500" />
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide">Report Contact Issue</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {done ? (
            <div className="text-center py-6">
              <Check className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="font-bold text-slate-800">Report submitted!</p>
              <p className="text-sm text-slate-500 mt-1">We'll investigate and notify you when it's fixed.</p>
              <button onClick={onClose} className="mt-4 text-sm bg-slate-900 text-white px-5 py-2 rounded-xl font-bold">Close</button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-slate-400 mb-3">
                  Reporting for <span className="font-bold text-slate-700">{college.name}{coach ? ` — ${coach.name}` : ""}</span>
                </p>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">What's the issue?</label>
                <select value={issueType} onChange={e => setIssueType(e.target.value)} data-testid="report-issue-type"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                  <option value="">Select an issue...</option>
                  {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Correct info (if known)</label>
                <input type="text" value={correctInfo} onChange={e => setCorrectInfo(e.target.value)} data-testid="report-correct-info"
                  placeholder="e.g. correct email address" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Additional notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} data-testid="report-notes"
                  placeholder="Any extra details..." className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
              </div>
              <button onClick={submit} disabled={!issueType || submitting} data-testid="report-submit-btn"
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black uppercase tracking-wider rounded-xl py-3 text-sm transition-all disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Report"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-orange-500", "bg-blue-500", "bg-green-600", "bg-purple-500",
  "bg-red-500", "bg-teal-600", "bg-indigo-500", "bg-pink-500",
];
function coachInitials(name = "") {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function coachAvatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function CollegeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [college, setCollege] = useState(null);
  const [tracked, setTracked] = useState(false);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("interested");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [appDeadline, setAppDeadline] = useState("");
  const [signingDay, setSigningDay] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [callNotes, setCallNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [newNoteDate, setNewNoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addingNote, setAddingNote] = useState(false);
  const [tapeUrl, setTapeUrl] = useState("");
  const [progressScore, setProgressScore] = useState(null);
  const [reportTarget, setReportTarget] = useState(null); // {coach} or null for general college report

  function daysUntil(dateStr) {
    if (!dateStr) return null;
    return Math.ceil((new Date(dateStr).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000);
  }

  function DeadlineBadge({ label, date }) {
    if (!date) return null;
    const d = daysUntil(date);
    const color = d < 0 ? "bg-red-100 text-red-700 border-red-200" : d <= 7 ? "bg-orange-100 text-orange-700 border-orange-200" : d <= 30 ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-slate-50 text-slate-600 border-slate-200";
    return (
      <div className={`flex items-center justify-between rounded-lg px-3 py-2 border text-xs ${color}`}>
        <span className="font-semibold">{label}</span>
        <span className="font-bold">
          {d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Today!" : `${d} days`} · {new Date(date).toLocaleDateString("en-GB")}
        </span>
      </div>
    );
  }

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [collegeRes, myCollegesRes, emailsRes, checklistRes, profileRes] = await Promise.all([
        apiRequest("get", `/colleges/${id}`),
        apiRequest("get", "/my-colleges"),
        apiRequest("get", `/emails?college_id=${id}`),
        apiRequest("get", `/checklist/${id}`),
        apiRequest("get", "/profile"),
      ]);
      setCollege(collegeRes.data);
      const t = myCollegesRes.data.find(c => c.college_id === id);
      if (t) {
        setTracked(true);
        setStatus(t.status || "interested");
        setNotes(t.notes || "");
        setFollowUpDate(t.follow_up_date || "");
        setAppDeadline(t.application_deadline || "");
        setSigningDay(t.signing_day || "");
      }
      setEmails(emailsRes.data);
      setChecklist(checklistRes.data?.items || []);
      setTapeUrl(profileRes.data?.highlight_tape_url || "");
      // Call notes + progress score stored in tracked college doc
      if (t && t.call_notes) setCallNotes(t.call_notes);
      if (t && t.progress_score !== undefined) setProgressScore(t.progress_score);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrack = async () => {
    if (tracked) {
      await apiRequest("delete", `/my-colleges/${id}`);
      setTracked(false);
    } else {
      await apiRequest("post", "/my-colleges", { college_id: id, notes });
      setTracked(true);
    }
  };

  const addCallNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      const res = await apiRequest("post", `/my-colleges/${id}/call-note`, {
        content: newNote.trim(),
        date: newNoteDate,
      });
      setCallNotes(prev => [...prev, res.data]);
      setNewNote("");
      setNewNoteDate(new Date().toISOString().slice(0, 10));
    } catch {}
    setAddingNote(false);
  };

  const deleteCallNote = async (noteId) => {
    try {
      await apiRequest("delete", `/my-colleges/${id}/call-note/${noteId}`);
      setCallNotes(prev => prev.filter(n => n.id !== noteId));
    } catch {}
  };

  const toggleCheckItem = async (itemId) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setChecklist(updated);
    setChecklistSaving(true);
    try {
      await apiRequest("put", `/checklist/${id}`, { items: updated });
    } catch {}
    setChecklistSaving(false);
  };

  const saveStatus = async () => {
    setSaving(true);
    try {
      await apiRequest("patch", `/my-colleges/${id}/status`, {
        status, notes,
        follow_up_date: followUpDate,
        application_deadline: appDeadline,
        signing_day: signingDay,
      });
      setSavedMsg("Saved!");
      setTimeout(() => setSavedMsg(""), 2000);
    } catch {}
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" /></div>;
  if (!college) return <div className="text-center py-20 text-slate-500">College not found.</div>;

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <button onClick={() => navigate("/colleges")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Directory
      </button>

      {/* Hero */}
      <div className="relative rounded-xl overflow-hidden h-52 mb-6">
        <img src={getCollegeImage(college.name)} alt={college.name} className="w-full h-full object-cover" onError={e => { e.target.src = getCollegeImage("default"); }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-slate-900/20" />
        <div className="absolute bottom-0 left-0 p-6 right-0">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${college.region === "Europe" ? "bg-blue-500 text-white" : college.division === "Division I" ? "bg-orange-500 text-white" : "bg-slate-500 text-white"}`}>
                  {college.region === "Europe" ? "Europe" : college.division}
                </span>
                {college.foreign_friendly && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-green-500 text-white">
                    UK Friendly
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                {college.name}
              </h1>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-sm">{college.region === "Europe" ? `${college.location}, ${college.country}` : college.location} · {college.region === "Europe" ? college.division : college.conference}</span>
              </div>
            </div>
            <button
              data-testid="college-detail-track-btn"
              onClick={toggleTrack}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black uppercase tracking-wider text-sm transition-all ${
                tracked
                  ? "bg-green-500 text-white hover:bg-red-500"
                  : "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-200"
              }`}
            >
              {tracked ? <><Check className="w-4 h-4" /> Tracking</> : <><Plus className="w-4 h-4" /> Add to My List</>}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Details */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>College Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {college.region === "Europe" ? (
                <>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Country</span><p className="font-semibold text-slate-800 mt-0.5">{college.country}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">League / Division</span><p className="font-semibold text-slate-800 mt-0.5">{college.division}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Language of Study</span><p className="font-semibold text-blue-700 mt-0.5">{college.language_of_study || "—"}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Scholarship Type</span><p className="font-semibold text-slate-800 mt-0.5">{college.scholarship_type || "—"}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Domestic Conference</span><p className="font-semibold text-slate-800 mt-0.5">{college.conference}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Entry Requirements</span><p className="font-semibold text-slate-800 mt-0.5">{college.acceptance_rate || "—"}</p></div>
                  <div className="col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Scholarship Info</span><p className="font-medium text-slate-700 mt-0.5">{college.scholarship_info}</p></div>
                </>
              ) : (
                <>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Acceptance Rate</span><p className="font-semibold text-slate-800 mt-0.5">{college.acceptance_rate}</p></div>
                  <div><span className="text-slate-400 text-xs uppercase tracking-wide">Conference</span><p className="font-semibold text-slate-800 mt-0.5">{college.conference}</p></div>
                  <div className="col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Scholarship Info</span><p className="font-medium text-slate-700 mt-0.5">{college.scholarship_info}</p></div>
                  <div className="col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Notable Alumni</span><p className="font-medium text-slate-700 mt-0.5">{college.notable_alumni}</p></div>
                </>
              )}
            </div>
            {college.website && (
              <a href={college.website} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium">
                <Globe className="w-4 h-4" /> Visit Official Website
              </a>
            )}
            {college.foreign_friendly && (
              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Euro Friendly
                </p>
                <p className="text-xs text-green-700 leading-relaxed">
                  This program actively recruits European players and has experience supporting international student-athletes with visa processes, SEVIS requirements, and NCAA Eligibility Center registration. A great target for your recruitment campaign.
                </p>
              </div>
            )}
          </div>

          {/* Coaches */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Coaching Staff</h2>
            <div className="space-y-3">
              {college.coaches?.map((coach, i) => (
                <div key={i} data-testid={`coach-card-${coach.name}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${coachAvatarColor(coach.name)}`}>
                      {coachInitials(coach.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{coach.name}</p>
                      <p className="text-xs text-slate-500">{coach.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {coach.email && (
                      <a href={`mailto:${coach.email}`} className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50" title={coach.email}>
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                    {coach.phone && (
                      <a href={`tel:${coach.phone}`} className="p-1.5 text-slate-400 hover:text-orange-500 transition-colors rounded-lg hover:bg-orange-50" title={coach.phone}>
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      data-testid={`report-btn-${coach.name}`}
                      onClick={() => setReportTarget(coach)}
                      className="flex items-center gap-1 px-2 py-1 text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors rounded-lg text-xs font-semibold"
                      title="Report incorrect contact info"
                    >
                      <Flag className="w-3 h-3" />
                      Report
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {coach.email && (
                      <button
                        data-testid={`coach-email-btn-${coach.name}`}
                        onClick={() => navigate("/compose", { state: { college, coach } })}
                        className="flex items-center gap-1.5 text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" /> Email
                      </button>
                    )}
                    {coach.phone && (
                      <a href={`tel:${coach.phone}`} className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* European Contact Tips */}
          {college.region === "Europe" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5" data-testid="euro-contact-tips">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-blue-900 text-sm mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Tips for Contacting European Clubs
                  </h3>
                  <ul className="space-y-1.5 text-sm text-blue-800">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-500 flex-shrink-0">1.</span>
                      <span><strong>These are admin/general inboxes</strong> — European clubs don't have dedicated recruitment portals like US coaches. Your email will be forwarded to the right person, so be patient.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-500 flex-shrink-0">2.</span>
                      <span><strong>Keep it short & professional</strong> — 3–4 sentences max. State your position, age, nationality, current club, and one stand-out stat. Attach your highlight tape link.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-500 flex-shrink-0">3.</span>
                      <span><strong>Reference your Player Profile</strong> — Use the AI Compose feature to auto-fill your stats, highlight tape URL, and academic info into a tailored draft.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-blue-500 flex-shrink-0">4.</span>
                      <span><strong>Follow up after 2–3 weeks</strong> — European clubs are slower to respond than US coaches. A polite follow-up email significantly increases reply rates.</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => navigate("/compose", { state: { college } })}
                    className="mt-3 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider hover:bg-blue-700 transition-colors flex items-center gap-1.5 w-fit"
                    data-testid="euro-compose-btn"
                  >
                    <Mail className="w-3.5 h-3.5" /> Draft AI Email for This Club
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Email History */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email History</h2>
              <button onClick={() => navigate("/compose", { state: { college } })} className="text-sm bg-orange-500 text-white px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors flex items-center gap-1.5">
                <Pen className="w-3.5 h-3.5" /> Compose
              </button>
            </div>
            {emails.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">No emails logged yet for this college.</p>
            ) : (
              <div className="space-y-2">
                {emails.map(email => (
                  <div key={email.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${email.direction === "sent" ? "bg-orange-400" : "bg-green-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{email.subject}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{email.direction === "sent" ? `To: ${email.coach_name || "Coach"}` : `From: ${email.coach_name || "Coach"}`} · {new Date(email.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase ${email.direction === "sent" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}>
                      {email.direction}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">

          {/* === NOT TRACKED: Prominent Add to List card === */}
          {!tracked && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-5 text-center" data-testid="add-to-list-card">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Plus className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-black text-slate-900 text-base mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Track This College
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Add to your tracked list to log status, set follow-up dates, use the checklist, and build your recruitment pipeline.
              </p>
              <button
                data-testid="sidebar-track-btn"
                onClick={toggleTrack}
                className="w-full bg-orange-500 text-white font-black uppercase tracking-wider rounded-xl py-3 text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add to My List
              </button>
            </div>
          )}

          {/* Recruitment Progress Score */}
          {tracked && progressScore !== null && (
            <div className="bg-white border border-slate-200 rounded-xl p-5" data-testid="progress-score-card">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Recruitment Progress
              </h2>
              <div className="flex items-center gap-4">
                {/* SVG Ring */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg width="80" height="80" className="-rotate-90">
                    <circle cx="40" cy="40" r="28" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle
                      cx="40" cy="40" r="28" fill="none"
                      stroke={progressScore >= 75 ? "#10b981" : progressScore >= 50 ? "#f97316" : progressScore >= 25 ? "#3b82f6" : "#94a3b8"}
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - progressScore / 100)}
                      strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.8s ease" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span
                      className="font-black text-base leading-none"
                      style={{ color: progressScore >= 75 ? "#10b981" : progressScore >= 50 ? "#f97316" : progressScore >= 25 ? "#3b82f6" : "#94a3b8" }}
                      data-testid="progress-score-value"
                    >
                      {progressScore}%
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">
                    {progressScore >= 75 ? "Strong pipeline" : progressScore >= 50 ? "Good progress" : progressScore >= 25 ? "Getting started" : "Just tracking"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {progressScore < 100 && (
                      progressScore < 25 ? "Send an email to start building your pipeline" :
                      progressScore < 50 ? "Set a follow-up date and log call notes" :
                      progressScore < 75 ? "Tick off checklist items to boost your score" :
                      "Almost there — aim for a reply!"
                    )}
                    {progressScore === 100 && "Full pipeline complete — great work!"}
                  </p>
                </div>
              </div>
            </div>
          )}
          {tracked && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>My Status</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Application Status</label>
                  <select
                    data-testid="college-status-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  >
                    <option value="interested">Interested</option>
                    <option value="contacted">Contacted</option>
                    <option value="replied">Replied</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Notes</label>
                  <textarea
                    data-testid="college-notes-input"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={4}
                    placeholder="Add notes about this college..."
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  />
                </div>

                {/* Follow-up Scheduler */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Follow-up Date
                  </label>
                  <input
                    data-testid="college-followup-date"
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {followUpDate && <DeadlineBadge label="Follow-up" date={followUpDate} />}
                </div>

                {/* Deadline Tracker */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Application Deadline
                  </label>
                  <input
                    data-testid="college-app-deadline"
                    type="date"
                    value={appDeadline}
                    onChange={e => setAppDeadline(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {appDeadline && <DeadlineBadge label="Application" date={appDeadline} />}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Signing Day
                  </label>
                  <input
                    data-testid="college-signing-day"
                    type="date"
                    value={signingDay}
                    onChange={e => setSigningDay(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                  {signingDay && <DeadlineBadge label="Signing Day" date={signingDay} />}
                </div>

                <button
                  data-testid="college-save-status-btn"
                  onClick={saveStatus}
                  disabled={saving}
                  className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-2.5 text-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
                >
                  {savedMsg || (saving ? "Saving..." : "Save Status & Dates")}
                </button>
              </div>
            </div>
          )}

          {/* Highlight Tape Quick-Link */}
          {tapeUrl ? (
            <div className="bg-white border border-slate-200 rounded-lg p-4" data-testid="college-tape-card">
              <div className="flex items-center gap-2 mb-2">
                <Film className="w-4 h-4 text-red-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Your Highlight Tape</span>
              </div>
              <a
                href={tapeUrl}
                target="_blank"
                rel="noreferrer"
                data-testid="college-tape-link"
                className="block text-xs text-orange-500 hover:text-orange-600 hover:underline break-all font-medium leading-relaxed"
              >
                {tapeUrl}
              </a>
              <p className="text-xs text-slate-400 mt-1.5">Auto-included when composing emails to this college</p>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4" data-testid="college-tape-missing">
              <div className="flex items-center gap-2 mb-1">
                <Film className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">No Highlight Tape</span>
              </div>
              <p className="text-xs text-amber-600">
                Add your Hudl or YouTube link in{" "}
                <button onClick={() => navigate("/profile")} className="font-semibold underline">your profile</button>{" "}
                to auto-include it in email drafts.
              </p>
            </div>
          )}

          <button
            data-testid="college-detail-strategy-btn"
            onClick={() => navigate("/strategy", { state: { college } })}
            className="w-full bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            Get AI Strategy Advice
          </button>

          {/* Application Checklist */}
          {checklist.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-slate-900 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <ListChecks className="w-4 h-4 text-slate-500" /> Checklist
                </h2>
                {checklistSaving && <span className="text-xs text-slate-400">Saving...</span>}
                <span className="text-xs font-bold text-slate-500">
                  {checklist.filter(i => i.checked).length}/{checklist.length}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${(checklist.filter(i => i.checked).length / checklist.length) * 100}%` }}
                />
              </div>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    data-testid={`checklist-item-${item.id}`}
                    onClick={() => toggleCheckItem(item.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all ${item.checked ? "bg-green-50" : "hover:bg-slate-50"}`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${item.checked ? "bg-green-500 border-green-500" : "border-slate-300"}`}>
                      {item.checked && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs font-medium leading-snug ${item.checked ? "text-green-700 line-through" : "text-slate-700"}`}>
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Coach / Call Notes */}
          {tracked && (
            <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid="call-notes-section">
              <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <MessageSquare className="w-4 h-4 text-slate-500" /> Call Notes
              </h2>

              {/* Existing notes */}
              {callNotes.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {[...callNotes].reverse().map(note => (
                    <div key={note.id} data-testid={`call-note-${note.id}`} className="bg-slate-50 rounded-lg p-3 group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-500">{new Date(note.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                        <button
                          data-testid={`delete-call-note-${note.id}`}
                          onClick={() => deleteCallNote(note.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs mb-4">No notes yet. Log calls, meetings, or key info below.</p>
              )}

              {/* Add note form */}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date</label>
                  <input
                    data-testid="call-note-date"
                    type="date"
                    value={newNoteDate}
                    onChange={e => setNewNoteDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>
                <textarea
                  data-testid="call-note-input"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Spoke with Coach Smith, very interested. Wants highlight tape by Friday..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
                <button
                  data-testid="add-call-note-btn"
                  onClick={addCallNote}
                  disabled={addingNote || !newNote.trim()}
                  className="w-full bg-slate-800 text-white font-bold uppercase tracking-wider rounded-lg py-2 text-xs hover:bg-slate-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addingNote ? "Adding..." : "Add Note"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {reportTarget !== null && college && (
        <ReportModal college={college} coach={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}
