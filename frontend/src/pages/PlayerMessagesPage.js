import { useState, useEffect, useRef } from "react";
import { apiRequest } from "../context/AuthContext";
import { Mail, CheckCircle, AlertCircle, Send, Eye, ExternalLink, ShieldCheck, X, Clock, ArrowRight, MessageSquare, ChevronRight } from "lucide-react";

const PERIOD_WARNINGS = {
  dead:       { label: "Dead Period",   color: "border-red-200 bg-red-50 text-red-700",    icon: AlertCircle },
  quiet:      { label: "Quiet Period",  color: "border-amber-200 bg-amber-50 text-amber-700", icon: AlertCircle },
  contact:    null,
  evaluation: null,
};

// ── Thread Panel (slide-in from right) ────────────────────────────────────────

function ThreadPanel({ msg, onClose, onReplied }) {
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [localReply, setLocalReply] = useState(msg.player_reply || null);
  const [localRepliedAt, setLocalRepliedAt] = useState(msg.player_replied_at || null);

  const periodWarn = PERIOD_WARNINGS[msg.ncaa_period_type];
  const WarnIcon = periodWarn?.icon;

  useEffect(() => {
    const handle = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const submitReply = async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setReplyError("");
    try {
      await apiRequest("post", `/player/messages/${msg.id}/reply`, { reply: replyText.trim() });
      const now = new Date().toISOString();
      setLocalReply(replyText.trim());
      setLocalRepliedAt(now);
      onReplied(msg.id, replyText.trim(), now);
      setReplyText("");
    } catch (e) {
      setReplyError(e?.response?.data?.detail || "Failed to send reply");
    }
    setSending(false);
  };

  const programmeSlug = (msg.coach_institution || "").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        data-testid="player-thread-backdrop"
      />
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col"
        style={{ animation: "slideInRight 0.2s ease-out" }}
        data-testid="player-thread-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {(msg.coach_name || "C")[0]}
            </div>
            <div className="min-w-0">
              <p className="font-black text-slate-900 text-sm truncate">{msg.coach_name}</p>
              <p className="text-slate-500 text-xs truncate">
                {msg.coach_institution}{msg.coach_division ? ` · ${msg.coach_division}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {programmeSlug && (
              <a
                href={`/coach/program/${programmeSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="player-thread-programme-link"
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-bold px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
              >
                Programme <ArrowRight className="w-3 h-3" />
              </a>
            )}
            <button
              onClick={onClose}
              data-testid="player-thread-close-btn"
              className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Thread content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Period warning */}
          {periodWarn && (
            <div className={`flex items-start gap-2 p-3 rounded-xl border text-xs ${periodWarn.color}`}>
              <WarnIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p className="font-semibold">This message was sent during a {periodWarn.label}. Confirm compliance with your coach before responding.</p>
            </div>
          )}

          {/* Subject */}
          {msg.subject && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Subject</p>
              <p className="text-slate-800 font-semibold text-sm">{msg.subject}</p>
            </div>
          )}

          {/* Coach message bubble */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Coach</span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(msg.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4" data-testid="player-thread-coach-msg">
              <p className="text-slate-100 text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
            </div>
          </div>

          {/* Player reply or compose */}
          {localReply ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-500 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Your Reply
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(localRepliedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl rounded-tr-sm p-4" data-testid="player-thread-reply-sent">
                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">{localReply}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Write Your Reply</p>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Type your reply to the coach..."
                data-testid="player-reply-input"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none resize-none bg-slate-50"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{replyText.length}/1000</span>
                {replyError && <span className="text-xs text-red-500">{replyError}</span>}
                <button
                  onClick={submitReply}
                  disabled={sending || !replyText.trim()}
                  data-testid="player-reply-submit-btn"
                  className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  <Send className="w-3 h-3" />
                  {sending ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}

// ── Messages Tab ─────────────────────────────────────────────────────────────

function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState(null);

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
    setSelectedMsg(msg);
    if (!msg.is_read) {
      try {
        await apiRequest("patch", `/player/messages/${msg.id}/read`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const handleReplied = (msgId, replyText, repliedAt) => {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, player_reply: replyText, player_replied_at: repliedAt } : m
    ));
    // Update selected msg state so the panel reflects the reply immediately
    setSelectedMsg(prev => prev?.id === msgId
      ? { ...prev, player_reply: replyText, player_replied_at: repliedAt }
      : prev
    );
  };

  const markAllRead = async () => {
    try {
      await apiRequest("patch", "/player/messages/read-all");
      setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
      setUnread(0);
    } catch {}
  };

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-slate-500 text-sm">
          {unread > 0 ? `${unread} unread message${unread !== 1 ? "s" : ""}` : `${total} message${total !== 1 ? "s" : ""} total`}
        </p>
        {unread > 0 && (
          <button onClick={markAllRead} data-testid="mark-all-read-player"
            className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors">
            <CheckCircle className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">No messages yet</p>
          <p className="text-slate-400 text-sm mt-1">When a coach contacts you, their message will appear here</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                data-testid={`player-msg-${msg.id}`}
                onClick={() => openMessage(msg)}
                className={`border rounded-xl p-4 cursor-pointer transition-all hover:border-slate-300 hover:shadow-sm ${
                  !msg.is_read ? "border-orange-300 bg-orange-50/60" : "border-slate-200 bg-white"
                }`}
              >
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
                        {!msg.is_read && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />}
                      </div>
                      <span className="text-slate-400 text-xs flex-shrink-0">
                        {new Date(msg.sent_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs">
                      {msg.coach_institution}{msg.coach_division ? ` · ${msg.coach_division}` : ""}
                    </p>
                    {msg.subject && (
                      <p className={`text-sm mt-0.5 ${!msg.is_read ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {msg.subject}
                      </p>
                    )}
                    <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{msg.body}</p>
                    {msg.player_reply && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-orange-500 font-semibold">
                        <MessageSquare className="w-3 h-3" /> Replied
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-1" />
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={e => { e.stopPropagation(); load(page - 1); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">← Prev</button>
              <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
              <button disabled={page === pages} onClick={e => { e.stopPropagation(); load(page + 1); }} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">Next →</button>
            </div>
          )}
        </>
      )}

      {selectedMsg && (
        <ThreadPanel
          msg={selectedMsg}
          onClose={() => setSelectedMsg(null)}
          onReplied={handleReplied}
        />
      )}
    </>
  );
}

// ── Profile Views Tab ────────────────────────────────────────────────────────

function ProfileViewsTab() {
  const [views, setViews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const r = await apiRequest("get", `/player/profile-views?page=${p}&limit=20`);
      setViews(r.data.views || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(1); }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <>
      <p className="text-slate-500 text-sm mb-4">
        {total === 0 ? "No coaches have viewed your profile yet" : `${total} coach${total !== 1 ? "es" : ""} have viewed your profile`}
      </p>

      {views.length === 0 ? (
        <div className="text-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-semibold">No profile views yet</p>
          <p className="text-slate-400 text-sm mt-1">When a verified coach views your profile, they'll appear here</p>
          <p className="text-slate-400 text-xs mt-3 max-w-xs mx-auto">Make sure your profile is complete and up to date to attract coach attention</p>
        </div>
      ) : (
        <>
          <div className="space-y-3" data-testid="profile-views-list">
            {views.map((v, i) => (
              <div key={v.coach_id} data-testid={`profile-view-item-${i}`}
                className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 hover:border-orange-200 transition-colors">
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                  {(v.coach_name || "C")[0]}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm text-slate-900">{v.coach_name}</span>
                    {v.is_verified && (
                      <span className="flex items-center gap-1 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full" data-testid={`verified-badge-${i}`}>
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">
                    {v.institution_name}
                    {v.division ? ` · ${v.division}` : ""}
                  </p>
                </div>

                {/* Right side: view count + date + link */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold" data-testid={`view-count-${i}`}>
                      {v.view_count} view{v.view_count !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {new Date(v.last_viewed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {v.is_verified && v.programme_slug && (
                    <a
                      href={`/coach/program/${v.programme_slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`programme-link-${i}`}
                      className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      onClick={e => e.stopPropagation()}
                    >
                      Programme <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button disabled={page === 1} onClick={() => load(page - 1)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">← Prev</button>
              <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
              <button disabled={page === pages} onClick={() => load(page + 1)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg disabled:opacity-40 hover:bg-slate-200 text-sm">Next →</button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlayerMessagesPage() {
  const [tab, setTab] = useState("messages");
  const [unreadCount, setUnreadCount] = useState(0);

  // Pre-fetch unread count to show badge on Messages tab
  useEffect(() => {
    apiRequest("get", "/player/messages/unread-count")
      .then(r => setUnreadCount(r.data?.unread || 0))
      .catch(() => {});
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Coach Inbox</h1>
          <p className="text-slate-500 text-sm mt-0.5">Messages and profile activity from coaches</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6" data-testid="messages-tab-bar">
        <button
          onClick={() => setTab("messages")}
          data-testid="tab-messages"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "messages" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Mail className="w-4 h-4" />
          Messages
          {unreadCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-black rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center" data-testid="messages-tab-unread-badge">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("views")}
          data-testid="tab-profile-views"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "views" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
        >
          <Eye className="w-4 h-4" />
          Profile Views
        </button>
      </div>

      {/* Tab content */}
      {tab === "messages" ? <MessagesTab /> : <ProfileViewsTab />}
    </div>
  );
}
