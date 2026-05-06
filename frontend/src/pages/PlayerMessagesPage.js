import { useState, useEffect } from "react";
import { apiRequest } from "../context/AuthContext";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";

const PERIOD_WARNINGS = {
  dead: { label: "Dead Period Message", color: "border-red-700/50 bg-red-950/30 text-red-300", icon: AlertCircle },
  quiet: { label: "Quiet Period", color: "border-amber-700/50 bg-amber-950/20 text-amber-300", icon: AlertCircle },
  contact: null,
  evaluation: null,
};

export default function PlayerMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await apiRequest("get", `/player/messages?page=${p}&limit=20`);
      setMessages(r.data.messages || []);
      setUnread(r.data.unread || 0);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  const openMessage = async (msg) => {
    setExpanded(expanded?.id === msg.id ? null : msg);
    if (!msg.is_read) {
      try {
        await apiRequest("patch", `/player/messages/${msg.id}/read`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const markAllRead = async () => {
    try {
      await apiRequest("patch", "/player/messages/read-all");
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      setUnread(0);
    } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Messages from Coaches</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unread > 0 ? `${unread} unread message${unread !== 1 ? "s" : ""}` : `${total} message${total !== 1 ? "s" : ""} total`}
          </p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors" data-testid="mark-all-read-player">
            <CheckCircle className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">No messages yet</p>
          <p className="text-slate-400 text-sm mt-1">When a coach contacts you, their message will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {messages.map(msg => {
              const isExpanded = expanded?.id === msg.id;
              const periodWarn = PERIOD_WARNINGS[msg.ncaa_period_type];
              const WarnIcon = periodWarn?.icon;
              return (
                <div
                  key={msg.id}
                  data-testid={`player-msg-${msg.id}`}
                  className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${!msg.is_read ? "border-orange-300 bg-orange-50/60" : "border-slate-200 bg-white"} hover:border-slate-300`}
                  onClick={() => openMessage(msg)}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                        {(msg.coach_name || "C")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`font-bold text-sm truncate ${!msg.is_read ? "text-slate-900" : "text-slate-700"}`}>
                              {msg.coach_name}
                            </span>
                            {!msg.is_read && (
                              <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                            )}
                          </div>
                          <span className="text-slate-400 text-xs flex-shrink-0">
                            {new Date(msg.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs">{msg.coach_institution}{msg.coach_division ? ` · ${msg.coach_division}` : ""}</p>
                        {msg.subject && (
                          <p className={`text-sm mt-1 ${!msg.is_read ? "font-semibold text-slate-800" : "text-slate-600"}`}>{msg.subject}</p>
                        )}
                        {!isExpanded && (
                          <p className="text-slate-500 text-xs mt-1 line-clamp-1">{msg.body}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3">
                      {periodWarn && (
                        <div className={`flex items-start gap-2 p-3 rounded-lg border mb-3 ${periodWarn.color}`}>
                          <WarnIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <p className="text-xs font-semibold">This message was sent during a {periodWarn.label}. Confirm compliance with your coach before responding.</p>
                        </div>
                      )}
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <p className="text-slate-400 text-xs">Sent by <strong className="text-slate-600">{msg.coach_name}</strong> at {msg.coach_institution}</p>
                        <p className="text-slate-400 text-xs mt-1">Replies are handled outside of CourtBound — contact the coach directly via your institution.</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={(e) => { e.stopPropagation(); load(page - 1); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">← Prev</button>
              <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
              <button disabled={page === pages} onClick={(e) => { e.stopPropagation(); load(page + 1); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
