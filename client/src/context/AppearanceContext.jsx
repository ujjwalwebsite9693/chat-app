import { createContext, useContext, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext.jsx";
import { userApi } from "../services/api.js";

// Precomputed hover shades so we don't need runtime color math
const ACCENT_HOVER = {
  "#5B6EF5": "#4756D6",
  "#F5A623": "#D98F12",
  "#34D399": "#22B384",
  "#FF6B6B": "#E85555",
  "#38BDF8": "#1E9FDB",
  "#C084FC": "#A855F7",
};

export const ACCENT_OPTIONS = [
  { value: "#5B6EF5", label: "Signal violet" },
  { value: "#F5A623", label: "Amber" },
  { value: "#34D399", label: "Green" },
  { value: "#FF6B6B", label: "Rose" },
  { value: "#38BDF8", label: "Sky" },
  { value: "#C084FC", label: "Orchid" },
];

export const WALLPAPER_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "dots", label: "Dotted grid" },
  { value: "waves", label: "Waves" },
  { value: "gradient-sunset", label: "Sunset" },
  { value: "gradient-mint", label: "Mint" },
  { value: "gradient-violet", label: "Violet" },
  { value: "solid-black", label: "Solid black" },
  { value: "custom", label: "Custom photo" },
];

const AppearanceContext = createContext(null);

export function AppearanceProvider({ children }) {
  const { user, updateUser } = useAuth();

  const theme = user?.theme || "dark";
  const accentColor = user?.accentColor || "#5B6EF5";
  const wallpaper = user?.wallpaper || "default";
  const wallpaperCustomUrl = user?.wallpaperCustomUrl || "";

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.setAttribute("data-wallpaper", wallpaper);
    root.style.setProperty("--accent", accentColor);
    root.style.setProperty("--accent-hover", ACCENT_HOVER[accentColor] || accentColor);
    if (wallpaperCustomUrl) {
      root.style.setProperty("--wallpaper-custom-url", `url(${wallpaperCustomUrl})`);
    }
  }, [theme, accentColor, wallpaper, wallpaperCustomUrl]);

  // Optimistically applies a change, then persists it to the backend so it
  // follows the user to any device they log in on.
  const updateAppearance = useCallback(
    async (partial) => {
      const previous = { theme, accentColor, wallpaper, wallpaperCustomUrl };
      updateUser(partial);
      try {
        const res = await userApi.updateProfile(partial);
        updateUser(res.data.user);
      } catch (err) {
        updateUser(previous);
        throw err;
      }
    },
    [theme, accentColor, wallpaper, wallpaperCustomUrl, updateUser]
  );

  return (
    <AppearanceContext.Provider
      value={{ theme, accentColor, wallpaper, wallpaperCustomUrl, updateAppearance }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error("useAppearance must be used within an AppearanceProvider");
  return ctx;
}
