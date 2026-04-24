import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Trophy, ArrowRight, X, CheckCircle2, ChevronRight, Sparkles, Instagram, Twitter } from "lucide-react";

const POSITIONS = ["Point Guard", "Shooting Guard", "Small Forward", "Power Forward", "Center"];
const DIVISIONS = ["NCAA Division I", "NCAA Division II", "NCAA Division III", "NAIA", "NJCAA", "BUCS (UK)"];
const YEARS = ["2025", "2026", "2027", "2028", "2029"];

const MEN_IMAGES = [
  "https://images.unsplash.com/photo-1546519638405-a2f9b51da64f?w=900&q=80",
  "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900&q=80",
  "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=900&q=80",
  "https://images.unsplash.com/photo-1474469176798-8ff83abe4a42?w=900&q=80",
];
const WOMEN_IMAGES = [
  "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=900&q=80",
  "https://images.unsplash.com/photo-1574623452334-1e0ac2b3ccb4?w=900&q=80",
  "https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=900&q=80",
  "https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=900&q=80",
];
const MEN_STEP_LABELS   = ["Who Are You", "How You Play", "Your Goals", "Social Media"];
const WOMEN_STEP_LABELS = ["Your Profile", "Game Stats", "Ambitions", "Social Media"];

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-widest text-slate-500">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, testId }) {
  return (
    <input
      data-testid={testId}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-white/30 transition-colors"
    />
  );
}
function Sel({ value, onChange, options, placeholder, testId }) {
  return (
    <select
      data-testid={testId}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => <option key={o} value={o} className="bg-slate-900 text-white">{o}</option>)}
    </select>
  );
}

export default function OnboardingPage({ onComplete }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setDivision } = useTheme();

  const [gender, setGender] = useState(null);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "", primary_position: "", secondary_position: "",
    height_ft: "", height_cm: "",
    ppg: "", apg: "", rpg: "", current_team: "", club_team: "", highlight_tape_url: "",
    gcse_grades: "", a_level_subjects: "", target_division: "", target_start_year: "",
    instagram: "", twitter: "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isWomens = gender === "women";
  const accent = isWomens ? "#e11d48" : "#f97316";
  const stepImages = isWomens ? WOMEN_IMAGES : MEN_IMAGES;
  const stepLabels = isWomens ? WOMEN_STEP_LABELS : MEN_STEP_LABELS;
  const fontHeading = isWomens ? "'Outfit', sans-serif" : "'Barlow Condensed', sans-serif";
  const sidebarGradient = isWomens
    ? "linear-gradient(135deg, rgba(225,29,72,0.2) 0%, transparent 60%)"
    : "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, transparent 60%)";

  const markOnboarded = () => {
    const key = user?.user_id ? `cb_onboarded_${user.user_id}` : "cb_onboarded";
    localStorage.setItem(key, "1");
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiRequest("put", "/profile", {
        ...form,
        position: form.primary_position,
        basketball_gender: gender || "men",
      });
    } catch {}
    setSaving(false);
  };

  const selectGender = (g) => {
    setGender(g);
    setDivision(g === "women" ? "womens" : "mens");
    setStep(1);
  };

  const next = async () => {
    if (step === 4) {
      await saveProfile();
      markOnboarded();
      if (onComplete) onComplete();
      navigate("/dashboard");
    } else {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    if (gender) saveProfile().catch(() => {});
    markOnboarded();
    if (onComplete) onComplete();
    navigate("/dashboard");
  };

  const progress = step === 0 ? 0 : (step / 4) * 100;

  // ─── Step 0: Gender Picker ───────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0A", fontFamily: "Manrope, sans-serif" }}>
        <div className="w-full max-w-3xl px-6 py-12">
          <div className="flex items-center gap-2.5 justify-center mb-12">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-white text-lg uppercase tracking-widest" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>CourtBound</span>
          </div>

          <h1 className="text-center text-4xl font-black text-white mb-2 uppercase" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            Choose Your Division
          </h1>
          <p className="text-center text-slate-500 text-sm mb-10">We'll personalise your entire experience around your program.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <button data-testid="gender-mens" onClick={() => selectGender("men")}
              className="group relative overflow-hidden rounded-2xl border-2 border-white/10 hover:border-orange-500 transition-all duration-300 text-left p-8 flex flex-col gap-4"
              style={{ background: "linear-gradient(135deg, #111 0%, #1a1a1a 100%)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, rgba(249,115,22,0.08) 0%, transparent 60%)" }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mb-5">
                  <Trophy className="w-6 h-6 text-orange-500" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Men's Basketball</h2>
                <p className="text-sm text-slate-500 leading-relaxed">Track NCAA, NAIA, and UK college men's basketball scholarship opportunities.</p>
              </div>
              <div className="relative z-10 flex items-center gap-2 text-orange-500 text-sm font-bold mt-auto">
                Select <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button data-testid="gender-womens" onClick={() => selectGender("women")}
              className="group relative overflow-hidden rounded-2xl border-2 border-white/10 hover:border-rose-500 transition-all duration-300 text-left p-8 flex flex-col gap-4"
              style={{ background: "linear-gradient(135deg, #0d0a1a 0%, #12101f 100%)" }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "linear-gradient(135deg, rgba(225,29,72,0.08) 0%, transparent 60%)" }} />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-5">
                  <Trophy className="w-6 h-6 text-rose-500" />
                </div>
                <h2 className="text-3xl font-black text-white uppercase mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>Women's Basketball</h2>
                <p className="text-sm text-slate-500 leading-relaxed">Track NCAA, NAIA, and UK college women's basketball scholarship opportunities.</p>
              </div>
              <div className="relative z-10 flex items-center gap-2 text-rose-500 text-sm font-bold mt-auto">
                Select <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Steps 1–4 ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex" style={{ background: isWomens ? "#070510" : "#0A0A0A" }}>

      {/* LEFT PANEL */}
      <div className="hidden lg:flex flex-col justify-between w-5/12 relative overflow-hidden"
        style={{ backgroundImage: `url(${stepImages[step - 1]})`, backgroundSize: "cover", backgroundPosition: "center", transition: "background-image 0.5s ease" }}>
        <div className="absolute inset-0 bg-black/65" />
        <div className="absolute inset-0" style={{ background: sidebarGradient }} />
        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="w-7 h-7 rounded flex items-center justify-center" style={{ background: accent }}>
            <Trophy className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-white text-sm uppercase tracking-widest" style={{ fontFamily: fontHeading }}>
            CourtBound {isWomens ? "Women's" : ""}
          </span>
        </div>
        <div className="relative z-10 p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: accent }}>Step {step} of 4</p>
          <h2 className="text-5xl font-black uppercase text-white leading-none" style={{ fontFamily: fontHeading }}>
            {stepLabels[step - 1]}
          </h2>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex flex-col min-h-screen" style={{ background: isWomens ? "#070510" : "#0A0A0A", fontFamily: isWomens ? "'DM Sans', sans-serif" : "Manrope, sans-serif" }}>
        <div className="h-1 bg-white/10 flex-shrink-0">
          <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, background: accent }} />
        </div>

        <div className="lg:hidden flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: accent }}>
              <Trophy className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-white text-xs uppercase tracking-widest" style={{ fontFamily: fontHeading }}>CourtBound</span>
          </div>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Step {step}/4</p>
        </div>

        <div className="flex items-center gap-2 px-8 pt-8 pb-4 flex-shrink-0">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all"
                style={{
                  background: i + 1 < step ? accent : i + 1 === step ? "#fff" : "rgba(255,255,255,0.1)",
                  color: i + 1 < step ? "#fff" : i + 1 === step ? "#000" : "#666",
                }}>
                {i + 1 < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider hidden sm:block ${i + 1 === step ? "text-white" : "text-slate-600"}`}>{label}</span>
              {i < stepLabels.length - 1 && <ChevronRight className="w-3 h-3 text-slate-700 ml-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4">
          <div className="max-w-md w-full mx-auto space-y-5">

            {step === 1 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: fontHeading }}>{isWomens ? "Your Profile" : "Who Are You?"}</h3>
                  <p className="text-sm text-slate-500">Let's start with the basics. Coaches will see this.</p>
                </div>
                <Field label="Full Name"><Input value={form.full_name} onChange={v => set("full_name", v)} placeholder="Your full name" testId="ob-name" /></Field>
                <Field label="Primary Position">
                  <Sel value={form.primary_position} onChange={v => set("primary_position", v)} options={POSITIONS} testId="ob-primary-pos" placeholder="Select primary position" />
                </Field>
                <Field label="Secondary Position (optional)">
                  <Sel value={form.secondary_position} onChange={v => set("secondary_position", v)} options={["None", ...POSITIONS]} testId="ob-secondary-pos" placeholder="Select secondary position" />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Height (ft/in)"><Input value={form.height_ft} onChange={v => set("height_ft", v)} placeholder={isWomens ? "5ft 10in" : "6ft 4in"} testId="ob-height-ft" /></Field>
                  <Field label="Height (cm)"><Input value={form.height_cm} onChange={v => set("height_cm", v)} placeholder={isWomens ? "178" : "193"} testId="ob-height-cm" /></Field>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: fontHeading }}>{isWomens ? "Game Stats" : "How Do You Play?"}</h3>
                  <p className="text-sm text-slate-500">Season averages and your highlight reel.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="PPG"><Input value={form.ppg} onChange={v => set("ppg", v)} placeholder="18.5" testId="ob-ppg" /></Field>
                  <Field label="APG"><Input value={form.apg} onChange={v => set("apg", v)} placeholder="6.2" testId="ob-apg" /></Field>
                  <Field label="RPG"><Input value={form.rpg} onChange={v => set("rpg", v)} placeholder="4.1" testId="ob-rpg" /></Field>
                </div>
                <Field label="National / Academy Team">
                  <Input value={form.current_team} onChange={v => set("current_team", v)} placeholder={isWomens ? "e.g. England Women U20" : "e.g. England Under-18"} testId="ob-team" />
                </Field>
                <Field label="Club Team">
                  <Input value={form.club_team} onChange={v => set("club_team", v)} placeholder={isWomens ? "e.g. Sevenoaks Suns" : "e.g. London Lions U18"} testId="ob-club" />
                </Field>
                <Field label="Highlight Tape URL">
                  <Input value={form.highlight_tape_url} onChange={v => set("highlight_tape_url", v)} placeholder="YouTube, Hudl or FIBA link" testId="ob-tape" />
                </Field>
                <div className="rounded-lg p-3 flex gap-2.5 border" style={{ background: `${accent}15`, borderColor: `${accent}40` }}>
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
                  <p className="text-xs text-slate-300 leading-relaxed">A highlight tape is the <strong style={{ color: accent }}>#1 thing coaches ask for</strong>. Upload to YouTube or Hudl — it dramatically increases your response rate.</p>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: fontHeading }}>{isWomens ? "Your Ambitions" : "Your Goals"}</h3>
                  <p className="text-sm text-slate-500">Academic eligibility and target program. The AI uses this to find your best-fit colleges.</p>
                </div>
                <Field label="GCSE Results"><Input value={form.gcse_grades} onChange={v => set("gcse_grades", v)} placeholder="e.g. 9 A*-C including Maths & English" testId="ob-gcse" /></Field>
                <Field label="A-Level Subjects (predicted/actual)"><Input value={form.a_level_subjects} onChange={v => set("a_level_subjects", v)} placeholder="e.g. Maths A*, Business A, PE B" testId="ob-alevels" /></Field>
                <Field label="Target Division">
                  <Sel value={form.target_division} onChange={v => set("target_division", v)} options={DIVISIONS} testId="ob-division" placeholder="Which division are you targeting?" />
                </Field>
                <Field label="Target Enrolment Year">
                  <Sel value={form.target_start_year} onChange={v => set("target_start_year", v)} options={YEARS} testId="ob-year" placeholder="When do you want to start?" />
                </Field>
              </>
            )}

            {step === 4 && (
              <>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white mb-1" style={{ fontFamily: fontHeading }}>Social Media</h3>
                  <p className="text-sm text-slate-500">Coaches increasingly check social media. Add your handles to boost your profile.</p>
                </div>
                <Field label="Instagram">
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input data-testid="ob-instagram" value={form.instagram} onChange={e => set("instagram", e.target.value)}
                      placeholder="@yourusername or profile URL"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-white/30 transition-colors" />
                  </div>
                </Field>
                <Field label="X (Twitter)">
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input data-testid="ob-twitter" value={form.twitter} onChange={e => set("twitter", e.target.value)}
                      placeholder="@yourusername or profile URL"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-white/30 transition-colors" />
                  </div>
                </Field>
                <div className="rounded-lg p-3 flex gap-2.5 border" style={{ background: `${accent}15`, borderColor: `${accent}40` }}>
                  <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong style={{ color: accent }}>Optional but recommended.</strong> Coaches use social media to assess character, team culture fit, and athlete brand.
                  </p>
                </div>
              </>
            )}

          </div>
        </div>

        <div className="px-8 py-5 border-t border-white/10 flex items-center justify-between flex-shrink-0">
          <button data-testid="ob-skip" onClick={skip}
            className="text-xs text-slate-600 hover:text-slate-400 uppercase tracking-widest font-bold transition-colors flex items-center gap-1.5">
            <X className="w-3.5 h-3.5" /> Skip for now
          </button>
          <button data-testid="ob-next" onClick={next} disabled={saving}
            className="flex items-center gap-2 disabled:opacity-60 text-white font-black uppercase tracking-widest px-6 py-3 text-sm transition-all"
            style={{ background: accent, fontFamily: fontHeading, borderRadius: isWomens ? "9999px" : "4px" }}>
            {saving ? "Saving..." : step === 4 ? "Go to Dashboard" : "Next"}
            {!saving && step !== 4 && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
