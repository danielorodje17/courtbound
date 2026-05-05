import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, X, Zap, Crown, ArrowLeft, Loader2, Trophy, Star } from "lucide-react";
import { apiRequest } from "../context/AuthContext";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL;

// ── Feature section definitions ───────────────────────────────────────────────
const FEATURE_SECTIONS = [
  {
    label: "COLLEGE DATABASE",
    rows: [
      {
        text: "College list",
        free: "10 colleges",
        basic: "50 tracked",
        premium: "Unlimited",
        freeOk: true, basicOk: true, premiumOk: true,
      },
      { text: "UK-friendly highlighting",   freeOk: false, basicOk: true,  premiumOk: true  },
      { text: "Division / conference filter", freeOk: false, basicOk: true,  premiumOk: true  },
    ],
  },
  {
    label: "OUTREACH TOOLS",
    rows: [
      { text: "Full communication sequence",    freeOk: false, basicOk: true,  premiumOk: true  },
      { text: "Follow-up timetable & reminders", freeOk: false, basicOk: true,  premiumOk: true  },
    ],
  },
  {
    label: "TRACKING & PLANNING",
    rows: [
      { text: "Weekly goals & digest",      freeOk: false, basicOk: true,  premiumOk: true  },
      { text: "Email summary & analytics",  freeOk: false, basicOk: true,  premiumOk: true  },
    ],
  },
  {
    label: "AI FEATURES",
    rows: [
      { text: "AI match & likelihood score", freeOk: false, basicOk: false, premiumOk: true  },
      { text: "Strategy advisor",            freeOk: false, basicOk: false, premiumOk: true  },
    ],
  },
  {
    label: "SUPPORT",
    rows: [
      { text: "Priority email support",      freeOk: false, basicOk: false, premiumOk: true  },
      { text: "Success stories & community", freeOk: false, basicOk: false, premiumOk: true  },
    ],
  },
];

function FeatureRow({ row, column }) {
  const ok = row[`${column}Ok`];
  const badge = row[column]; // e.g. "10 colleges"
  return (
    <div className="flex items-start gap-2 text-sm py-1">
      {ok
        ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
        : <X     className="w-4 h-4 text-slate-300  flex-shrink-0 mt-0.5" />
      }
      <span className={ok ? "text-slate-700" : "text-slate-400"}>
        {row.text}
        {badge && ok && (
          <span className="ml-2 bg-slate-100 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}

function PlanCard({ col, children, highlight, badge }) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 p-7 h-full ${
        highlight
          ? "border-blue-300 bg-white shadow-lg"
          : "border-slate-200 bg-white"
      }`}
    >
      {badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            {badge}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [annual, setAnnual] = useState(false);
  const [status, setStatus] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [polling, setPolling] = useState(false);

  // ── Fetch subscription status ──────────────────────────────────────────────
  useEffect(() => {
    apiRequest("get", "/subscription/status")
      .then(r => setStatus(r.data))
      .catch(() => {});
  }, []);

  // ── Handle return from Stripe (session_id in URL) ──────────────────────────
  const pollStatus = useCallback(async (sessionId, attempts = 0) => {
    if (attempts >= 8) {
      toast.error("Payment status check timed out. Check your email for confirmation.");
      setPolling(false);
      return;
    }
    try {
      const res = await apiRequest("get", `/subscription/checkout/status/${sessionId}`);
      const { payment_status } = res.data;
      if (payment_status === "paid") {
        toast.success("Payment successful! Your plan is now active.");
        setPolling(false);
        // Remove session_id from URL and refresh status
        setSearchParams({});
        const statusRes = await apiRequest("get", "/subscription/status");
        setStatus(statusRes.data);
        return;
      } else if (res.data.status === "expired") {
        toast.error("Payment session expired. Please try again.");
        setPolling(false);
        setSearchParams({});
        return;
      }
      setTimeout(() => pollStatus(sessionId, attempts + 1), 2000);
    } catch {
      setTimeout(() => pollStatus(sessionId, attempts + 1), 2000);
    }
  }, [setSearchParams]);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && !polling) {
      setPolling(true);
      pollStatus(sessionId);
    }
  }, [searchParams, polling, pollStatus]);

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = async (planKey) => {
    setLoadingPlan(planKey);
    try {
      const origin = window.location.origin;
      const res = await apiRequest("post", "/subscription/checkout", { plan_key: planKey, origin });
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not start checkout. Please try again.");
    }
    setLoadingPlan(null);
  };

  const currentTier = status?.subscription_tier;
  const isOnTrial   = status?.is_trial_active;
  const expiresAt   = status?.subscription_expires_at;

  const expiryLabel = expiresAt
    ? `Active until ${new Date(expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          data-testid="pricing-back-btn"
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            CourtBound
          </span>
        </div>
        <div className="w-16" />
      </div>

      {/* Polling banner */}
      {polling && (
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-center justify-center gap-2 text-sm font-semibold text-orange-700">
          <Loader2 className="w-4 h-4 animate-spin" />
          Confirming your payment…
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-12">

        {/* Title */}
        <div className="text-center mb-10">
          {isOnTrial && (
            <div data-testid="trial-active-badge" className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-4 py-2 rounded-full mb-5">
              <Zap className="w-3.5 h-3.5" />
              {status.trial_days_remaining} days left in your free trial
            </div>
          )}
          {expiryLabel && (currentTier === "basic" || currentTier === "premium") && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-4 py-2 rounded-full mb-5">
              <Check className="w-3.5 h-3.5" /> {expiryLabel}
            </div>
          )}
          <h1 className="text-5xl font-black text-slate-900 mb-3" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-500 text-base max-w-xl mx-auto mb-8">
            Start free. Upgrade when you're ready. Every new account gets a full 14-day Scholarship trial — no card required.
          </p>
          <p className="text-xs text-slate-400 mb-3 italic">
            Scholarship agencies charge £2,000–£5,000 with no guarantees. Scholarship tier: £159 for a full year.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-5 py-3 shadow-sm">
            <span className={`text-sm font-bold transition-colors ${!annual ? "text-slate-900" : "text-slate-400"}`}>Monthly</span>
            <button
              data-testid="billing-toggle"
              onClick={() => setAnnual(a => !a)}
              className="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none"
              style={{ background: annual ? "#f97316" : "#e2e8f0" }}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${annual ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-bold transition-colors ${annual ? "text-slate-900" : "text-slate-400"}`}>
              Annual
              <span className="ml-2 bg-emerald-100 text-emerald-700 text-xs font-black px-2 py-0.5 rounded-full">Save up to £81</span>
            </span>
          </div>
        </div>

        {/* Main 3-column plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

          {/* ── Explorer (Free) ─────────────────────────────────────────── */}
          <PlanCard col="free">
            <div className="inline-block bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full mb-4">Free</div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Explorer</h2>
            <p className="text-slate-400 text-sm mb-5">Get a feel for the platform</p>
            <div className="mb-1">
              <span className="text-4xl font-black text-slate-900">£0</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">forever</p>
            <hr className="border-slate-100 mb-6" />
            {FEATURE_SECTIONS.map(sec => (
              <div key={sec.label} className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{sec.label}</p>
                {sec.rows.map(row => <FeatureRow key={row.text} row={row} column="free" />)}
              </div>
            ))}
            <div className="mt-auto pt-6">
              <button
                disabled
                data-testid="plan-free-btn"
                className="w-full border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-xl text-sm cursor-default"
              >
                {currentTier === "free" || !currentTier ? "Current Plan" : "Default after trial"}
              </button>
            </div>
          </PlanCard>

          {/* ── Recruit (Basic) ──────────────────────────────────────────── */}
          <PlanCard col="basic">
            <div className="inline-block bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Basic</div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Recruit</h2>
            <p className="text-slate-400 text-sm mb-5">Structure your search</p>
            {annual ? (
              <div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-slate-900">£79</span>
                  <span className="text-sm text-slate-400 ml-1">/year</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mb-6">or £9.99/mo — save £41</p>
              </div>
            ) : (
              <div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-slate-900">£9.99</span>
                  <span className="text-sm text-slate-400 ml-1">/mo</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mb-6">or £79/year — save £41</p>
              </div>
            )}
            <hr className="border-slate-100 mb-6" />
            {FEATURE_SECTIONS.map(sec => (
              <div key={sec.label} className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{sec.label}</p>
                {sec.rows.map(row => <FeatureRow key={row.text} row={row} column="basic" />)}
              </div>
            ))}
            <div className="mt-auto pt-6">
              {currentTier === "basic" ? (
                <button disabled data-testid="plan-basic-btn" className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl text-sm cursor-default">
                  Current Plan
                </button>
              ) : (
                <button
                  data-testid="plan-basic-btn"
                  onClick={() => handleCheckout(annual ? "recruit_annual" : "recruit_monthly")}
                  disabled={!!loadingPlan}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loadingPlan === (annual ? "recruit_annual" : "recruit_monthly")
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : null}
                  Get Recruit
                </button>
              )}
            </div>
          </PlanCard>

          {/* ── Scholarship (Premium) ────────────────────────────────────── */}
          <PlanCard col="premium" highlight badge="Most popular">
            <div className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full mb-4">Most popular</div>
            <h2 className="text-2xl font-black text-slate-900 mb-1">Scholarship</h2>
            <p className="text-slate-400 text-sm mb-5">Everything you need to land an offer</p>
            {annual ? (
              <div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-slate-900">£159</span>
                  <span className="text-sm text-slate-400 ml-1">/year</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mb-6">or £19.99/mo — save £81</p>
              </div>
            ) : (
              <div>
                <div className="mb-1">
                  <span className="text-4xl font-black text-slate-900">£19.99</span>
                  <span className="text-sm text-slate-400 ml-1">/mo</span>
                </div>
                <p className="text-xs text-emerald-600 font-bold mb-6">or £159/year — save £81</p>
              </div>
            )}
            <hr className="border-slate-100 mb-6" />
            {FEATURE_SECTIONS.map(sec => (
              <div key={sec.label} className="mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{sec.label}</p>
                {sec.rows.map(row => <FeatureRow key={row.text} row={row} column="premium" />)}
              </div>
            ))}
            <div className="mt-auto pt-6">
              {currentTier === "premium" ? (
                <button disabled data-testid="plan-premium-btn" className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-xl text-sm cursor-default">
                  Current Plan
                </button>
              ) : (
                <button
                  data-testid="plan-premium-btn"
                  onClick={() => handleCheckout(annual ? "scholarship_annual" : "scholarship_monthly")}
                  disabled={!!loadingPlan}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {loadingPlan === (annual ? "scholarship_annual" : "scholarship_monthly")
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : null}
                  Get Scholarship
                </button>
              )}
            </div>
          </PlanCard>
        </div>

        {/* ── Season Pass ─────────────────────────────────────────────────── */}
        <div
          data-testid="plan-season-pass"
          className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-7 flex flex-col md:flex-row items-start md:items-center gap-6 mb-8"
        >
          <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Star className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-black text-slate-900">Season Pass</h2>
              <span className="bg-orange-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">One-time</span>
            </div>
            <p className="text-sm text-slate-500 mb-2">
              Already mid-process? Get <strong>4 months of full Scholarship access</strong> — no rolling subscription. Pay once and focus on getting recruited.
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {["Full Scholarship features", "4 months access", "No auto-renewal", "Ideal for families mid-process"].map(f => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Check className="w-3.5 h-3.5 text-orange-500" /> {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="text-right">
              <span className="text-4xl font-black text-orange-600">£49</span>
              <p className="text-xs text-slate-400">one-time payment</p>
            </div>
            <button
              data-testid="plan-season-pass-btn"
              onClick={() => handleCheckout("season_pass")}
              disabled={!!loadingPlan || currentTier === "premium"}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              {loadingPlan === "season_pass" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {currentTier === "premium" ? "Already on Scholarship" : "Buy Season Pass"}
            </button>
          </div>
        </div>

        {/* Trial note */}
        <div className="text-center bg-white border border-slate-200 rounded-2xl px-8 py-6">
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Every new account gets a <strong>14-day free trial</strong> with full Scholarship access — no credit card required.
          </p>
          <p className="text-xs text-slate-400">
            After your trial, you'll move to the Free plan unless you subscribe.
          </p>
        </div>
      </div>
    </div>
  );
}
