import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Crown, X, Clock } from "lucide-react";
import { apiRequest } from "../context/AuthContext";

export default function TrialBanner({ user }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiRequest("get", "/subscription/status")
      .then(r => setStatus(r.data))
      .catch(() => {});
  }, [user]);

  if (dismissed || !status) return null;

  const { subscription_tier, is_trial_active, trial_days_remaining } = status;

  // Don't show banner for paid users
  if (subscription_tier === "basic" || subscription_tier === "premium") return null;

  // Trial active banner
  if (is_trial_active) {
    const urgent = trial_days_remaining <= 3;
    return (
      <div
        data-testid="trial-banner"
        className={`relative rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 ${
          urgent
            ? "bg-red-50 border border-red-200"
            : "bg-orange-50 border border-orange-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${urgent ? "bg-red-100" : "bg-orange-100"}`}>
            <Clock className={`w-4 h-4 ${urgent ? "text-red-600" : "text-orange-600"}`} />
          </div>
          <div>
            <p className={`text-sm font-bold ${urgent ? "text-red-800" : "text-orange-800"}`}>
              {urgent
                ? `Only ${trial_days_remaining} day${trial_days_remaining === 1 ? "" : "s"} left in your trial!`
                : `${trial_days_remaining} days left in your 14-day free trial`}
            </p>
            <p className={`text-xs mt-0.5 ${urgent ? "text-red-600" : "text-orange-600"}`}>
              {urgent
                ? "Upgrade now to keep full access to all features."
                : "You have full Premium access during your trial. Upgrade to keep it after."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate("/pricing")}
            data-testid="trial-upgrade-btn"
            className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${
              urgent
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-orange-500 hover:bg-orange-600 text-white"
            }`}
          >
            View Plans
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            data-testid="trial-banner-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Free plan upgrade prompt
  if (subscription_tier === "free") {
    return (
      <div
        data-testid="upgrade-banner"
        className="relative rounded-xl px-5 py-4 mb-6 flex items-center justify-between gap-4 bg-slate-900 border border-slate-700"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Crown className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">You're on the Free plan</p>
            <p className="text-xs text-white/50 mt-0.5">
              Upgrade to unlock email logging, AI tools, unlimited tracking and more.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => navigate("/pricing")}
            data-testid="free-upgrade-btn"
            className="text-xs font-bold px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            Upgrade
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/40 hover:text-white/70 transition-colors"
            data-testid="upgrade-banner-dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
