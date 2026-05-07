import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { supabase } from "../../supabaseClient";
import { toast } from "sonner";
import { Trophy, CheckCircle, AlertCircle, Eye, EyeOff, ChevronRight, ChevronLeft } from "lucide-react";

const DIVISIONS = ["NCAA D1", "NCAA D2", "NCAA D3", "NAIA", "JUCO", "Other"];
const JOB_TITLES = ["Head Coach", "Assistant Coach", "Associate Head Coach", "Director of Basketball Operations", "Graduate Assistant Coach", "Volunteer Coach"];

const GOOGLE_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function CoachRegisterPage() {
  const { register } = useCoachAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [result, setResult] = useState(null);

  // Check for Google prefill
  const isGooglePrefill = new URLSearchParams(location.search).get("prefill") === "true";
  const googlePrefillData = isGooglePrefill
    ? (() => { try { return JSON.parse(sessionStorage.getItem("coach_google_prefill") || "{}"); } catch { return {}; } })()
    : {};

  const [form, setForm] = useState({
    email: googlePrefillData.email || "",
    password: "",
    confirm_password: "",
    full_name: googlePrefillData.full_name || "",
    google_id: googlePrefillData.google_id || "",
    job_title: "", institution_name: "",
    division: "", conference: "", institution_website: "",
    primary_sport: "Men's Basketball", country: "US",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const stepTitles = ["Account Details", "Programme Info", "Sport & Verification"];

  const handleGoogleRegister = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/coach/auth/callback` },
      });
      if (error) toast.error("Google sign-in failed. Please try again.");
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.email || !form.full_name) return "Please fill all required fields";
      if (!form.email.includes("@")) return "Enter a valid email address";
      if (!isGooglePrefill) {
        if (form.password.length < 8) return "Password must be at least 8 characters";
        if (form.password !== form.confirm_password) return "Passwords do not match";
      }
    }
    if (step === 2) {
      if (!form.institution_name || !form.division) return "Institution name and division are required";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    setStep(s => s + 1);
  };

  const submit = async () => {
    const err = validateStep();
    if (err) { toast.error(err); return; }
    if (!form.primary_sport) { toast.error("Select your primary sport"); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (isGooglePrefill) { delete payload.password; delete payload.confirm_password; }
      const data = await register(payload);
      setResult(data);
      if (isGooglePrefill) sessionStorage.removeItem("coach_google_prefill");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Registration failed. Please try again.");
    }
    setLoading(false);
  };

  if (result) {
    const verified = result.auto_verified;
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="w-full max-w-lg text-center bg-slate-900 border border-slate-800 rounded-2xl p-10">
          {verified ? (
            <>
              <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Account Verified!</h2>
              <p className="text-slate-400 mb-8">Your institutional email was auto-verified. You now have full access to the CourtBound Coach Portal.</p>
              <button onClick={() => navigate("/coach/dashboard")} className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3 rounded-xl transition-colors inline-flex items-center gap-2">
                Go to Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-2xl font-black text-white mb-3">Pending Verification</h2>
              <p className="text-slate-400 mb-4">Your account has been created. Our team will review and verify your credentials within <strong className="text-white">48 hours</strong>.</p>
              <p className="text-slate-500 text-sm mb-8">You'll receive an email at <strong className="text-slate-300">{form.email}</strong> when your account is approved.</p>
              <button onClick={() => navigate("/coach/dashboard")} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-8 py-3 rounded-xl transition-colors">
                View Your Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/coach" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-xl text-white">CourtBound <span className="text-blue-400">Coaches</span></span>
          </Link>
          <h1 className="text-2xl font-black text-white">Create Coach Account</h1>
          <p className="text-slate-400 text-sm mt-1">Free for verified US college coaches</p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {stepTitles.map((t, i) => (
            <div key={t} className="flex-1 flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm mb-1 ${
                i + 1 < step ? "bg-green-600 text-white" : i + 1 === step ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-500"
              }`}>
                {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${i + 1 === step ? "text-blue-400" : "text-slate-600"}`}>{t}</span>
            </div>
          ))}
        </div>

        {/* Google SSO — only shown on step 1 and when not already prefilled from Google */}
        {step === 1 && !isGooglePrefill && (
          <div className="mb-6">
            <button
              data-testid="coach-google-register-btn"
              onClick={handleGoogleRegister}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-800 font-bold py-3 rounded-xl border border-slate-300 transition-all disabled:opacity-60 text-sm"
            >
              {GOOGLE_SVG}
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>
            <div className="flex items-center gap-3 mt-4 mb-2">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-xs text-slate-500 font-semibold">or register with email</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
          </div>
        )}

        {isGooglePrefill && step === 1 && (
          <div className="mb-4 bg-blue-950/50 border border-blue-800/60 rounded-xl p-3 flex items-center gap-2">
            <span className="text-blue-400 text-xs font-semibold">{GOOGLE_SVG}</span>
            <p className="text-blue-300 text-xs font-semibold">Pre-filled from Google. Complete your programme details below.</p>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-5">

          {/* Step 1 */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Full Name *</label>
                <input data-testid="reg-full-name" value={form.full_name} onChange={e => set("full_name", e.target.value)}
                  placeholder="Coach John Smith" className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Institutional Email *</label>
                <input data-testid="reg-email" type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  readOnly={isGooglePrefill}
                  placeholder="jsmith@university.edu"
                  className={`w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 ${isGooglePrefill ? "opacity-70 cursor-not-allowed" : ""}`} />
                {!isGooglePrefill && <p className="text-xs text-slate-500 mt-1">Use your official .edu email for instant auto-verification</p>}
              </div>
              {!isGooglePrefill && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Password *</label>
                    <div className="relative">
                      <input data-testid="reg-password" type={showPw ? "text" : "password"} value={form.password}
                        onChange={e => set("password", e.target.value)} placeholder="Min 8 characters"
                        className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-3 text-slate-400">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirm Password *</label>
                    <input type="password" value={form.confirm_password} onChange={e => set("confirm_password", e.target.value)}
                      placeholder="Re-enter password" className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                  </div>
                </>
              )}
            </>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Job Title *</label>
                <select value={form.job_title} onChange={e => set("job_title", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="">Select your role</option>
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Institution Name *</label>
                <input value={form.institution_name} onChange={e => set("institution_name", e.target.value)}
                  placeholder="e.g. Fort Hays State University" className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Division *</label>
                <select value={form.division} onChange={e => set("division", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="">Select division</option>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Conference</label>
                <input value={form.conference} onChange={e => set("conference", e.target.value)}
                  placeholder="e.g. MIAA, Sooner Athletic, GSC" className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Institution Website</label>
                <input value={form.institution_website} onChange={e => set("institution_website", e.target.value)}
                  placeholder="https://athletics.university.edu" className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
              </div>
            </>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Primary Sport *</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Men's Basketball", "Women's Basketball"].map(sport => (
                    <button key={sport} type="button" onClick={() => set("primary_sport", sport)}
                      data-testid={`sport-${sport.toLowerCase().replace(/[' ]/g, "-")}`}
                      className={`py-4 px-4 rounded-xl border-2 font-bold text-sm transition-all ${
                        form.primary_sport === sport ? "border-blue-500 bg-blue-600/20 text-blue-300" : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}>
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Country</label>
                <select value={form.country} onChange={e => set("country", e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-4 text-sm text-blue-300">
                <strong className="block mb-1">How verification works</strong>
                <ul className="space-y-1 text-blue-400 text-xs">
                  <li>• Institutional .edu emails from 200+ known programmes are auto-verified instantly</li>
                  <li>• Other domains are reviewed by CourtBound staff within 48 hours</li>
                  <li>• You can browse the platform while verification is pending</li>
                  <li>• Full player access unlocks on verification</li>
                </ul>
              </div>
              <p className="text-slate-500 text-xs">By registering, you agree to CourtBound's Terms of Use and confirm that your recruiting activity will comply with your division's NCAA/NAIA rules.</p>
            </>
          )}

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step < 3 ? (
              <button data-testid={`reg-next-step-${step}`} onClick={nextStep} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                Continue <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button data-testid="reg-submit" onClick={submit} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black py-3 rounded-lg transition-colors">
                {loading ? "Creating Account..." : "Create Coach Account"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Already have an account? <Link to="/coach/login" className="text-blue-400 hover:text-blue-300 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
