import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Bell, CheckCircle, ChevronRight, Film, Trophy, Eye, Calendar, MessageSquare, Bookmark, ShieldCheck, UserPlus } from "lucide-react";

const TYPE_CONFIG = {
  player_new: {
    colors: "bg-blue-600/20 border-blue-700/50 text-blue-300",
    icon: UserPlus,
    iconClass: "text-blue-400",
  },
  verified: {
    colors: "bg-green-600/20 border-green-700/50 text-green-300",
    icon: ShieldCheck,
    iconClass: "text-green-400",
  },
  player_save: {
    colors: "bg-blue-600/20 border-blue-700/50 text-blue-300",
    icon: Bookmark,
    iconClass: "text-blue-400",
  },
  player_reel_updated: {
    colors: "bg-amber-600/20 border-amber-700/50 text-amber-300",
    icon: Film,
    iconClass: "text-amber-400",
  },
  player_committed: {
    colors: "bg-red-600/20 border-red-700/50 text-red-300",
    icon: Trophy,
    iconClass: "text-red-400",
  },
  player_profile_viewed: {
    colors: "bg-sky-600/20 border-sky-700/50 text-sky-300",
    icon: Eye,
    iconClass: "text-sky-400",
  },
  calendar_alert: {
    colors: "bg-yellow-600/20 border-yellow-700/50 text-yellow-300",
    icon: Calendar,
    iconClass: "text-yellow-400",
  },
  player_reply: {
    colors: "bg-emerald-600/20 border-emerald-700/50 text-emerald-300",
    icon: MessageSquare,
    iconClass: "text-emerald-400",
  },
  default: {
    colors: "bg-slate-800 border-slate-700 text-slate-400",
    icon: Bell,
    iconClass: "text-slate-400",
  },
};

export default function CoachNotificationsPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    coachReq("get", "/notifications")
      .then(r => setNotifs(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markAllRead = async () => {
    await coachReq("patch", "/notifications/read-all").catch(() => {});
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav notifCount={unread} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-black text-white">Notifications</h1>
            <p className="text-slate-400 text-sm mt-1">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors"
              data-testid="mark-all-read-btn"
            >
              <CheckCircle className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">No notifications yet</p>
            <p className="text-slate-600 text-sm mt-1">Start saving players to get updates here</p>
            <button
              onClick={() => navigate("/coach/players")}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Search Players
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => {
              const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
              const Icon = config.icon;
              return (
                <div
                  key={n.id}
                  data-testid={`notif-${n.id}`}
                  className={`border rounded-xl p-4 transition-all ${!n.is_read ? config.colors : "bg-slate-900 border-slate-800"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!n.is_read ? "bg-white/10" : "bg-slate-800"}`}>
                        <Icon className={`w-4 h-4 ${!n.is_read ? config.iconClass : "text-slate-500"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <p className={`font-bold text-sm ${!n.is_read ? "text-white" : "text-slate-300"}`}>
                            {n.title}
                          </p>
                        </div>
                        {n.message && (
                          <p className="text-slate-400 text-xs leading-relaxed">{n.message}</p>
                        )}
                        <p className="text-slate-600 text-xs mt-2">
                          {n.created_at ? new Date(n.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                        </p>
                      </div>
                    </div>
                    {n.link && (
                      <button
                        onClick={() => navigate(n.link)}
                        className="text-blue-400 hover:text-blue-300 flex-shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
