import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { toast } from "sonner";
import { ArrowLeft, Film, Shield, Star, MapPin, GraduationCap, BarChart2, User, ExternalLink, Bookmark, Send, X, AlertCircle } from "lucide-react";

const PERIOD_WARNINGS = {
  dead: "You are in a NCAA Dead Period. In-person contact is not permitted. Ensure any written communication complies with your division rules.",
  quiet: "You are in a Quiet Period. Off-campus recruiting and evaluations are restricted.",
  evaluation: "You are in an Evaluation Period. Only on-campus contact is permitted.",
};

function SendMessageModal({ player, coach, onClose, onSent }) {
  const { coachReq } = useCoachAuth();
  const [form, setForm] = useState({ subject: "", body: "" });
  const [sending, setSending] = useState(false);
  const [periodWarning] = useState(PERIOD_WARNINGS[coach?.current_period_type] || null);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.body.trim()) { toast.error("Message body is required"); return; }
    setSending(true);
    try {
      await coachReq("post", `/messages/${player.user_id}`, form);
      toast.success("Message sent!");
      onSent();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send message");
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div>
            <h3 className="font-black text-white">Message {player?.full_name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{player?.position} · {player?.club_team || player?.hometown || "UK"}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        {periodWarning && (
          <div className="mx-5 mt-4 flex items-start gap-2 bg-amber-900/30 border border-amber-700/50 rounded-xl p-3">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300 text-xs leading-relaxed">{periodWarning}</p>
          </div>
        )}
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Subject (optional)</label>
            <input
              value={form.subject}
              onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
              placeholder="e.g. Recruiting Interest — Fort Hays State"
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={6}
              maxLength={2000}
              placeholder="Introduce yourself and your programme..."
              className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
              required
              data-testid="message-body-input"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{form.body.length}/2000</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={sending || !form.body.trim()} data-testid="send-message-btn"
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Message"}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors font-semibold text-sm">
              Cancel
            </button>
          </div>
          <p className="text-slate-600 text-xs text-center">By sending, you confirm this communication complies with your division's recruiting rules.</p>
        </form>
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-slate-800 rounded-xl px-4 py-3 text-center">
      <p className="text-xl font-black text-white">{value}</p>
      <p className="text-slate-400 text-xs mt-0.5 font-semibold">{label}</p>
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-blue-400" />
        <h3 className="font-black text-white text-sm uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-slate-800 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold">{value}</span>
    </div>
  );
}

export default function CoachPlayerProfile() {
  const { userId } = useParams();
  const { coachReq, coach } = useCoachAuth();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [saveList, setSaveList] = useState("Watch List");
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);

  const LISTS = ["Watch List", "Priority Targets", "Contacted", "Offer Extended"];

  useEffect(() => {
    coachReq("get", `/players/${userId}`)
      .then(r => setPlayer(r.data))
      .catch(err => {
        if (err?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async (listName = saveList) => {
    if (!player) return;
    setSaving(true);
    try {
      if (player.is_saved) {
        await coachReq("delete", `/players/${userId}/save`);
        setPlayer(prev => ({ ...prev, is_saved: false }));
      } else {
        await coachReq("post", `/players/${userId}/save`, { list_name: listName });
        setPlayer(prev => ({ ...prev, is_saved: true, saved_list: listName }));
      }
    } catch {}
    setSaving(false);
    setShowSaveMenu(false);
  };

  const matchColor = player?.match_score >= 80 ? "text-green-400" : player?.match_score >= 60 ? "text-blue-400" : "text-slate-400";

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <CoachNav />
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-950">
        <CoachNav />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-400 text-lg font-semibold">Player profile not found</p>
          <button onClick={() => navigate("/coach/players")} className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-semibold">← Back to Search</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />

      {/* Sticky action bar */}
      <div className="sticky top-14 z-30 bg-slate-950/95 border-b border-slate-800 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-sm truncate">{player?.full_name}</h1>
            <p className="text-slate-400 text-xs">{player?.position} · {player?.height_ft}</p>
          </div>
          {/* Action buttons */}
          <div className="flex gap-2 items-center">
            {/* Send Message */}
            <button
              onClick={() => setShowMessageModal(true)}
              data-testid="open-message-modal-btn"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors border border-blue-600"
            >
              <Send className="w-3.5 h-3.5" /> Message
            </button>
            {/* Save button */}
            <div className="relative">
              <div className="flex gap-1">
                <button onClick={() => handleSave()} disabled={saving} data-testid="save-player-profile-btn"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                    player?.is_saved ? "bg-blue-600/20 border border-blue-600 text-blue-300" : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-blue-600"
                  }`}>
                  <Bookmark className="w-3.5 h-3.5" /> {player?.is_saved ? `Saved: ${player.saved_list}` : "Save to Board"}
                </button>
                {!player?.is_saved && (
                  <button onClick={() => setShowSaveMenu(!showSaveMenu)} className="bg-slate-800 border border-slate-700 text-slate-300 px-2 py-2 rounded-lg hover:border-blue-600 transition-colors text-xs">▾</button>
                )}
              </div>
              {showSaveMenu && (
                <div className="absolute right-0 top-10 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-48 py-1 z-50">
                  <p className="px-3 py-1.5 text-xs text-slate-500 font-bold uppercase">Save to list</p>
                  {LISTS.map(l => (
                    <button key={l} onClick={() => handleSave(l)} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors">{l}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 mb-5">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-3xl flex-shrink-0">
              {(player?.full_name || "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-2xl font-black text-white">{player?.full_name}</h2>
                {player?.ncaa_registered && (
                  <span className="flex items-center gap-1 bg-green-900/50 border border-green-700/50 text-green-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    <Shield className="w-3 h-3" /> NCAA Reg.
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-300 mb-3">
                <span className="font-bold text-blue-300">{player?.position}{player?.secondary_position ? ` / ${player.secondary_position}` : ""}</span>
                {player?.height_ft && <span>· {player.height_ft}</span>}
                {player?.weight_kg && <span>· {player.weight_kg}kg</span>}
                {player?.dominant_hand && <span>· {player.dominant_hand} hand</span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                {player?.club_team && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {player.club_team}</span>}
                {player?.hometown && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {player.hometown}</span>}
                {player?.expected_graduation && <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Grad {player.expected_graduation}</span>}
              </div>
            </div>
            {/* Match Score */}
            {player?.match_score != null && (
              <div className="text-center flex-shrink-0">
                <p className={`text-4xl font-black ${matchColor}`}>{player.match_score}%</p>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Match</p>
              </div>
            )}
          </div>
          {/* AI Summary */}
          {player?.ai_summary && (
            <div className="mt-4 bg-blue-950/50 border border-blue-800/40 rounded-xl px-4 py-3">
              <p className="text-blue-200 text-sm italic">"{player.ai_summary}"</p>
              <p className="text-blue-500 text-xs mt-1 flex items-center gap-1"><Star className="w-3 h-3" /> AI recruiting summary</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">

            {/* Season Stats */}
            {(player?.ppg || player?.rpg || player?.apg || player?.spg || player?.fg_percent) && (
              <Section title="Season Statistics" icon={BarChart2}>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  <StatPill label="PPG" value={player.ppg} />
                  <StatPill label="RPG" value={player.rpg} />
                  <StatPill label="APG" value={player.apg} />
                  <StatPill label="SPG" value={player.spg} />
                  <StatPill label="FG%" value={player.fg_percent || null} />
                  <StatPill label="3P%" value={player.three_pt_percent || null} />
                  <StatPill label="FT%" value={player.ft_percent || null} />
                  <StatPill label="BPG" value={player.bpg} />
                </div>
              </Section>
            )}

            {/* Highlight Reel */}
            {player?.highlight_tape_url && (
              <Section title="Highlight Reel" icon={Film}>
                <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden">
                  {player.highlight_tape_url.includes("youtube.com") || player.highlight_tape_url.includes("youtu.be") ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${player.highlight_tape_url.split("v=")[1]?.split("&")[0] || player.highlight_tape_url.split("/").pop()}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Highlight reel"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <a href={player.highlight_tape_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl transition-colors">
                        <Film className="w-5 h-5" /> Watch Highlight Reel <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Bio */}
            {player?.bio && (
              <Section title="Player Bio" icon={User}>
                <p className="text-slate-300 text-sm leading-relaxed">{player.bio}</p>
              </Section>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Athletic Profile */}
            <Section title="Athletic Profile" icon={Star}>
              <InfoRow label="Position" value={`${player?.position || ""}${player?.secondary_position ? ` / ${player.secondary_position}` : ""}`} />
              <InfoRow label="Height" value={player?.height_ft} />
              <InfoRow label="Weight" value={player?.weight_kg ? `${player.weight_kg} kg` : null} />
              <InfoRow label="Wingspan" value={player?.wingspan_cm ? `${player.wingspan_cm} cm` : null} />
              <InfoRow label="Dominant Hand" value={player?.dominant_hand} />
              <InfoRow label="Current Club" value={player?.club_team || player?.current_team} />
              <InfoRow label="Years Playing" value={player?.years_playing ? `${player.years_playing} years` : null} />
            </Section>

            {/* Academic Profile */}
            <Section title="Academic Profile" icon={GraduationCap}>
              <InfoRow label="Current School" value={player?.current_school} />
              <InfoRow label="School Year" value={player?.school_year} />
              <InfoRow label="Expected Graduation" value={player?.expected_graduation} />
              <InfoRow label="A-Level Subjects" value={player?.a_level_subjects} />
              <InfoRow label="Predicted Grades" value={player?.predicted_grades} />
              <InfoRow label="GPA Equivalent" value={player?.gpa_equivalent ? `${player.gpa_equivalent} GPA` : null} />
              <InfoRow label="SAT Score" value={player?.sat_score} />
              <InfoRow label="ACT Score" value={player?.act_score} />
              <InfoRow label="Intended Major" value={player?.intended_major} />
              <InfoRow label="NCAA Eligible" value={player?.ncaa_registered ? "Registered ✓" : "Not yet registered"} />
              <InfoRow label="Target Division" value={player?.target_division} />
              <InfoRow label="Target Start" value={player?.target_start_year} />
            </Section>
          </div>
        </div>
      </div>

      {showMessageModal && player && (
        <SendMessageModal
          player={player}
          coach={coach}
          onClose={() => setShowMessageModal(false)}
          onSent={() => {
            setPlayer(prev => ({ ...prev, is_saved: prev.is_saved }));
          }}
        />
      )}
    </div>
  );
}
