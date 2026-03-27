export type ThemePreset =
  | "default"
  | "rose"
  | "blue"
  | "green"
  | "orange"
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

export interface AppSettings {
  openInNewTab: boolean;
  rememberLastFolder: boolean;
  language: "en" | "zh" | "ja";
  theme: "light" | "dark" | "system";
  preset: ThemePreset;
  customTheme: CustomThemeConfig;
  sidebarStyle: SidebarStyle;
}

export const DEFAULT_SETTINGS: AppSettings = {
  openInNewTab: true,
  rememberLastFolder: false,
  language: "en",
  theme: "light",
  preset: "default",
  customTheme: DEFAULT_CUSTOM_THEME,
  sidebarStyle: "style1",
};
