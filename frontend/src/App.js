import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Dashboard from "./pages/Dashboard";
import CollegesPage from "./pages/CollegesPage";
import CollegeDetailPage from "./pages/CollegeDetailPage";
import CommunicationsPage from "./pages/CommunicationsPage";
import ComposePage from "./pages/ComposePage";
import StrategyPage from "./pages/StrategyPage";
import NCAACHeckerPage from "./pages/NCAACHeckerPage";
import ProfilePage from "./pages/ProfilePage";
import ResponseTrackerPage from "./pages/ResponseTrackerPage";
import AIMatchPage from "./pages/AIMatchPage";
import LoginPage from "./pages/LoginPage";
import AuthCallback from "./pages/AuthCallback";
import { Trophy, Home, BookOpen, Mail, Wand2, Lightbulb, Menu, X, ShieldCheck, UserCircle, MessageSquare, LogOut, ChevronDown, Sparkles } from "lucide-react";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/profile", label: "Profile", icon: UserCircle },
  { path: "/colleges", label: "Colleges", icon: BookOpen },
  { path: "/communications", label: "Emails", icon: Mail },
  { path: "/responses", label: "Responses", icon: MessageSquare },
  { path: "/ai-match", label: "AI Match", icon: Sparkles },
  { path: "/compose", label: "Compose", icon: Wand2 },
  { path: "/strategy", label: "Strategy", icon: Lightbulb },
  { path: "/ncaa", label: "NCAA Check", icon: ShieldCheck }
];

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        data-testid="user-menu-btn"
      >
        {user?.picture ? (
          <img src={user.picture} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="hidden md:block text-xs font-semibold text-slate-700 max-w-24 truncate">{user?.name?.split(" ")[0]}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
          </div>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function AppLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "Manrope, sans-serif" }}>
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2 flex-shrink-0 mr-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-slate-900 text-sm" style={{ fontFamily: "Barlow Condensed, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              CourtBound
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <UserMenu />
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2 text-slate-600">
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 grid grid-cols-2 gap-1">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${
                    isActive ? "bg-orange-50 text-orange-600" : "text-slate-600 hover:bg-slate-50"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRouter() {
  const location = useLocation();
  // Synchronously detect OAuth callback BEFORE routes render (prevents race condition with ProtectedRoute)
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/colleges" element={<ProtectedRoute><AppLayout><CollegesPage /></AppLayout></ProtectedRoute>} />
      <Route path="/colleges/:id" element={<ProtectedRoute><AppLayout><CollegeDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/communications" element={<ProtectedRoute><AppLayout><CommunicationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/compose" element={<ProtectedRoute><AppLayout><ComposePage /></AppLayout></ProtectedRoute>} />
      <Route path="/strategy" element={<ProtectedRoute><AppLayout><StrategyPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ncaa" element={<ProtectedRoute><AppLayout><NCAACHeckerPage /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><ProfilePage /></AppLayout></ProtectedRoute>} />
      <Route path="/responses" element={<ProtectedRoute><AppLayout><ResponseTrackerPage /></AppLayout></ProtectedRoute>} />
      <Route path="/ai-match" element={<ProtectedRoute><AppLayout><AIMatchPage /></AppLayout></ProtectedRoute>} />
    </Routes>
  );
}

export default App;
