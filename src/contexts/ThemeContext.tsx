import { createContext, useContext } from "react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreset } from "@/types";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface UseThemeReturn {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  preset: ThemePreset;
  setPreset: (p: ThemePreset) => void;
}

const ThemeContext = createContext<UseThemeReturn | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const value = useTheme();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): UseThemeReturn {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
