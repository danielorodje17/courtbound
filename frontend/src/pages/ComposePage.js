import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Wand2, Copy, ArrowLeft, ChevronDown, Trash2, X, Plus, BookMarked, Film, Mail, ExternalLink, CheckCircle } from "lucide-react";

export default function ComposePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preloaded = location.state;

  const [playerProfile, setPlayerProfile] = useState({});
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(preloaded?.college || null);
  const [selectedCoach, setSelectedCoach] = useState(preloaded?.coach || null);
  const [messageType, setMessageType] = useState(preloaded?.messageType || "initial_outreach");
  const [position, setPosition] = useState("point guard");
  const [secondaryPosition, setSecondaryPosition] = useState("");
  const [stats, setStats] = useState("");
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");

  // Template library state
  const [templates, setTemplates] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);

  // Prior outreach detection
  const [alreadyContacted, setAlreadyContacted] = useState(false);

  // When college changes, check if initial outreach was already sent
  useEffect(() => {
    if (!selectedCollege?.id) { setAlreadyContacted(false); return; }
    apiRequest("get", `/emails?college_id=${selectedCollege.id}`)
      .then(r => {
        const sentInitial = (r.data || []).some(
          e => e.direction === "sent" && e.message_type === "initial_outreach"
        );
        setAlreadyContacted(sentInitial);
        if (sentInitial) setMessageType("follow_up");
      })
      .catch(() => {});
  }, [selectedCollege?.id]);

  useEffect(() => {
    apiRequest("get", "/colleges").then(r => setColleges(r.data)).catch(() => {});
    apiRequest("get", "/profile").then(r => {
      const p = r.data || {};
      setPlayerProfile(p);
      if (p.primary_position) setPosition(p.primary_position.toLowerCase());
      else if (p.position) setPosition(p.position.toLowerCase());
      if (p.secondary_position && p.secondary_position !== "None") setSecondaryPosition(p.secondary_position.toLowerCase());
      if (p.ppg && p.apg) setStats(`${p.ppg} PPG, ${p.apg} APG${p.rpg ? `, ${p.rpg} RPG` : ""}${p.current_team ? ` — ${p.current_team}` : ""}`);
    }).catch(() => {});
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const r = await apiRequest("get", "/templates");
      setTemplates(r.data);
    } catch {}
  };

  const generateDraft = async () => {
    if (!selectedCollege) { setError("Please select a college first."); return; }
    setError("");
    setGenerating(true);
    setShowSaveTemplate(false);
    try {
      const { data } = await apiRequest("post", "/ai/draft-message", {
        college_name: selectedCollege.name,
        coach_name: selectedCoach?.name || "Coach",
        division: selectedCollege.division || "Division I",
        user_name: playerProfile.full_name || "England U18 Player",
        user_position: position,
        user_secondary_position: secondaryPosition || "",
        user_stats: stats,
        user_email: playerProfile.email || "",
        user_phone: playerProfile.phone || "",
        highlight_tape_url: playerProfile.highlight_tape_url || "",
        message_type: messageType
      });
      setDraft(data.draft);
      if (!subject) {
        const playerName = playerProfile.full_name || "England U18 Player";
        const subjectMap = {
          initial_outreach:  `Basketball Scholarship Inquiry - ${playerName} | England Under-18`,
          follow_up:         `Follow-Up: Basketball Scholarship Inquiry - ${selectedCollege.name}`,
          second_follow_up:  `Second Follow-Up: Basketball Scholarship - ${playerName}`,
          reply_to_interest: `Re: Your Interest — ${playerName} | Basketball`,
          reply_to_offer:    `Re: Scholarship Offer — ${playerName} | ${selectedCollege.name}`,
          after_call:        `Following Our Call — ${playerName} | ${selectedCollege.name} Basketball`,
          after_visit:       `Following My Campus Visit — ${playerName} | ${selectedCollege.name}`,
          thank_you:         `Thank You - ${playerName} | ${selectedCollege.name}`,
        };
        setSubject(subjectMap[messageType] || "Basketball Scholarship Inquiry");
      }
    } catch {
      setError("AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    if (!draft || !selectedCollege) return;
    const coachEmail = selectedCoach?.email || "";
    const sendingEmail = playerProfile.email || "";
    const authParam = sendingEmail ? `&authuser=${encodeURIComponent(sendingEmail)}` : "";
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${authParam}${coachEmail ? `&to=${encodeURIComponent(coachEmail)}` : ""}&su=${encodeURIComponent(subject || "Basketball Scholarship Inquiry")}&body=${encodeURIComponent(draft)}`;
    window.open(gmailUrl, "_blank");
    setAwaitingConfirmation(true);
    setConfirmed(false);
  };

  const confirmEmailSent = async () => {
    if (!selectedCollege) return;
    setConfirming(true);
    try {
      await apiRequest("post", "/emails", {
        college_id: selectedCollege.id,
        direction: "sent",
        subject: subject || "Basketball Scholarship Inquiry",
        body: draft,
        coach_name: selectedCoach?.name || "",
        coach_email: selectedCoach?.email || "",
        message_type: messageType,
      });
      try {
        await apiRequest("post", "/my-colleges", { college_id: selectedCollege.id, notes: "" });
      } catch {} // 400 = already tracked
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + 7);
      await apiRequest("patch", `/my-colleges/${selectedCollege.id}/status`, {
        status: "contacted",
        follow_up_date: followUpDate.toISOString().split("T")[0],
      });
      setAwaitingConfirmation(false);
      setConfirmed(true);
      setTimeout(() => setConfirmed(false), 6000);
    } catch (err) {
      console.error("Failed to log email:", err);
    } finally {
      setConfirming(false);
    }
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim() || !draft) return;
    setSavingTemplate(true);
    try {
      const res = await apiRequest("post", "/templates", {
        name: templateName.trim(),
        subject: subject || "",
        body: draft,
        message_type: messageType,
      });
      setTemplates(prev => [res.data, ...prev]);
      setTemplateName("");
      setShowSaveTemplate(false);
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 2500);
    } catch {}
    setSavingTemplate(false);
  };

  const loadTemplate = (tpl) => {
    setDraft(tpl.body);
    if (tpl.subject) setSubject(tpl.subject);
    setMessageType(tpl.message_type || "initial_outreach");
    setShowTemplates(false);
  };

  const deleteTemplate = async (id, e) => {
    e.stopPropagation();
    try {
      await apiRequest("delete", `/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const messageTypes = [
    { value: "initial_outreach",  label: "Initial Outreach"   },
    { value: "follow_up",         label: "Follow-Up"          },
    { value: "second_follow_up",  label: "2nd Follow Up"      },
    { value: "reply_to_interest", label: "Reply to Interest"  },
    { value: "reply_to_offer",    label: "Reply to Offer"     },
    { value: "after_call",        label: "After Call"         },
    { value: "after_visit",       label: "After Visit"        },
  ];

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="mb-6">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">AI Message Composer</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          Draft Your Email
        </h1>
        <p className="text-slate-500 mt-1">Let AI help you write a compelling message to coaches</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Settings Panel */}
        <div className="space-y-4">

          {/* Template Library Panel */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <button
              data-testid="templates-toggle-btn"
              onClick={() => setShowTemplates(!showTemplates)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <BookMarked className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-sm text-slate-700 uppercase tracking-wider" style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "0.05em" }}>
                  My Templates
                </span>
                {templates.length > 0 && (
                  <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {templates.length}
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
            </button>

            {showTemplates && (
              <div className="border-t border-slate-100 p-4">
                {templates.length === 0 ? (
                  <p className="text-slate-400 text-sm text-center py-3">
                    No saved templates yet. Generate a draft and save it as a template.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {templates.map(tpl => (
                      <div
                        key={tpl.id}
                        data-testid={`template-item-${tpl.id}`}
                        onClick={() => loadTemplate(tpl)}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-orange-50 transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{tpl.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{tpl.subject || "No subject"}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full uppercase">
                            {tpl.message_type?.replace("_", " ")}
                          </span>
                          <button
                            data-testid={`delete-template-${tpl.id}`}
                            onClick={(e) => deleteTemplate(tpl.id, e)}
                            className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Message Settings</h2>

            {/* College selector */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Target College *</label>
              <div className="relative">
                <select
                  data-testid="compose-college-select"
                  value={selectedCollege?.id || ""}
                  onChange={e => {
                    const c = colleges.find(c => c.id === e.target.value);
                    setSelectedCollege(c || null);
                    setSelectedCoach(null);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                >
                  <option value="">Select a college...</option>
                  {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Coach selector */}
            {selectedCollege?.coaches?.length > 0 && (
              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Coach</label>
                <div className="relative">
                  <select
                    data-testid="compose-coach-select"
                    value={selectedCoach?.name || ""}
                    onChange={e => setSelectedCoach(selectedCollege.coaches.find(c => c.name === e.target.value) || null)}
                    className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                  >
                    <option value="">Select a coach...</option>
                    {selectedCollege.coaches.map(c => <option key={c.name} value={c.name}>{c.name} - {c.title}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Prior outreach warning */}
            {alreadyContacted && (
              <div className="mb-4 flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3" data-testid="already-contacted-warning">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                <div>
                  <p className="text-sm font-bold text-amber-800">Initial outreach already sent to {selectedCollege?.name}</p>
                  <p className="text-xs text-amber-700 mt-0.5">Switched to <strong>Follow-Up</strong> automatically. You can change this below if needed.</p>
                </div>
              </div>
            )}

            {/* Message type */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Message Type</label>
              <div className="flex gap-2 flex-wrap">
                {messageTypes.map(t => (
                  <button
                    key={t.value}
                    data-testid={`message-type-${t.value}`}
                    onClick={() => setMessageType(t.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${messageType === t.value ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Primary Position</label>
              <div className="relative">
                <select
                  data-testid="compose-position-select"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                >
                  <option value="point guard">Point Guard</option>
                  <option value="shooting guard">Shooting Guard</option>
                  <option value="combo guard">Combo Guard</option>
                  <option value="small forward">Small Forward</option>
                  <option value="power forward">Power Forward</option>
                  <option value="center">Center</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Secondary Position <span className="text-slate-400 normal-case font-normal">(optional — adds versatility to your email)</span></label>
              <div className="relative">
                <select
                  data-testid="compose-secondary-position-select"
                  value={secondaryPosition}
                  onChange={e => setSecondaryPosition(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                >
                  <option value="">None</option>
                  <option value="point guard">Point Guard</option>
                  <option value="shooting guard">Shooting Guard</option>
                  <option value="combo guard">Combo Guard</option>
                  <option value="small forward">Small Forward</option>
                  <option value="power forward">Power Forward</option>
                  <option value="center">Center</option>
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Stats */}
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Key Stats / Highlights (optional)</label>
              <textarea
                data-testid="compose-stats-input"
                value={stats}
                onChange={e => setStats(e.target.value)}
                rows={3}
                placeholder="e.g. 18 PPG, 7 APG for England U18. Led team to European Championships..."
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              data-testid="compose-generate-btn"
              onClick={generateDraft}
              disabled={generating || !selectedCollege}
              className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              {generating ? "Generating..." : "Generate Draft with AI"}
            </button>

            {/* Tape indicator */}
            {playerProfile.highlight_tape_url ? (
              <div className="mt-2 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5" data-testid="tape-included-indicator">
                <Film className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-emerald-700">Highlight tape auto-included in draft</p>
                  <a href={playerProfile.highlight_tape_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 hover:underline truncate block max-w-xs">
                    {playerProfile.highlight_tape_url}
                  </a>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5" data-testid="tape-missing-hint">
                <Film className="w-3 h-3" />
                Add your Hudl/YouTube link in Profile to auto-include in drafts
              </p>
            )}
          </div>
        </div>

        {/* Right: Draft Editor */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Draft</h2>
            {draft && (
              <div className="flex gap-2 flex-wrap">
                <button data-testid="compose-copy-btn" onClick={copyDraft} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  data-testid="save-template-btn"
                  onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${showSaveTemplate ? "bg-purple-100 text-purple-700" : "bg-purple-50 text-purple-600 hover:bg-purple-100"}`}
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  {templateSaved ? "Template Saved!" : "Save as Template"}
                </button>
              </div>
            )}
          </div>

          {/* Optional: Save as Template inline form */}
          {showSaveTemplate && draft && (
            <form
              data-testid="save-template-form"
              onSubmit={handleSaveTemplate}
              className="mb-4 bg-purple-50 border border-purple-200 rounded-lg p-3"
            >
              <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">Save as Template</p>
              <div className="flex gap-2">
                <input
                  data-testid="template-name-input"
                  type="text"
                  required
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g. D1 Initial Outreach)..."
                  className="flex-1 border border-purple-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none bg-white"
                />
                <button
                  type="submit"
                  disabled={savingTemplate || !templateName.trim()}
                  className="bg-purple-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-60"
                >
                  {savingTemplate ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={() => setShowSaveTemplate(false)} className="text-slate-400 hover:text-slate-600 p-2">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Subject */}
          <div className="mb-3">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Subject</label>
            <input
              data-testid="compose-subject-input"
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Body</label>
            <textarea
              data-testid="compose-body-textarea"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={16}
              placeholder={generating ? "AI is drafting your email..." : "Your AI-generated draft will appear here. You can edit it freely."}
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none"
            />
          </div>

          {/* Open in Gmail — primary send action */}
          {draft && (
            <div className="mt-4 space-y-3">
              {/* Step 1 — Open Gmail */}
              <button
                data-testid="open-in-gmail-btn"
                onClick={openInGmail}
                disabled={!selectedCollege}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-700 text-white font-bold uppercase tracking-wider rounded-lg py-3.5 text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                Open in Gmail
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </button>
              {playerProfile.email ? (
                <p className="text-xs text-slate-500 text-center">
                  Will open as <span className="font-semibold text-slate-700">{playerProfile.email}</span> — make sure you're signed into this account in Gmail.
                </p>
              ) : (
                <p className="text-xs text-amber-600 text-center">
                  No email set in your <a href="/profile" className="underline font-semibold">Profile</a> — Gmail may open the wrong account. Add your recruiting email to fix this.
                </p>
              )}

              {/* Step 2 — Awaiting confirmation */}
              {awaitingConfirmation && (
                <div className="border border-orange-200 bg-orange-50 rounded-xl p-4 space-y-3" data-testid="gmail-confirm-card">
                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-900">Please confirm once you've sent the email</p>
                      <p className="text-xs text-orange-700 mt-1 leading-relaxed">
                        CourtBound can't detect sends from Gmail, so your confirmation lets us log this to your <strong>Sent Emails</strong> history and set a <strong>7-day follow-up reminder</strong> for {selectedCollege?.name} in Priority Actions.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      data-testid="confirm-email-sent-btn"
                      onClick={confirmEmailSent}
                      disabled={confirming}
                      className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm uppercase tracking-wider rounded-lg py-2.5 transition-colors disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {confirming ? "Logging..." : "Yes, Email Sent"}
                    </button>
                    <button
                      data-testid="cancel-gmail-confirm-btn"
                      onClick={() => setAwaitingConfirmation(false)}
                      className="px-4 py-2.5 rounded-lg border border-orange-200 text-sm font-medium text-orange-600 hover:bg-orange-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 — Confirmed success */}
              {confirmed && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3" data-testid="gmail-sent-confirmation">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Email logged successfully</p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                      <strong>{selectedCollege?.name}</strong> marked as Contacted. Follow-up reminder set for 7 days — check Priority Actions on your Dashboard.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {!draft && !generating && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700 font-medium">
                Select a college and click "Generate Draft with AI" to get a personalised email draft.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
