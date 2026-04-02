import manifest from "../../manifest.json";
import logoUrl from "@/assets/nova-icon.svg";

export const APP_NAME = manifest.name ?? "novaTab";
export const APP_VERSION = manifest.version ?? "0.0.0";
export const APP_REPO_URL = "https://github.com/liopoos/novaTab";
export const APP_LOGO_URL = logoUrl;

/**
 * The browser environment the extension is running in.
 * - "edge"    — Microsoft Edge (Chromium-based, UA contains "Edg/")
 * - "chrome"  — Google Chrome
 * - "browser" — Unknown / non-Chromium (fallback)
 */
export type BrowserEnv = "chrome" | "edge" | "browser";

function detectBrowserEnv(): BrowserEnv {
  const ua = navigator.userAgent;
  if (ua.includes("Edg/") || ua.includes("EdgA/") || ua.includes("EdgiOS/")) {
    return "edge";
  }
  if (ua.includes("Chrome/")) {
    return "chrome";
  }
  return "browser";
}

export const BROWSER_ENV: BrowserEnv = detectBrowserEnv();

function resolveRepoLink(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const match = /^git@([^:]+):(.+?)(?:\\.git)?$/.exec(value);
  if (match) {
    const host = match[1];
    const path = match[2];
    return `https://${host}/${path}`;
  }
  return value;
}

export const APP_REPO_LINK = resolveRepoLink(APP_REPO_URL);
