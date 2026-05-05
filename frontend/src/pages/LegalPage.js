import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

function renderContent(content) {
  if (!content) return null;
  const blocks = content.split(/\n\n+/);
  const elements = [];

  blocks.forEach((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Horizontal rule
    if (trimmed === "---") {
      elements.push(<hr key={bi} className="my-10 border-slate-200" />);
      return;
    }

    // Detect bullet list block (lines starting with *)
    const lines = trimmed.split("\n");
    if (lines.every(l => l.trimStart().startsWith("* "))) {
      elements.push(
        <ul key={bi} className="list-disc list-outside ml-6 space-y-1.5 mb-5">
          {lines.map((l, li) => (
            <li key={li} className="text-slate-600 leading-relaxed text-sm">
              {renderInline(l.replace(/^\*\s+/, ""))}
            </li>
          ))}
        </ul>
      );
      return;
    }

    // Mixed block — process line by line
    const out = [];
    let listBuf = [];

    const flushList = () => {
      if (listBuf.length) {
        out.push(
          <ul key={`l${out.length}`} className="list-disc list-outside ml-6 space-y-1.5 mb-3">
            {listBuf.map((item, i) => (
              <li key={i} className="text-slate-600 leading-relaxed text-sm">{renderInline(item)}</li>
            ))}
          </ul>
        );
        listBuf = [];
      }
    };

    lines.forEach((line, li) => {
      const t = line.trim();
      if (!t) { flushList(); return; }

      if (t.startsWith("* ")) {
        listBuf.push(t.replace(/^\*\s+/, ""));
        return;
      }

      flushList();

      // Full-line bold → heading
      const headingMatch = t.match(/^\*\*(.+)\*\*$/);
      if (headingMatch) {
        const text = headingMatch[1];
        const isTitle = bi === 0 && li === 0;
        out.push(
          isTitle
            ? <h1 key={li} className="text-3xl font-black text-slate-900 mb-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>{text}</h1>
            : /^\d+\./.test(text)
              ? <h2 key={li} className="text-base font-black text-slate-900 mt-8 mb-2">{text}</h2>
              : <p key={li} className="text-sm font-bold text-slate-500 mt-1 mb-3">{text}</p>
        );
        return;
      }

      out.push(
        <p key={li} className="text-slate-600 leading-relaxed text-sm mb-1">{renderInline(t)}</p>
      );
    });

    flushList();
    if (out.length) elements.push(<div key={bi} className="mb-4">{out}</div>);
  });

  return elements;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} className="font-semibold text-slate-800">{p.slice(2, -2)}</strong>
      : p
  );
}

export default function LegalPage({ type }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/api/legal/${type}`)
      .then(r => setDoc(r.data))
      .catch(() => setDoc(null))
      .finally(() => setLoading(false));
  }, [type]);

  const title = type === "privacy" ? "Privacy Policy" : "Terms of Use";

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black text-slate-900 uppercase tracking-wider" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            CourtBound
          </span>
        </Link>
        <div className="w-16" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-200 rounded" style={{ width: `${70 + (i % 3) * 10}%` }} />
            ))}
          </div>
        ) : doc ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-10 py-10">
            {renderContent(doc.content)}
            {doc.last_updated && (
              <p className="text-xs text-slate-400 mt-10 pt-6 border-t border-slate-100">
                Last updated: {new Date(doc.last_updated).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-400 py-20">
            <p className="text-sm">Could not load {title}. Please try again later.</p>
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-xs text-slate-400 space-x-4">
        <Link to="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-slate-600 transition-colors">Terms of Use</Link>
        <span>·</span>
        <span>© {new Date().getFullYear()} CourtBound Limited</span>
      </footer>
    </div>
  );
}
