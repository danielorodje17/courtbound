import { BrowserRouter, Routes, Route, Navigate, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import CollegesPage from "./pages/CollegesPage";
import CollegeDetailPage from "./pages/CollegeDetailPage";
import ComposePage from "./pages/ComposePage";
import CommunicationsPage from "./pages/CommunicationsPage";
import StrategyPage from "./pages/StrategyPage";
import NCAACHeckerPage from "./pages/NCAACHeckerPage";
import { Trophy, Home, BookOpen, Mail, Wand2, Lightbulb, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";
import "./App.css";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/colleges", label: "Colleges", icon: BookOpen },
  { path: "/communications", label: "Emails", icon: Mail },
  { path: "/compose", label: "Compose", icon: Wand2 },
  { path: "/strategy", label: "Strategy", icon: Lightbulb },
  { path: "/ncaa", label: "NCAA Check", icon: ShieldCheck }
];

function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <NavLink to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 text-base" style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                CourtBound
              </span>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/ /g, "-")}`}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`
                  }
                >
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* England U18 badge */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs font-bold text-orange-600 uppercase tracking-widest bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                England U18
              </span>
            </div>

            {/* Mobile menu button */}
            <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 space-y-1">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive ? "bg-orange-500 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/colleges" element={<AppLayout><CollegesPage /></AppLayout>} />
        <Route path="/colleges/:id" element={<AppLayout><CollegeDetailPage /></AppLayout>} />
        <Route path="/communications" element={<AppLayout><CommunicationsPage /></AppLayout>} />
        <Route path="/compose" element={<AppLayout><ComposePage /></AppLayout>} />
        <Route path="/strategy" element={<AppLayout><StrategyPage /></AppLayout>} />
        <Route path="/ncaa" element={<AppLayout><NCAACHeckerPage /></AppLayout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
