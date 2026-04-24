import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Check, X, Zap, Crown, Shield, ToggleLeft, ToggleRight } from "lucide-react";

const FREE_FEATURES = [
  { text: "Browse up to 500 colleges", included: true },
  { text: "Track up to 3 colleges", included: true },
  { text: "Basic dashboard overview", included: true },
  { text: "Email logging & history", included: false },
  { text: "Response tracker", included: false },
  { text: "Profile management", included: false },
  { text: "College comparison tool", included: false },
  { text: "AI email composer", included: false },
  { text: "Recruitment strategy AI", included: false },
  { text: "NCAA eligibility checker", included: false },
  { text: "AI college match scoring", included: false },
  { text: "Bulk email & CSV export", included: false },
];

const ANNUAL_PRICES = { basic: 90, premium: 170 };

const DEFAULT_PLANS = {
  basic: {
    tier: "basic",
    name: "Recruit",
    price_monthly: 9.99,
    currency: "GBP",
    description: "Perfect for serious players",
    features: [
      "Unlimited college tracking",
      "Email logging & history",
      "Response tracker",
      "Profile management",
      "College comparison tool",
      "Basic dashboard analytics",
    ],
  },
  premium: {
    tier: "premium",
    name: "Scholarship",
    price_monthly: 19.99,
    currency: "GBP",
    description: "Full access to every feature",
    features: [
      "All Recruit features",
      "AI email composer",
      "Recruitment strategy AI",
      "NCAA eligibility checker",
      "AI college match scoring",
      "Bulk email import",
      "CSV export",
      "Priority support",
    ],
  },
};

function ComingSoonModal({ tier, annual, onClose }) {
  const name = tier === "basic" ? "Recruit" : "Scholarship";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7 text-orange-500" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          Payment Launching Soon
        </h3>
        <p className="text-slate-500 text-sm mb-1">
          Stripe payments for the <strong>{name}</strong> {annual ? "annual" : "monthly"} plan are launching soon.
        </p>
        <p className="text-slate-400 text-sm mb-6">
          Continue enjoying your 14-day free trial in the meantime — we'll notify you by email when subscriptions go live.
        </p>
        <button
          onClick={onClose}
          data-testid="coming-soon-close-btn"
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [status, setStatus] = useState(null);
  const [showModal, setShowModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          apiRequest("get", "/subscription/plans"),
          apiRequest("get", "/subscription/status"),
        ]);
        if (plansRes.data && Object.keys(plansRes.data).length > 0) {
          setPlans(prev => ({ ...prev, ...plansRes.data }));
        }
        setStatus(statusRes.data);
      } catch {
        try {
          const plansRes = await apiRequest("get", "/subscription/plans");
          if (plansRes.data && Object.keys(plansRes.data).length > 0) {
            setPlans(prev => ({ ...prev, ...plansRes.data }));
          }
        } catch {}
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const sym = (c) => c === "GBP" ? "£" : c === "USD" ? "$" : c === "EUR" ? "€" : c;

  const basicPlan = plans.basic || DEFAULT_PLANS.basic;
  const premiumPlan = plans.premium || DEFAULT_PLANS.premium;
  const basicFeatures = Array.isArray(basicPlan.features) ? basicPlan.features : JSON.parse(basicPlan.features || "[]");
  const premiumFeatures = Array.isArray(premiumPlan.features) ? premiumPlan.features : JSON.parse(premiumPlan.features || "[]");

  const basicMonthly = Number(basicPlan.price_monthly) || 9.99;
  const premiumMonthly = Number(premiumPlan.price_monthly) || 19.99;
  const basicAnnual = ANNUAL_PRICES.basic;
  const premiumAnnual = ANNUAL_PRICES.premium;
  const basicSaving = Math.round(basicMonthly * 12 - basicAnnual);
  const premiumSaving = Math.round(premiumMonthly * 12 - premiumAnnual);
  const currency = basicPlan.currency || "GBP";

  const isOnTrial = status?.is_trial_active;
  const currentTier = status?.subscription_tier;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
          <span>←</span> Back
        </button>
        <span className="text-sm font-black text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
          CourtBound
        </span>
        <div className="w-16" />
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          {isOnTrial && (
            <div data-testid="trial-active-badge" className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-4 py-2 rounded-full mb-5">
              <Zap className="w-3.5 h-3.5" />
              {status.trial_days_remaining} days left in your free trial
            </div>
          )}
          <h1 className="text-5xl font-black text-slate-900 mb-3" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-slate-500 text-base max-w-xl mx-auto mb-8">
            Start free. Upgrade when you're ready. Every new account gets a full 14-day Scholarship trial — no card required.
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
              <span className="ml-2 bg-green-100 text-green-700 text-xs font-black px-2 py-0.5 rounded-full">Save up to £{premiumSaving}</span>
            </span>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">

          {/* Free */}
          <div data-testid="plan-free" className="bg-white border-2 border-slate-200 rounded-2xl p-7 flex flex-col">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-500" />
              </div>
              <span className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>Free</span>
            </div>
            <div className="mb-1">
              <span className="text-4xl font-black text-slate-900">£0</span>
              <span className="text-sm text-slate-400 ml-1">/month</span>
            </div>
            <p className="text-xs text-slate-400 mb-6">Always free</p>
            <ul className="space-y-3 flex-1 mb-7">
              {FREE_FEATURES.map((f, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-sm ${f.included ? "text-slate-700" : "text-slate-300"}`}>
                  {f.included ? <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" /> : <X className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                  {f.text}
                </li>
              ))}
            </ul>
            <button disabled className="w-full border-2 border-slate-200 text-slate-400 font-bold py-3 rounded-xl text-sm cursor-default" data-testid="plan-free-btn">
              {currentTier === "free" ? "Current Plan" : "Default after trial"}
            </button>
          </div>

          {/* Recruit */}
          <div data-testid="plan-basic" className="bg-white border-2 border-orange-400 rounded-2xl p-7 flex flex-col relative">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              <span className="font-black text-slate-900 text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>Recruit</span>
            </div>
            <div className="mb-1">
              {annual ? (
                <>
                  <span className="text-4xl font-black text-slate-900">{sym(currency)}{basicAnnual}</span>
                  <span className="text-sm text-slate-400 ml-1">/year</span>
                  <span className="ml-2 text-xs text-green-600 font-bold">Save {sym(currency)}{basicSaving}</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-black text-slate-900">{sym(currency)}{basicMonthly.toFixed(2)}</span>
                  <span className="text-sm text-slate-400 ml-1">/month</span>
                </>
              )}
            </div>
            {annual && <p className="text-xs text-slate-400 mb-1">{sym(currency)}{(basicAnnual/12).toFixed(2)}/month billed annually</p>}
            <p className="text-xs text-slate-500 mb-6">{basicPlan.description}</p>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Free, plus:</div>
            <ul className="space-y-3 flex-1 mb-7">
              {basicFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <Check className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowModal("basic")} data-testid="plan-basic-btn"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              {currentTier === "basic" ? "Current Plan" : "Get Recruit"}
            </button>
          </div>

          {/* Scholarship */}
          <div data-testid="plan-premium" className="bg-slate-900 border-2 border-slate-900 rounded-2xl p-7 flex flex-col relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-orange-500 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
            </div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Crown className="w-4 h-4 text-orange-400" />
              </div>
              <span className="font-black text-white text-lg" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>Scholarship</span>
            </div>
            <div className="mb-1">
              {annual ? (
                <>
                  <span className="text-4xl font-black text-white">{sym(currency)}{premiumAnnual}</span>
                  <span className="text-sm text-white/40 ml-1">/year</span>
                  <span className="ml-2 text-xs text-green-400 font-bold">Save {sym(currency)}{premiumSaving}</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-black text-white">{sym(currency)}{premiumMonthly.toFixed(2)}</span>
                  <span className="text-sm text-white/40 ml-1">/month</span>
                </>
              )}
            </div>
            {annual && <p className="text-xs text-white/40 mb-1">{sym(currency)}{(premiumAnnual/12).toFixed(2)}/month billed annually</p>}
            <p className="text-xs text-white/50 mb-6">{premiumPlan.description}</p>
            <div className="text-xs font-bold text-white/30 uppercase tracking-wider mb-3">Recruit, plus:</div>
            <ul className="space-y-3 flex-1 mb-7">
              {premiumFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/80">
                  <Check className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button onClick={() => setShowModal("premium")} data-testid="plan-premium-btn"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              {currentTier === "premium" ? "Current Plan" : "Get Scholarship"}
            </button>
          </div>
        </div>

        {/* Trial note */}
        <div className="text-center bg-white border border-slate-200 rounded-2xl px-8 py-6">
          <p className="text-sm font-semibold text-slate-700 mb-1">
            Every new account gets a <strong>14-day free trial</strong> with full Scholarship access — no credit card required.
          </p>
          <p className="text-xs text-slate-400">
            After your trial, you'll automatically move to the Free plan unless you subscribe.
          </p>
        </div>
      </div>

      {showModal && (
        <ComingSoonModal tier={showModal} annual={annual} onClose={() => setShowModal(null)} />
      )}
    </div>
  );
}
