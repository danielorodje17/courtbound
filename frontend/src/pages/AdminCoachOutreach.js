import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import {
  Send, Mail, Users, RefreshCw, Clock, CheckCircle2, XCircle, AlertTriangle,
  Eye, EyeOff, Search, Sparkles, ChevronRight,
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;
const adm = (method, path, data) => {
  const token = localStorage.getItem("cb_admin_token");
  return axios({ method, url: `${API}/api${path}`, data, headers: { Authorization: `Bearer ${token}` } });
};

const DIVISIONS  = ["D1", "D2", "D3", "NAIA", "JUCO"];
const AI_TONES   = ["professional", "casual", "friendly", "urgent"];
const AI_FOCUSES = [
  "general invitation",
  "free trial offer",
  "UK player access",
  "international recruiting",
  "NCAA compliance tools",
];
const MERGE_TAGS = ["[First Name]", "[Institution]", "[Division]"];

const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }); }
  catch { return "—"; }
};

function CampaignStatusBadge({ status }) {
  const cfg = {
    draft:     { bg: "bg-slate-100",   text: "text-slate-600",  label: "Draft" },
    pending:   { bg: "bg-yellow-100",  text: "text-yellow-700", label: "Queued" },
    scheduled: { bg: "bg-blue-100",    text: "text-blue-700",   label: "Scheduled" },
    sending:   { bg: "bg-orange-100",  text: "text-orange-700", label: "Sending..." },
    sent:      { bg: "bg-green-100",   text: "text-green-700",  label: "Sent" },
    failed:    { bg: "bg-red-100",     text: "text-red-700",    label: "Failed" },
  };
  const c = cfg[status] || cfg.draft;
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function RecipientStatusIcon({ status }) {
  const map = {
    pending:      <Clock className="w-4 h-4 text-slate-400" />,
    sent:         <CheckCircle2 className="w-4 h-4 text-green-500" />,
    failed:       <XCircle className="w-4 h-4 text-red-500" />,
    unsubscribed: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  };
  return map[status] || map.pending;
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!value)}
        className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${value ? "bg-orange-500" : "bg-slate-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? "translate-x-4" : ""}`} />
      </div>
      <span className="text-xs text-slate-600 font-medium">{label}</span>
    </label>
  );
}

export default function AdminCoachOutreach() {
  const [subTab, setSubTab] = useState("contacts");

  // ── Contacts state ────────────────────────────────────────────────────────
  const [contacts, setContacts]               = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [filters, setFilters] = useState({
    division: "", state: "", verified_only: false, hide_registered: false, hide_unsubscribed: true,
  });
  const [search, setSearch]   = useState("");
  const [selected, setSelected] = useState(new Set()); // Set of emails

  const loadContacts = useCallback(async () => {
    setContactsLoading(true);
    try {
      const p = new URLSearchParams();
      if (filters.division) p.set("division", filters.division);
      if (filters.state)    p.set("state", filters.state);
      if (filters.verified_only)    p.set("verified_only", "true");
      if (filters.hide_registered)  p.set("hide_registered", "true");
      if (filters.hide_unsubscribed) p.set("hide_unsubscribed", "true");
      const r = await adm("get", `/admin/coach-outreach/contacts?${p}`);
      setContacts(r.data.contacts || []);
    } catch {
      toast.error("Failed to load contacts");
    }
    setContactsLoading(false);
  }, [filters]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const filteredContacts = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.coach_name   || "").toLowerCase().includes(q) ||
      (c.college_name || "").toLowerCase().includes(q) ||
      (c.email        || "").toLowerCase().includes(q) ||
      (c.state        || "").toLowerCase().includes(q)
    );
  });

  const toggleSelect = (email) => {
    const s = new Set(selected);
    s.has(email) ? s.delete(email) : s.add(email);
    setSelected(s);
  };

  const allChecked = filteredContacts.length > 0 && selected.size === filteredContacts.length;
  const toggleAll  = () => allChecked
    ? setSelected(new Set())
    : setSelected(new Set(filteredContacts.map(c => c.email)));

  // ── Compose state ─────────────────────────────────────────────────────────
  const [campaignName,    setCampaignName]    = useState("");
  const [subject,         setSubject]         = useState("");
  const [bodyHtml,        setBodyHtml]        = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt,     setScheduledAt]     = useState("");
  const [sending,         setSending]         = useState(false);
  const [sendResult,      setSendResult]      = useState(null);
  const [preview,         setPreview]         = useState(false);

  // AI draft
  const [aiTone,      setAiTone]      = useState("professional");
  const [aiFocus,     setAiFocus]     = useState("general invitation");
  const [aiGenerating, setAiGenerating] = useState(false);

  const generateAiDraft = async () => {
    setAiGenerating(true);
    try {
      const count = selected.size > 0 ? selected.size : filteredContacts.length;
      const r = await adm("post", "/admin/coach-outreach/ai-draft", {
        tone: aiTone, focus: aiFocus, recipient_count: count,
      });
      if (r.data.subject)   setSubject(r.data.subject);
      if (r.data.body_html) setBodyHtml(r.data.body_html);
      toast.success("AI draft ready — review before sending");
    } catch {
      toast.error("AI generation failed");
    }
    setAiGenerating(false);
  };

  const insertMergeTag = (tag) => {
    setBodyHtml(prev => prev + ` ${tag}`);
  };

  const sendCampaign = async () => {
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!bodyHtml.trim()) { toast.error("Email body is required"); return; }
    const emails = selected.size > 0
      ? Array.from(selected)
      : filteredContacts.map(c => c.email);
    if (emails.length === 0) {
      toast.error("No recipients — load Contacts first or select some");
      return;
    }
    if (!window.confirm(`Send to ${emails.length} coaches?`)) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await adm("post", "/admin/coach-outreach/campaigns", {
        name: campaignName.trim() || undefined,
        subject: subject.trim(),
        body_html: bodyHtml.trim(),
        recipient_emails: emails,
        scheduled_at: scheduleEnabled && scheduledAt ? scheduledAt : null,
      });
      setSendResult(r.data);
      toast.success(
        r.data.scheduled
          ? "Campaign scheduled!"
          : `Campaign launched to ${r.data.recipient_count} coaches`
      );
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to launch campaign");
    }
    setSending(false);
  };

  const clearCompose = () => {
    setCampaignName(""); setSubject(""); setBodyHtml("");
    setScheduleEnabled(false); setScheduledAt(""); setSendResult(null);
  };

  // ── Campaigns state ───────────────────────────────────────────────────────
  const [campaigns,        setCampaigns]        = useState([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [expanded,         setExpanded]         = useState(null);
  const [detail,           setDetail]           = useState(null);
  const [detailLoading,    setDetailLoading]    = useState(false);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const r = await adm("get", "/admin/coach-outreach/campaigns");
      setCampaigns(r.data.campaigns || []);
    } catch {}
    setCampaignsLoading(false);
  }, []);

  useEffect(() => {
    if (subTab === "campaigns") loadCampaigns();
  }, [subTab, loadCampaigns]);

  const toggleDetail = async (id) => {
    if (expanded === id) { setExpanded(null); setDetail(null); return; }
    setExpanded(id);
    setDetailLoading(true);
    try {
      const r = await adm("get", `/admin/coach-outreach/campaigns/${id}`);
      setDetail(r.data);
    } catch {}
    setDetailLoading(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const recipientCount = selected.size > 0 ? selected.size : filteredContacts.length;

  return (
    <div className="space-y-6">
      {/* Header + sub-tab nav */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            className="text-xl font-black text-slate-900 uppercase tracking-wide"
            style={{ fontFamily: "Barlow Condensed, sans-serif" }}
          >
            Coach Outreach Hub
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Email US college coaches directly from your contact database
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[
            { id: "contacts",  label: contacts.length ? `Contacts (${filteredContacts.length})` : "Contacts" },
            { id: "compose",   label: "Compose" },
            { id: "campaigns", label: `Campaigns${campaigns.length ? ` (${campaigns.length})` : ""}` },
          ].map(t => (
            <button
              key={t.id}
              data-testid={`outreach-subtab-${t.id}`}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${subTab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══ CONTACTS ══════════════════════════════════════════════════════════ */}
      {subTab === "contacts" && (
        <div className="space-y-4">
          {/* Filter card */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  data-testid="outreach-contact-search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search coach, college, email, state…"
                  className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <select
                data-testid="outreach-filter-division"
                value={filters.division}
                onChange={e => setFilters(f => ({ ...f, division: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
              >
                <option value="">All Divisions</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <input
                data-testid="outreach-filter-state"
                value={filters.state}
                onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
                placeholder="State (e.g. CA)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32 focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <button
                data-testid="outreach-filter-apply"
                onClick={loadContacts}
                disabled={contactsLoading}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${contactsLoading ? "animate-spin" : ""}`} />
                Apply
              </button>
            </div>
            <div className="flex flex-wrap gap-4 pt-1 border-t border-slate-100">
              <Toggle
                value={filters.verified_only}
                onChange={v => setFilters(f => ({ ...f, verified_only: v }))}
                label="Verified email only"
              />
              <Toggle
                value={filters.hide_registered}
                onChange={v => setFilters(f => ({ ...f, hide_registered: v }))}
                label="Hide already-registered"
              />
              <Toggle
                value={filters.hide_unsubscribed}
                onChange={v => setFilters(f => ({ ...f, hide_unsubscribed: v }))}
                label="Hide unsubscribed"
              />
            </div>
          </div>

          {/* Action bar */}
          {filteredContacts.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <button
                  data-testid="outreach-select-all"
                  onClick={toggleAll}
                  className="text-xs font-bold text-orange-500 hover:text-orange-600 underline underline-offset-2"
                >
                  {allChecked ? "Deselect All" : `Select All (${filteredContacts.length})`}
                </button>
                {selected.size > 0 && (
                  <span className="text-xs text-slate-500">{selected.size} selected</span>
                )}
              </div>
              {selected.size > 0 && (
                <button
                  data-testid="outreach-compose-selected"
                  onClick={() => setSubTab("compose")}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Compose to {selected.size} selected
                </button>
              )}
            </div>
          )}

          {/* Table */}
          {contactsLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No contacts found</p>
              <p className="text-slate-400 text-sm mt-1">
                Adjust your filters, or add coach emails in the Colleges tab.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {filteredContacts.length} contacts
                  {selected.size > 0 && <span className="ml-2 text-orange-500 normal-case">· {selected.size} selected</span>}
                </span>
                <span className="text-xs text-slate-400">
                  {contacts.filter(c => c.is_registered).length} registered &middot; {contacts.filter(c => c.is_unsubscribed).length} unsubscribed
                </span>
              </div>
              <div className="overflow-x-auto" style={{ maxHeight: 520 }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={toggleAll}
                          className="accent-orange-500 cursor-pointer"
                        />
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Coach</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">College</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Div</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">State</th>
                      <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c, i) => (
                      <tr
                        key={c.email + c.coach_id}
                        className={`border-b border-slate-100 hover:bg-orange-50/30 transition-colors ${selected.has(c.email) ? "bg-orange-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(c.email)}
                            onChange={() => toggleSelect(c.email)}
                            className="accent-orange-500 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{c.coach_name || "—"}</p>
                          {c.title && <p className="text-xs text-slate-400">{c.title}</p>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{c.email}</td>
                        <td className="px-4 py-3 text-slate-700 text-xs">{c.college_name || "—"}</td>
                        <td className="px-4 py-3">
                          {c.division && (
                            <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded">
                              {c.division}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{c.state || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            {c.last_verified && (
                              <span className="bg-green-50 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full w-fit">Verified</span>
                            )}
                            {c.is_registered && (
                              <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full w-fit">Registered</span>
                            )}
                            {c.is_unsubscribed && (
                              <span className="bg-red-50 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full w-fit">Unsubscribed</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ COMPOSE ══════════════════════════════════════════════════════════ */}
      {subTab === "compose" && (
        <div className="space-y-5 max-w-3xl">
          {/* Recipients banner */}
          <div
            className={`rounded-xl p-4 flex items-center justify-between border ${selected.size > 0 ? "bg-orange-50 border-orange-200" : "bg-slate-50 border-slate-200"}`}
          >
            <div className="flex items-center gap-3">
              <Users className={`w-5 h-5 flex-shrink-0 ${selected.size > 0 ? "text-orange-500" : "text-slate-400"}`} />
              <div>
                {selected.size > 0 ? (
                  <>
                    <p className="font-bold text-slate-900 text-sm" data-testid="recipient-count-label">
                      {selected.size} coaches selected
                    </p>
                    <p className="text-xs text-slate-500">Sending to manually selected contacts</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-slate-900 text-sm" data-testid="recipient-count-label">
                      {filteredContacts.length} coaches (current filter)
                    </p>
                    <p className="text-xs text-slate-500">Will send to all contacts matching your Contacts filters</p>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setSubTab("contacts")}
              className="text-xs font-bold text-orange-500 hover:text-orange-600 underline underline-offset-2 whitespace-nowrap"
            >
              Change selection
            </button>
          </div>

          {/* AI Draft */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <h3
                className="font-black text-slate-900 text-sm uppercase tracking-wide"
                style={{ fontFamily: "Barlow Condensed, sans-serif" }}
              >
                AI Draft Generator
              </h3>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Tone</label>
                <select
                  data-testid="ai-tone-select"
                  value={aiTone}
                  onChange={e => setAiTone(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  {AI_TONES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Focus</label>
                <select
                  data-testid="ai-focus-select"
                  value={aiFocus}
                  onChange={e => setAiFocus(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none w-full"
                >
                  {AI_FOCUSES.map(f => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>
              <button
                data-testid="ai-generate-btn"
                onClick={generateAiDraft}
                disabled={aiGenerating}
                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                {aiGenerating
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Sparkles className="w-4 h-4" />
                }
                {aiGenerating ? "Generating…" : "Generate Draft"}
              </button>
            </div>
          </div>

          {/* Campaign name */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Campaign Name <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <input
              data-testid="campaign-name-input"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder={`Campaign ${new Date().toLocaleDateString("en-GB")}`}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Subject Line <span className="text-red-400">*</span>
            </label>
            <input
              data-testid="campaign-subject-input"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="e.g. Recruit Verified UK Players with CourtBound"
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
            />
            <p className={`text-xs mt-1 ${subject.length > 60 ? "text-orange-500" : "text-slate-400"}`}>
              {subject.length} chars {subject.length > 60 ? "(over 60 char recommended limit)" : ""}
            </p>
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Email Body (HTML) <span className="text-red-400">*</span>
              </label>
              <button
                data-testid="preview-toggle-btn"
                onClick={() => setPreview(p => !p)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {/* Merge tag chips */}
            <div className="flex gap-2 mb-2 flex-wrap items-center">
              <span className="text-xs text-slate-400 font-medium">Insert:</span>
              {MERGE_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => insertMergeTag(tag)}
                  disabled={preview}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-mono px-2.5 py-1 rounded border border-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tag}
                </button>
              ))}
            </div>
            {preview ? (
              <div
                className="w-full min-h-[240px] border border-slate-200 rounded-lg p-5 bg-white text-slate-700 text-sm"
                dangerouslySetInnerHTML={{ __html: bodyHtml || "<em class='text-slate-400'>Nothing to preview yet</em>" }}
              />
            ) : (
              <textarea
                data-testid="campaign-body-input"
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                placeholder={"<p>Hi [First Name],</p>\n<p>I wanted to reach out about CourtBound...</p>"}
                rows={12}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-orange-500 outline-none resize-y"
              />
            )}
          </div>

          {/* Schedule */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <Toggle
              value={scheduleEnabled}
              onChange={setScheduleEnabled}
              label="Schedule for later"
            />
            {scheduleEnabled && (
              <input
                data-testid="campaign-schedule-input"
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            )}
          </div>

          {/* Send result */}
          {sendResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-800 text-sm">
                  {sendResult.scheduled ? "Campaign scheduled!" : "Campaign launched!"}
                </p>
                <p className="text-green-700 text-sm">
                  {sendResult.recipient_count} recipients &middot; {sendResult.skipped_unsubscribed} skipped (unsubscribed)
                  {sendResult.scheduled && " · Will send at your scheduled time"}
                </p>
                <button
                  onClick={() => { setSendResult(null); setSubTab("campaigns"); }}
                  className="mt-2 text-xs font-bold text-green-700 underline underline-offset-2"
                >
                  View Campaigns →
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              data-testid="send-campaign-btn"
              onClick={sendCampaign}
              disabled={sending || !subject.trim() || !bodyHtml.trim()}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-8 py-3 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {sending
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />
              }
              {sending ? "Sending…" : scheduleEnabled ? `Schedule to ${recipientCount} coaches` : `Send to ${recipientCount} coaches`}
            </button>
            <button
              onClick={clearCompose}
              className="border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold px-5 py-3 rounded-xl text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ══ CAMPAIGNS ════════════════════════════════════════════════════════ */}
      {subTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-400">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} total
            </p>
            <button
              data-testid="refresh-campaigns-btn"
              onClick={loadCampaigns}
              disabled={campaignsLoading}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${campaignsLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {campaignsLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <Mail className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No campaigns yet</p>
              <p className="text-slate-400 text-sm mt-1">
                Go to Compose to send your first outreach campaign
              </p>
              <button
                onClick={() => setSubTab("compose")}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-colors"
              >
                Compose Campaign
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Campaign</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Recipients</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Sent</th>
                    <th className="text-right px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Failed</th>
                    <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Date</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <React.Fragment key={c.id}>
                      <tr
                        data-testid={`campaign-row-${c.id}`}
                        className={`border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${expanded === c.id ? "bg-orange-50/40" : i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}`}
                        onClick={() => toggleDetail(c.id)}
                      >
                        <td className="px-4 py-4">
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">{c.subject}</p>
                        </td>
                        <td className="px-4 py-4">
                          <CampaignStatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-700">{c.recipient_count}</td>
                        <td className="px-4 py-4 text-right font-bold text-green-600">{c.sent_count}</td>
                        <td className="px-4 py-4 text-right">
                          {c.failed_count > 0
                            ? <span className="font-bold text-red-500">{c.failed_count}</span>
                            : <span className="text-slate-400">0</span>
                          }
                        </td>
                        <td className="px-4 py-4 text-slate-500 text-xs">{fmtDate(c.sent_at || c.created_at)}</td>
                        <td className="px-4 py-4">
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expanded === c.id ? "rotate-90" : ""}`} />
                        </td>
                      </tr>
                      {expanded === c.id && (
                        <tr>
                          <td colSpan={7} className="bg-slate-50 border-b border-slate-200 p-0">
                            <div className="px-6 py-4">
                              {detailLoading ? (
                                <div className="flex items-center gap-2 text-xs text-slate-400 py-3">
                                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                                  Loading recipients…
                                </div>
                              ) : detail?.recipients?.length > 0 ? (
                                <div className="overflow-auto" style={{ maxHeight: 280 }}>
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                        <th className="text-left py-2 pr-6">Email</th>
                                        <th className="text-left py-2 pr-6">Name</th>
                                        <th className="text-left py-2 pr-6">Institution</th>
                                        <th className="text-left py-2 pr-6">Status</th>
                                        <th className="text-left py-2">Sent At</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {detail.recipients.map(r => (
                                        <tr key={r.id} className="border-b border-slate-100">
                                          <td className="py-1.5 pr-6 font-mono text-slate-600">{r.contact_email}</td>
                                          <td className="py-1.5 pr-6 text-slate-700">{r.contact_name || "—"}</td>
                                          <td className="py-1.5 pr-6 text-slate-600">{r.contact_institution || "—"}</td>
                                          <td className="py-1.5 pr-6">
                                            <div className="flex items-center gap-1.5">
                                              <RecipientStatusIcon status={r.status} />
                                              <span className="capitalize text-slate-600">{r.status}</span>
                                            </div>
                                          </td>
                                          <td className="py-1.5 text-slate-400">{fmtDate(r.sent_at)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic py-2">No recipient records yet</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
