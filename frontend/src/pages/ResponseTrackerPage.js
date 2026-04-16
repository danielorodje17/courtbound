import { useState, useEffect } from "react";
import { apiRequest } from "../context/AuthContext";
import { MessageSquare, Clock, CheckCircle2, TrendingUp, MailOpen, Wand2, Send, X, AlertCircle, Heart, XCircle, Trophy, PhoneCall, RefreshCw, MinusCircle, Zap, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DIV_BADGE = {
  "Division I": "bg-orange-100 text-orange-700",
  "Division II": "bg-blue-100 text-blue-700",
  "NAIA": "bg-purple-100 text-purple-700",
  "JUCO": "bg-green-100 text-green-700",
};

const OUTCOME_CONFIG = {
  interested:          { label: "Interested",      color: "bg-green-100 text-green-700",   Icon: Heart },
  schedule_call:       { label: "Call Requested",  color: "bg-blue-100 text-blue-700",     Icon: PhoneCall },
  scholarship_offered: { label: "Offer Received",  color: "bg-amber-100 text-amber-700",   Icon: Trophy },
  second_follow_up:    { label: "2nd Follow Up",   color: "bg-purple-100 text-purple-700", Icon: RefreshCw },
  no_interest:         { label: "No Interest",     color: "bg-slate-100 text-slate-600",   Icon: MinusCircle },
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function ResponseTrackerPage() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Log reply modal
  const [logModal, setLogModal] = useState(null);
  const [logForm, setLogForm] = useState({ subject: "", body: "", coach_name: "", received_date: "", outcome: "" });
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccess, setLogSuccess] = useState("");

  // AI follow-up modal
  const [aiModal, setAiModal] = useState(null);
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // AI Next Steps modal
  const [nextStepsModal, setNextStepsModal] = useState(null);
  const [nextStepsResult, setNextStepsResult] = useState(null);
  const [nextStepsLoading, setNextStepsLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await apiRequest("get", "/responses/summary");
      setColleges(data);
    } catch {}
    setLoading(false);
  };

  const openLogModal = (c) => {
    setLogModal(c);
    setLogForm({ subject: "", body: "", coach_name: c.college.coaches?.[0]?.name || "", received_date: "", outcome: "" });
    setLogSuccess("");
  };

  const submitReply = async () => {
    if (!logForm.body.trim()) return;
    setLogSubmitting(true);
    try {
      await apiRequest("post", "/emails/log-reply", {
        college_id: logModal.college_id,
        subject: logForm.subject || `Re: Basketball Scholarship - ${logModal.college.name}`,
        body: logForm.body,
        coach_name: logForm.coach_name,
        received_date: logForm.received_date ? new Date(logForm.received_date).toISOString() : "",
        outcome: logForm.outcome,
      });
      setLogModal(null);
      setLogForm({ subject: "", body: "", coach_name: "", received_date: "", outcome: "" });
      fetchData();
    } catch {}
    setLogSubmitting(false);
  };

  const getFollowUp = async (c) => {
    const replyBody = c.received?.last_body || "";
    const coachName = c.received?.last_coach || c.college.coaches?.[0]?.name || "Coach";
    setAiModal({ college: c.college, replyBody, coachName });
    setAiResult("");
    setAiLoading(true);
    try {
      const { data } = await apiRequest("post", "/ai/follow-up", {
        college_name: c.college.name,
        coach_name: coachName,
        reply_content: replyBody,
        original_subject: c.received?.last_subject || "",
      });
      setAiResult(data.suggestion);
    } catch {
      setAiResult("Could not generate suggestion. Please try again.");
    }
    setAiLoading(false);
  };

  const getNextSteps = async (c) => {
    const coachName = c.received?.last_coach || c.college.coaches?.[0]?.name || "Coach";
    setNextStepsModal({ college: c.college, coachName, outcome: c.reply_outcome });
    setNextStepsResult(null);
    setNextStepsLoading(true);
    try {
      const { data } = await apiRequest("post", "/ai/reply-next-steps", {
        college_name: c.college.name,
        reply_body: c.received?.last_body || "",
        outcome: c.reply_outcome || "",
        coach_name: coachName,
        division: c.college.division || "",
      });
      setNextStepsResult(data);
    } catch {
      setNextStepsResult({ headline: "Could not generate next steps. Please try again.", next_steps: [] });
    }
    setNextStepsLoading(false);
  };

  const contacted = colleges.filter(c => c.sent?.count > 0 || ["contacted", "replied"].includes(c.status));
  const awaiting = contacted.filter(c => !c.received?.count);
  const replied = contacted.filter(c => c.received?.count > 0);
  const responseRate = contacted.length > 0 ? Math.round((replied.length / contacted.length) * 100) : 0;

  const displayed = (filter === "awaiting" ? awaiting : filter === "replied" ? replied : contacted)
    .filter(c => !search || c.college?.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div className="mb-6">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Response Tracker</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          Coach Responses
        </h1>
        <p className="text-slate-500 mt-1">Log replies from coaches and get AI-powered follow-up advice</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Colleges Contacted", value: contacted.length, color: "text-slate-900", Icon: Send },
          { label: "Awaiting Reply", value: awaiting.length, color: "text-orange-600", Icon: Clock },
          { label: "Received Reply", value: replied.length, color: "text-green-600", Icon: CheckCircle2 },
          { label: "Response Rate", value: `${responseRate}%`, color: "text-blue-600", Icon: TrendingUp },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{label}</p>
              <Icon className="w-4 h-4 text-slate-300" />
            </div>
            <p className={`text-2xl font-black ${color}`}>{loading ? "—" : value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-2 flex-wrap">
          {[["all", "All Contacted", contacted.length], ["awaiting", "Awaiting Reply", awaiting.length], ["replied", "Received Reply", replied.length]].map(([val, label, count]) => (
            <button
              key={val}
              data-testid={`filter-tab-${val}`}
              onClick={() => setFilter(val)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === val ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >
              {label} ({count})
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <input
            data-testid="response-search"
            type="text"
            placeholder="Search colleges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-64 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No colleges found in this view.</p>
          <p className="text-slate-400 text-sm mt-1">Contact colleges via Compose, then track replies here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(c => {
            const hasReply = c.received?.count > 0;
            const days = daysSince(c.sent?.last_date);
            return (
              <div
                key={c.college_id}
                data-testid={`response-row-${c.college_id}`}
                className={`bg-white border rounded-xl p-5 transition-all hover:shadow-sm ${hasReply ? "border-green-200" : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-slate-900 text-base">{c.college.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${DIV_BADGE[c.college.division] || "bg-slate-100 text-slate-600"}`}>
                        {c.college.division?.replace("Division ", "D") || "—"}
                      </span>
                      {hasReply ? (
                        c.reply_outcome && OUTCOME_CONFIG[c.reply_outcome] ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${OUTCOME_CONFIG[c.reply_outcome].color}`}>
                            {(() => { const Ic = OUTCOME_CONFIG[c.reply_outcome].Icon; return <Ic className="w-3 h-3" />; })()}
                            {OUTCOME_CONFIG[c.reply_outcome].label}
                          </span>
                        ) : (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Replied
                          </span>
                        )
                      ) : (
                        <span className="bg-orange-50 text-orange-600 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Awaiting
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400">{c.college.location}</p>

                    {/* Email timeline */}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                      {c.sent?.count > 0 && (
                        <span>{c.sent.count} sent · Last: {new Date(c.sent.last_date).toLocaleDateString("en-GB")}</span>
                      )}
                      {hasReply && (
                        <span className="text-green-600 font-medium">
                          {c.received.count} received · {new Date(c.received.last_date).toLocaleDateString("en-GB")}
                        </span>
                      )}
                      {!hasReply && days !== null && (
                        <span className={days > 14 ? "text-orange-500 font-medium" : ""}>
                          {days === 0 ? "Contacted today" : `${days} day${days !== 1 ? "s" : ""} waiting`}
                          {days > 21 && <span className="ml-1 flex items-center gap-0.5 inline-flex"><AlertCircle className="w-3 h-3" /> Follow up now</span>}
                        </span>
                      )}
                    </div>

                    {/* Reply preview */}
                    {hasReply && c.received.last_body && (
                      <div className="mt-3 bg-green-50 border border-green-100 rounded-lg p-3">
                        <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                          <MailOpen className="w-3 h-3" /> Coach Reply — {c.received.last_subject || "No subject"}
                        </p>
                        <p className="text-xs text-slate-600 overflow-hidden" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {c.received.last_body}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 flex-shrink-0 min-w-[140px]">
                    {!hasReply ? (
                      <button
                        data-testid={`log-reply-btn-${c.college_id}`}
                        onClick={() => openLogModal(c)}
                        className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-4 py-2 text-xs hover:bg-orange-600 transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" /> Log Reply
                      </button>
                    ) : (
                      <>
                        {/* Next Steps — uses AI follow-up modal */}
                        <button
                          data-testid={`ai-next-steps-btn-${c.college_id}`}
                          onClick={() => getFollowUp(c)}
                          className="bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg px-4 py-2 text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5"
                        >
                          <Wand2 className="w-3.5 h-3.5 text-orange-400" /> Next Steps
                        </button>
                        {/* Outcome-specific shortcut */}
                        {(c.reply_outcome === "rejected" || c.reply_outcome === "scholarship_offered" || c.reply_outcome === "no_interest") && (                          <button
                            data-testid={`draft-thanks-btn-${c.college_id}`}
                            onClick={() => navigate("/compose", { state: { college: c.college, messageType: "thank_you" } })}
                            className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider rounded-lg px-4 py-2 text-xs hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Heart className="w-3.5 h-3.5" /> Thank You
                          </button>
                        )}
                        {(c.reply_outcome === "interested" || c.reply_outcome === "schedule_call" || c.reply_outcome === "second_follow_up") && (
                          <button
                            data-testid={`ai-followup-btn-${c.college_id}`}
                            onClick={() => getFollowUp(c)}
                            className="bg-green-50 text-green-700 border border-green-200 font-bold uppercase tracking-wider rounded-lg px-4 py-2 text-xs hover:bg-green-100 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Wand2 className="w-3.5 h-3.5" /> AI Strategy
                          </button>
                        )}
                      </>
                    )}
                    <button
                      data-testid={`compose-btn-${c.college_id}`}
                      onClick={() => navigate("/compose", { state: { college: c.college } })}
                      className="border border-slate-300 text-slate-600 font-bold uppercase tracking-wider rounded-lg px-4 py-2 text-xs hover:bg-slate-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Compose
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── AI NEXT STEPS MODAL ──────────────────────────────────────────────── */}
      {nextStepsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="ai-next-steps-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                  AI Next Steps
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{nextStepsModal.college.name}</p>
              </div>
              <button onClick={() => setNextStepsModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {nextStepsLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mb-4" />
                <p className="text-slate-500 text-sm">Generating your next steps...</p>
              </div>
            ) : nextStepsResult && (
              <div className="space-y-4">
                {/* Urgency + headline */}
                <div className={`rounded-xl p-4 ${
                  nextStepsResult.urgency_colour === "red" ? "bg-red-50 border border-red-200" :
                  nextStepsResult.urgency_colour === "orange" ? "bg-orange-50 border border-orange-200" :
                  "bg-green-50 border border-green-200"
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {nextStepsResult.urgency_colour === "red"
                      ? <AlertTriangle className="w-4 h-4 text-red-500" />
                      : nextStepsResult.urgency_colour === "orange"
                      ? <AlertTriangle className="w-4 h-4 text-orange-500" />
                      : <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      nextStepsResult.urgency_colour === "red" ? "text-red-600" :
                      nextStepsResult.urgency_colour === "orange" ? "text-orange-600" : "text-green-600"
                    }`}>{nextStepsResult.urgency_label}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-snug">{nextStepsResult.headline}</p>
                </div>

                {/* Numbered steps */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2.5">What to do now</p>
                  <div className="space-y-3">
                    {nextStepsResult.next_steps?.map((s, i) => (
                      <div key={i} className="flex gap-3">
                        <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0">{s.step}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{s.action}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What to avoid */}
                {nextStepsResult.what_to_avoid?.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Avoid These Mistakes</p>
                    <ul className="space-y-1.5">
                      {nextStepsResult.what_to_avoid.map((w, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                          <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* UK player tip */}
                {nextStepsResult.uk_player_tip && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5">
                    <Zap className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-0.5">UK Player Tip</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{nextStepsResult.uk_player_tip}</p>
                    </div>
                  </div>
                )}

                <button
                  data-testid="next-steps-compose-btn"
                  onClick={() => { setNextStepsModal(null); navigate("/compose", { state: { college: nextStepsModal.college } }); }}
                  className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Draft Email to {nextStepsModal.college.name}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOG REPLY MODAL ──────────────────────────────────────────────────── */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="log-reply-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                  Log Coach Reply
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{logModal.college.name}</p>
              </div>
              <button onClick={() => setLogModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Coach Name</label>
                <input
                  data-testid="reply-coach-name"
                  value={logForm.coach_name}
                  onChange={e => setLogForm({ ...logForm, coach_name: e.target.value })}
                  placeholder="Coach's name..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date Received</label>
                <input
                  data-testid="reply-date"
                  type="date"
                  value={logForm.received_date}
                  onChange={e => setLogForm({ ...logForm, received_date: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Subject</label>
                <input
                  data-testid="reply-subject"
                  value={logForm.subject}
                  onChange={e => setLogForm({ ...logForm, subject: e.target.value })}
                  placeholder={`Re: Basketball Scholarship - ${logModal.college.name}`}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Coach's Reply *</label>
                <textarea
                  data-testid="reply-body"
                  value={logForm.body}
                  onChange={e => setLogForm({ ...logForm, body: e.target.value })}
                  rows={5}
                  placeholder="Paste or type the coach's reply here..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Reply Outcome</label>
                <div className="grid grid-cols-2 gap-2" data-testid="outcome-selector">
                  {[
                    { value: "interested",          label: "Interested",             color: "border-green-400 bg-green-50 text-green-800" },
                    { value: "schedule_call",        label: "Call / Visit Requested", color: "border-blue-400 bg-blue-50 text-blue-800" },
                    { value: "scholarship_offered",  label: "Scholarship Offered",    color: "border-amber-400 bg-amber-50 text-amber-800" },
                    { value: "second_follow_up",     label: "2nd Follow Up",          color: "border-purple-400 bg-purple-50 text-purple-800" },
                    { value: "no_interest",          label: "No Interest",            color: "border-slate-400 bg-slate-100 text-slate-700" },
                  ].map(o => (
                    <button
                      key={o.value}
                      type="button"
                      data-testid={`outcome-${o.value}`}
                      onClick={() => setLogForm({ ...logForm, outcome: logForm.outcome === o.value ? "" : o.value })}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all text-center ${logForm.outcome === o.value ? o.color + " ring-2 ring-offset-1 ring-current" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setLogModal(null)}
                className="px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                data-testid="submit-reply-btn"
                onClick={submitReply}
                disabled={logSubmitting || !logForm.body.trim()}
                className="flex-1 bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-2.5 text-sm hover:bg-orange-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                {logSubmitting ? "Logging..." : "Log Reply & Update Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI FOLLOW-UP MODAL ───────────────────────────────────────────────── */}
      {aiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="ai-followup-modal">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                  AI Follow-up Strategy
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{aiModal.college.name}</p>
              </div>
              <button onClick={() => setAiModal(null)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Reply context */}
            {aiModal.replyBody && (
              <div className="bg-green-50 border border-green-100 rounded-lg p-3 mb-4">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                  <MailOpen className="w-3 h-3" /> Coach's Reply (analysed by AI)
                </p>
                <p className="text-xs text-slate-600">{aiModal.replyBody}</p>
              </div>
            )}

            {aiLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mb-4" />
                <p className="text-slate-500 text-sm">Generating your follow-up strategy...</p>
              </div>
            ) : (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">AI Strategy</p>
                  <div
                    data-testid="ai-followup-result"
                    className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed"
                  >
                    {aiResult}
                  </div>
                </div>
                <button
                  data-testid="draft-followup-btn"
                  onClick={() => { setAiModal(null); navigate("/compose", { state: { college: aiModal.college } }); }}
                  className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-orange-600 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Draft Follow-up Email
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
