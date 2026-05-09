import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { Search, Trophy, X, Shield, Globe, DollarSign, ChevronRight, SlidersHorizontal } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

const DIVISIONS = ["D1", "D2", "D3", "NAIA", "JUCO"];
const SPORTS = [
  { value: "", label: "All Sports" },
  { value: "Men", label: "Men's Basketball" },
  { value: "Women", label: "Women's Basketball" },
];

const DEFAULT_FILTERS = { search: "", division: "", sport: "", nil_available: "", f1_visa: "" };

function ProgrammeCard({ programme }) {
  const initials = (programme.institution_name || "?")
    .split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <div
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col hover:border-blue-700/50 transition-all"
      data-testid="programme-card"
    >
      {/* Top row */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-700 to-slate-700 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-white text-sm leading-snug truncate">
            {programme.institution_name}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">{programme.coach_name}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {programme.division && (
          <span className="bg-blue-900/40 border border-blue-700/50 text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full">
            {programme.division}
          </span>
        )}
        {programme.primary_sport && (
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
            {programme.primary_sport}
          </span>
        )}
        {programme.conference && (
          <span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded-full">
            {programme.conference}
          </span>
        )}
      </div>

      {/* What we offer chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {programme.nil_available && (
          <span className="flex items-center gap-1 bg-emerald-900/30 border border-emerald-700/40 text-emerald-300 text-xs font-bold px-2 py-0.5 rounded-full" data-testid="nil-badge">
            <DollarSign className="w-2.5 h-2.5" /> NIL
          </span>
        )}
        {programme.f1_visa_support && (
          <span className="flex items-center gap-1 bg-purple-900/30 border border-purple-700/40 text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full" data-testid="f1-badge">
            <Globe className="w-2.5 h-2.5" /> F-1 Visa
          </span>
        )}
        {programme.scholarship_type && (
          <span className="flex items-center gap-1 bg-amber-900/30 border border-amber-700/40 text-amber-300 text-xs font-bold px-2 py-0.5 rounded-full">
            <Shield className="w-2.5 h-2.5" /> {programme.scholarship_type}
          </span>
        )}
      </div>

      {/* Positions sought */}
      {programme.positions?.length > 0 && (
        <p className="text-slate-500 text-xs mb-3">
          Seeking: <span className="text-slate-400 font-semibold">{programme.positions.join(", ")}</span>
        </p>
      )}

      {/* Bio snippet */}
      {programme.bio && (
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3 flex-1">
          {programme.bio}
        </p>
      )}

      <div className="mt-auto">
        <Link
          to={`/coach/program/${programme.slug}`}
          data-testid={`view-programme-${programme.slug}`}
          className="flex items-center justify-center gap-1.5 w-full py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
        >
          View Programme <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function ProgrammesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filtersFromUrl = () => ({
    search: searchParams.get("search") || "",
    division: searchParams.get("division") || "",
    sport: searchParams.get("sport") || "",
    nil_available: searchParams.get("nil_available") || "",
    f1_visa: searchParams.get("f1_visa") || "",
  });

  const [filters, setFilters] = useState(filtersFromUrl);
  const [applied, setApplied] = useState(filtersFromUrl);
  const [programmes, setProgrammes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const syncUrl = (f) => {
    const p = {};
    Object.entries(f).forEach(([k, v]) => { if (v) p[k] = v; });
    setSearchParams(p, { replace: true });
  };

  const fetchProgrammes = useCallback(async (f = applied, p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (f.search) params.append("search", f.search);
      if (f.division) params.append("division", f.division);
      if (f.sport) params.append("sport", f.sport);
      if (f.nil_available === "true") params.append("nil_available", "true");
      if (f.f1_visa === "true") params.append("f1_visa", "true");
      params.append("page", p);
      params.append("limit", 24);
      const r = await axios.get(`${API}/api/coach/public/programmes?${params}`);
      setProgrammes(r.data.programmes || []);
      setTotal(r.data.total || 0);
      setPages(r.data.pages || 1);
      setPage(p);
    } catch {}
    setLoading(false);
  }, [applied]);

  useEffect(() => {
    fetchProgrammes(applied, 1);
    // eslint-disable-next-line
  }, []);

  const applyFilters = () => {
    setApplied({ ...filters });
    syncUrl(filters);
    fetchProgrammes(filters, 1);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
    setSearchParams({}, { replace: true });
    fetchProgrammes(DEFAULT_FILTERS, 1);
  };

  const quickFilter = (update) => {
    const nf = { ...applied, ...update };
    setFilters(nf);
    setApplied(nf);
    syncUrl(nf);
    fetchProgrammes(nf, 1);
  };

  const hasFilters = Object.values(applied).some(v => v !== "");
  const activeCount = Object.values(applied).filter(v => v !== "").length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top nav bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm tracking-widest uppercase">CourtBound</span>
          </Link>
          <div className="flex-1" />
          <Link to="/login" className="text-slate-400 hover:text-white text-xs font-bold transition-colors hidden sm:block">Player Login</Link>
          <Link to="/coach/login" className="text-slate-400 hover:text-white text-xs font-bold transition-colors hidden sm:block">Coach Login</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
            Discover Programmes
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl">
            Browse verified US college basketball programmes actively recruiting international players.
          </p>
        </div>

        {/* Search + filter toggle */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
            <input
              value={filters.search}
              onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && applyFilters()}
              placeholder="Search by university, coach or conference..."
              data-testid="programme-search-input"
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            data-testid="programme-filters-toggle"
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${filtersOpen ? "bg-blue-600 text-white" : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeCount > 0 && (
              <span className="bg-blue-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-black">{activeCount}</span>
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="programme-filters-panel">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Division</label>
              <select value={filters.division} onChange={e => setFilters(p => ({ ...p, division: e.target.value }))}
                data-testid="filter-division"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                <option value="">All Divisions</option>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Sport</label>
              <select value={filters.sport} onChange={e => setFilters(p => ({ ...p, sport: e.target.value }))}
                data-testid="filter-sport"
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm">
                {SPORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.nil_available === "true"}
                  onChange={e => setFilters(p => ({ ...p, nil_available: e.target.checked ? "true" : "" }))}
                  data-testid="filter-nil"
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-white text-sm font-semibold">NIL Available</span>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={filters.f1_visa === "true"}
                  onChange={e => setFilters(p => ({ ...p, f1_visa: e.target.checked ? "true" : "" }))}
                  data-testid="filter-f1"
                  className="w-4 h-4 rounded accent-blue-600" />
                <span className="text-white text-sm font-semibold">F-1 Visa Support</span>
              </label>
            </div>
            <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex gap-3 pt-1">
              <button onClick={applyFilters} data-testid="apply-programme-filters-btn"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-lg text-sm transition-colors">
                Apply
              </button>
              {hasFilters && (
                <button onClick={clearFilters} data-testid="clear-programme-filters-btn"
                  className="text-slate-400 hover:text-white text-sm font-semibold flex items-center gap-1 transition-colors">
                  <X className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Quick filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {DIVISIONS.map(d => (
            <button key={d} onClick={() => quickFilter({ division: applied.division === d ? "" : d })}
              data-testid={`quick-division-${d}`}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.division === d ? "bg-blue-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"}`}>
              {d}
            </button>
          ))}
          <button onClick={() => quickFilter({ nil_available: applied.nil_available === "true" ? "" : "true" })}
            data-testid="quick-nil-toggle"
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.nil_available === "true" ? "bg-emerald-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"}`}>
            <DollarSign className="w-3 h-3" /> NIL
          </button>
          <button onClick={() => quickFilter({ f1_visa: applied.f1_visa === "true" ? "" : "true" })}
            data-testid="quick-f1-toggle"
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition-colors ${applied.f1_visa === "true" ? "bg-purple-600 text-white" : "bg-slate-800 border border-slate-700 text-slate-400 hover:text-white"}`}>
            <Globe className="w-3 h-3" /> F-1 Visa
          </button>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            {loading ? "Searching..." : `${total} programme${total !== 1 ? "s" : ""} found`}
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="text-blue-400 hover:text-blue-300 text-xs font-bold underline">
              Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-52 bg-slate-900 rounded-xl animate-pulse border border-slate-800" />)}
          </div>
        ) : programmes.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 font-semibold">No programmes found</p>
            <p className="text-slate-600 text-sm mt-1">Try adjusting your search or filters</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" data-testid="programme-grid">
              {programmes.map(p => <ProgrammeCard key={p.slug} programme={p} />)}
            </div>
            {pages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                <button disabled={page === 1} onClick={() => fetchProgrammes(applied, page - 1)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 text-sm">← Prev</button>
                <span className="px-4 py-2 text-slate-400 text-sm">{page} / {pages}</span>
                <button disabled={page === pages} onClick={() => fetchProgrammes(applied, page + 1)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg disabled:opacity-40 hover:bg-slate-700 text-sm">Next →</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
