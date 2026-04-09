import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Search, Filter, Star, MapPin, Users, Globe, Plus, Check } from "lucide-react";

export default function CollegesPage() {
  const navigate = useNavigate();
  const [colleges, setColleges] = useState([]);
  const [tracked, setTracked] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [foreignOnly, setForeignOnly] = useState(false);
  const [state, setState] = useState("");

  useEffect(() => {
    fetchColleges();
    fetchTracked();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchColleges, 400);
    return () => clearTimeout(timeout);
  }, [search, division, foreignOnly, state]);

  const fetchColleges = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (division) params.set("division", division);
      if (foreignOnly) params.set("foreign_friendly", "true");
      if (state) params.set("state", state);
      const { data } = await apiRequest("get", `/colleges?${params}`);
      setColleges(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTracked = async () => {
    try {
      const { data } = await apiRequest("get", "/my-colleges");
      setTracked(new Set(data.map(t => t.college_id)));
    } catch {}
  };

  const toggleTrack = async (e, college) => {
    e.stopPropagation();
    if (tracked.has(college.id)) {
      await apiRequest("delete", `/my-colleges/${college.id}`);
      setTracked(prev => { const s = new Set(prev); s.delete(college.id); return s; });
    } else {
      await apiRequest("post", "/my-colleges", { college_id: college.id, notes: "" });
      setTracked(prev => new Set([...prev, college.id]));
    }
  };

  const divisions = ["Division I", "Division II", "NAIA", "JUCO"];

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="mb-6">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">College Directory</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          Find Your College
        </h1>
        <p className="text-slate-500 mt-1">Browse {colleges.length} US colleges with basketball programs</p>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            data-testid="college-search-input"
            type="text"
            placeholder="Search colleges..."
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
          <option value="">All Divisions</option>
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
        <label data-testid="college-foreign-filter" className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={foreignOnly}
            onChange={e => setForeignOnly(e.target.checked)}
            className="w-4 h-4 rounded accent-orange-500"
          />
          <span className="text-sm font-medium text-slate-700">Foreign-Friendly Only</span>
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {colleges.map((college) => (
            <div
              key={college.id}
              data-testid={`college-card-${college.name}`}
              className="bg-white border border-slate-200 rounded-lg hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer overflow-hidden"
              onClick={() => navigate(`/colleges/${college.id}`)}
            >
              <div className="h-32 relative overflow-hidden">
                <img
                  src={college.image_url}
                  alt={college.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className="absolute top-3 right-3 flex gap-1.5">
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
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-green-500 text-white">
                      Intl Friendly
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="text-xs text-white/80 font-medium">{college.conference}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{college.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500">{college.location}</span>
                    </div>
                  </div>
                  <button
                    data-testid={`track-college-${college.name}`}
                    onClick={(e) => toggleTrack(e, college)}
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${tracked.has(college.id) ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-500"}`}
                  >
                    {tracked.has(college.id) ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{college.coaches?.length || 0} coaches</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    <span>{college.acceptance_rate} accept</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
