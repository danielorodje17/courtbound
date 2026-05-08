import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import {
  Bookmark, ChevronRight, Film, Trash2, StickyNote,
  LayoutGrid, List, Download, Printer,
  ArrowUpDown, ArrowUp, ArrowDown,
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
  { key: "red",    dot: "#ef4444", border: "border-red-500",    bg: "bg-red-500",    ring: "ring-red-400" },
  { key: "amber",  dot: "#f59e0b", border: "border-amber-500",  bg: "bg-amber-500",  ring: "ring-amber-400" },
  { key: "green",  dot: "#22c55e", border: "border-green-500",  bg: "bg-green-500",  ring: "ring-green-400" },
  { key: "blue",   dot: "#3b82f6", border: "border-blue-500",   bg: "bg-blue-500",   ring: "ring-blue-400" },
  { key: "purple", dot: "#a855f7", border: "border-purple-500", bg: "bg-purple-500", ring: "ring-purple-400" },
];

const COLOR_BORDER = {
  red: "border-l-4 border-l-red-500",
  amber: "border-l-4 border-l-amber-500",
  green: "border-l-4 border-l-green-500",
  blue: "border-l-4 border-l-blue-500",
  purple: "border-l-4 border-l-purple-500",
};

// ── Kanban Card ───────────────────────────────────────────────────────────────

function BoardCard({ item, onRemove, onMove, onView, onColorLabel }) {
  const p = item.player || {};
  const [showColors, setShowColors] = useState(false);
  const colorBorder = item.color_label ? COLOR_BORDER[item.color_label] || "" : "";

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all relative ${colorBorder}`}
      data-testid="board-card"
      onMouseEnter={() => setShowColors(true)}
      onMouseLeave={() => setShowColors(false)}
    >
      {showColors && (
        <div className="absolute top-2 right-2 flex gap-1 z-10 bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-full border border-slate-700">
          {LABEL_COLORS.map(c => (
            <button
              key={c.key}
              data-testid={`color-label-${c.key}`}
              onClick={(e) => { e.stopPropagation(); onColorLabel(item.player_user_id, c.key); }}
              className={`w-4 h-4 rounded-full ${c.bg} transition-all hover:scale-125 ${item.color_label === c.key ? `ring-2 ring-offset-1 ring-offset-slate-900 ${c.ring}` : ""}`}
            />
          ))}
          {item.color_label && (
            <button
              data-testid="color-label-clear"
              onClick={(e) => { e.stopPropagation(); onColorLabel(item.player_user_id, null); }}
              className="w-4 h-4 rounded-full bg-slate-600 hover:bg-slate-500 transition-all text-slate-300 text-xs flex items-center justify-center"
            >×</button>
          )}
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
          {(p.full_name || "?")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-white text-sm truncate">{p.full_name || "Unknown"}</h4>
          <p className="text-slate-400 text-xs">{p.position} · {p.height_ft || "—"}</p>
        </div>
        {p.match_score != null && (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${p.match_score >= 80 ? "bg-green-600 text-white" : p.match_score >= 60 ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-300"}`}>
            {p.match_score}%
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {p.club_team && <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{p.club_team}</span>}
        {p.expected_graduation && <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">Grad {p.expected_graduation}</span>}
        {p.highlight_tape_url && <span className="text-blue-400 text-xs flex items-center gap-0.5"><Film className="w-3 h-3" />Reel</span>}
      </div>
      {item.notes && (
        <div className="bg-slate-800 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
          <StickyNote className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-slate-300 text-xs leading-relaxed">{item.notes}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={() => onView(item.player_user_id)} data-testid={`board-view-${item.player_user_id}`}
          className="flex-1 text-xs font-bold py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center justify-center gap-1">
          Profile <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onRemove(item.player_user_id)} data-testid={`board-remove-${item.player_user_id}`}
          className="px-3 py-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {LISTS.filter(l => l !== item.list_name).map(l => (
          <button key={l} onClick={() => onMove(item.player_user_id, l)}
            className="text-xs text-slate-500 hover:text-slate-300 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors">
            → {l}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Table View ────────────────────────────────────────────────────────────────

const TABLE_COLS = [
  { key: "full_name",           label: "Player",      src: "player" },
  { key: "position",            label: "Pos",         src: "player" },
  { key: "height_ft",           label: "Height",      src: "player" },
  { key: "club_team",           label: "Club",        src: "player" },
  { key: "expected_graduation", label: "Grad",        src: "player" },
  { key: "stats_ppg",           label: "PPG",         src: "player", numeric: true },
  { key: "match_score",         label: "Match %",     src: "player", numeric: true },
  { key: "list_name",           label: "List",        src: "item" },
];

function getValue(item, col) {
  const raw = col.src === "item" ? item[col.key] : (item.player || {})[col.key];
  return raw ?? (col.numeric ? -1 : "");
}

function SortIcon({ active, dir }) {
  if (!active) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
  return dir === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />;
}

function TableView({ saved, onRemove, onView }) {
  const [sort, setSort] = useState({ key: "full_name", dir: "asc" });

  const toggleSort = (key) => {
    setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  };

  const col = TABLE_COLS.find(c => c.key === sort.key);
  const sorted = [...saved].sort((a, b) => {
    const va = getValue(a, col);
    const vb = getValue(b, col);
    if (col?.numeric) return sort.dir === "asc" ? va - vb : vb - va;
    return sort.dir === "asc"
      ? String(va).localeCompare(String(vb))
      : String(vb).localeCompare(String(va));
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800" data-testid="board-table-view">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900">
            {TABLE_COLS.map(c => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key)}
                data-testid={`table-sort-${c.key}`}
                className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                <span className="flex items-center gap-1.5">
                  {c.label}
                  <SortIcon active={sort.key === c.key} dir={sort.dir} />
                </span>
              </th>
            ))}
            <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {sorted.map(item => {
            const p = item.player || {};
            const labelColor = LABEL_COLORS.find(c => c.key === item.color_label);
            return (
              <tr key={item.id} className="bg-slate-950 hover:bg-slate-900 transition-colors" data-testid="board-table-row">
                {/* Player name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {labelColor && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: labelColor.dot }} />
                    )}
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                      {(p.full_name || "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white text-xs truncate max-w-[140px]">{p.full_name || "—"}</p>
                      {p.highlight_tape_url && (
                        <span className="text-blue-400 text-xs flex items-center gap-0.5"><Film className="w-3 h-3" />Reel</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.position || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs whitespace-nowrap">{p.height_ft || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs max-w-[140px] truncate">{p.club_team || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.expected_graduation || "—"}</td>
                <td className="px-4 py-3 text-slate-300 text-xs">{p.stats_ppg != null ? p.stats_ppg : "—"}</td>
                {/* Match score */}
                <td className="px-4 py-3">
                  {p.match_score != null ? (
                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      p.match_score >= 80 ? "bg-green-600 text-white" :
                      p.match_score >= 60 ? "bg-blue-600 text-white" :
                      "bg-slate-700 text-slate-300"
                    }`}>
                      {p.match_score}%
                    </span>
                  ) : "—"}
                </td>
                {/* List badge */}
                <td className="px-4 py-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${LIST_BADGE[item.list_name] || LIST_BADGE["Watch List"]}`}>
                    {item.list_name || "Watch List"}
                  </span>
                </td>
                {/* Actions */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onView(item.player_user_id)}
                      data-testid={`table-view-${item.player_user_id}`}
                      className="text-xs font-bold py-1.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors whitespace-nowrap"
                    >
                      View
                    </button>
                    <button
                      onClick={() => onRemove(item.player_user_id)}
                      data-testid={`table-remove-${item.player_user_id}`}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
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

// ── CSV / Print helpers ───────────────────────────────────────────────────────

function exportCSV(saved) {
  const headers = ["Name", "Position", "Height (ft)", "Club", "Grad Year", "PPG", "Match Score", "List", "Color Label", "Notes"];
  const rows = saved.map(item => {
    const p = item.player || {};
    return [
      p.full_name || "",
      p.position || "",
      p.height_ft || "",
      p.club_team || "",
      p.expected_graduation || "",
      p.stats_ppg != null ? p.stats_ppg : "",
      p.match_score != null ? `${p.match_score}%` : "",
      item.list_name || "Watch List",
      item.color_label || "",
      item.notes || "",
    ];
  });
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "courtbound-recruiting-board.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Print styles (injected once) ──────────────────────────────────────────────

const PRINT_STYLE = `
@media print {
  body { background: #fff !important; color: #000 !important; }
  .no-print { display: none !important; }
  .print-board { background: #fff !important; color: #000 !important; }
  .print-board table { border-collapse: collapse; width: 100%; }
  .print-board th, .print-board td { border: 1px solid #ccc; padding: 6px 10px; font-size: 11px; color: #000 !important; background: #fff !important; }
  .print-board th { background: #f3f4f6 !important; font-weight: 700; }
}
`;

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CoachBoardPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("boardViewMode") || "kanban");
  const styleInjected = useRef(false);

  // Inject print styles once
  useEffect(() => {
    if (!styleInjected.current) {
      const tag = document.createElement("style");
      tag.textContent = PRINT_STYLE;
      document.head.appendChild(tag);
      styleInjected.current = true;
    }
  }, []);

  const switchView = (mode) => {
    setViewMode(mode);
    localStorage.setItem("boardViewMode", mode);
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await coachReq("get", "/saved");
      setSaved(r.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const handleRemove = async (userId) => {
    try {
      await coachReq("delete", `/players/${userId}/save`);
      setSaved(prev => prev.filter(s => s.player_user_id !== userId));
    } catch {}
  };

  const handleMove = async (userId, listName) => {
    try {
      await coachReq("patch", `/players/${userId}/save`, { list_name: listName });
      setSaved(prev => prev.map(s => s.player_user_id === userId ? { ...s, list_name: listName } : s));
    } catch {}
  };

  const handleColorLabel = async (userId, colorKey) => {
    try {
      await coachReq("patch", `/players/${userId}/save`, { color_label: colorKey });
      setSaved(prev => prev.map(s => s.player_user_id === userId ? { ...s, color_label: colorKey } : s));
    } catch {}
  };

  const byList = LISTS.reduce((acc, l) => {
    acc[l] = saved.filter(s => s.list_name === l);
    return acc;
  }, {});

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-slate-950 print-board">
      <div className="no-print">
        <CoachNav />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white">My Recruiting Board</h1>
            <p className="text-slate-400 text-sm mt-1">{saved.length} player{saved.length !== 1 ? "s" : ""} saved across all lists</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 no-print">
              <button
                onClick={() => switchView("kanban")}
                data-testid="view-toggle-kanban"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === "kanban" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Kanban
              </button>
              <button
                onClick={() => switchView("table")}
                data-testid="view-toggle-table"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${viewMode === "table" ? "bg-slate-700 text-white" : "text-slate-500 hover:text-slate-300"}`}
              >
                <List className="w-3.5 h-3.5" /> Table
              </button>
            </div>

            {/* Export CSV */}
            {saved.length > 0 && (
              <button
                onClick={() => exportCSV(saved)}
                data-testid="export-csv-btn"
                className="no-print flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            )}

            {/* Print / PDF */}
            {saved.length > 0 && (
              <button
                onClick={handlePrint}
                data-testid="print-board-btn"
                className="no-print flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg border border-slate-700 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> PDF
              </button>
            )}

            {/* Find players */}
            <button
              onClick={() => navigate("/coach/players")}
              className="no-print bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Bookmark className="w-4 h-4" /> Find Players
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className={viewMode === "kanban" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" : "space-y-2"}>
            {viewMode === "kanban"
              ? LISTS.map(l => <div key={l} className="h-64 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)
              : Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)
            }
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-20">
            <Bookmark className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">Your board is empty</p>
            <p className="text-slate-600 text-sm mt-1">Save players from the search page to add them here</p>
            <button onClick={() => navigate("/coach/players")}
              className="mt-6 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              Search Players
            </button>
          </div>
        ) : viewMode === "table" ? (
          <TableView
            saved={saved}
            onRemove={handleRemove}
            onMove={handleMove}
            onView={(id) => navigate(`/coach/players/${id}`)}
            onColorLabel={handleColorLabel}
          />
        ) : (
          /* Kanban */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {LISTS.map(listName => (
              <div key={listName} className={`border rounded-xl p-3 ${LIST_COLORS[listName]}`}>
                <div className={`flex items-center justify-between pb-2 mb-3 border-b ${LIST_HEADER_COLORS[listName]}`}>
                  <h3 className="font-black text-sm">{listName}</h3>
                  <span className="text-xs font-bold opacity-60">{byList[listName].length}</span>
                </div>
                <div className="space-y-3">
                  {byList[listName].length === 0 ? (
                    <div className="text-center py-6 text-slate-600 text-xs">Empty</div>
                  ) : byList[listName].map(item => (
                    <BoardCard
                      key={item.id}
                      item={item}
                      onRemove={handleRemove}
                      onMove={handleMove}
                      onColorLabel={handleColorLabel}
                      onView={(id) => navigate(`/coach/players/${id}`)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
