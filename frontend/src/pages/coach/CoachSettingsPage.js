import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { toast } from "sonner";
import { Save, SlidersHorizontal, User, GraduationCap, BarChart2 } from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "G", "F"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];
const DIVISIONS_FILTER = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "JUCO"];

export default function CoachSettingsPage() {
  const { coach, coachReq, updateCoach } = useCoachAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [prefs, setPrefs] = useState({
    positions: [],
    grad_years: [],
    divisions: [],
    min_height_cm: "",
    min_ppg: "",
  });

  const [profile, setProfile] = useState({
    full_name: "",
    job_title: "",
    institution_name: "",
    division: "",
    conference: "",
    institution_website: "",
    about_programme: "",
  });

  useEffect(() => {
    if (!coach) return;
    setProfile({
      full_name: coach.full_name || "",
      job_title: coach.job_title || "",
      institution_name: coach.institution_name || "",
      division: coach.division || "",
      conference: coach.conference || "",
      institution_website: coach.institution_website || "",
      about_programme: coach.about_programme || "",
    });
    const rp = coach.recruiting_prefs || {};
    setPrefs({
      positions: rp.positions || [],
      grad_years: rp.grad_years || [],
      divisions: rp.divisions || [],
      min_height_cm: rp.min_height_cm ?? "",
      min_ppg: rp.min_ppg ?? "",
    });
  }, [coach]);

  const toggle = (field, value) => {
    setPrefs(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        ...profile,
        recruiting_prefs: {
          ...prefs,
          min_height_cm: prefs.min_height_cm !== "" ? Number(prefs.min_height_cm) : null,
          min_ppg: prefs.min_ppg !== "" ? Number(prefs.min_ppg) : null,
        },
        onboarding_steps: {
          ...(coach?.onboarding_steps || {}),
          prefs_set: true,
        },
      };
      const r = await coachReq("patch", "/auth/profile", body);
      updateCoach(r.data);
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">Coach Settings</h1>
            <p className="text-slate-400 text-sm mt-1">Update your profile and recruiting preferences</p>
          </div>
          <button onClick={handleSave} disabled={saving} data-testid="save-settings-btn"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        {/* Profile Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-5">
            <User className="w-4 h-4 text-blue-400" />
            <h2 className="font-black text-white text-sm uppercase tracking-wide">Coach Profile</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "full_name", label: "Full Name" },
              { key: "job_title", label: "Job Title" },
              { key: "institution_name", label: "Institution Name" },
              { key: "division", label: "Division" },
              { key: "conference", label: "Conference" },
              { key: "institution_website", label: "Institution Website" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
                <input value={profile[key]} onChange={e => setProfile(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            ))}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">About Your Programme</label>
              <textarea value={profile.about_programme} onChange={e => setProfile(p => ({ ...p, about_programme: e.target.value }))} rows={3}
                placeholder="Tell players about your programme, coaching style, and what you look for in recruits..."
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none" />
            </div>
          </div>
        </div>

        {/* Recruiting Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <SlidersHorizontal className="w-4 h-4 text-blue-400" />
            <h2 className="font-black text-white text-sm uppercase tracking-wide">Recruiting Preferences</h2>
          </div>
          <p className="text-slate-500 text-xs mb-5">These preferences power your personalised match scores. Players who fit your criteria score higher.</p>

          {/* Positions */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Positions</label>
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map(pos => (
                <button key={pos} type="button" onClick={() => toggle("positions", pos)} data-testid={`pref-pos-${pos}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    prefs.positions.includes(pos) ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Grad Years */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Target Graduation Years</label>
            <div className="flex flex-wrap gap-2">
              {GRAD_YEARS.map(yr => (
                <button key={yr} type="button" onClick={() => toggle("grad_years", yr)} data-testid={`pref-yr-${yr}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    prefs.grad_years.includes(yr) ? "border-purple-500 bg-purple-600/20 text-purple-300" : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Target Divisions */}
          <div className="mb-5">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Divisions You Recruit From</label>
            <div className="flex flex-wrap gap-2">
              {DIVISIONS_FILTER.map(d => (
                <button key={d} type="button" onClick={() => toggle("divisions", d)} data-testid={`pref-div-${d.replace(/\s/g, "-")}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                    prefs.divisions.includes(d) ? "border-green-500 bg-green-600/20 text-green-300" : "border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Stats thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Minimum Height (cm)</label>
              <input type="number" placeholder="e.g. 188" value={prefs.min_height_cm}
                onChange={e => setPrefs(p => ({ ...p, min_height_cm: e.target.value }))}
                data-testid="pref-min-height"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Minimum PPG</label>
              <input type="number" step="0.1" placeholder="e.g. 10" value={prefs.min_ppg}
                onChange={e => setPrefs(p => ({ ...p, min_ppg: e.target.value }))}
                data-testid="pref-min-ppg"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-blue-400" />
            <h2 className="font-black text-white text-sm uppercase tracking-wide">Account Status</h2>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-500 text-xs">Email</span>
              <p className="text-white font-semibold">{coach?.email}</p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Verification</span>
              <p className={`font-bold ${coach?.verification_status === "verified" ? "text-green-400" : "text-amber-400"}`}>
                {coach?.verification_status === "verified" ? "Verified" : "Pending Review"}
              </p>
            </div>
            <div>
              <span className="text-slate-500 text-xs">Primary Sport</span>
              <p className="text-white font-semibold">{coach?.primary_sport}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={handleSave} disabled={saving} data-testid="save-settings-bottom-btn"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save All Changes"}
          </button>
          <button onClick={() => navigate("/coach/dashboard")}
            className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-semibold text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
