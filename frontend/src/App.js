import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import CollegesPage from "./pages/CollegesPage";
import CollegeDetailPage from "./pages/CollegeDetailPage";
import ComposePage from "./pages/ComposePage";
import CommunicationsPage from "./pages/CommunicationsPage";
import StrategyPage from "./pages/StrategyPage";
import { Trophy, Home, BookOpen, Mail, Wand2, Lightbulb, Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import "./App.css";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: Home },
  { path: "/colleges", label: "Colleges", icon: BookOpen },
  { path: "/communications", label: "Emails", icon: Mail },
  { path: "/compose", label: "Compose", icon: Wand2 },
  { path: "/strategy", label: "Strategy", icon: Lightbulb }
];

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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
              <span className="font-bold text-slate-900 text-base tracking-wide" style={{ fontFamily: "Barlow Condensed, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                CourtBound
              </span>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
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

            {/* Right side */}
            <div className="flex items-center gap-2">
              <span className="hidden md:block text-xs text-slate-500 truncate max-w-32">{user?.name}</span>
              <button
                data-testid="logout-button"
                onClick={handleLogout}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
              <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
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
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition-all">
              <LogOut className="w-4 h-4" /> Logout
            </button>
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/colleges" element={<ProtectedRoute><AppLayout><CollegesPage /></AppLayout></ProtectedRoute>} />
          <Route path="/colleges/:id" element={<ProtectedRoute><AppLayout><CollegeDetailPage /></AppLayout></ProtectedRoute>} />
          <Route path="/communications" element={<ProtectedRoute><AppLayout><CommunicationsPage /></AppLayout></ProtectedRoute>} />
          <Route path="/compose" element={<ProtectedRoute><AppLayout><ComposePage /></AppLayout></ProtectedRoute>} />
          <Route path="/strategy" element={<ProtectedRoute><AppLayout><StrategyPage /></AppLayout></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
