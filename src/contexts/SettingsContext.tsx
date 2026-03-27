import { createContext, useContext } from "react";
import { useSettings } from "@/hooks/useSettings";
import type { AppSettings } from "@/types";

interface UseSettingsReturn {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loading: boolean;
}

const SettingsContext = createContext<UseSettingsReturn | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const value = useSettings();
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext(): UseSettingsReturn {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
