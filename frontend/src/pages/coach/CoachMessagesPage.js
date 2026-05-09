import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Send, CheckCircle, Clock, ChevronRight, MessageSquare, CalendarClock, X, ArrowRight } from "lucide-react";

const PERIOD_LABELS = {
  contact: { label: "Contact Period", color: "text-green-400" },
  evaluation: { label: "Evaluation Period", color: "text-amber-400" },
  dead: { label: "Dead Period", color: "text-red-400" },
  quiet: { label: "Quiet Period", color: "text-slate-400" },
};

function ThreadPanel({ msg, onClose, onViewProfile }) {
  const panelRef = useRef(null);
  const period = PERIOD_LABELS[msg.ncaa_period_type] || PERIOD_LABELS.contact;
  const isScheduled = (msg.status || "sent") === "scheduled";

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        data-testid="thread-panel-backdrop"
      />
      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
        data-testid="thread-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {(msg.player_name || "?")[0]}
            </div>
            <div className="min-w-0">
              <p className="font-black text-white text-sm truncate">{msg.player_name}</p>
              <p className="text-slate-500 text-xs">
                {msg.player_position && `${msg.player_position} · `}{msg.player_club || ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onViewProfile}
              data-testid="thread-panel-view-profile-btn"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-bold transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-800"
            >
              Profile <ArrowRight className="w-3 h-3" />
            </button>
            <button
              onClick={onClose}
              data-testid="thread-panel-close-btn"
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thread content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Subject */}
          {msg.subject && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Subject</p>
              <p className="text-white font-semibold text-sm">{msg.subject}</p>
            </div>
          )}

          {/* Coach message bubble */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">You</span>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                {isScheduled ? (
                  <span className="flex items-center gap-1 text-blue-500">
                    <CalendarClock className="w-3 h-3" />
                    Scheduled for {new Date(msg.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(msg.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {!isScheduled && (
                  <span className={`flex items-center gap-1 ${period.color}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {period.label}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm p-4" data-testid="thread-coach-message">
              <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
            </div>
            {!isScheduled && (
              <div className="flex items-center gap-1.5 text-xs">
                {msg.is_read ? (
                  <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3" /> Read by player</span>
                ) : (
                  <span className="text-slate-600">Not yet read</span>
                )}
              </div>
            )}
          </div>

          {/* Player reply bubble */}
          {!isScheduled && msg.player_reply ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Player Reply</span>
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(msg.player_replied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="bg-blue-950/60 border border-blue-800/50 rounded-2xl rounded-tl-sm p-4" data-testid="thread-player-reply">
                <p className="text-blue-100 text-sm leading-relaxed whitespace-pre-wrap">{msg.player_reply}</p>
              </div>
            </div>
          ) : !isScheduled && (
            <div className="text-center py-6 text-slate-600 text-sm">
              <MessageSquare className="w-7 h-7 mx-auto mb-2 opacity-40" />
              No reply yet
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-800">
          <button
            onClick={onViewProfile}
            data-testid="thread-panel-profile-link-btn"
            className="w-full flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            View Full Profile <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}

export default function CoachMessagesPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMsg, setSelectedMsg] = useState(null);

  const load = async (p = 1, filter = statusFilter) => {
    setLoading(true);
    try {
      const r = await coachReq("get", `/messages/sent?page=${p}&limit=20&status=${filter}`);
      setMessages(r.data.messages || []);
      setTotal(r.data.total || 0);
      setScheduledCount(r.data.scheduled_count || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1, "all"); }, []); // eslint-disable-line

  const switchFilter = (f) => {
    setStatusFilter(f);
    load(1, f);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-black text-white">Sent Messages</h1>
            <p className="text-slate-400 text-sm mt-1">{total} message{total !== 1 ? "s" : ""} total</p>
          </div>
          {/* Filter tabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 gap-1">
            {[
              { key: "all", label: "All" },
              { key: "sent", label: "Sent" },
              { key: "scheduled", label: `Scheduled${scheduledCount > 0 ? ` (${scheduledCount})` : ""}` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => switchFilter(tab.key)}
                data-testid={`messages-filter-${tab.key}`}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statusFilter === tab.key ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-20">
            <Send className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">
              {statusFilter === "scheduled" ? "No scheduled messages" : "No messages sent yet"}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {statusFilter === "scheduled" ? "Schedule a message from a player's profile" : "Find a player and send them your first message"}
            </p>
            <button
              onClick={() => navigate("/coach/players")}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Search Players
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {messages.map(m => {
                const period = PERIOD_LABELS[m.ncaa_period_type] || PERIOD_LABELS.contact;
                const isScheduled = (m.status || "sent") === "scheduled";
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMsg(m)}
                    className={`bg-slate-900 border rounded-xl p-4 cursor-pointer hover:border-slate-600 hover:bg-slate-800/60 transition-all ${isScheduled ? "border-blue-800/60" : "border-slate-800"}`}
                    data-testid={`sent-msg-${m.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {(m.player_name || "?")[0]}
                          </div>
                          <span className="font-bold text-white text-sm">{m.player_name}</span>
                          {m.player_position && <span className="text-slate-500 text-xs">· {m.player_position}</span>}
                          {m.player_club && <span className="text-slate-500 text-xs">· {m.player_club}</span>}
                        </div>
                        {m.subject && (
                          <p className="font-semibold text-slate-200 text-sm mb-1">{m.subject}</p>
                        )}
                        <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{m.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {isScheduled ? (
                            <span className="flex items-center gap-1 text-blue-400 font-semibold" data-testid={`scheduled-badge-${m.id}`}>
                              <CalendarClock className="w-3.5 h-3.5" />
                              Scheduled for {new Date(m.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              {new Date(m.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {!isScheduled && (
                            <span className={`flex items-center gap-1 ${period.color}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {period.label}
                            </span>
                          )}
                          {!isScheduled && (m.is_read ? (
                            <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3" /> Read</span>
                          ) : (
                            <span className="text-slate-600">Not yet read</span>
                          ))}
                          {!isScheduled && m.player_reply && (
                            <span className="flex items-center gap-1 text-blue-400 font-semibold">
                              <MessageSquare className="w-3 h-3" /> Replied
                            </span>
                          )}
                        </div>
                        {/* Player reply teaser */}
                        {!isScheduled && m.player_reply && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-blue-400/70 italic">
                            <MessageSquare className="w-3 h-3 flex-shrink-0" />
                            <span className="line-clamp-1">"{m.player_reply}"</span>
                            <span className="text-blue-600 flex-shrink-0 font-bold not-italic">· click to expand</span>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button disabled={page === 1} onClick={() => load(page - 1)} className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
                <button disabled={page === pages} onClick={() => load(page + 1)} className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 text-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedMsg && (
        <ThreadPanel
          msg={selectedMsg}
          onClose={() => setSelectedMsg(null)}
          onViewProfile={() => navigate(`/coach/players/${selectedMsg.player_user_id}`)}
        />
      )}
    </div>
  );
}
