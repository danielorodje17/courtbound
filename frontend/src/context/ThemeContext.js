import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiRequest } from "./AuthContext";

const ThemeContext = createContext({ division: "mens", setDivision: () => {} });

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [division, setDivisionState] = useState(
    () => localStorage.getItem("cb_division") || "mens"
  );

  const setDivision = (d) => {
    localStorage.setItem("cb_division", d);
    setDivisionState(d);
  };

  // On login, read gender from profile
  useEffect(() => {
    if (!user?.user_id) return;
    apiRequest("get", "/profile")
      .then(r => {
        const gender = r.data?.basketball_gender;
        if (gender === "women") setDivision("womens");
        else if (gender === "men") setDivision("mens");
      })
      .catch(() => {});
  }, [user?.user_id]); // eslint-disable-line

  // Apply data-division attribute to document root for CSS variables
  useEffect(() => {
    document.documentElement.setAttribute("data-division", division);
    return () => document.documentElement.removeAttribute("data-division");
  }, [division]);

  return (
    <ThemeContext.Provider value={{ division, setDivision }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Color helpers keyed by division
export const DIVISION_THEME = {
  mens: {
    accent: "#f97316",
    accentHover: "#ea580c",
    accentLight: "#fff7ed",
    accentText: "#c2410c",
    sidebarBg: "#0f172a",
    label: "Men's",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    btnClass: "bg-orange-500 hover:bg-orange-600 text-white",
    ringClass: "ring-orange-500",
    borderClass: "border-orange-400",
    textAccent: "text-orange-500",
    bgLight: "bg-orange-50",
    fontHeading: "'Barlow Condensed', sans-serif",
  },
  womens: {
    accent: "#e11d48",
    accentHover: "#be123c",
    accentLight: "#fff1f2",
    accentText: "#9f1239",
    sidebarBg: "#1e1b4b",
    label: "Women's",
    badgeBg: "bg-rose-100",
    badgeText: "text-rose-700",
    btnClass: "bg-rose-600 hover:bg-rose-700 text-white rounded-full",
    ringClass: "ring-rose-500",
    borderClass: "border-rose-400",
    textAccent: "text-rose-600",
    bgLight: "bg-rose-50",
    fontHeading: "'Outfit', sans-serif",
  },
};
