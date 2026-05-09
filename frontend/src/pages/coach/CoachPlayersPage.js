import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { CoachNav } from "../../components/coach/CoachNav";
import { Search, BookmarkPlus, Film, Shield, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { VideoModal } from "../../components/coach/VideoModal";

const POSITIONS = ["PG", "SG", "SF", "PF", "C", "G", "F"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];
const SORT_OPTIONS = [
  { value: "match", label: "Best Match" },
  { value: "newest", label: "Newest Profiles" },
  { value: "height", label: "Height (Tallest)" },
  { value: "grad_year", label: "Graduation Year" },
];
const COMMITMENT_OPTIONS = [
  { value: "", label: "Any Status" },
  { value: "uncommitted", label: "Uncommitted" },
  { value: "committed", label: "Committed" },
];
const DEFAULT_FILTERS = {
  search: "", position: "", grad_year: "",
  min_height_cm: "", max_height_cm: "", min_ppg: "",
  min_gpa: "", min_sat: "", ncaa_registered: "",
  nationality: "", commitment_status: "", sort: "match",
};

function MatchBadge({ score }) {
  const color = score >= 80 ? "bg-green-600" : score >= 60 ? "bg-blue-600" : "bg-slate-600";
  return <span className={`${color} text-white text-xs font-black px-2 py-0.5 rounded-full`}>{score}% match</span>;
}

export default function CoachPlayersPage() {
  const { coachReq, markOnboardingStep } = useCoachAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [videoTarget, setVideoTarget] = useState(null); // { url, name }

  // Initialise filters from URL query params (enables shareable/back-button state)
  const filtersFromUrl = () => ({
    search: searchParams.get("search") || "",
    position: searchParams.get("position") || "",
    grad_year: searchParams.get("grad_year") || "",
    min_height_cm: searchParams.get("min_height_cm") || "",
    max_height_cm: searchParams.get("max_height_cm") || "",
    min_ppg: searchParams.get("min_ppg") || "",
    min_gpa: searchParams.get("min_gpa") || "",
    min_sat: searchParams.get("min_sat") || "",
    ncaa_registered: searchParams.get("ncaa_registered") || "",
    nationality: searchParams.get("nationality") || "",
    commitment_status: searchParams.get("commitment_status") || "",
    sort: searchParams.get("sort") || "match",
  });

  const [filters, setFilters] = useState(filtersFromUrl);
  const [applied, setApplied] = useState(filtersFromUrl);

  // Write active filters to URL (omit defaults to keep URL clean)
  const syncUrl = (f) => {
    const p = {};
    Object.entries(f).forEach(([k, v]) => {
      if (v && !(k === "sort" && v === "match")) p[k] = v;
    });
    setSearchParams(p, { replace: true });
  };

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
      if (f.min_gpa) params.append("min_gpa", f.min_gpa);
      if (f.min_sat) params.append("min_sat", f.min_sat);
      if (f.ncaa_registered !== "") params.append("ncaa_registered", f.ncaa_registered);
      if (f.nationality) params.append("nationality", f.nationality);
      if (f.commitment_status) params.append("commitment_status", f.commitment_status);
      params.append("sort", f.sort);
      params.append("page", p);
      params.append("limit", 20);
      const r = await coachReq("get", `/players?${params}`);
      setPlayers(r.data.players || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
      markOnboardingStep("search_done");
    } catch {}
    setLoading(false);
  }, [applied, coachReq, markOnboardingStep]);

  useEffect(() => {
    fetchPlayers(applied, 1);
    // eslint-disable-next-line
  }, []);

  const applyFilters = () => {
    setApplied({ ...filters });
    syncUrl(filters);
    fetchPlayers(filters, 1);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setSearchParams({}, { replace: true });
    fetchPlayers(DEFAULT_FILTERS, 1);
  };

  // Quick-apply a partial filter update without opening the panel
  const quickFilter = (update) => {
    const nf = { ...applied, ...update };
    setFilters(nf);
    setApplied(nf);
    syncUrl(nf);
    fetchPlayers(nf, 1);
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
  const activeFilterCount = Object.entries(applied).filter(([k, v]) => k !== "sort" && v !== "").length;

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
            <select value={applied.sort} onChange={e => quickFilter({ sort: e.target.value })}
              data-testid="sort-select"
              className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => setFiltersOpen(!filtersOpen)} data-testid="filters-toggle"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filtersOpen ? "bg-blue-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"}`}>
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">{activeFilterCount}</span>
              )}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="filters-panel">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Position</label>
              <select value={filters.position} onChange={e => setFilters(p => ({ ...p, position: e.target.value }))}
                data-testid="filter-position"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Grad Year</label>
              <select value={filters.grad_year} onChange={e => setFilters(p => ({ ...p, grad_year: e.target.value }))}
                data-testid="filter-grad-year"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                {GRAD_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min Height (cm)</label>
              <input type="number" placeholder="e.g. 185" value={filters.min_height_cm}
                onChange={e => setFilters(p => ({ ...p, min_height_cm: e.target.value }))}
                data-testid="filter-min-height"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Max Height (cm)</label>
              <input type="number" placeholder="e.g. 220" value={filters.max_height_cm}
                onChange={e => setFilters(p => ({ ...p, max_height_cm: e.target.value }))}
                data-testid="filter-max-height"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min PPG</label>
              <input type="number" step="0.1" placeholder="e.g. 10" value={filters.min_ppg}
                onChange={e => setFilters(p => ({ ...p, min_ppg: e.target.value }))}
                data-testid="filter-min-ppg"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min GPA</label>
              <input type="number" step="0.1" min="0" max="4" placeholder="e.g. 3.0" value={filters.min_gpa}
                onChange={e => setFilters(p => ({ ...p, min_gpa: e.target.value }))}
                data-testid="filter-min-gpa"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nationality</label>
              <input type="text" placeholder="e.g. British, Nigerian..." value={filters.nationality}
                onChange={e => setFilters(p => ({ ...p, nationality: e.target.value }))}
                data-testid="filter-nationality"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Commitment</label>
              <select value={filters.commitment_status} onChange={e => setFilters(p => ({ ...p, commitment_status: e.target.value }))}
                data-testid="filter-commitment-status"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                {COMMITMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Min SAT</label>
              <input type="number" step="10" min="400" max="1600" placeholder="e.g. 1000" value={filters.min_sat}
                onChange={e => setFilters(p => ({ ...p, min_sat: e.target.value }))}
                data-testid="filter-min-sat"
                className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">NCAA Reg.</label>
              <select value={filters.ncaa_registered} onChange={e => setFilters(p => ({ ...p, ncaa_registered: e.target.value }))}
                data-testid="filter-ncaa"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">Any</option>
                <option value="true">Registered</option>
                <option value="false">Not Yet</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-3 lg:col-span-4 flex gap-3 pt-1">
              <button onClick={applyFilters} data-testid="apply-filters-btn"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
                Apply Filters
              </button>
              {hasFilters && (
                <button onClick={clearFilters} data-testid="clear-filters-btn"
                  className="text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-1 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick filter pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {POSITIONS.slice(0, 5).map(pos => (
            <button key={pos} onClick={() => quickFilter({ position: applied.position === pos ? "" : pos })}
              data-testid={`quick-position-${pos}`}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.position === pos ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
              {pos}
            </button>
          ))}
          {GRAD_YEARS.slice(0, 3).map(yr => (
            <button key={yr} onClick={() => quickFilter({ grad_year: applied.grad_year === yr ? "" : yr })}
              data-testid={`quick-grad-${yr}`}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.grad_year === yr ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
              {yr}
            </button>
          ))}
          <button
            onClick={() => quickFilter({ commitment_status: applied.commitment_status === "uncommitted" ? "" : "uncommitted" })}
            data-testid="quick-uncommitted-toggle"
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.commitment_status === "uncommitted" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"}`}>
            Uncommitted
          </button>
        </div>

        {/* Active filter chips — dismissable */}
        {hasFilters && (
          <div className="flex flex-wrap gap-2 mb-5" data-testid="active-filter-chips">
            {applied.commitment_status && (
              <span className="flex items-center gap-1 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-full capitalize" data-testid="chip-commitment">
                {applied.commitment_status}
                <button onClick={() => quickFilter({ commitment_status: "" })} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {applied.nationality && (
              <span className="flex items-center gap-1 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full" data-testid="chip-nationality">
                {applied.nationality}
                <button onClick={() => quickFilter({ nationality: "" })} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {applied.min_ppg && (
              <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full" data-testid="chip-ppg">
                PPG ≥ {applied.min_ppg}
                <button onClick={() => quickFilter({ min_ppg: "" })} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {applied.min_gpa && (
              <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full" data-testid="chip-gpa">
                GPA ≥ {applied.min_gpa}
                <button onClick={() => quickFilter({ min_gpa: "" })} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
            {(applied.min_height_cm || applied.max_height_cm) && (
              <span className="flex items-center gap-1 bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full" data-testid="chip-height">
                {applied.min_height_cm || "any"}–{applied.max_height_cm || "any"}cm
                <button onClick={() => quickFilter({ min_height_cm: "", max_height_cm: "" })} className="ml-0.5 hover:text-white"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}

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
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold underline">Clear all filters</button>
            )}
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
                    {player.nationality && <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">{player.nationality}</span>}
                  </div>
                  <div className="flex gap-3 text-xs mb-3 border-t border-slate-800 pt-3">
                    {player.ppg != null && <span><strong className="text-white">{player.ppg}</strong><span className="text-slate-500"> PPG</span></span>}
                    {player.rpg != null && <span><strong className="text-white">{player.rpg}</strong><span className="text-slate-500"> RPG</span></span>}
                    {player.apg != null && <span><strong className="text-white">{player.apg}</strong><span className="text-slate-500"> APG</span></span>}
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <MatchBadge score={player.match_score} />
                    {player.highlight_tape_url && (
                      <button
                        onClick={e => { e.stopPropagation(); setVideoTarget({ url: player.highlight_tape_url, name: player.full_name }); }}
                        data-testid={`reel-btn-${player.user_id}`}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs transition-colors cursor-pointer"
                      >
                        <Film className="w-3 h-3" /> Reel
                      </button>
                    )}
                    {player.ncaa_registered && <span className="flex items-center gap-1 text-green-400 text-xs"><Shield className="w-3 h-3" /> NCAA</span>}
                    {player.commitment_status === "committed" && (
                      <span className="bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-xs font-bold px-1.5 py-0.5 rounded-full" data-testid={`committed-badge-${player.user_id}`}>Committed</span>
                    )}
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
                <button disabled={page === 1} onClick={() => fetchPlayers(applied, page - 1)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
                <button disabled={page === pages} onClick={() => fetchPlayers(applied, page + 1)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 transition-colors text-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>

      {videoTarget && (
        <VideoModal
          url={videoTarget.url}
          playerName={videoTarget.name}
          onClose={() => setVideoTarget(null)}
        />
      )}
    </div>
  );
}
