import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Bell, CheckCircle, ChevronRight } from "lucide-react";

const TYPE_COLORS = {
  player_new: "bg-blue-600/20 border-blue-700/50 text-blue-300",
  verified: "bg-green-600/20 border-green-700/50 text-green-300",
  default: "bg-slate-800 border-slate-700 text-slate-400",
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
              const colors = TYPE_COLORS[n.type] || TYPE_COLORS.default;
              return (
                <div
                  key={n.id}
                  data-testid={`notif-${n.id}`}
                  className={`border rounded-xl p-4 transition-all ${!n.is_read ? colors : "bg-slate-900 border-slate-800"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
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
