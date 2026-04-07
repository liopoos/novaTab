export type ThemePreset =
  | "default"
  | "blue"
  | "claude"
  | "contrast"
  | "portfolio"
  | "terminal"
  | "rounded"
  | "sharp"
  | "custom";

export type FontFamily = "inter" | "system" | "mono" | "serif" | "custom";

export interface CustomThemeConfig {
  primaryColor: string;
  radius: number;
  fontFamily: FontFamily;
  customFontFamily: string;
  surfaceStyle: "elevated" | "bordered";
}

export const DEFAULT_CUSTOM_THEME: CustomThemeConfig = {
  primaryColor: "#3D816E",
  radius: 0.5,
  fontFamily: "inter",
  customFontFamily: "",
  surfaceStyle: "elevated",
};

export type SidebarStyle = "style1" | "style2" | "style3";

export const EXTRA_SECTION_COUNT_OPTIONS = [10, 20] as const;
export type ExtraSectionCount = (typeof EXTRA_SECTION_COUNT_OPTIONS)[number];

export function isExtraSectionCount(value: unknown): value is ExtraSectionCount {
  return (
    typeof value === "number" &&
    EXTRA_SECTION_COUNT_OPTIONS.includes(value as ExtraSectionCount)
  );
}

export interface AppSettings {
  openInNewTab: boolean;
  rememberLastFolder: boolean;
  showRecentlyClosed: boolean;
  showMostVisited: boolean;
  recentlyClosedCount: ExtraSectionCount;
  mostVisitedCount: ExtraSectionCount;
  language: "en" | "zh" | "ja";
  theme: "light" | "dark" | "system";
  preset: ThemePreset;
  customTheme: CustomThemeConfig;
  sidebarStyle: SidebarStyle;
  checkerConcurrency: number;
  checkerTimeoutMs: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openInNewTab: true,
  rememberLastFolder: false,
  showRecentlyClosed: true,
  showMostVisited: true,
  recentlyClosedCount: 10,
  mostVisitedCount: 10,
  language: "en",
  theme: "light",
  preset: "default",
  customTheme: DEFAULT_CUSTOM_THEME,
  sidebarStyle: "style1",
  checkerConcurrency: 6,
  checkerTimeoutMs: 8000,
};
