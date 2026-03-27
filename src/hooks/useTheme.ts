import { useState, useEffect, useCallback } from "react";
import type { ThemePreset, CustomThemeConfig } from "@/types";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "nova-theme";
const PRESET_STORAGE_KEY = "nova-preset";

function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.sync !== "undefined"
  );
}

async function readStorageItem(key: string): Promise<string | null> {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (result) => {
        resolve(typeof result[key] === "string" ? result[key] : null);
      });
    });
  }
  return localStorage.getItem(key);
}

function writeStorageItem(key: string, value: string): void {
  if (isChromeStorageAvailable()) {
    chrome.storage.sync.set({ [key]: value });
  } else {
    localStorage.setItem(key, value);
  }
}

function readStorageItemSync(key: string): string | null {
  if (isChromeStorageAvailable()) return null;
  return localStorage.getItem(key);
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  if (resolved === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function applyPreset(p: ThemePreset) {
  const root = document.documentElement;
  if (p === "default") {
    root.removeAttribute("data-preset");
  } else {
    root.setAttribute("data-preset", p);
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return getSystemTheme();
  return theme;
}

export function expandHex(hex: string): string {
  if (/^#[0-9a-fA-F]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

function hexToOklch(hex: string): string {
  const normalized = expandHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rl = toLinear(r);
  const gl = toLinear(g);
  const bl = toLinear(b);

  const lx = 0.4122214708 * rl + 0.5363325363 * gl + 0.0514459929 * bl;
  const mx = 0.2119034982 * rl + 0.6806995451 * gl + 0.1073969566 * bl;
  const sx = 0.0883024619 * rl + 0.2817188376 * gl + 0.6299787005 * bl;

  const l_ = Math.cbrt(lx);
  const m_ = Math.cbrt(mx);
  const s_ = Math.cbrt(sx);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  const h = (Math.atan2(bVal, a) * 180) / Math.PI;
  const hue = h < 0 ? h + 360 : h;

  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${hue.toFixed(1)})`;
}

function scaleOklchLightness(oklchStr: string, factor: number): string {
  const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklchStr;
  const L = Math.min(1, parseFloat(match[1]) * factor);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
}

function tintedSurface(oklchStr: string, targetL: number): string {
  const match = oklchStr.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) return oklchStr;
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);
  return `oklch(${targetL.toFixed(3)} ${(C * 0.08).toFixed(3)} ${H.toFixed(1)})`;
}

export function applyCustomTheme(config: CustomThemeConfig, isDark: boolean) {
  const root = document.documentElement;
  const primary = hexToOklch(config.primaryColor);
  const primaryResolved = isDark ? scaleOklchLightness(primary, 1.3) : primary;
  const secondaryBg = tintedSurface(primary, isDark ? 0.269 : 0.97);
  const ringColor = primaryResolved;

  root.style.setProperty("--radius", `${config.radius}rem`);
  root.style.setProperty("--color-primary", primaryResolved);
  root.style.setProperty("--color-primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");
  root.style.setProperty("--color-secondary", secondaryBg);
  root.style.setProperty("--color-secondary-foreground", isDark ? "oklch(0.985 0 0)" : "oklch(0.205 0 0)");
  root.style.setProperty("--color-accent", secondaryBg);
  root.style.setProperty("--color-accent-foreground", isDark ? "oklch(0.985 0 0)" : "oklch(0.205 0 0)");
  root.style.setProperty("--color-ring", ringColor);
  root.style.setProperty("--color-sidebar-primary", primaryResolved);
  root.style.setProperty("--color-sidebar-primary-foreground", isDark ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)");
  root.style.setProperty("--color-sidebar-accent", secondaryBg);
  root.style.setProperty("--color-sidebar-accent-foreground", isDark ? "oklch(0.985 0 0)" : "oklch(0.205 0 0)");
  root.style.setProperty("--color-sidebar-ring", ringColor);

  const fontMap: Record<string, string> = {
    inter:  "'Inter', sans-serif",
    system: "system-ui, -apple-system, sans-serif",
    mono:   "'JetBrains Mono', 'Fira Code', monospace",
    serif:  "Georgia, 'Times New Roman', serif",
  };
  const customFontFamily = config.customFontFamily?.trim() ?? "";
  const resolvedFont =
    config.fontFamily === "custom" && customFontFamily
      ? `${customFontFamily}, sans-serif`
      : (fontMap[config.fontFamily] ?? fontMap["inter"]);
  root.style.setProperty("--font-sans", resolvedFont);
  document.body.style.fontFamily = resolvedFont;

  if (config.surfaceStyle === "elevated") {
    root.style.setProperty("--color-card", isDark ? "oklch(0.22 0 0)" : "oklch(1 0 0)");
    root.style.removeProperty("--color-border");
    root.style.removeProperty("--card-border-override");
  } else {
    root.style.removeProperty("--color-card");
    root.style.removeProperty("--color-border");
    root.style.removeProperty("--card-border-override");
  }
}

export function clearCustomTheme() {
  const root = document.documentElement;
  [
    "--radius", "--color-primary", "--color-primary-foreground",
    "--color-secondary", "--color-secondary-foreground",
    "--color-accent", "--color-accent-foreground",
    "--color-ring", "--color-sidebar-primary", "--color-sidebar-primary-foreground",
    "--color-sidebar-accent", "--color-sidebar-accent-foreground",
    "--color-sidebar-ring", "--font-sans",
    "--color-card", "--color-border", "--card-border-override",
  ].forEach((p) => root.style.removeProperty(p));
  document.body.style.fontFamily = "";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = readStorageItemSync(STORAGE_KEY) as Theme | null;
    return stored ?? "light";
  });

  const [preset, setPresetState] = useState<ThemePreset>(() => {
    const stored = readStorageItemSync(PRESET_STORAGE_KEY) as ThemePreset | null;
    return stored ?? "default";
  });

  useEffect(() => {
    if (!isChromeStorageAvailable()) return;
    readStorageItem(STORAGE_KEY).then((stored) => {
      if (stored) setThemeState(stored as Theme);
    });
    readStorageItem(PRESET_STORAGE_KEY).then((stored) => {
      if (stored) setPresetState(stored as ThemePreset);
    });

    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area !== "sync") return;
      if (changes[STORAGE_KEY]?.newValue) {
        setThemeState(changes[STORAGE_KEY].newValue as Theme);
      }
      if (changes[PRESET_STORAGE_KEY]?.newValue) {
        setPresetState(changes[PRESET_STORAGE_KEY].newValue as ThemePreset);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const resolvedTheme = resolveTheme(theme);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    applyPreset(preset);
    if (preset !== "custom") {
      clearCustomTheme();
    }
  }, [preset]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    writeStorageItem(STORAGE_KEY, t);
  }, []);

  const setPreset = useCallback((p: ThemePreset) => {
    setPresetState(p);
    writeStorageItem(PRESET_STORAGE_KEY, p);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  return { theme, resolvedTheme, setTheme, toggleTheme, preset, setPreset };
}
