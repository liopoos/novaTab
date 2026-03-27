import manifest from "../../manifest.json";
import logoUrl from "@/assets/nova-icon.svg";

export const APP_NAME = manifest.name ?? "novaTab";
export const APP_VERSION = manifest.version ?? "0.0.0";
export const APP_REPO_URL = "https://github.com/liopoos/novaTab";
export const APP_LOGO_URL = logoUrl;

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
