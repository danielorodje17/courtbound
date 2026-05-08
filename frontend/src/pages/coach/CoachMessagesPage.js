import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Send, CheckCircle, Clock, ChevronRight, MessageSquare } from "lucide-react";

const PERIOD_LABELS = {
  contact: { label: "Contact Period", color: "text-green-400" },
  evaluation: { label: "Evaluation Period", color: "text-amber-400" },
  dead: { label: "Dead Period", color: "text-red-400" },
  quiet: { label: "Quiet Period", color: "text-slate-400" },
};

export default function CoachMessagesPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await coachReq("get", `/messages/sent?page=${p}&limit=20`);
      setMessages(r.data.messages || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-black text-white">Sent Messages</h1>
          <p className="text-slate-400 text-sm mt-1">{total} message{total !== 1 ? "s" : ""} sent to players</p>
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
            <p className="text-slate-400 font-semibold">No messages sent yet</p>
            <p className="text-slate-600 text-sm mt-1">Find a player and send them your first message</p>
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
                return (
                  <div key={m.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all" data-testid={`sent-msg-${m.id}`}>
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
                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3 h-3" />
                            {new Date(m.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className={`flex items-center gap-1 ${period.color}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {period.label}
                          </span>
                          {m.is_read ? (
                            <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3" /> Read</span>
                          ) : (
                            <span className="text-slate-600">Not yet read</span>
                          )}
                          {m.player_reply && (
                            <span className="flex items-center gap-1 text-blue-400 font-semibold">
                              <MessageSquare className="w-3 h-3" /> Replied
                            </span>
                          )}
                        </div>
                        {/* Player reply preview */}
                        {m.player_reply && (
                          <div className="mt-3 bg-blue-950/40 border border-blue-800/40 rounded-lg px-3 py-2" data-testid={`player-reply-preview-${m.id}`}>
                            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Player Reply
                              <span className="text-blue-600 font-normal ml-1">
                                · {new Date(m.player_replied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                            </p>
                            <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{m.player_reply}</p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => navigate(`/coach/players/${m.player_user_id}`)}
                        className="text-slate-500 hover:text-blue-400 transition-colors flex-shrink-0"
                        data-testid={`view-msg-player-${m.player_user_id}`}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
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
    </div>
  );
}
