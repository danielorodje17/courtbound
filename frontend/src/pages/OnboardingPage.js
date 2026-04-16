import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Trophy, ArrowRight, ChevronRight, CheckCircle2, Sparkles, X } from "lucide-react";

const STEP_IMAGES = [
  "https://images.unsplash.com/photo-1759694423710-8e8defcfefd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHw0fHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwZHVuayUyMGR1bmtpbmclMjBnYW1lfGVufDB8fHx8MTc3NjM3MDE2OHww&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1677617586882-2b494292ebbe?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzR8MHwxfHNlYXJjaHwyfHxlbXB0eSUyMGluZG9vciUyMGJhc2tldGJhbGwlMjBjb3VydCUyMGRhcmt8ZW58MHx8fHwxNzc2MzcwMTc4fDA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1763770449161-eb1cd5596415?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxNzV8MHwxfHNlYXJjaHwzfHx1bml2ZXJzaXR5JTIwY2FtcHVzJTIwYnVpbGRpbmclMjBuaWdodHxlbnwwfHx8fDE3NzYzNzAxNzh8MA&ixlib=rb-4.1.0&q=85",
  "https://images.unsplash.com/photo-1759694423710-8e8defcfefd3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzB8MHwxfHNlYXJjaHw0fHxiYXNrZXRiYWxsJTIwcGxheWVyJTIwZHVuayUyMGR1bmtpbmclMjBnYW1lfGVufDB8fHx8MTc3NjM3MDE2OHww&ixlib=rb-4.1.0&q=85",
];

const STEP_LABELS = ["Who Are You?", "How Do You Play?", "Your Goals", "First Matches"];

const POSITIONS = ["Point Guard", "Shooting Guard", "Combo Guard", "Small Forward", "Power Forward", "Center"];
const DIVISIONS = ["Division I", "Division II", "NAIA", "JUCO"];
const YEARS = ["2025", "2026", "2027", "2028"];

const FIT_COLORS = {
  excellent_fit: { bg: "bg-green-900/30 border-green-500/40", badge: "bg-green-500", label: "Excellent Fit" },
  good_fit:      { bg: "bg-orange-900/20 border-orange-500/40", badge: "bg-orange-500", label: "Good Fit" },
  possible_fit:  { bg: "bg-slate-800/60 border-slate-600/40", badge: "bg-slate-500", label: "Possible Fit" },
};

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", testId }) {
  return (
    <input
      data-testid={testId}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-black/40 border border-white/15 rounded px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
    />
  );
}

function Sel({ value, onChange, options, testId, placeholder = "Select..." }) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-black/40 border border-white/15 rounded px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all appearance-none"
      style={{ color: value ? "#fff" : "#475569" }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o} style={{ background: "#0f172a", color: "#fff" }}>{o}</option>)}
    </select>
  );
}

export default function OnboardingPage({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [matches, setMatches] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const [form, setForm] = useState({
    full_name: "", primary_position: "", secondary_position: "",
    height_ft: "", height_cm: "",
    ppg: "", apg: "", rpg: "", current_team: "", club_team: "", highlight_tape_url: "",
    gcse_grades: "", a_level_subjects: "", target_division: "", target_start_year: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiRequest("put", "/profile", { ...form, position: form.primary_position });
    } catch {}
    setSaving(false);
  };

  const runMatch = async () => {
    setMatchLoading(true);
    try {
      const { data } = await apiRequest("get", "/ai/match");
      const topMatches = [
        ...(data.excellent_fit || []).slice(0, 2),
        ...(data.good_fit || []).slice(0, 1),
      ].slice(0, 3);
      setMatches(topMatches.map(m => ({ ...m, tier: data.excellent_fit?.find(c => c.id === m.id) ? "excellent_fit" : "good_fit" })));
    } catch {
      setMatches([]);
    }
    setMatchLoading(false);
  };

  const next = async () => {
    if (step === 3) {
      await saveProfile();
      setStep(4);
      runMatch();
    } else if (step === 4) {
      if (onComplete) onComplete();
      localStorage.setItem("cb_onboarded", "1");
      navigate("/dashboard");
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    localStorage.setItem("cb_onboarded", "1");
    if (onComplete) onComplete();
    navigate("/dashboard");
  };

  const progress = ((step - 1) / 4) * 100;

  return (
    <div className="min-h-screen flex" style={{ background: "#0A0A0A", fontFamily: "Manrope, sans-serif" }}>

      {/* ── LEFT PANEL (image) ───────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-5/12 relative overflow-hidden"
        style={{
          backgroundImage: `url(${STEP_IMAGES[step - 1]})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transition: "background-image 0.5s ease",
        }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, transparent 60%)" }} />
        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded flex items-center justify-center">
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-sm uppercase tracking-widest" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            CourtBound
          </span>
        </div>
        <div className="relative z-10 p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400 mb-3">Step {step} of 4</p>
          <h2
            className="text-5xl font-black uppercase text-white leading-none"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {STEP_LABELS[step - 1]}
          </h2>
        </div>
      </div>

      {/* ── RIGHT PANEL (form) ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Progress bar */}
        <div className="h-1 bg-white/10 flex-shrink-0">
          <div
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-white text-xs uppercase tracking-widest" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>CourtBound</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Step {step}/4</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-8 pt-8 pb-4 flex-shrink-0">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                i + 1 < step ? "bg-orange-500 text-white" :
                i + 1 === step ? "bg-white text-black" :
                "bg-white/10 text-slate-500"
              }`}>
                {i + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${i + 1 === step ? "text-white" : "text-slate-600"}`}>
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 ml-1" />}
            </div>
          ))}
        </div>

        {/* Form content */}
        <div className="flex-1 overflow-y-auto px-8 py-4">
          <div className="max-w-md w-full mx-auto space-y-5">

            {/* ── STEP 1 ── */}
            {step === 1 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Who Are You?</h3>
                  <p className="text-sm text-slate-500">Let's start with the basics. Coaches will see this.</p>
                </div>
                <Field label="Full Name">
                  <Input value={form.full_name} onChange={v => set("full_name", v)} placeholder="Your full name" testId="ob-name" />
                </Field>
                <Field label="Primary Position">
                  <Sel value={form.primary_position} onChange={v => set("primary_position", v)} options={POSITIONS} testId="ob-primary-pos" placeholder="Select primary position" />
                </Field>
                <Field label="Secondary Position (optional)">
                  <Sel value={form.secondary_position} onChange={v => set("secondary_position", v)} options={["None", ...POSITIONS]} testId="ob-secondary-pos" placeholder="Select secondary position" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Height (ft/in)">
                    <Input value={form.height_ft} onChange={v => set("height_ft", v)} placeholder="e.g. 6ft 4in" testId="ob-height-ft" />
                  </Field>
                  <Field label="Height (cm)">
                    <Input value={form.height_cm} onChange={v => set("height_cm", v)} placeholder="e.g. 193" testId="ob-height-cm" />
                  </Field>
                </div>
              </>
            )}

            {/* ── STEP 2 ── */}
            {step === 2 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>How Do You Play?</h3>
                  <p className="text-sm text-slate-500">Season averages and your highlight reel. This is what coaches ask for first.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="PPG">
                    <Input value={form.ppg} onChange={v => set("ppg", v)} placeholder="18.5" testId="ob-ppg" />
                  </Field>
                  <Field label="APG">
                    <Input value={form.apg} onChange={v => set("apg", v)} placeholder="6.2" testId="ob-apg" />
                  </Field>
                  <Field label="RPG">
                    <Input value={form.rpg} onChange={v => set("rpg", v)} placeholder="4.1" testId="ob-rpg" />
                  </Field>
                </div>
                <Field label="National / Academy Team">
                  <Input value={form.current_team} onChange={v => set("current_team", v)} placeholder="e.g. England Under-18" testId="ob-team" />
                </Field>
                <Field label="Club Team">
                  <Input value={form.club_team} onChange={v => set("club_team", v)} placeholder="e.g. London Lions U18" testId="ob-club" />
                </Field>
                <Field label="Highlight Tape URL">
                  <Input value={form.highlight_tape_url} onChange={v => set("highlight_tape_url", v)} placeholder="YouTube, Hudl or FIBA link" testId="ob-tape" />
                </Field>
                <div className="bg-orange-500/10 border border-orange-500/30 rounded p-3 flex gap-2.5">
                  <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">A highlight tape is the <strong className="text-orange-400">#1 thing coaches ask for</strong>. Upload to YouTube or Hudl and paste the link — it dramatically increases your response rate.</p>
                </div>
              </>
            )}

            {/* ── STEP 3 ── */}
            {step === 3 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Your Goals</h3>
                  <p className="text-sm text-slate-500">Academic eligibility and target program type. The AI uses this to find your best-fit colleges.</p>
                </div>
                <Field label="GCSE Results (e.g. 8 A*-B grades)">
                  <Input value={form.gcse_grades} onChange={v => set("gcse_grades", v)} placeholder="e.g. 9 A*-C including Maths & English" testId="ob-gcse" />
                </Field>
                <Field label="A-Level Subjects (predicted/actual)">
                  <Input value={form.a_level_subjects} onChange={v => set("a_level_subjects", v)} placeholder="e.g. Maths A*, Business A, PE B" testId="ob-alevels" />
                </Field>
                <Field label="Target Division">
                  <Sel value={form.target_division} onChange={v => set("target_division", v)} options={DIVISIONS} testId="ob-division" placeholder="Which division are you targeting?" />
                </Field>
                <Field label="Target Enrolment Year">
                  <Sel value={form.target_start_year} onChange={v => set("target_start_year", v)} options={YEARS} testId="ob-year" placeholder="When do you want to start?" />
                </Field>
              </>
            )}

            {/* ── STEP 4 ── */}
            {step === 4 && (
              <div data-testid="onboarding-matches-step">
                <div className="mb-6">
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Your First Matches</h3>
                  <p className="text-sm text-slate-500">AI is scanning 274 colleges against your profile right now.</p>
                </div>
                {matchLoading && (
                  <div className="space-y-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="h-24 rounded bg-white/5 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                    <p className="text-xs text-center text-slate-600 pt-2 animate-pulse">Analysing your profile...</p>
                  </div>
                )}
                {matches && matches.length > 0 && (
                  <div className="space-y-3">
                    {matches.map((m, i) => {
                      const cfg = FIT_COLORS[m.tier] || FIT_COLORS.good_fit;
                      return (
                        <div key={i} data-testid={`ob-match-${i}`}
                          className={`border rounded p-4 flex items-start justify-between gap-3 ${cfg.bg} transition-all`}
                          style={{ animationDelay: `${i * 0.1}s` }}>
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{m.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{m.division}</p>
                            {m.why && <p className="text-xs text-slate-400 mt-1.5 leading-snug line-clamp-2">{m.why}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`${cfg.badge} text-white text-xs font-black px-2 py-0.5 rounded-full`}>{Math.min(m.pct, 86)}%</span>
                            <span className="text-xs text-slate-500">{cfg.label}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div className="bg-green-900/20 border border-green-500/30 rounded p-4 mt-4 flex gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <strong className="text-green-400">Profile saved.</strong> You can run a full AI match at any time from the AI Match page to see all 30 colleges ranked.
                      </p>
                    </div>
                  </div>
                )}
                {matches && matches.length === 0 && (
                  <div className="bg-orange-900/20 border border-orange-500/30 rounded p-4 text-sm text-slate-400">
                    Complete your profile with more detail to get AI match results. Head to the Profile page to fill in your stats.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom nav */}
        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <button
            data-testid="ob-skip"
            onClick={skip}
            className="text-xs text-slate-600 hover:text-slate-400 uppercase tracking-widest font-bold transition-colors flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" /> Skip for now
          </button>
          <button
            data-testid="ob-next"
            onClick={next}
            disabled={saving}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-black uppercase tracking-widest px-6 py-3 rounded text-sm transition-all"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            {saving ? "Saving..." :
              step === 4 ? "Go to Dashboard" :
              step === 3 ? "Save & See My Matches" :
              "Next"}
            {!saving && step !== 4 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
