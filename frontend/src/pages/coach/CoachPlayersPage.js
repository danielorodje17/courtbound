import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Search, Filter, BookmarkPlus, Film, Shield, ChevronRight, SlidersHorizontal, X } from "lucide-react";

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "G", "F"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];
const SORT_OPTIONS = [
  { value: "match", label: "Best Match" },
  { value: "newest", label: "Newest Profiles" },
  { value: "height", label: "Height (Tallest)" },
  { value: "grad_year", label: "Graduation Year" },
];

function MatchBadge({ score }) {
  const color = score >= 80 ? "bg-green-600" : score >= 60 ? "bg-blue-600" : "bg-slate-600";
  return <span className={`${color} text-white text-xs font-black px-2 py-0.5 rounded-full`}>{score}% match</span>;
}

export default function CoachPlayersPage() {
  const { coachReq } = useCoachAuth();
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [filters, setFilters] = useState({
    search: "", position: "", grad_year: "",
    min_height_cm: "", max_height_cm: "", min_ppg: "",
    ncaa_registered: "", sort: "match",
  });
  const [applied, setApplied] = useState({ ...filters });

  const fetchPlayers = useCallback(async (f = applied, p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.append("search", f.search);
      if (f.position) params.append("position", f.position);
      if (f.grad_year) params.append("grad_year", f.grad_year);
      if (f.min_height_cm) params.append("min_height_cm", f.min_height_cm);
      if (f.max_height_cm) params.append("max_height_cm", f.max_height_cm);
      if (f.min_ppg) params.append("min_ppg", f.min_ppg);
      if (f.ncaa_registered !== "") params.append("ncaa_registered", f.ncaa_registered);
      params.append("sort", f.sort);
      params.append("page", p);
      params.append("limit", 20);
      const r = await coachReq("get", `/players?${params}`);
      setPlayers(r.data.players || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [applied, coachReq]);

  useEffect(() => {
    fetchPlayers(applied, 1);
    // eslint-disable-next-line
  }, []);

  const applyFilters = () => {
    setApplied({ ...filters });
    fetchPlayers(filters, 1);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    const cleared = { search: "", position: "", grad_year: "", min_height_cm: "", max_height_cm: "", min_ppg: "", ncaa_registered: "", sort: "match" };
    setFilters(cleared);
    setApplied(cleared);
    fetchPlayers(cleared, 1);
  };

  const handleSave = async (player) => {
    try {
      if (player.is_saved) {
        await coachReq("delete", `/players/${player.user_id}/save`);
      } else {
        await coachReq("post", `/players/${player.user_id}/save`, { list_name: "Watch List" });
      }
      setPlayers(prev => prev.map(p => p.user_id === player.user_id ? { ...p, is_saved: !p.is_saved } : p));
    } catch {}
  };

  const hasFilters = Object.entries(applied).some(([k, v]) => k !== "sort" && v !== "");

  return (
    <div className="min-h-screen bg-slate-950">
      <CoachNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-xl font-black text-white">Player Search</h1>
            <p className="text-slate-400 text-sm">{loading ? "Searching..." : `${total} players match your criteria`}</p>
          </div>
          <div className="sm:ml-auto flex items-center gap-3">
            <select value={filters.sort} onChange={e => { setFilters(p => ({ ...p, sort: e.target.value })); setApplied(p => ({ ...p, sort: e.target.value })); fetchPlayers({ ...applied, sort: e.target.value }, 1); }}
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => setFiltersOpen(!filtersOpen)} data-testid="filters-toggle"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filtersOpen ? "bg-blue-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"}`}>
              <SlidersHorizontal className="w-4 h-4" /> Filters {hasFilters && <span className="bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">•</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            data-testid="player-search-input"
            value={filters.search}
            onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && applyFilters()}
            placeholder="Search by name, club, or hometown..."
            className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {/* Filters panel */}
        {filtersOpen && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="filters-panel">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Position</label>
              <select value={filters.position} onChange={e => setFilters(p => ({ ...p, position: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Grad Year</label>
              <select value={filters.grad_year} onChange={e => setFilters(p => ({ ...p, grad_year: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min Height (cm)</label>
              <input type="number" placeholder="e.g. 190" value={filters.min_height_cm}
                onChange={e => setFilters(p => ({ ...p, min_height_cm: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm placeholder-slate-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Max Height (cm)</label>
              <input type="number" placeholder="e.g. 210" value={filters.max_height_cm}
                onChange={e => setFilters(p => ({ ...p, max_height_cm: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min PPG</label>
              <input type="number" step="0.1" placeholder="e.g. 10" value={filters.min_ppg}
                onChange={e => setFilters(p => ({ ...p, min_ppg: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">NCAA Reg.</label>
              <select value={filters.ncaa_registered} onChange={e => setFilters(p => ({ ...p, ncaa_registered: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="true">Registered</option>
                <option value="false">Not Yet</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-6 flex gap-3 pt-1">
              <button onClick={applyFilters} data-testid="apply-filters-btn"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
                Apply Filters
              </button>
              {hasFilters && (
                <button onClick={clearFilters} className="text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-1 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {POSITIONS.slice(0, 5).map(pos => (
            <button key={pos} onClick={() => { const nf = { ...applied, position: applied.position === pos ? "" : pos }; setFilters(nf); setApplied(nf); fetchPlayers(nf, 1); }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.position === pos ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
              {pos}
            </button>
          ))}
          {GRAD_YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => { const nf = { ...applied, grad_year: applied.grad_year === yr ? "" : yr }; setFilters(nf); setApplied(nf); fetchPlayers(nf, 1); }}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.grad_year === yr ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
              {yr}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-52 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
          </div>
        ) : players.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">No players found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {players.map(player => (
                <div key={player.user_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-blue-700/50 transition-all flex flex-col" data-testid="search-player-card">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {(player.full_name || "?")[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <h3 className="font-bold text-white text-sm truncate">{player.full_name}</h3>
                        {new Date(player.updated_at || 0) > new Date(Date.now() - 7 * 86400000) && (
                          <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded flex-shrink-0 font-bold">NEW</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{player.position}{player.secondary_position ? ` / ${player.secondary_position}` : ""} · {player.height_ft || "—"}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {player.club_team && <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">{player.club_team}</span>}
                    {player.expected_graduation && <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-full">Grad {player.expected_graduation}</span>}
                  </div>
                  <div className="flex gap-3 text-xs mb-3 border-t border-slate-800 pt-3">
                    {player.ppg != null && <span><strong className="text-white">{player.ppg}</strong><span className="text-slate-500"> PPG</span></span>}
                    {player.rpg != null && <span><strong className="text-white">{player.rpg}</strong><span className="text-slate-500"> RPG</span></span>}
                    {player.apg != null && <span><strong className="text-white">{player.apg}</strong><span className="text-slate-500"> APG</span></span>}
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <MatchBadge score={player.match_score} />
                    {player.highlight_tape_url && <span className="flex items-center gap-1 text-blue-400 text-xs"><Film className="w-3 h-3" /> Reel</span>}
                    {player.ncaa_registered && <span className="flex items-center gap-1 text-green-400 text-xs"><Shield className="w-3 h-3" /> NCAA</span>}
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button onClick={() => handleSave(player)} data-testid={`save-${player.user_id}`}
                      className={`flex-1 text-xs font-bold py-2 rounded-lg border transition-colors ${
                        player.is_saved ? "border-blue-600 text-blue-400 bg-blue-600/10" : "border-slate-700 text-slate-400 hover:border-blue-600 hover:text-blue-400"
                      }`}>
                      <BookmarkPlus className="w-3.5 h-3.5 inline mr-1" />{player.is_saved ? "Saved" : "Save"}
                    </button>
                    <button onClick={() => navigate(`/coach/players/${player.user_id}`)} data-testid={`view-${player.user_id}`}
                      className="flex-1 text-xs font-bold py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
                      View <ChevronRight className="w-3.5 h-3.5 inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button disabled={page === 1} onClick={() => fetchPlayers(applied, page - 1)} className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
                <button disabled={page === pages} onClick={() => fetchPlayers(applied, page + 1)} className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
