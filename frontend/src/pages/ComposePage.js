import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Wand2, Copy, Save, ArrowLeft, ChevronDown } from "lucide-react";

export default function ComposePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const preloaded = location.state;

  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(preloaded?.college || null);
  const [selectedCoach, setSelectedCoach] = useState(preloaded?.coach || null);
  const [messageType, setMessageType] = useState("initial_outreach");
  const [position, setPosition] = useState("point guard");
  const [stats, setStats] = useState("");
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("get", "/colleges").then(r => setColleges(r.data)).catch(() => {});
  }, []);

  const generateDraft = async () => {
    if (!selectedCollege) { setError("Please select a college first."); return; }
    setError("");
    setGenerating(true);
    try {
      const { data } = await apiRequest("post", "/ai/draft-message", {
        college_name: selectedCollege.name,
        coach_name: selectedCoach?.name || "Coach",
        division: selectedCollege.division || "Division I",
        user_name: "England U18 Player",
        user_position: position,
        user_stats: stats,
        message_type: messageType
      });
      setDraft(data.draft);
      if (!subject) {
        const subjectMap = {
          initial_outreach: `Basketball Scholarship Inquiry - England U18 Player | England Under-18`,
          follow_up: `Follow-Up: Basketball Scholarship Inquiry - ${selectedCollege.name}`,
          thank_you: `Thank You - ${selectedCollege.name} Basketball`
        };
        setSubject(subjectMap[messageType] || "Basketball Scholarship Inquiry");
      }
    } catch (err) {
      setError("AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const saveDraft = async () => {
    if (!draft || !selectedCollege) return;
    setSaving(true);
    try {
      await apiRequest("post", "/emails", {
        college_id: selectedCollege.id,
        direction: "sent",
        subject: subject || "Draft",
        body: draft,
        coach_name: selectedCoach?.name || "",
        coach_email: selectedCoach?.email || ""
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const copyDraft = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const messageTypes = [
    { value: "initial_outreach", label: "Initial Outreach" },
    { value: "follow_up", label: "Follow-Up" },
    { value: "thank_you", label: "Thank You" }
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
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Your Position</label>
              <div className="relative">
                <select
                  data-testid="compose-position-select"
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                >
                  <option value="point guard">Point Guard</option>
                  <option value="shooting guard">Shooting Guard</option>
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
          </div>
        </div>

        {/* Right: Draft Editor */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Email Draft</h2>
            {draft && (
              <div className="flex gap-2">
                <button data-testid="compose-copy-btn" onClick={copyDraft} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  <Copy className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Copy"}
                </button>
                <button data-testid="compose-save-btn" onClick={saveDraft} disabled={saving} className="flex items-center gap-1.5 text-xs bg-green-500 text-white hover:bg-green-600 px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" /> {saved ? "Saved!" : saving ? "Saving..." : "Save to Log"}
                </button>
              </div>
            )}
          </div>

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
