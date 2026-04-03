import { useState } from "react";
import { apiRequest } from "../context/AuthContext";
import { ShieldCheck, Loader2, ChevronDown, CheckCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";

const Toggle = ({ label, checked, onChange, testId }) => (
  <label data-testid={testId} className="flex items-center justify-between cursor-pointer py-2">
    <span className="text-sm text-slate-700">{label}</span>
    <div
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-orange-500" : "bg-slate-200"}`}
    >
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </div>
  </label>
);

export default function NCAACHeckerPage() {
  const [form, setForm] = useState({
    gcse_grades: "",
    a_level_grades: "",
    predicted_grades: "",
    core_subjects_completed: true,
    competitive_level: "national",
    years_played: 5,
    has_club_team: true,
    paid_to_play: false,
    received_award_money: false,
    played_on_pro_contract: false,
    agent_representation: false,
    social_media_monetised: false
  });
  const [assessment, setAssessment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleCheck = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await apiRequest("post", "/ai/ncaa-check", form);
      setAssessment(data.assessment);
    } catch {
      setError("Could not generate assessment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const competitiveLevels = [
    { value: "local", label: "Local / County" },
    { value: "regional", label: "Regional" },
    { value: "national", label: "National (England U18)" },
    { value: "international", label: "International" }
  ];

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="mb-6">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Eligibility Tool</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          NCAA Eligibility Checker
        </h1>
        <p className="text-slate-500 mt-1">Find out if you're eligible to play NCAA college basketball as a UK international player</p>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>Important:</strong> This tool gives AI-powered guidance based on NCAA rules for international players. Always confirm your final eligibility with the official{" "}
          <a href="https://web3.ncaa.org/ecwr3/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-blue-600">
            NCAA Eligibility Center <ExternalLink className="inline w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-4">
          {/* Academic */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">1</span>
              Academic Profile
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">GCSE Grades (e.g. 9,8,7,6,5,5,4)</label>
                <input
                  data-testid="ncaa-gcse-input"
                  type="text"
                  value={form.gcse_grades}
                  onChange={e => set("gcse_grades", e.target.value)}
                  placeholder="e.g. English 7, Maths 6, Science 6..."
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">A-Level / Predicted Grades</label>
                <input
                  data-testid="ncaa-alevel-input"
                  type="text"
                  value={form.a_level_grades || form.predicted_grades}
                  onChange={e => set("a_level_grades", e.target.value)}
                  placeholder="e.g. Maths B, PE A, Business C (predicted)"
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <Toggle
                testId="ncaa-core-subjects-toggle"
                label="Completed core academic subjects (English, Maths, Sciences)"
                checked={form.core_subjects_completed}
                onChange={v => set("core_subjects_completed", v)}
              />
            </div>
          </div>

          {/* Athletic */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">2</span>
              Athletic Profile
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Highest Competitive Level</label>
                <div className="relative">
                  <select
                    data-testid="ncaa-level-select"
                    value={form.competitive_level}
                    onChange={e => set("competitive_level", e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8"
                  >
                    {competitiveLevels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Years Playing Organised Basketball</label>
                <input
                  data-testid="ncaa-years-input"
                  type="number"
                  min="1"
                  max="15"
                  value={form.years_played}
                  onChange={e => set("years_played", parseInt(e.target.value) || 1)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <Toggle testId="ncaa-club-toggle" label="Play for a club team (not just school)" checked={form.has_club_team} onChange={v => set("has_club_team", v)} />
              <Toggle testId="ncaa-paid-toggle" label="Ever been paid to play basketball" checked={form.paid_to_play} onChange={v => set("paid_to_play", v)} />
            </div>
          </div>

          {/* Amateurism */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-bold">3</span>
              Amateurism Status
            </h2>
            <p className="text-xs text-slate-500 mb-3">Answer honestly — these are critical for NCAA eligibility</p>
            <div className="space-y-1 divide-y divide-slate-100">
              <Toggle testId="ncaa-award-money-toggle" label="Received prize/award money for basketball" checked={form.received_award_money} onChange={v => set("received_award_money", v)} />
              <Toggle testId="ncaa-pro-contract-toggle" label="Signed / played on a professional contract" checked={form.played_on_pro_contract} onChange={v => set("played_on_pro_contract", v)} />
              <Toggle testId="ncaa-agent-toggle" label="Had an agent represent you" checked={form.agent_representation} onChange={v => set("agent_representation", v)} />
              <Toggle testId="ncaa-social-media-toggle" label="Monetised social media content related to basketball" checked={form.social_media_monetised} onChange={v => set("social_media_monetised", v)} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            data-testid="ncaa-check-btn"
            onClick={handleCheck}
            disabled={loading}
            className="w-full bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg py-3.5 text-sm hover:bg-orange-600 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysing Eligibility...</> : <><ShieldCheck className="w-4 h-4" /> Check My Eligibility</>}
          </button>
        </div>

        {/* Results */}
        <div className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-16 flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 text-sm text-center">Analysing your eligibility against NCAA rules for UK international players...</p>
            </div>
          ) : assessment ? (
            <div data-testid="ncaa-assessment-output" className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Your NCAA Eligibility Assessment
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">AI-generated based on your answers · Always verify with NCAA Eligibility Center</p>
                </div>
              </div>
              <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{assessment}</div>
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <strong>Next Step:</strong> Register at the{" "}
                  <a href="https://web3.ncaa.org/ecwr3/" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-orange-600">
                    NCAA Eligibility Center (eligibilitycenter.org) <ExternalLink className="inline w-3 h-3" />
                  </a>{" "}
                  as early as possible — ideally in Year 12/13.
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <ShieldCheck className="w-14 h-14 text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-700 text-lg mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
                Ready to Check Your Eligibility?
              </h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">Fill in your academic and athletic details on the left, then click the button for a full AI eligibility assessment.</p>
            </div>
          )}

          {/* Static Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>UK Qualifications & NCAA</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> GCSEs accepted as core course equivalents</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> A-Levels satisfy NCAA academic requirements</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> No SAT/ACT required for Div II & III</li>
                <li className="flex items-start gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" /> SAT/ACT recommended but not always required for Div I</li>
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-slate-800 text-sm mb-2 uppercase tracking-wide" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>Key Deadlines</h3>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li className="flex items-start gap-1.5"><span className="w-3.5 h-3.5 bg-orange-100 text-orange-600 rounded text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">!</span> Register with NCAA EC by April of Year 12</li>
                <li className="flex items-start gap-1.5"><span className="w-3.5 h-3.5 bg-orange-100 text-orange-600 rounded text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">!</span> Final transcripts due by August before enrollment</li>
                <li className="flex items-start gap-1.5"><span className="w-3.5 h-3.5 bg-blue-100 text-blue-600 rounded text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">i</span> Amateurism certification needed before competing</li>
                <li className="flex items-start gap-1.5"><span className="w-3.5 h-3.5 bg-blue-100 text-blue-600 rounded text-[10px] flex items-center justify-center font-bold flex-shrink-0 mt-0.5">i</span> NAIA has separate registration via PlayNAIA.org</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
