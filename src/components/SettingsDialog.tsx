import { useState, useCallback, useRef, useEffect } from "react";
import { Brush, Database, Download, Info, Monitor, Moon, Palette, Settings, Sun, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useThemeContext } from "@/contexts/ThemeContext";
import { applyCustomTheme, expandHex } from "@/hooks/useTheme";
import { APP_NAME, APP_REPO_LINK, APP_REPO_URL, APP_VERSION } from "@/lib/appInfo";
import { isChromeAvailable } from "@/lib/favicon";
import { cn } from "@/lib/utils";
import { exportSettingsToJson, downloadSettingsFile, parseSettingsJson } from "@/lib/settingsIO";
import logoSvg from "@/assets/nova-icon.svg?raw";
import { DEFAULT_CUSTOM_THEME } from "@/types";
import type { AppSettings, ThemePreset, CustomThemeConfig, FontFamily, SidebarStyle } from "@/types";

type Tab = "general" | "appearance" | "custom" | "data" | "about";

interface PresetMeta {
  value: ThemePreset;
  primaryLight: string;
  primaryDark: string;
  radius: string;
}

const PRESETS: PresetMeta[] = [
  { value: "default", primaryLight: "oklch(0.205 0 0)", primaryDark: "oklch(0.922 0 0)", radius: "6px" },
  { value: "rounded", primaryLight: "oklch(0.205 0 0)", primaryDark: "oklch(0.922 0 0)", radius: "12px" },
  { value: "sharp", primaryLight: "oklch(0.205 0 0)", primaryDark: "oklch(0.922 0 0)", radius: "2px" },
  { value: "blue", primaryLight: "oklch(0.488 0.243 264.376)", primaryDark: "oklch(0.696 0.17 264.376)", radius: "6px" },
  { value: "claude", primaryLight: "oklch(0.6171 0.1375 39.0427)", primaryDark: "oklch(0.6724 0.1308 38.7559)", radius: "16px" },
  { value: "contrast", primaryLight: "oklch(0.4275 0.2562 27.33)", primaryDark: "oklch(0.6280 0.2577 29.2339)", radius: "0px" },
  { value: "portfolio", primaryLight: "oklch(0.7414 0.0738 84.5946)", primaryDark: "oklch(0.8039 0.0702 84.7579)", radius: "12px" },
  { value: "terminal", primaryLight: "oklch(0.8686 0.2776 144.4661)", primaryDark: "oklch(0.8686 0.2776 144.4661)", radius: "0px" },
];

const FONT_OPTIONS: { value: Exclude<FontFamily, "custom">; label: string }[] = [
  { value: "inter", label: "Inter" },
  { value: "system", label: "System" },
  { value: "mono", label: "Mono" },
  { value: "serif", label: "Serif" },
];

const FONT_STYLE_MAP: Record<Exclude<FontFamily, "custom">, string> = {
  inter: "'Inter', sans-serif",
  system: "system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  serif: "Georgia, 'Times New Roman', serif",
};

function resolveFontFamily(fontFamily: FontFamily, customFontFamily: string): string {
  if (fontFamily === "custom") {
    return customFontFamily.trim() ? `${customFontFamily.trim()}, sans-serif` : "sans-serif";
  }
  return FONT_STYLE_MAP[fontFamily];
}

const SURFACE_OPTIONS = ["elevated", "bordered"] as const;

function Switch({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-background transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

interface GeneralPanelProps {
  settings: AppSettings;
  showBrowserFeatureSettings: boolean;
  updateSettings: (partial: Partial<AppSettings>) => void;
  onClearAllPins?: () => void;
}

function GeneralPanel({
  settings,
  showBrowserFeatureSettings,
  updateSettings,
  onClearAllPins,
}: GeneralPanelProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lang: "en" | "zh" | "ja") => {
    updateSettings({ language: lang });
    i18n.changeLanguage(lang);
    localStorage.setItem("nova-language", lang);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("settings.openInNewTab")}</span>
        <Switch
          checked={settings.openInNewTab}
          onToggle={() => updateSettings({ openInNewTab: !settings.openInNewTab })}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t("settings.rememberLastFolder")}</span>
        <Switch
          checked={settings.rememberLastFolder}
          onToggle={() => updateSettings({ rememberLastFolder: !settings.rememberLastFolder })}
        />
      </div>

      {showBrowserFeatureSettings && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("settings.showRecentlyClosed")}</span>
          <Switch
            checked={settings.showRecentlyClosed}
            onToggle={() => updateSettings({ showRecentlyClosed: !settings.showRecentlyClosed })}
          />
        </div>
      )}

      {showBrowserFeatureSettings && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("settings.showMostVisited")}</span>
          <Switch
            checked={settings.showMostVisited}
            onToggle={() => updateSettings({ showMostVisited: !settings.showMostVisited })}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{t("settings.language")}</span>
        <Select
          value={settings.language}
          onValueChange={(v) => handleLanguageChange(v as "en" | "zh" | "ja")}
        >
          <SelectTrigger className="w-36 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">{t("language.en")}</SelectItem>
            <SelectItem value="zh">{t("language.zh")}</SelectItem>
            <SelectItem value="ja">{t("language.ja")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onClearAllPins && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("pin.clearAll")}</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={onClearAllPins}
            className="h-8 text-xs"
          >
            {t("pin.clearAllButton")}
          </Button>
        </div>
      )}
    </div>
  );
}

interface DataPanelProps {
  onImport: (file: File) => Promise<void>;
  onExport: () => void;
  importError: string | null;
  importSuccess: boolean;
}

function DataPanel({ onImport, onExport, importError, importSuccess }: DataPanelProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await onImport(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("settings.export")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("settings.exportTooltip")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 text-xs gap-1.5"
        >
          <Download size={13} />
          {t("settings.export")}
        </Button>
      </div>

      <div className="border-t border-border" />

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">{t("settings.import")}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{t("settings.importTooltip")}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="h-8 text-xs gap-1.5"
        >
          <Upload size={13} />
          {t("settings.import")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleFileChange}
        />
        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}
        {importSuccess && (
          <p className="text-xs text-primary">{t("settings.importSuccess")}</p>
        )}
      </div>
    </div>
  );
}

function AboutPanel() {
  const { t } = useTranslation();
  const logoMarkup = logoSvg
    .replace('width="128"', 'width="100%"')
    .replace('height="128"', 'height="100%"');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted/40">
          <div
            role="img"
            aria-label={t("about.logoAlt", { name: APP_NAME })}
            className="size-7 text-foreground [&_svg]:size-full"
            dangerouslySetInnerHTML={{ __html: logoMarkup }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">{APP_NAME}</div>
          <div className="text-xs text-muted-foreground">
            {t("about.version", { version: APP_VERSION })}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-muted/30 p-3">
        <span className="text-xs text-muted-foreground">{t("about.repo")}</span>
        <a
          href={APP_REPO_LINK}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-mono break-all underline underline-offset-4"
        >
          {APP_REPO_URL}
        </a>
      </div>
    </div>
  );
}

function PresetSwatch({ primary, radius }: { primary: string; radius: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="w-full h-5 border border-border/40" style={{ backgroundColor: primary, borderRadius: radius }} />
      <div className="flex gap-1">
        <div className="h-2.5 flex-1 bg-muted border border-border/30" style={{ borderRadius: radius }} />
        <div className="h-2.5 w-3 bg-muted border border-border/30" style={{ borderRadius: radius }} />
      </div>
    </div>
  );
}

interface AppearancePanelProps {
  theme: "light" | "dark" | "system";
  resolvedTheme: "light" | "dark";
  preset: ThemePreset;
  customTheme: CustomThemeConfig;
  sidebarStyle: SidebarStyle;
  setTheme: (t: "light" | "dark" | "system") => void;
  setPreset: (p: ThemePreset) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  onOpenCustomTab: () => void;
}

function AppearancePanel({
  theme,
  resolvedTheme,
  preset,
  customTheme,
  sidebarStyle,
  setTheme,
  setPreset,
  updateSettings,
  onOpenCustomTab,
}: AppearancePanelProps) {
  const { t } = useTranslation();

  const handleSelectPreset = useCallback((value: ThemePreset) => {
    setPreset(value);
    updateSettings({ customTheme: { ...customTheme, surfaceStyle: "bordered" } });
  }, [setPreset, updateSettings, customTheme]);

  const handleSelectCustom = useCallback(() => {
    setPreset("custom");
    onOpenCustomTab();
  }, [setPreset, onOpenCustomTab]);

  const SIDEBAR_STYLES: { value: SidebarStyle; labelKey: string; preview: React.ReactNode }[] = [
    {
      value: "style1",
      labelKey: "sidebarStyle.style1",
      preview: (
        <svg viewBox="0 0 48 32" className="w-full" aria-hidden="true">
          {/* Background */}
          <rect width="48" height="32" rx="2" className="fill-muted" />
          {/* Sidebar flush */}
          <rect x="0" y="0" width="13" height="32" rx="2" className="fill-sidebar" />
          <rect x="0" y="0" width="13" height="32" className="fill-sidebar" />
          {/* Sidebar border */}
          <line x1="13" y1="0" x2="13" y2="32" className="stroke-border" strokeWidth="0.5" />
          {/* Sidebar items */}
          <rect x="2" y="4" width="8" height="2" rx="0.5" className="fill-sidebar-foreground/30" />
          <rect x="2" y="8" width="6" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="2" y="11" width="7" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="2" y="14" width="5" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          {/* Main header */}
          <rect x="14" y="0" width="34" height="7" className="fill-background" />
          <line x1="14" y1="7" x2="48" y2="7" className="stroke-border" strokeWidth="0.5" />
          {/* Main content */}
          <rect x="17" y="10" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="29" y="10" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="17" y="18" width="8" height="1.5" rx="0.5" className="fill-muted-foreground/20" />
          <rect x="17" y="21" width="14" height="1.5" rx="0.5" className="fill-muted-foreground/15" />
        </svg>
      ),
    },
    {
      value: "style2",
      labelKey: "sidebarStyle.style2",
      preview: (
        <svg viewBox="0 0 48 32" className="w-full" aria-hidden="true">
          {/* Background */}
          <rect width="48" height="32" rx="2" className="fill-muted" />
          {/* Floating sidebar with margin */}
          <rect x="2" y="2" width="13" height="28" rx="2" className="fill-sidebar" />
          <rect x="2" y="2" width="13" height="28" rx="2" className="fill-none stroke-border" strokeWidth="0.5" />
          {/* Sidebar items */}
          <rect x="4" y="5" width="8" height="2" rx="0.5" className="fill-sidebar-foreground/30" />
          <rect x="4" y="9" width="6" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="4" y="12" width="7" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="4" y="15" width="5" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          {/* Main area (flush) */}
          <rect x="16" y="0" width="32" height="32" className="fill-background" />
          {/* Main header */}
          <rect x="16" y="0" width="32" height="7" className="fill-background" />
          <line x1="16" y1="7" x2="48" y2="7" className="stroke-border" strokeWidth="0.5" />
          {/* Main content */}
          <rect x="18" y="10" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="30" y="10" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="18" y="18" width="8" height="1.5" rx="0.5" className="fill-muted-foreground/20" />
          <rect x="18" y="21" width="14" height="1.5" rx="0.5" className="fill-muted-foreground/15" />
        </svg>
      ),
    },
    {
      value: "style3",
      labelKey: "sidebarStyle.style3",
      preview: (
        <svg viewBox="0 0 48 32" className="w-full" aria-hidden="true">
          {/* Background */}
          <rect width="48" height="32" rx="2" className="fill-muted" />
          {/* Sidebar flush */}
          <rect x="0" y="0" width="13" height="32" rx="2" className="fill-sidebar" />
          <rect x="0" y="0" width="13" height="32" className="fill-sidebar" />
          <line x1="13" y1="0" x2="13" y2="32" className="stroke-border" strokeWidth="0.5" />
          {/* Sidebar items */}
          <rect x="2" y="4" width="8" height="2" rx="0.5" className="fill-sidebar-foreground/30" />
          <rect x="2" y="8" width="6" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="2" y="11" width="7" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          <rect x="2" y="14" width="5" height="1.5" rx="0.5" className="fill-sidebar-foreground/20" />
          {/* Floating main panel with margin */}
          <rect x="15" y="2" width="31" height="28" rx="2" className="fill-background" />
          <rect x="15" y="2" width="31" height="28" rx="2" className="fill-none stroke-border" strokeWidth="0.5" />
          {/* Main header inside floating panel */}
          <line x1="15" y1="9" x2="46" y2="9" className="stroke-border" strokeWidth="0.5" />
          {/* Main content */}
          <rect x="17" y="12" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="29" y="12" width="10" height="6" rx="1" className="fill-muted-foreground/20" />
          <rect x="17" y="20" width="8" height="1.5" rx="0.5" className="fill-muted-foreground/20" />
          <rect x="17" y="23" width="14" height="1.5" rx="0.5" className="fill-muted-foreground/15" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(["light", "dark", "system"] as const).map((opt) => {
          const Icon = opt === "light" ? Sun : opt === "dark" ? Moon : Monitor;
          return (
            <button
              key={opt}
              onClick={() => setTheme(opt)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-md border p-2.5 text-xs transition-colors",
                theme === opt
                  ? "border-primary bg-primary/5 text-primary font-medium"
                  : "border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground"
              )}
            >
              <Icon size={15} />
              {t(`theme.${opt}`)}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">{t("settings.sidebarStyle")}</span>
        <div className="grid grid-cols-3 gap-2 pt-1">
          {SIDEBAR_STYLES.map(({ value, labelKey, preview }) => (
            <button
              key={value}
              onClick={() => updateSettings({ sidebarStyle: value })}
              className={cn(
                "flex flex-col items-start gap-2 rounded-md border p-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sidebarStyle === value
                  ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary"
                  : "border-border hover:border-border/60 hover:bg-muted/40 text-muted-foreground"
              )}
            >
              {preview}
              <span className="w-full truncate text-center leading-none">{t(labelKey)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-medium text-muted-foreground">{t("settings.preset")}</span>
        <div className="grid grid-cols-4 gap-2 pt-1">
          {PRESETS.map(({ value, primaryLight, primaryDark, radius }) => {
            const primary = resolvedTheme === "dark" ? primaryDark : primaryLight;
            return (
              <button
                key={value}
                onClick={() => handleSelectPreset(value)}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-md border p-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  preset === value
                    ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary"
                    : "border-border hover:border-border/60 hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <PresetSwatch primary={primary} radius={radius} />
                <span className="w-full truncate text-center leading-none">{t(`preset.${value}`)}</span>
              </button>
            );
          })}

          <button
            onClick={handleSelectCustom}
            className={cn(
              "flex flex-col items-start gap-2 rounded-md border p-2.5 text-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              preset === "custom"
                ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary"
                : "border-border hover:border-border/60 hover:bg-muted/40 text-muted-foreground"
            )}
          >
            <div className="flex flex-col gap-1 w-full">
              <div
                className="w-full h-5"
                style={{
                  backgroundColor: customTheme.primaryColor,
                  borderRadius: `${customTheme.radius}rem`,
                }}
              />
              <div className="flex gap-1">
                <div className="h-2.5 flex-1 bg-muted" style={{ borderRadius: `${customTheme.radius}rem` }} />
                <div className="h-2.5 w-3 bg-muted" style={{ borderRadius: `${customTheme.radius}rem` }} />
              </div>
            </div>
            <span className="w-full truncate text-center leading-none">{t("preset.custom")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemePreview({ draft }: { draft: CustomThemeConfig }) {
  const radius = `${draft.radius}rem`;
  const fontFamily = resolveFontFamily(draft.fontFamily, draft.customFontFamily);

  return (
    <div
      className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 select-none"
      style={{ fontFamily }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-5 px-3 text-[10px] font-medium flex items-center text-white"
          style={{ backgroundColor: draft.primaryColor, borderRadius: radius }}
        >
          Button
        </div>
        <div
          className="h-5 px-3 text-[10px] font-medium flex items-center border border-border text-foreground bg-background"
          style={{ borderRadius: radius }}
        >
          Outline
        </div>
      </div>
      <div className="w-full h-2 bg-muted overflow-hidden" style={{ borderRadius: radius }}>
        <div className="h-full w-2/3" style={{ backgroundColor: draft.primaryColor, borderRadius: radius }} />
      </div>
      <div className="flex gap-1.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-1 h-6 bg-background border border-border/40"
            style={{
              borderRadius: radius,
              boxShadow: draft.surfaceStyle === "elevated" ? "0 2px 8px rgba(0,0,0,0.12)" : undefined,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 flex-1 bg-muted" style={{ borderRadius: radius }} />
        <div className="h-2 w-10 bg-muted" style={{ borderRadius: radius }} />
      </div>
    </div>
  );
}

interface CustomPanelProps {
  draft: CustomThemeConfig;
  onUpdate: <K extends keyof CustomThemeConfig>(key: K, value: CustomThemeConfig[K]) => void;
  onApply: () => void;
  onReset: () => void;
}

function CustomPanel({ draft, onUpdate, onApply, onReset }: CustomPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <ThemePreview draft={draft} />

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("customTheme.primaryColor")}
        </label>
        <div className="flex items-center gap-2 pt-1">
          <div className="relative h-8 w-8 shrink-0 rounded-md border border-border overflow-hidden">
            <input
              type="color"
              value={/^#[0-9a-fA-F]{3}$/.test(draft.primaryColor) || /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor) ? expandHex(draft.primaryColor) : "#000000"}
              onChange={(e) => onUpdate("primaryColor", e.target.value)}
              className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
            />
            <div className="absolute inset-0" style={{ backgroundColor: /^#[0-9a-fA-F]{3}$/.test(draft.primaryColor) || /^#[0-9a-fA-F]{6}$/.test(draft.primaryColor) ? expandHex(draft.primaryColor) : undefined }} />
          </div>
          <input
            type="text"
            value={draft.primaryColor}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onUpdate("primaryColor", v);
            }}
            className="h-8 flex-1 rounded-md border border-input bg-background px-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            maxLength={7}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("customTheme.radius")}
          </label>
          <span className="text-xs text-muted-foreground tabular-nums">{draft.radius.toFixed(3)}rem</span>
        </div>
        <input
          type="range"
          min={0.125}
          max={1.0}
          step={0.025}
          value={draft.radius}
          onChange={(e) => onUpdate("radius", parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer"
          style={{ accentColor: draft.primaryColor }}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{t("customTheme.radius.sharp")}</span>
          <span>{t("customTheme.radius.round")}</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("customTheme.fontFamily")}
        </label>
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {FONT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                onUpdate("fontFamily", value);
                onUpdate("customFontFamily", "");
              }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md border py-2 px-1 text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                draft.fontFamily === value
                  ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary"
                  : "border-border text-muted-foreground hover:border-border/60 hover:bg-muted/40"
              )}
            >
              <span className="text-base leading-none" style={{ fontFamily: FONT_STYLE_MAP[value] }}>Aa</span>
              <span className="truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] text-muted-foreground">{t("customTheme.customFontFamily")}</label>
          <input
            type="text"
            value={draft.customFontFamily}
            onChange={(e) => {
              onUpdate("customFontFamily", e.target.value);
              onUpdate("fontFamily", "custom");
            }}
            placeholder={t("customTheme.customFontPlaceholder")}
            className={cn(
              "h-8 w-full rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              draft.fontFamily === "custom"
                ? "border-primary ring-1 ring-primary"
                : "border-input"
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("customTheme.surfaceStyle")}
        </label>
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {SURFACE_OPTIONS.map((style) => (
            <button
              key={style}
              onClick={() => onUpdate("surfaceStyle", style)}
              className={cn(
                "rounded-md border py-2 px-2 text-xs transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                draft.surfaceStyle === style
                  ? "border-primary bg-primary/5 text-primary font-medium ring-1 ring-primary"
                  : "border-border text-muted-foreground hover:border-border/60 hover:bg-muted/40"
              )}
            >
              {t(`customTheme.surfaceStyle.${style}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="destructive" size="sm" onClick={onReset} className="text-xs">
          {t("customTheme.reset")}
        </Button>
        <Button size="sm" onClick={onApply} className="text-xs">
          {t("customTheme.apply")}
        </Button>
      </div>
    </div>
  );
}

interface SettingsDialogProps {
  onClearAllPins?: () => void;
  onOpen?: () => void;
}

export function SettingsDialog({ onClearAllPins, onOpen }: SettingsDialogProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const { settings, updateSettings } = useSettingsContext();
  const { theme, resolvedTheme, setTheme, preset, setPreset } = useThemeContext();
  const showBrowserFeatureSettings = isChromeAvailable;
  const [draft, setDraft] = useState<CustomThemeConfig>(() => settings.customTheme);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    setDraft(settings.customTheme);
  }, [settings.customTheme]);

  const updateDraft = useCallback(<K extends keyof CustomThemeConfig>(
    key: K,
    value: CustomThemeConfig[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyCustomTheme = useCallback(() => {
    updateSettings({ customTheme: draft, preset: "custom" });
    setPreset("custom");
    applyCustomTheme(draft, resolvedTheme === "dark");
  }, [draft, updateSettings, setPreset, resolvedTheme]);

  const handleResetDraft = useCallback(() => {
    setDraft(DEFAULT_CUSTOM_THEME);
  }, []);

  const handleOpenCustomTab = useCallback(() => {
    setDraft(settings.customTheme);
    setActiveTab("custom");
  }, [settings.customTheme]);

  const handleExport = useCallback(() => {
    const json = exportSettingsToJson(settings);
    downloadSettingsFile(json);
  }, [settings]);

  const handleImport = useCallback(async (file: File) => {
    setImportError(null);
    setImportSuccess(false);
    const text = await file.text();
    const result = parseSettingsJson(text);
    if (!result.ok) {
      setImportError(t(result.error === "parse" ? "settings.importErrorParse" : "settings.importErrorInvalid"));
      return;
    }
    updateSettings(result.appSettings);
    if (result.theme && ["light", "dark", "system"].includes(result.theme)) {
      setTheme(result.theme as "light" | "dark" | "system");
    }
    if (result.preset && result.appSettings.preset) {
      setPreset(result.appSettings.preset);
    }
    if (result.appSettings.preset === "custom") {
      applyCustomTheme(result.appSettings.customTheme, resolvedTheme === "dark");
      setDraft(result.appSettings.customTheme);
    }
    setImportSuccess(true);
    setTimeout(() => setImportSuccess(false), 3000);
  }, [updateSettings, setTheme, setPreset, resolvedTheme, t]);

  const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: t("settings.title"), icon: <Settings size={15} /> },
    { id: "appearance", label: t("settings.appearance"), icon: <Palette size={15} /> },
    { id: "custom", label: t("customTheme.title"), icon: <Brush size={15} /> },
    { id: "data", label: t("settings.data"), icon: <Database size={15} /> },
    { id: "about", label: t("about.title"), icon: <Info size={15} /> },
  ];
  const activeNavItem = NAV_ITEMS.find(({ id }) => id === activeTab) ?? NAV_ITEMS[0];

  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) onOpen?.();
    setOpen(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings size={15} />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="top">{t("settings.title")}</TooltipContent>
      </Tooltip>

      <DialogContent className="p-0 sm:max-w-2xl overflow-hidden flex flex-col h-[640px] max-h-[90dvh]" aria-describedby={undefined}>
        <DialogTitle className="sr-only">{t("settings.title")}</DialogTitle>

        <nav className="flex sm:hidden shrink-0 border-b border-border bg-muted/30 px-2 pt-2 gap-1">
          {NAV_ITEMS.map(({ id, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex flex-1 items-center justify-center py-2.5 rounded-t-md text-sm transition-colors",
                activeTab === id
                  ? "bg-background text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {icon}
            </button>
          ))}
        </nav>

        <div className="flex flex-col sm:flex-row flex-1 min-h-0 overflow-hidden">
          <nav className="hidden sm:flex flex-col w-44 shrink-0 border-r border-border bg-muted/30 pt-4 pb-4">
            {NAV_ITEMS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left",
                  activeTab === id
                    ? "bg-background text-foreground font-medium border-r-2 border-primary"
                    : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                )}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 border-b border-border bg-background/80 px-4 py-3 sm:px-6">
              <div className="text-sm font-medium">{activeNavItem.label}</div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 sm:pr-12">
              {activeTab === "general" && (
                <GeneralPanel
                  settings={settings}
                  showBrowserFeatureSettings={showBrowserFeatureSettings}
                  updateSettings={updateSettings}
                  onClearAllPins={onClearAllPins}
                />
              )}
              {activeTab === "appearance" && (
                <AppearancePanel
                  theme={theme}
                  resolvedTheme={resolvedTheme}
                  preset={preset}
                  customTheme={settings.customTheme}
                  sidebarStyle={settings.sidebarStyle ?? "style1"}
                  setTheme={setTheme}
                  setPreset={setPreset}
                  updateSettings={updateSettings}
                  onOpenCustomTab={handleOpenCustomTab}
                />
              )}
              {activeTab === "custom" && (
                <CustomPanel
                  draft={draft}
                  onUpdate={updateDraft}
                  onApply={handleApplyCustomTheme}
                  onReset={handleResetDraft}
                />
              )}
              {activeTab === "data" && (
                <DataPanel
                  onExport={handleExport}
                  onImport={handleImport}
                  importError={importError}
                  importSuccess={importSuccess}
                />
              )}
              {activeTab === "about" && <AboutPanel />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
