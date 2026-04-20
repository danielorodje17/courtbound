import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { ArrowLeft, Check, X, Flag, ExternalLink, Plus, Mail, ChevronRight } from "lucide-react";

const STATUS_COLORS = {
  interested: "bg-blue-100 text-blue-700",
  contacted:  "bg-orange-100 text-orange-700",
  replied:    "bg-green-100 text-green-700",
  rejected:   "bg-red-100 text-red-700",
};

const DIVISION_RANK = { "Division I": 1, "Division II": 2, "NAIA": 3, "JUCO": 4 };

// Highlight the "best" value in a row
function isBest(colleges, field, index) {
  if (field === "division") {
    const ranks = colleges.map(c => DIVISION_RANK[c.division] ?? 99);
    return ranks[index] === Math.min(...ranks);
  }
  if (field === "acceptance_rate") {
    // lower is more selective — highlight lowest
    const vals = colleges.map(c => parseFloat(c.acceptance_rate) || 100);
    return vals[index] === Math.min(...vals);
  }
  if (field === "foreign_friendly") {
    return colleges[index]?.foreign_friendly === true;
  }
  return false;
}

const YES = <span className="flex items-center gap-1 text-green-600 font-bold"><Check className="w-4 h-4" /> Yes</span>;
const NO  = <span className="flex items-center gap-1 text-slate-400"><X className="w-3.5 h-3.5" /> No</span>;

export default function ComparePage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const ids = (params.get("ids") || "").split(",").filter(Boolean).slice(0, 3);

  const [colleges, setColleges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); setError("No colleges selected."); return; }
    apiRequest("get", `/colleges/compare?ids=${ids.join(",")}`)
      .then(r => setColleges(r.data))
      .catch(() => setError("Failed to load comparison."))
      .finally(() => setLoading(false));
  }, [params.get("ids")]);

  const removeCollege = (id) => {
    const remaining = ids.filter(i => i !== id);
    if (remaining.length === 0) { navigate("/colleges"); return; }
    navigate(`/compare?ids=${remaining.join(",")}`);
  };

  const colWidth = colleges.length === 3 ? "w-1/3" : colleges.length === 2 ? "w-1/2" : "w-full";

  const rows = [
    { key: "division",        label: "Division",        render: (c, i) => (
      <span className={`font-bold text-sm ${isBest(colleges, "division", i) ? "text-orange-600" : "text-slate-700"}`}>{c.division || "—"}</span>
    )},
    { key: "location",        label: "Location",        render: c => <span className="text-sm text-slate-700">{c.location || "—"}</span> },
    { key: "conference",      label: "Conference",      render: c => <span className="text-sm text-slate-600">{c.conference || "—"}</span> },
    { key: "foreign_friendly",label: "UK Friendly",   render: (c, i) => (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${c.foreign_friendly ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
        {c.foreign_friendly ? <><Flag className="w-3 h-3" /> UK Pick</> : "Standard"}
      </div>
    )},
    { key: "acceptance_rate", label: "Acceptance Rate", render: (c, i) => (
      <span className={`font-bold text-sm ${isBest(colleges, "acceptance_rate", i) ? "text-blue-600" : "text-slate-700"}`}>
        {c.acceptance_rate || "—"}
      </span>
    )},
    { key: "ranking",         label: "Ranking",         render: c => <span className="text-sm text-slate-700">{c.ranking ? `#${c.ranking}` : "—"}</span> },
    { key: "scholarship_info",label: "Scholarship Info",render: c => (
      <p className="text-xs text-slate-600 leading-relaxed">{c.scholarship_info || "—"}</p>
    )},
    { key: "coaches",         label: "Coaches",         render: c => (
      c.coaches?.length > 0
        ? <div className="space-y-1">{c.coaches.slice(0, 3).map(ch => (
            <p key={ch.name} className="text-xs text-slate-700"><span className="font-semibold">{ch.name}</span> <span className="text-slate-400">· {ch.title}</span></p>
          ))}</div>
        : <span className="text-slate-400 text-xs">—</span>
    )},
    { key: "tracking",        label: "Your Status",     render: c => {
      if (!c.tracking) return <span className="text-xs text-slate-400 italic">Not tracked</span>;
      return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${STATUS_COLORS[c.tracking.status] || "bg-slate-100 text-slate-600"}`}>
          {c.tracking.status}
        </span>
      );
    }},
    { key: "website",         label: "Website",         render: c => (
      c.website
        ? <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-orange-500 hover:underline flex items-center gap-1">{c.website.replace(/^https?:\/\//, "")} <ExternalLink className="w-3 h-3" /></a>
        : <span className="text-slate-400 text-xs">—</span>
    )},
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );

  if (error || colleges.length === 0) return (
    <div className="text-center py-20">
      <p className="text-slate-500 mb-4">{error || "No colleges to compare."}</p>
      <button onClick={() => navigate("/colleges")} className="text-orange-500 font-semibold hover:text-orange-600">
        ← Back to Colleges
      </button>
    </div>
  );

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/colleges")} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Colleges
        </button>
        <span className="text-slate-300">/</span>
        <div>
          <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">Side-by-Side</span>
          <h1 className="text-3xl font-bold text-slate-900 leading-none" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
            Compare Colleges
          </h1>
        </div>
      </div>

      {ids.length < 3 && (
        <div
          data-testid="compare-add-more-hint"
          onClick={() => navigate("/colleges")}
          className="mb-5 bg-orange-50 border border-dashed border-orange-300 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer hover:bg-orange-100 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg border-2 border-dashed border-orange-400 flex items-center justify-center flex-shrink-0">
            <Plus className="w-4 h-4 text-orange-400" />
          </div>
          <p className="text-sm text-orange-600 font-medium">
            Add {3 - ids.length} more college{3 - ids.length !== 1 ? "s" : ""} to compare (max 3)
          </p>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {/* College Header Row */}
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns: `180px repeat(${colleges.length}, 1fr)` }}>
          <div className="p-4 bg-slate-50 border-r border-slate-200" />
          {colleges.map((c, i) => (
            <div key={c.id} className="relative border-r last:border-r-0 border-slate-200">
              <div className="h-28 overflow-hidden relative">
                <img
                  src={c.image_url}
                  alt={c.name}
                  className="w-full h-full object-cover"
                  onError={e => { e.target.src = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400"; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                <button
                  data-testid={`compare-remove-${c.id}`}
                  onClick={() => removeCollege(c.id)}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/40 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="font-bold text-white text-sm leading-tight truncate">{c.name}</p>
                  <p className="text-white/70 text-xs">{c.location}</p>
                </div>
              </div>
              {/* Quick actions */}
              <div className="flex gap-1.5 p-3 bg-slate-50">
                <button
                  data-testid={`compare-email-${c.id}`}
                  onClick={() => navigate("/compose", { state: { college: c } })}
                  className="flex-1 flex items-center justify-center gap-1 bg-orange-500 text-white text-xs font-bold rounded-lg py-1.5 hover:bg-orange-600 transition-colors"
                >
                  <Mail className="w-3 h-3" /> Email
                </button>
                <button
                  data-testid={`compare-view-${c.id}`}
                  onClick={() => navigate(`/colleges/${c.id}`)}
                  className="flex-1 flex items-center justify-center gap-1 bg-slate-800 text-white text-xs font-bold rounded-lg py-1.5 hover:bg-slate-700 transition-colors"
                >
                  View <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Attribute Rows */}
        {rows.map((row, rowIdx) => (
          <div
            key={row.key}
            data-testid={`compare-row-${row.key}`}
            className={`grid border-b last:border-b-0 border-slate-100 ${rowIdx % 2 === 0 ? "" : "bg-slate-50/50"}`}
            style={{ gridTemplateColumns: `180px repeat(${colleges.length}, 1fr)` }}
          >
            {/* Row label */}
            <div className="p-4 border-r border-slate-200 flex items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{row.label}</span>
            </div>
            {/* College values */}
            {colleges.map((c, i) => (
              <div key={c.id} className="p-4 border-r last:border-r-0 border-slate-100 flex items-center">
                {row.render(c, i)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
