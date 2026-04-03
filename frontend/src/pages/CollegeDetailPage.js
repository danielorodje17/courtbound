import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { MapPin, Globe, Users, Mail, Phone, Plus, Check, ArrowLeft, Star, Pen } from "lucide-react";

export default function CollegeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [college, setCollege] = useState(null);
  const [tracked, setTracked] = useState(false);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("interested");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetchAll();
  }, [id]);

  const fetchAll = async () => {
    try {
      const [collegeRes, myCollegesRes, emailsRes] = await Promise.all([
        apiRequest("get", `/colleges/${id}`),
        apiRequest("get", "/my-colleges"),
        apiRequest("get", `/emails?college_id=${id}`)
      ]);
      setCollege(collegeRes.data);
      const t = myCollegesRes.data.find(c => c.college_id === id);
      if (t) {
        setTracked(true);
        setStatus(t.status || "interested");
        setNotes(t.notes || "");
      }
      setEmails(emailsRes.data);
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

  const saveStatus = async () => {
    setSaving(true);
    try {
      await apiRequest("patch", `/my-colleges/${id}/status`, { status, notes });
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
        <img src={college.image_url} alt={college.name} className="w-full h-full object-cover" onError={e => { e.target.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-slate-900/20" />
        <div className="absolute bottom-0 left-0 p-6 right-0">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${college.division === "Division I" ? "bg-orange-500 text-white" : "bg-slate-500 text-white"}`}>
                  {college.division}
                </span>
                {college.foreign_friendly && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-green-500 text-white">
                    International Friendly
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                {college.name}
              </h1>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-sm">{college.location} · {college.conference}</span>
              </div>
            </div>
            <button
              data-testid="college-detail-track-btn"
              onClick={toggleTrack}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold uppercase tracking-wider text-sm transition-all ${tracked ? "bg-green-500 text-white" : "bg-orange-500 text-white hover:bg-orange-600"}`}
            >
              {tracked ? <><Check className="w-4 h-4" /> Tracking</> : <><Plus className="w-4 h-4" /> Track</>}
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
              <div><span className="text-slate-400 text-xs uppercase tracking-wide">Acceptance Rate</span><p className="font-semibold text-slate-800 mt-0.5">{college.acceptance_rate}</p></div>
              <div><span className="text-slate-400 text-xs uppercase tracking-wide">Conference</span><p className="font-semibold text-slate-800 mt-0.5">{college.conference}</p></div>
              <div className="col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Scholarship Info</span><p className="font-medium text-slate-700 mt-0.5">{college.scholarship_info}</p></div>
              <div className="col-span-2"><span className="text-slate-400 text-xs uppercase tracking-wide">Notable Alumni</span><p className="font-medium text-slate-700 mt-0.5">{college.notable_alumni}</p></div>
            </div>
            {college.website && (
              <a href={college.website} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 text-orange-500 hover:text-orange-600 text-sm font-medium">
                <Globe className="w-4 h-4" /> Visit Official Website
              </a>
            )}
          </div>

          {/* Coaches */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Coaching Staff</h2>
            <div className="space-y-3">
              {college.coaches?.map((coach, i) => (
                <div key={i} data-testid={`coach-card-${coach.name}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{coach.name}</p>
                    <p className="text-xs text-slate-500">{coach.title}</p>
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
                <button
                  data-testid="college-save-status-btn"
                  onClick={saveStatus}
                  disabled={saving}
                  className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-2.5 text-sm hover:bg-orange-600 transition-colors disabled:opacity-60"
                >
                  {savedMsg || (saving ? "Saving..." : "Save Status")}
                </button>
              </div>
            </div>
          )}

          <button
            data-testid="college-detail-strategy-btn"
            onClick={() => navigate("/strategy", { state: { college } })}
            className="w-full bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
          >
            Get AI Strategy Advice
          </button>
        </div>
      </div>
    </div>
  );
}
