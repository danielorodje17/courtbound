import { useNavigate, useLocation, Link } from "react-router-dom";
import { useCoachAuth } from "../../context/CoachAuthContext";
import { Trophy, LayoutDashboard, Search, Bookmark, Bell, LogOut, ChevronDown, Shield, AlertCircle, Send } from "lucide-react";
import { useState } from "react";

export function CoachNav({ notifCount = 0 }) {
  const { coach, logout } = useCoachAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { to: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/coach/players", label: "Search Players", icon: Search },
    { to: "/coach/board", label: "My Board", icon: Bookmark },
    { to: "/coach/messages", label: "Messages", icon: Send },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/coach");
  };

  const isVerified = coach?.verification_status === "verified";

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link to="/coach/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-white text-sm tracking-tight hidden sm:block">CourtBound <span className="text-blue-400">Coaches</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  location.pathname.startsWith(to) ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {!isVerified && (
            <div className="hidden sm:flex items-center gap-1.5 bg-amber-900/40 border border-amber-700/50 text-amber-300 text-xs font-bold px-3 py-1 rounded-full">
              <AlertCircle className="w-3 h-3" /> Pending Verification
            </div>
          )}
          <button onClick={() => navigate("/coach/notifications")} className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800" data-testid="notif-bell-btn">
            <Bell className="w-4 h-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">{notifCount}</span>
            )}
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 text-slate-300 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors">
              <div className="w-6 h-6 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-black">
                {(coach?.full_name || "C")[0]}
              </div>
              <span className="hidden sm:block max-w-[100px] truncate">{coach?.full_name?.split(" ")[0]}</span>
              <ChevronDown className="w-3 h-3 text-slate-500" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 bg-slate-800 border border-slate-700 rounded-xl shadow-xl w-48 py-1 z-50">
                <div className="px-4 py-2 border-b border-slate-700">
                  <p className="text-white text-xs font-bold truncate">{coach?.full_name}</p>
                  <p className="text-slate-400 text-xs truncate">{coach?.institution_name}</p>
                  {isVerified && (
                    <div className="flex items-center gap-1 mt-1">
                      <Shield className="w-3 h-3 text-green-400" />
                      <span className="text-green-400 text-xs font-bold">Verified Coach</span>
                    </div>
                  )}
                </div>
                <button onClick={() => { navigate("/coach/settings"); setMenuOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">Settings</button>
                <button onClick={handleLogout} data-testid="coach-logout-btn"
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-700 transition-colors flex items-center gap-2">
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
