import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import {
  DndContext, DragOverlay, closestCenter,
  PointerSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Bookmark, ChevronRight, Film, Trash2,
  LayoutGrid, List, Download, Printer,
  ArrowUpDown, ArrowUp, ArrowDown,
  Plus, Pencil, Check, X, GripVertical,
  StickyNote, Send, Users,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const LISTS = ["Watch List", "Priority Targets", "Contacted", "Offer Extended", "Committed"];

const LIST_COLORS = {
  "Watch List":       "border-slate-700 bg-slate-900",
  "Priority Targets": "border-blue-700/50 bg-blue-950/30",
  "Contacted":        "border-amber-700/50 bg-amber-950/20",
  "Offer Extended":   "border-green-700/50 bg-green-950/20",
  "Committed":        "border-emerald-600/60 bg-emerald-950/30",
};
const LIST_HEADER_COLORS = {
  "Watch List":       "text-slate-300 border-slate-700",
  "Priority Targets": "text-blue-300 border-blue-700/50",
  "Contacted":        "text-amber-300 border-amber-700/50",
  "Offer Extended":   "text-green-300 border-green-700/50",
  "Committed":        "text-emerald-300 border-emerald-600/40",
};
const LIST_BADGE = {
  "Watch List":       "bg-slate-800 text-slate-400",
  "Priority Targets": "bg-blue-900/50 text-blue-300",
  "Contacted":        "bg-amber-900/50 text-amber-300",
  "Offer Extended":   "bg-green-900/50 text-green-300",
  "Committed":        "bg-emerald-900/50 text-emerald-300",
};
const LABEL_COLORS = [
  { key: "red",    dot: "#ef4444", bg: "bg-red-500",    ring: "ring-red-400" },
  { key: "amber",  dot: "#f59e0b", bg: "bg-amber-500",  ring: "ring-amber-400" },
  { key: "green",  dot: "#22c55e", bg: "bg-green-500",  ring: "ring-green-400" },
  { key: "blue",   dot: "#3b82f6", bg: "bg-blue-500",   ring: "ring-blue-400" },
  { key: "purple", dot: "#a855f7", bg: "bg-purple-500", ring: "ring-purple-400" },
];
const COLOR_BORDER = {
  red:    "border-l-4 border-l-red-500",
  amber:  "border-l-4 border-l-amber-500",
  green:  "border-l-4 border-l-green-500",
  blue:   "border-l-4 border-l-blue-500",
  purple: "border-l-4 border-l-purple-500",
};
const CUSTOM_LIST_COLOR        = "border-violet-700/50 bg-violet-950/20";
const CUSTOM_LIST_HEADER_COLOR = "text-violet-300 border-violet-700/50";
const CUSTOM_LIST_BADGE        = "bg-violet-900/50 text-violet-300";

// ── Inline Notes ──────────────────────────────────────────────────────────────

function InlineNote({ note, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note || "");
  const ref = useRef(null);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed !== (note || "").trim()) onSave(trimmed);
    setEditing(false);
  };

  const open = (e) => { e.stopPropagation(); setDraft(note || ""); setEditing(true); };

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <textarea
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") setEditing(false); if (e.key === "Enter" && e.metaKey) commit(); }}
          rows={3}
          maxLength={300}
          placeholder="Add a note..."
          data-testid="inline-note-textarea"
          className="w-full bg-slate-800 border border-amber-600/50 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
        />
        <div className="flex items-center justify-between mt-1">
          <span className="text-slate-600 text-xs">{draft.length}/300 · ⌘Enter to save</span>
          <button onClick={commit} data-testid="inline-note-save-btn"
            className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1">
            <Check className="w-3 h-3" /> Save
          </button>
        </div>
      </div>
    );
  }

  return note ? (
    <div
      onClick={open}
      data-testid="inline-note-display"
      className="mt-2 bg-slate-800 rounded-lg px-3 py-2 flex items-start gap-2 cursor-pointer hover:bg-slate-700 transition-colors group"
    >
      <StickyNote className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
      <p className="text-slate-300 text-xs leading-relaxed flex-1 line-clamp-2">{note}</p>
      <Pencil className="w-3 h-3 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-0.5" />
    </div>
  ) : (
    <button
      onClick={open}
      data-testid="inline-note-add-btn"
      className="mt-2 w-full flex items-center gap-1.5 text-slate-700 hover:text-amber-500 text-xs py-1.5 px-3 rounded-lg hover:bg-slate-800 transition-colors border border-dashed border-slate-800 hover:border-amber-700/50"
    >
      <Plus className="w-3 h-3" /> Add note
    </button>
  );
}

// ── Sortable Card ─────────────────────────────────────────────────────────────

function SortableCard({ item, allLists, onRemove, onView, onColorLabel, onSaveNote, isDragOverlay }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { listName: item.list_name, item },
  });

  const p = item.player || {};
  const [showColors, setShowColors] = useState(false);
  const colorBorder = item.color_label ? (COLOR_BORDER[item.color_label] || "") : "";

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging && !isDragOverlay ? 0.35 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-600 transition-colors relative ${colorBorder} ${isDragOverlay ? "shadow-2xl ring-2 ring-blue-500/40 rotate-1 scale-105" : ""}`}
      data-testid="board-card"
      onMouseEnter={() => setShowColors(true)}
      onMouseLeave={() => setShowColors(false)}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 left-3 cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-400 transition-colors touch-none z-10"
        data-testid={`drag-handle-${item.id}`}
        title="Drag to reorder or move"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Color picker */}
      {showColors && !isDragOverlay && (
        <div className="absolute top-2 right-2 flex gap-1 z-10 bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-full border border-slate-700">
          {LABEL_COLORS.map(c => (
            <button key={c.key} data-testid={`color-label-${c.key}`}
              onClick={e => { e.stopPropagation(); onColorLabel(item.player_user_id, c.key); }}
              className={`w-4 h-4 rounded-full ${c.bg} hover:scale-125 transition-all ${item.color_label === c.key ? `ring-2 ring-offset-1 ring-offset-slate-900 ${c.ring}` : ""}`}
            />
          ))}
          {item.color_label && (
            <button data-testid="color-label-clear"
              onClick={e => { e.stopPropagation(); onColorLabel(item.player_user_id, null); }}
              className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 text-slate-300 text-xs flex items-center justify-center">×
            </button>
          )}
        </div>
      )}

      <div className="p-4 pl-7">
        {/* Player info */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {(p.full_name || "?")[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm truncate">{p.full_name || "Unknown"}</h4>
            <p className="text-slate-400 text-xs">{p.position}{p.height_ft ? ` · ${p.height_ft}` : ""}</p>
          </div>
          {p.match_score != null && (
            <span className={`text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0 ${p.match_score >= 80 ? "bg-green-600 text-white" : p.match_score >= 60 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
              {p.match_score}%
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {p.club_team && <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{p.club_team}</span>}
          {p.expected_graduation && <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">Grad {p.expected_graduation}</span>}
          {p.highlight_tape_url && <span className="text-blue-400 text-xs flex items-center gap-0.5"><Film className="w-3 h-3" />Reel</span>}
        </div>

        {/* Inline notes */}
        {!isDragOverlay && (
          <InlineNote
            note={item.notes}
            onSave={text => onSaveNote(item.player_user_id, text)}
          />
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => onView(item.player_user_id)} data-testid={`board-view-${item.player_user_id}`}
            className="flex-1 text-xs font-bold py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1">
            Profile <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onRemove(item.player_user_id)} data-testid={`board-remove-${item.player_user_id}`}
            className="px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Droppable Column Body ─────────────────────────────────────────────────────
// Used as a drop target for empty columns (SortableContext doesn't catch empty areas)

function DroppableColumnBody({ id, isOver, children, isEmpty }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`space-y-3 min-h-[60px] rounded-lg transition-all duration-150 ${isOver ? "ring-2 ring-blue-500/40 bg-blue-500/5" : ""}`}
    >
      {isEmpty
        ? <div className="text-center py-8 text-slate-600 text-xs">Drop here</div>
        : children
      }
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: "full_name",           label: "Player",  src: "player" },
  { key: "position",            label: "Pos",     src: "player" },
  { key: "height_ft",           label: "Height",  src: "player" },
  { key: "club_team",           label: "Club",    src: "player" },
  { key: "expected_graduation", label: "Grad",    src: "player" },
  { key: "stats_ppg",           label: "PPG",     src: "player", numeric: true },
  { key: "match_score",         label: "Match %", src: "player", numeric: true },
  { key: "list_name",           label: "List",    src: "item" },
];
function getVal(item, col) {
  const v = col.src === "item" ? item[col.key] : (item.player || {})[col.key];
  return v ?? (col.numeric ? -1 : "");
}
function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />;
}
function TableView({ saved, onRemove, onView }) {
  const [sort, setSort] = useState({ key: "full_name", dir: "asc" });
  const toggleSort = k => setSort(s => ({ key: k, dir: s.key === k && s.dir === "asc" ? "desc" : "asc" }));
  const col = TABLE_COLS.find(c => c.key === sort.key);
  const sorted = [...saved].sort((a, b) => {
    const va = getVal(a, col), vb = getVal(b, col);
    if (col?.numeric) return sort.dir === "asc" ? va - vb : vb - va;
    return sort.dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800" data-testid="board-table-view">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900">
            {TABLE_COLS.map(c => (
              <th key={c.key} onClick={() => toggleSort(c.key)} data-testid={`table-sort-${c.key}`}
                className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap">
                <span className="flex items-center gap-1.5">{c.label}<SortIcon active={sort.key === c.key} dir={sort.dir} /></span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {sorted.map(item => {
            const p = item.player || {};
            const lc = LABEL_COLORS.find(c => c.key === item.color_label);
            return (
              <tr key={item.id} className="bg-slate-950 hover:bg-slate-900 transition-colors" data-testid="board-table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {lc && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: lc.dot }} />}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0">{(p.full_name||"?")[0]}</div>
                    <p className="font-bold text-white text-xs truncate max-w-[140px]">{p.full_name||"—"}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.position||"—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{p.height_ft||"—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-[140px] truncate">{p.club_team||"—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.expected_graduation||"—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.stats_ppg!=null?p.stats_ppg:"—"}</td>
                <td className="px-4 py-3">
                  {p.match_score!=null
                    ? <span className={`text-xs font-black px-2 py-0.5 rounded-full ${p.match_score>=80?"bg-green-600 text-white":p.match_score>=60?"bg-blue-600 text-white":"bg-slate-700 text-slate-300"}`}>{p.match_score}%</span>
                    : "—"}
                </td>
                <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${LIST_BADGE[item.list_name]||CUSTOM_LIST_BADGE}`}>{item.list_name||"Watch List"}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => onView(item.player_user_id)} data-testid={`table-view-${item.player_user_id}`}
                      className="text-xs font-bold py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap">View</button>
                    <button onClick={() => onRemove(item.player_user_id)} data-testid={`table-remove-${item.player_user_id}`}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Custom Column Header ───────────────────────────────────────────────────────

function CustomColumnHeader({ name, count, onRename, onDelete, onMessageAll }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);
  const commit = () => { const t = draft.trim(); if (t && t !== name) onRename(name, t); setEditing(false); };
  useEffect(() => { if (editing) { setDraft(name); inputRef.current?.focus(); } }, [editing, name]);
  return (
    <div className={`flex items-center justify-between pb-2 mb-3 border-b ${CUSTOM_LIST_HEADER_COLOR}`}>
      {editing ? (
        <div className="flex items-center gap-1 flex-1">
          <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
            maxLength={40} data-testid={`custom-list-rename-input-${name}`}
            className="bg-slate-800 border border-violet-600 text-white text-xs font-bold rounded px-2 py-0.5 w-full focus:outline-none" />
          <button onClick={commit} data-testid={`custom-list-rename-confirm-${name}`} className="text-green-400 p-0.5"><Check className="w-3.5 h-3.5" /></button>
          <button onClick={() => setEditing(false)} className="text-slate-500 p-0.5"><X className="w-3.5 h-3.5" /></button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 min-w-0">
            <h3 className="font-black text-sm truncate">{name}</h3>
            <span className="text-xs font-bold opacity-60">{count}</span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {onMessageAll && count > 0 && (
              <button onClick={onMessageAll} data-testid={`message-all-btn-${name}`}
                title="Message all players in this column"
                className="p-0.5 text-slate-600 hover:text-blue-400 transition-colors"><Send className="w-3 h-3" /></button>
            )}
            <button onClick={() => setEditing(true)} data-testid={`custom-list-edit-${name}`} className="p-0.5 text-slate-600 hover:text-violet-400 transition-colors"><Pencil className="w-3 h-3" /></button>
            <button onClick={() => onDelete(name)} data-testid={`custom-list-delete-${name}`} className="p-0.5 text-slate-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Add List Form ─────────────────────────────────────────────────────────────

function AddListForm({ onAdd, onCancel }) {
  const [name, setName] = useState("");
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div className="border border-violet-700/50 bg-violet-950/20 rounded-xl p-3 w-60 flex-shrink-0">
      <p className="text-violet-300 text-xs font-bold uppercase tracking-wider mb-2">New List</p>
      <form onSubmit={e => { e.preventDefault(); if (name.trim()) onAdd(name.trim()); }} className="space-y-2">
        <input ref={ref} value={name} onChange={e => setName(e.target.value)} maxLength={40}
          placeholder="e.g. 2026 Guards" data-testid="add-custom-list-input"
          className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-violet-600" />
        <div className="flex gap-1.5">
          <button type="submit" disabled={!name.trim()} data-testid="add-custom-list-confirm-btn"
            className="flex-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 text-white text-xs font-bold py-1.5 rounded-lg transition-colors">Add</button>
          <button type="button" onClick={onCancel} className="px-3 text-slate-400 hover:text-white text-xs py-1.5 rounded-lg hover:bg-slate-800 transition-colors">Cancel</button>
        </div>
      </form>
    </div>
  );
}

// ── Delete List Modal ─────────────────────────────────────────────────────────

function DeleteListModal({ listName, playerCount, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="p-6">
          <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-700/50 flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-white font-black text-base text-center mb-2">Delete "{listName}"?</h3>
          <p className="text-slate-400 text-sm text-center leading-relaxed">
            {playerCount > 0
              ? <><strong className="text-slate-300">{playerCount} player{playerCount !== 1 ? "s" : ""}</strong> will be moved to <strong className="text-slate-300">Watch List</strong>.</>
              : "This list is empty and will be removed."}
          </p>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel} data-testid="delete-list-cancel-btn"
            className="flex-1 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} data-testid="delete-list-confirm-btn"
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors">Delete List</button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Message Modal ────────────────────────────────────────────────────────

function BulkMessageModal({ listName, players, onSend, onClose }) {
  const eligible = players.filter(item =>
    (item.player?.commitment_status || "uncommitted") !== "committed"
  );
  const skipped = players.filter(item =>
    (item.player?.commitment_status || "uncommitted") === "committed"
  );

  const [subject, setSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!msgBody.trim() || eligible.length === 0 || sending) return;
    setSending(true);
    const res = await onSend({ list_name: listName, subject: subject.trim() || undefined, body: msgBody.trim() });
    setSending(false);
    if (res) setResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {result ? (
          /* ── Success state ── */
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-green-900/40 border border-green-700/50 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-400" />
            </div>
            <h3 className="text-white font-black text-lg mb-2">Messages Sent!</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              <strong className="text-green-400">{result.sent} message{result.sent !== 1 ? "s" : ""}</strong> sent to players in <strong className="text-white">{listName}</strong>.
              {result.skipped > 0 && (
                <> <span className="text-slate-500">{result.skipped} committed player{result.skipped !== 1 ? "s" : ""} skipped.</span></>
              )}
            </p>
            <button onClick={onClose} data-testid="bulk-msg-done-btn"
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-2.5 rounded-xl text-sm transition-colors">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between p-6 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-400" />
                  <h3 className="text-white font-black text-base">Message All — {listName}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                  <span className="text-slate-300 font-semibold">
                    <strong className="text-blue-400">{eligible.length}</strong> player{eligible.length !== 1 ? "s" : ""} will receive this
                  </span>
                  {skipped.length > 0 && (
                    <span className="text-slate-500 text-xs" data-testid="bulk-msg-skipped-count">
                      · {skipped.length} committed skipped
                    </span>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Skipped player names (if any) */}
            {skipped.length > 0 && (
              <div className="mx-6 mb-4 bg-amber-950/30 border border-amber-700/40 rounded-lg px-3 py-2" data-testid="bulk-msg-skipped-info">
                <p className="text-amber-400 text-xs font-bold mb-1">Skipping committed players:</p>
                <p className="text-amber-300/70 text-xs">{skipped.map(i => i.player?.full_name || "Unknown").join(", ")}</p>
              </div>
            )}

            {/* No eligible players guard */}
            {eligible.length === 0 ? (
              <div className="px-6 pb-6 text-center">
                <p className="text-slate-400 text-sm">All players in this list are committed. No messages can be sent.</p>
                <button onClick={onClose} className="mt-4 text-slate-400 hover:text-white text-sm font-bold underline">Close</button>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-4">
                {/* Subject */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Subject <span className="text-slate-600 font-normal normal-case">(optional)</span></label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    maxLength={150}
                    placeholder="e.g. Interest from our programme"
                    data-testid="bulk-msg-subject-input"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Body */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Message <span className="text-red-500">*</span></label>
                  <textarea
                    value={msgBody}
                    onChange={e => setMsgBody(e.target.value)}
                    rows={5}
                    maxLength={2000}
                    placeholder="Write your message here..."
                    data-testid="bulk-msg-body-textarea"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-slate-600 text-xs">NCAA compliance rules apply to all messages.</p>
                    <span className="text-slate-600 text-xs">{msgBody.length}/2000</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button onClick={onClose} data-testid="bulk-msg-cancel-btn"
                    className="flex-1 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSend} disabled={!msgBody.trim() || sending} data-testid="bulk-msg-send-btn"
                    className="flex-1 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2">
                    {sending ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</>
                    ) : (
                      <><Send className="w-4 h-4" />Send to {eligible.length}</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── CSV / Print ───────────────────────────────────────────────────────────────

function exportCSV(saved) {
  const headers = ["Name","Position","Height","Club","Grad Year","PPG","Match Score","List","Color","Notes"];
  const rows = saved.map(item => {
    const p = item.player||{};
    return [p.full_name||"",p.position||"",p.height_ft||"",p.club_team||"",p.expected_graduation||"",
      p.stats_ppg!=null?p.stats_ppg:"",p.match_score!=null?`${p.match_score}%`:"",
      item.list_name||"Watch List",item.color_label||"",item.notes||""];
  });
  const esc = v => `"${String(v).replace(/"/g,'""')}"`;
  const csv = [headers,...rows].map(r=>r.map(esc).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  const a = document.createElement("a");
  a.href=url; a.download="courtbound-recruiting-board.csv";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const PRINT_STYLE = `@media print{body{background:#fff!important;color:#000!important}.no-print{display:none!important}.print-board{background:#fff!important;color:#000!important}.print-board table{border-collapse:collapse;width:100%}.print-board th,.print-board td{border:1px solid #ccc;padding:6px 10px;font-size:11px;color:#000!important;background:#fff!important}.print-board th{background:#f3f4f6!important;font-weight:700}}`;

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CoachBoardPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("boardViewMode") || "kanban");
  const [customLists, setCustomLists] = useState([]);
  const [showAddList, setShowAddList] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeItem, setActiveItem] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  const [bulkTarget, setBulkTarget] = useState(null); // listName when bulk modal is open
  const [exportingPDF, setExportingPDF] = useState(false);
  const dragOriginRef = useRef(null); // { id, list_name } — original position before drag
  const styleInjected = useRef(false);

  const allLists = [...LISTS, ...customLists];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    if (!styleInjected.current) {
      const tag = document.createElement("style"); tag.textContent = PRINT_STYLE;
      document.head.appendChild(tag); styleInjected.current = true;
    }
  }, []);

  const switchView = m => { setViewMode(m); localStorage.setItem("boardViewMode", m); };

  const load = async () => {
    setLoading(true);
    try {
      const [boardRes, listsRes] = await Promise.all([
        coachReq("get", "/saved"),
        coachReq("get", "/custom-lists").catch(() => ({ data: { custom_lists: [] } })),
      ]);
      setSaved(boardRes.data || []);
      setCustomLists(listsRes.data?.custom_lists || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  // ── CRUD helpers ─────────────────────────────────────────────────────────────

  const handleRemove = async uid => {
    try { await coachReq("delete", `/players/${uid}/save`); setSaved(p => p.filter(s => s.player_user_id !== uid)); } catch {}
  };

  const handleColorLabel = async (uid, key) => {
    try {
      await coachReq("patch", `/players/${uid}/save`, { color_label: key });
      setSaved(p => p.map(s => s.player_user_id === uid ? { ...s, color_label: key } : s));
    } catch {}
  };

  const handleSaveNote = async (uid, text) => {
    try {
      await coachReq("patch", `/players/${uid}/save`, { notes: text || null });
      setSaved(p => p.map(s => s.player_user_id === uid ? { ...s, notes: text || null } : s));
    } catch {}
  };

  const handleBulkSend = async (data) => {
    try {
      const r = await coachReq("post", "/messages/bulk", data);
      return r.data;
    } catch (e) {
      alert(e?.response?.data?.detail || "Failed to send messages");
      return null;
    }
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    try {
      const API = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem("cb_coach_token");
      const res = await fetch(`${API}/api/coach/board/export-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `courtbound-board-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate PDF — please try again");
    }
    setExportingPDF(false);
  };

  const handleAddList = async name => {
    try { const r = await coachReq("post", "/custom-lists", { name }); setCustomLists(r.data.custom_lists||[]); setShowAddList(false); }
    catch (e) { alert(e?.response?.data?.detail || "Failed to create list"); }
  };

  const handleRenameList = async (old_, new_) => {
    try {
      const r = await coachReq("patch", `/custom-lists/${encodeURIComponent(old_)}`, { name: new_ });
      setCustomLists(r.data.custom_lists||[]);
      setSaved(p => p.map(s => s.list_name === old_ ? { ...s, list_name: new_ } : s));
    } catch (e) { alert(e?.response?.data?.detail || "Failed to rename list"); }
  };

  const handleDeleteList = name => {
    const playerCount = (byList[name] || []).length;
    setDeleteTarget({ name, playerCount });
  };

  const confirmDeleteList = async () => {
    if (!deleteTarget) return;
    const { name } = deleteTarget; setDeleteTarget(null);
    try {
      const r = await coachReq("delete", `/custom-lists/${encodeURIComponent(name)}`);
      setCustomLists(r.data.custom_lists||[]);
      setSaved(p => p.map(s => s.list_name === name ? { ...s, list_name: "Watch List" } : s));
    } catch (e) { alert(e?.response?.data?.detail || "Failed to delete list"); }
  };

  // ── DnD helpers ──────────────────────────────────────────────────────────────

  // Sort each list by sort_order, returning a fresh array per column
  const byList = allLists.reduce((acc, l) => {
    acc[l] = [...saved.filter(s => s.list_name === l)].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return acc;
  }, {});

  // Resolve which list_name an over.id belongs to (card id → its list, or "col-X" → X)
  const resolveTargetList = (overId) => {
    if (String(overId).startsWith("col-")) return overId.slice(4);
    return saved.find(s => s.id === overId)?.list_name ?? null;
  };

  const handleDragStart = ({ active }) => {
    const item = saved.find(s => s.id === active.id);
    setActiveItem(item || null);
    dragOriginRef.current = item ? { id: item.id, list_name: item.list_name } : null;
  };

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) { setOverColumnId(null); return; }
    const targetList = resolveTargetList(over.id);
    setOverColumnId(targetList);
    const activeItem = saved.find(s => s.id === active.id);
    if (!activeItem || targetList === activeItem.list_name) return;
    // Cross-column live preview: move item to target column
    setSaved(prev => prev.map(s => s.id === active.id ? { ...s, list_name: targetList } : s));
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveItem(null); setOverColumnId(null);
    const origin = dragOriginRef.current;
    if (!origin) return;

    if (!over) {
      // Dropped outside — revert to origin
      setSaved(prev => prev.map(s => s.id === active.id ? { ...s, list_name: origin.list_name } : s));
      return;
    }

    const currentItem = saved.find(s => s.id === active.id);
    if (!currentItem) return;

    const targetList = resolveTargetList(over.id) || currentItem.list_name;
    const isCrossColumn = origin.list_name !== targetList;

    if (isCrossColumn) {
      // Already moved in onDragOver — persist list_name + recalculate sort_orders for target
      coachReq("patch", `/players/${currentItem.player_user_id}/save`, { list_name: targetList }).catch(() => {
        setSaved(prev => prev.map(s => s.id === active.id ? { ...s, list_name: origin.list_name } : s));
      });
      const targetItems = saved.filter(s => s.list_name === targetList);
      const reorderItems = targetItems.map((item, idx) => ({ id: item.id, sort_order: idx }));
      coachReq("patch", "/board/reorder", { items: reorderItems }).catch(() => {});
    } else {
      // Within-column reorder
      const colItems = byList[targetList] || [];
      const oldIdx = colItems.findIndex(s => s.id === active.id);
      const newIdx = colItems.findIndex(s => s.id === over.id);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(colItems, oldIdx, newIdx);
      const withSortOrders = reordered.map((item, idx) => ({ ...item, sort_order: idx }));
      setSaved(prev => {
        const others = prev.filter(s => s.list_name !== targetList);
        return [...others, ...withSortOrders];
      });
      coachReq("patch", "/board/reorder", { items: withSortOrders.map((s, idx) => ({ id: s.id, sort_order: idx })) }).catch(() => {});
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const renderColumn = (listName, isCustom) => {
    const items = byList[listName] || [];
    const colDropId = `col-${listName}`;
    return (
      <div
        key={listName}
        className={`border rounded-xl p-3 flex-shrink-0 w-60 ${isCustom ? CUSTOM_LIST_COLOR : LIST_COLORS[listName]}`}
        data-testid={isCustom ? `custom-list-column-${listName}` : undefined}
      >
        {isCustom ? (
          <CustomColumnHeader name={listName} count={items.length} onRename={handleRenameList} onDelete={handleDeleteList} onMessageAll={items.length > 0 ? () => setBulkTarget(listName) : undefined} />
        ) : (
          <div className={`flex items-center justify-between pb-2 mb-3 border-b ${LIST_HEADER_COLORS[listName]}`}>
            <h3 className="font-black text-sm">{listName}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold opacity-60">{items.length}</span>
              {listName !== "Committed" && items.length > 0 && (
                <button
                  onClick={() => setBulkTarget(listName)}
                  data-testid={`message-all-btn-${listName}`}
                  title="Message all players in this column"
                  className="p-1 text-slate-600 hover:text-blue-400 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <DroppableColumnBody id={colDropId} isOver={overColumnId === listName} isEmpty={items.length === 0}>
            {items.map(item => (
              <SortableCard key={item.id} item={item} allLists={allLists}
                onRemove={handleRemove}
                onColorLabel={handleColorLabel}
                onSaveNote={handleSaveNote}
                onView={id => navigate(`/coach/players/${id}`)}
              />
            ))}
          </DroppableColumnBody>
        </SortableContext>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 print-board">
      <div className="no-print"><CoachNav /></div>
      <div className="max-w-full px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white">My Recruiting Board</h1>
            <p className="text-slate-400 text-sm mt-1">{saved.length} player{saved.length !== 1 ? "s" : ""} saved</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 no-print">
              <button onClick={() => switchView("kanban")} data-testid="view-toggle-kanban"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode==="kanban"?"bg-slate-700 text-white":"text-slate-500 hover:text-slate-300"}`}>
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button onClick={() => switchView("table")} data-testid="view-toggle-table"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode==="table"?"bg-slate-700 text-white":"text-slate-500 hover:text-slate-300"}`}>
                <List className="w-3.5 h-3.5" /> Table
              </button>
            </div>
            {saved.length > 0 && (
              <button onClick={() => exportCSV(saved)} data-testid="export-csv-btn"
                className="no-print flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}
            {saved.length > 0 && (
              <button onClick={handleExportPDF} disabled={exportingPDF} data-testid="export-pdf-btn"
                className="no-print flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                <Printer className="w-3.5 h-3.5" /> {exportingPDF ? "Generating..." : "PDF"}
              </button>
            )}
            <button onClick={() => navigate("/coach/players")}
              className="no-print bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
              <Bookmark className="w-4 h-4" /> Find Players
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {LISTS.map(l => <div key={l} className="h-64 w-60 flex-shrink-0 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
          </div>
        ) : saved.length === 0 && customLists.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">Your board is empty</p>
            <button onClick={() => navigate("/coach/players")}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              Search Players
            </button>
          </div>
        ) : viewMode === "table" ? (
          <TableView saved={saved} onRemove={handleRemove}
            onView={id => navigate(`/coach/players/${id}`)} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter}
            onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {LISTS.map(l => renderColumn(l, false))}
              {customLists.map(l => renderColumn(l, true))}
              <div className="flex-shrink-0">
                {showAddList
                  ? <AddListForm onAdd={handleAddList} onCancel={() => setShowAddList(false)} />
                  : customLists.length < 10 && (
                    <button onClick={() => setShowAddList(true)} data-testid="add-custom-list-btn"
                      className="flex items-center gap-2 text-slate-500 hover:text-violet-400 border border-dashed border-slate-700 hover:border-violet-600 rounded-xl px-4 py-3 text-xs font-bold transition-all h-fit">
                      <Plus className="w-4 h-4" /> New List
                    </button>
                  )
                }
              </div>
            </div>

            <DragOverlay dropAnimation={{ duration: 180, easing: "ease" }}>
              {activeItem && (
                <SortableCard item={activeItem} allLists={allLists}
                  onRemove={() => {}} onColorLabel={() => {}} onSaveNote={() => {}} onView={() => {}}
                  isDragOverlay />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {deleteTarget && (
        <DeleteListModal listName={deleteTarget.name} playerCount={deleteTarget.playerCount}
          onConfirm={confirmDeleteList} onCancel={() => setDeleteTarget(null)} />
      )}

      {bulkTarget && (
        <BulkMessageModal
          listName={bulkTarget}
          players={byList[bulkTarget] || []}
          onSend={handleBulkSend}
          onClose={() => setBulkTarget(null)}
        />
      )}
    </div>
  );
}
