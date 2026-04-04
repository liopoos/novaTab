import type { AppSettings, CustomThemeConfig, FontFamily, SidebarStyle, ThemePreset } from "@/types";
import { DEFAULT_CUSTOM_THEME, DEFAULT_SETTINGS, isExtraSectionCount } from "@/types";

export interface NovaSettingsExport {
  version: 1;
  exportedAt: string;
  appSettings: AppSettings;
  theme: string | null;
  preset: string | null;
}

const VALID_PRESETS: ThemePreset[] = [
  "default", "blue", "claude", "contrast", "portfolio", "terminal", "rounded", "sharp", "custom",
];
const VALID_FONTS: FontFamily[] = ["inter", "system", "mono", "serif", "custom"];
const VALID_THEMES = ["light", "dark", "system"] as const;
const VALID_LANGUAGES = ["en", "zh", "ja"] as const;
const VALID_SURFACE_STYLES = ["elevated", "bordered"] as const;
const VALID_SIDEBAR_STYLES: SidebarStyle[] = ["style1", "style2", "style3"];

function isValidCustomTheme(obj: unknown): obj is Partial<CustomThemeConfig> {
  if (typeof obj !== "object" || obj === null) return false;
  const t = obj as Record<string, unknown>;
  if ("primaryColor" in t && typeof t.primaryColor !== "string") return false;
  if ("radius" in t && typeof t.radius !== "number") return false;
  if ("fontFamily" in t && !VALID_FONTS.includes(t.fontFamily as FontFamily)) return false;
  if ("customFontFamily" in t && typeof t.customFontFamily !== "string") return false;
  if ("surfaceStyle" in t && !VALID_SURFACE_STYLES.includes(t.surfaceStyle as "elevated" | "bordered")) return false;
  return true;
}

function mergeCustomTheme(raw: unknown): CustomThemeConfig {
  if (!isValidCustomTheme(raw)) return { ...DEFAULT_CUSTOM_THEME };
  return {
    ...DEFAULT_CUSTOM_THEME,
    ...raw,
  };
}

function mergeAppSettings(raw: unknown): AppSettings {
  if (typeof raw !== "object" || raw === null) return { ...DEFAULT_SETTINGS };
  const s = raw as Record<string, unknown>;

  return {
    openInNewTab:
      typeof s.openInNewTab === "boolean" ? s.openInNewTab : DEFAULT_SETTINGS.openInNewTab,
    rememberLastFolder:
      typeof s.rememberLastFolder === "boolean"
        ? s.rememberLastFolder
        : DEFAULT_SETTINGS.rememberLastFolder,
    showRecentlyClosed:
      typeof s.showRecentlyClosed === "boolean"
        ? s.showRecentlyClosed
        : DEFAULT_SETTINGS.showRecentlyClosed,
    showMostVisited:
      typeof s.showMostVisited === "boolean"
        ? s.showMostVisited
        : DEFAULT_SETTINGS.showMostVisited,
    recentlyClosedCount: isExtraSectionCount(s.recentlyClosedCount)
      ? s.recentlyClosedCount
      : DEFAULT_SETTINGS.recentlyClosedCount,
    mostVisitedCount: isExtraSectionCount(s.mostVisitedCount)
      ? s.mostVisitedCount
      : DEFAULT_SETTINGS.mostVisitedCount,
    language: VALID_LANGUAGES.includes(s.language as "en" | "zh" | "ja")
      ? (s.language as "en" | "zh" | "ja")
      : DEFAULT_SETTINGS.language,
    theme: VALID_THEMES.includes(s.theme as "light" | "dark" | "system")
      ? (s.theme as "light" | "dark" | "system")
      : DEFAULT_SETTINGS.theme,
    preset: VALID_PRESETS.includes(s.preset as ThemePreset)
      ? (s.preset as ThemePreset)
      : DEFAULT_SETTINGS.preset,
    customTheme: mergeCustomTheme(s.customTheme),
    sidebarStyle: VALID_SIDEBAR_STYLES.includes(s.sidebarStyle as SidebarStyle)
      ? (s.sidebarStyle as SidebarStyle)
      : DEFAULT_SETTINGS.sidebarStyle,
    checkerConcurrency:
      typeof s.checkerConcurrency === "number"
        ? Math.min(8, Math.max(1, Math.round(s.checkerConcurrency)))
        : DEFAULT_SETTINGS.checkerConcurrency,
    checkerTimeoutMs:
      typeof s.checkerTimeoutMs === "number"
        ? Math.min(30000, Math.max(1000, Math.round(s.checkerTimeoutMs)))
        : DEFAULT_SETTINGS.checkerTimeoutMs,
  };
}

/** Serialize current settings + theme/preset to a downloadable JSON blob. */
export function exportSettingsToJson(appSettings: AppSettings): string {
  const payload: NovaSettingsExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    appSettings,
    theme: localStorage.getItem("nova-theme"),
    preset: localStorage.getItem("nova-preset"),
  };
  return JSON.stringify(payload, null, 2);
}

/** Download the settings JSON as a file in the browser. */
export function downloadSettingsFile(json: string): void {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `nova-settings-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export type ImportResult =
  | { ok: true; appSettings: AppSettings; theme: string | null; preset: string | null }
  | { ok: false; error: "parse" | "invalid" };

/** Parse and validate a settings JSON string. Returns merged AppSettings or an error. */
export function parseSettingsJson(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "parse" };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { ok: false, error: "invalid" };
  }

  const obj = parsed as Record<string, unknown>;

  // Support both versioned export format { version, appSettings, ... }
  // and a raw AppSettings object for backwards-compat.
  const rawSettings = "appSettings" in obj ? obj.appSettings : obj;
  const appSettings = mergeAppSettings(rawSettings);

  const theme = typeof obj.theme === "string" ? obj.theme : null;
  const preset = typeof obj.preset === "string" ? obj.preset : null;

  return { ok: true, appSettings, theme, preset };
}
