import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { apiRequest } from "../context/AuthContext";
import { Lightbulb, ChevronDown, Loader2 } from "lucide-react";

export default function StrategyPage() {
  const location = useLocation();
  const preloaded = location.state;
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState(preloaded?.college || null);
  const [responseStatus, setResponseStatus] = useState("no_response");
  const [lastContact, setLastContact] = useState("");
  const [strategy, setStrategy] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    apiRequest("get", "/my-colleges").then(r => setColleges(r.data)).catch(() => {});
    if (preloaded?.college) {
      generateStrategy(preloaded.college, "no_response", "");
    }
  }, []);

  const generateStrategy = async (college, status, lastContactDate) => {
    if (!college) { setError("Please select a college."); return; }
    setError("");
    setGenerating(true);
    const coachName = college.coaches?.[0]?.name || "Head Coach";
    try {
      const { data } = await apiRequest("post", "/ai/strategy", {
        college_name: college.name,
        coach_name: coachName,
        last_contact_date: lastContactDate || "",
        response_status: status || "no_response"
      });
      setStrategy(data.strategy);
      setHistory(prev => [{ college: college.name, strategy: data.strategy, date: new Date().toLocaleDateString("en-GB") }, ...prev.slice(0, 4)]);
    } catch {
      setError("Strategy generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => generateStrategy(selectedCollege, responseStatus, lastContact);

  const statusOptions = [
    { value: "no_response", label: "No Response Yet", color: "bg-yellow-100 text-yellow-700" },
    { value: "replied", label: "They Replied", color: "bg-green-100 text-green-700" },
    { value: "interested", label: "Showing Interest", color: "bg-blue-100 text-blue-700" }
  ];

  return (
    <div style={{ fontFamily: "Manrope, sans-serif" }}>
      <div className="mb-6">
        <span className="text-xs tracking-[0.2em] uppercase font-bold text-orange-600">AI Strategy Advisor</span>
        <h1 className="text-3xl font-bold text-slate-900 mt-1" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase" }}>
          Recruitment Strategy
        </h1>
        <p className="text-slate-500 mt-1">Get AI-powered advice to maximise your chances of getting a scholarship</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="font-bold text-slate-900 mb-4" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>Strategy Settings</h2>
            
            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">College</label>
              <div className="relative">
                <select
                  data-testid="strategy-college-select"
                  value={selectedCollege?.id || selectedCollege?.name || ""}
                  onChange={e => {
                    const c = colleges.find(c => c.college_id === e.target.value || c.college?.id === e.target.value);
                    setSelectedCollege(c?.college || null);
                  }}
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none appearance-none bg-white pr-8 text-slate-900"
                >
                  <option value="">Select a college...</option>
                  {colleges.map(c => <option key={c.college_id} value={c.college_id}>{c.college?.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Current Status</label>
              <div className="space-y-2">
                {statusOptions.map(opt => (
                  <button
                    key={opt.value}
                    data-testid={`strategy-status-${opt.value}`}
                    onClick={() => setResponseStatus(opt.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all border-2 ${responseStatus === opt.value ? "border-orange-500 bg-orange-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
                  >
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide mr-2 ${opt.color}`}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Last Contact Date</label>
              <input
                data-testid="strategy-last-contact-input"
                type="date"
                value={lastContact}
                onChange={e => setLastContact(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              data-testid="strategy-generate-btn"
              onClick={handleGenerate}
              disabled={generating || !selectedCollege}
              className="w-full bg-slate-900 text-white font-bold uppercase tracking-wider rounded-lg py-3 text-sm hover:bg-slate-800 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Lightbulb className="w-4 h-4" /> Get Strategy</>}
            </button>
          </div>

          {/* Tips */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-bold text-orange-900 text-sm mb-2 uppercase tracking-wide">Quick Tips</h3>
            <ul className="space-y-1.5 text-xs text-orange-800">
              <li>• Contact coaches 12-18 months before intake</li>
              <li>• UK players should highlight Euro U18 credentials</li>
              <li>• Follow up every 2-3 weeks if no response</li>
              <li>• Include highlight tape link in every email</li>
              <li>• Research each program's playing style</li>
            </ul>
          </div>
        </div>

        {/* Strategy Output */}
        <div className="lg:col-span-2 space-y-4">
          {generating ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 flex flex-col items-center justify-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
              <p className="text-slate-500 text-sm">Analysing your situation and generating strategy...</p>
            </div>
          ) : strategy ? (
            <div data-testid="strategy-output" className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Your Strategy for {selectedCollege?.name}
                  </h2>
                  <p className="text-xs text-slate-400">Generated today</p>
                </div>
              </div>
              <div className="prose prose-sm max-w-none">
                <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{strategy}</div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
              <Lightbulb className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700 mb-1">No Strategy Generated Yet</h3>
              <p className="text-slate-400 text-sm">Select a college and click "Get Strategy" for personalised AI advice.</p>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h2 className="font-bold text-slate-900 mb-3" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.875rem" }}>Recent Strategies</h2>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setStrategy(h.strategy)}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <p className="text-sm font-semibold text-slate-800">{h.college}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{h.date}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
