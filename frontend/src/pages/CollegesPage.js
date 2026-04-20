import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { getCollegeImage } from "../utils/collegeImages";
import { Search, MapPin, Users, Globe, Plus, Check, Flag, BarChart2, ArrowLeft } from "lucide-react";

export default function CollegesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const trackedOnly = searchParams.get("view") === "tracked";
  const [colleges, setColleges] = useState([]);
  const [allColleges, setAllColleges] = useState([]);
  const [tracked, setTracked] = useState(new Set());
  const [trackedData, setTrackedData] = useState({});
  const [compareSet, setCompareSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [region, setRegion] = useState("");
  const [foreignOnly, setForeignOnly] = useState(false);
  const [state, setState] = useState("");

  useEffect(() => {
    fetchAllColleges();
    fetchTracked();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, division, region, foreignOnly, state, allColleges, trackedOnly, trackedData]);

  const fetchAllColleges = async () => {
    try {
      const { data } = await apiRequest("get", "/colleges");
      setAllColleges(data);
      setColleges(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = allColleges;
    if (trackedOnly) filtered = filtered.filter(c => tracked.has(c.id));
    if (region) filtered = filtered.filter(c => (c.region || "USA") === region);
    if (search) filtered = filtered.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.location.toLowerCase().includes(search.toLowerCase()) || c.country?.toLowerCase().includes(search.toLowerCase()));
    if (division) filtered = filtered.filter(c => c.division === division);
    if (foreignOnly) filtered = filtered.filter(c => c.foreign_friendly);
    if (state) filtered = filtered.filter(c => c.state?.toLowerCase().includes(state.toLowerCase()) || c.location?.toLowerCase().includes(state.toLowerCase()) || c.country?.toLowerCase().includes(state.toLowerCase()));
    setColleges(filtered);
  };

  const fetchTracked = async () => {
    try {
      const { data } = await apiRequest("get", "/my-colleges");
      setTracked(new Set(data.map(t => t.college_id)));
      const map = {};
      data.forEach(t => { map[t.college_id] = t; });
      setTrackedData(map);
    } catch {}
  };

  const toggleTrack = async (e, college) => {
    e.stopPropagation();
    if (tracked.has(college.id)) {
      await apiRequest("delete", `/my-colleges/${college.id}`);
      setTracked(prev => { const s = new Set(prev); s.delete(college.id); return s; });
      setTrackedData(prev => { const d = { ...prev }; delete d[college.id]; return d; });
    } else {
      await apiRequest("post", "/my-colleges", { college_id: college.id, notes: "" });
      setTracked(prev => new Set([...prev, college.id]));
      setTrackedData(prev => ({ ...prev, [college.id]: { status: "interested", progress_score: 10 } }));
    }
  };

  const toggleCompare = (e, college) => {
    e.stopPropagation();
    setCompareSet(prev => {
      const s = new Set(prev);
      if (s.has(college.id)) { s.delete(college.id); }
      else if (s.size < 3) { s.add(college.id); }
      return s;
    });
  };

  const startComparison = () => {
    if (compareSet.size >= 2) navigate(`/compare?ids=${[...compareSet].join(",")}`);
  };

  const euroFriendlyCount = allColleges.filter(c => c.foreign_friendly).length;
  const divisions = ["Division I", "Division II", "NAIA", "JUCO"];

  const scoreColor = (s) => s >= 75 ? "#10b981" : s >= 50 ? "#f97316" : s >= 25 ? "#3b82f6" : "#94a3b8";
  const scoreBg = (s) => s >= 75 ? "bg-emerald-500" : s >= 50 ? "bg-orange-500" : s >= 25 ? "bg-blue-500" : "bg-slate-400";

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="mb-6">
        {trackedOnly ? (
          <>
            <button
              onClick={() => navigate("/colleges")}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm mb-2 transition-colors"
              data-testid="back-to-all-colleges"
            >
              <ArrowLeft className="w-4 h-4" /> All Colleges
            </button>
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Your Pipeline</span>
            <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
              My Tracked Colleges
            </h1>
            <p className="text-slate-500 mt-1">
              {tracked.size > 0 ? `${tracked.size} college${tracked.size !== 1 ? "s" : ""} in your list` : "No colleges tracked yet"}
            </p>
          </>
        ) : (
          <>
            <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">College Directory</span>
            <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
              Find Your College
            </h1>
            <p className="text-slate-500 mt-1">Browse {allColleges.length} colleges with basketball programs</p>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
        {/* Region Toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Region:</span>
          {[["", "All"], ["USA", "USA"], ["Europe", "Europe"]].map(([val, label]) => (
            <button
              key={val}
              data-testid={`region-filter-${label.toLowerCase()}`}
              onClick={() => setRegion(val)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                region === val ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {label === "USA" ? "🇺🇸 USA" : label === "Europe" ? "🇪🇺 Europe" : label}
            </button>
          ))}
          <span className="text-slate-200 mx-1">|</span>
          <button
            data-testid="euro-friendly-filter-btn"
            onClick={() => setForeignOnly(!foreignOnly)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1 ${
              foreignOnly ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Flag className="w-3 h-3" /> UK Friendly Only
          </button>
        </div>

        {/* Search + Division filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              data-testid="college-search-input"
              type="text"
              placeholder="Search colleges, cities, countries..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
            />
          </div>
          <select
            data-testid="college-division-filter"
            value={division}
            onChange={e => setDivision(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none text-slate-700 bg-white"
          >
            <option value="">All Divisions / Leagues</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <input
            data-testid="college-state-filter"
            type="text"
            placeholder="State..."
            value={state}
            onChange={e => setState(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-orange-500 outline-none w-28"
          />
          <button
            data-testid="college-foreign-filter"
            onClick={() => setForeignOnly(!foreignOnly)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider border-2 transition-all ${foreignOnly ? "bg-green-500 text-white border-green-500 shadow-sm" : "bg-white text-green-700 border-green-300 hover:bg-green-50"}`}
          >
            <Flag className="w-3.5 h-3.5" />
            UK Friendly {foreignOnly && `(${colleges.length})`}
          </button>
          {(search || division || foreignOnly || state) && (
            <button
              onClick={() => { setSearch(""); setDivision(""); setForeignOnly(false); setState(""); }}
              className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-700 font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
            >
              Clear filters
            </button>
          )}
        </div>
        {foreignOnly && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
            <Flag className="w-3.5 h-3.5" />
            Showing {colleges.length} colleges that actively recruit UK & international players — great targets for you as an England U18 player.
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : colleges.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          {trackedOnly ? (
            <>
              <p className="text-slate-600 font-semibold text-base mb-1">No colleges in your list yet</p>
              <p className="text-slate-400 text-sm mb-4">Browse the full directory and click "Add to My List" on any college to start tracking.</p>
              <button onClick={() => navigate("/colleges")} className="bg-orange-500 text-white font-bold uppercase tracking-wider rounded-lg px-5 py-2.5 text-sm hover:bg-orange-600 transition-colors">
                Browse All Colleges
              </button>
            </>
          ) : (
            <>
              <p className="text-slate-500 font-medium">No colleges match your filters.</p>
              <button onClick={() => { setSearch(""); setDivision(""); setForeignOnly(false); setState(""); }} className="mt-3 text-orange-500 font-semibold text-sm hover:text-orange-600">
                Clear all filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colleges.map((college) => (
            <div
              key={college.id}
              data-testid={`college-card-${college.name}`}
              className={`bg-white border rounded-lg hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden ${compareSet.has(college.id) ? "border-purple-400 ring-2 ring-purple-300" : college.foreign_friendly ? "border-green-200" : "border-slate-200"}`}
              onClick={() => navigate(`/colleges/${college.id}`)}
            >
              <div className="h-32 relative overflow-hidden">
                <img
                  src={getCollegeImage(college.name)}
                  alt={college.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = getCollegeImage("default"); }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className="absolute top-3 right-3 flex gap-1.5 flex-wrap justify-end">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                    college.division === "Division I" ? "bg-orange-500 text-white" :
                    college.division === "Division II" ? "bg-blue-500 text-white" :
                    college.division === "NAIA" ? "bg-purple-500 text-white" :
                    college.division === "JUCO" ? "bg-green-600 text-white" :
                    "bg-slate-700 text-white"
                  }`}>
                    {college.division?.replace("Division ", "D")}
                  </span>
                  {college.foreign_friendly && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-green-500 text-white flex items-center gap-1">
                      <Flag className="w-2.5 h-2.5" /> UK Pick
                    </span>
                  )}
                </div>
                {/* Compare toggle */}
                <button
                  data-testid={`compare-toggle-${college.name}`}
                  onClick={(e) => toggleCompare(e, college)}
                  className={`absolute top-3 left-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all text-xs font-black ${compareSet.has(college.id) ? "bg-purple-500 text-white shadow-lg" : compareSet.size >= 3 ? "bg-black/30 text-white/40 cursor-not-allowed" : "bg-black/30 text-white hover:bg-purple-500"}`}
                  title={compareSet.has(college.id) ? "Remove from comparison" : compareSet.size >= 3 ? "Max 3 colleges" : "Add to comparison"}
                >
                  {compareSet.has(college.id) ? <Check className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
                </button>
                <div className="absolute bottom-3 left-3">
                  <span className="text-xs text-white/80 font-medium">{college.conference}</span>
                </div>
                {/* Progress score badge (only for tracked colleges) */}
                {trackedData[college.id] && (
                  <div
                    data-testid={`progress-badge-${college.name}`}
                    className={`absolute bottom-3 right-3 text-white text-xs font-black px-2 py-0.5 rounded-full ${scoreBg(trackedData[college.id].progress_score ?? 0)}`}
                  >
                    {trackedData[college.id].progress_score ?? 0}%
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="min-w-0 mb-3">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{college.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span className="text-xs text-slate-500">
                      {college.region === "Europe" ? `${college.location}, ${college.country}` : college.location}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{college.coaches?.length || 0} coaches</span>
                  </div>
                  {college.region === "Europe" && (
                    <div className="flex items-center gap-1 font-semibold text-blue-600">
                      <Globe className="w-3 h-3" />
                      <span>{college.language_of_study || "—"}</span>
                    </div>
                  )}
                  {college.foreign_friendly && (
                    <span className="text-green-600 font-semibold flex items-center gap-0.5">
                      <Flag className="w-3 h-3" /> UK
                    </span>
                  )}
                </div>
                {college.region === "Europe" && college.scholarship_type && (
                  <div className="mb-2">
                    <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                      {college.scholarship_type}
                    </span>
                  </div>
                )}
                {/* Full-width Track button */}
                <button
                  data-testid={`track-college-${college.name}`}
                  onClick={(e) => toggleTrack(e, college)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg font-bold uppercase tracking-wider text-xs transition-all ${
                    tracked.has(college.id)
                      ? "bg-green-50 text-green-700 border-2 border-green-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {tracked.has(college.id) ? <><Check className="w-3.5 h-3.5" /> Tracking</> : <><Plus className="w-3.5 h-3.5" /> Add to My List</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Compare Bar */}
      {compareSet.size > 0 && (
        <div
          data-testid="compare-sticky-bar"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-5 py-3.5 flex items-center gap-4 border border-white/10"
          style={{ backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold">{compareSet.size} selected</span>
            <span className="text-white/40 text-xs">(max 3)</span>
          </div>
          <div className="h-4 w-px bg-white/20" />
          <button
            data-testid="clear-compare-btn"
            onClick={() => setCompareSet(new Set())}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            Clear
          </button>
          <button
            data-testid="start-compare-btn"
            onClick={startComparison}
            disabled={compareSet.size < 2}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold text-sm px-4 py-1.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {compareSet.size < 2 ? `Select ${2 - compareSet.size} more` : "Compare →"}
          </button>
        </div>
      )}

    </div>
  );
}
