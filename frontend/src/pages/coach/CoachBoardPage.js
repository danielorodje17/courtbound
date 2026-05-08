import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Bookmark, ChevronRight, Film, Trash2, StickyNote } from "lucide-react";

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

const LABEL_COLORS = [
  { key: "red",    border: "border-red-500",    bg: "bg-red-500",    ring: "ring-red-400" },
  { key: "amber",  border: "border-amber-500",  bg: "bg-amber-500",  ring: "ring-amber-400" },
  { key: "green",  border: "border-green-500",  bg: "bg-green-500",  ring: "ring-green-400" },
  { key: "blue",   border: "border-blue-500",   bg: "bg-blue-500",   ring: "ring-blue-400" },
  { key: "purple", border: "border-purple-500", bg: "bg-purple-500", ring: "ring-purple-400" },
];

const colorBorderMap = {
  red: "border-l-4 border-l-red-500",
  amber: "border-l-4 border-l-amber-500",
  green: "border-l-4 border-l-green-500",
  blue: "border-l-4 border-l-blue-500",
  purple: "border-l-4 border-l-purple-500",
};

function BoardCard({ item, onRemove, onMove, onView, onColorLabel }) {
  const p = item.player || {};
  const [showColors, setShowColors] = useState(false);
  const colorBorder = item.color_label ? colorBorderMap[item.color_label] || "" : "";

  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all relative ${colorBorder}`}
      data-testid="board-card"
      onMouseEnter={() => setShowColors(true)}
      onMouseLeave={() => setShowColors(false)}
    >
      {/* Color label picker — appears on hover */}
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
              title="Clear label"
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
      {/* Move to list */}
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

export default function CoachBoardPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Players not in any named list default to Watch List for display
  const totalOnBoard = saved.length;

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black text-white">My Recruiting Board</h1>
            <p className="text-slate-400 text-sm mt-1">{totalOnBoard} player{totalOnBoard !== 1 ? "s" : ""} saved across all lists</p>
          </div>
          <button onClick={() => navigate("/coach/players")}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
            <Bookmark className="w-4 h-4" /> Find More Players
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {LISTS.map(l => <div key={l} className="h-64 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
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
        ) : (
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
