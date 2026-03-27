const DEFAULT_FAVICON_SVG = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;

export function getFaviconUrl(pageUrl: string): string {
  try {
    const encoded = encodeURIComponent(pageUrl);
    const base = chrome.runtime.getURL("/_favicon/");
    return `${base}?pageUrl=${encoded}&size=32`;
  } catch {
    return getFaviconeUrl(pageUrl);
  }
}

export function getFaviconeUrl(pageUrl: string): string {
  try {
    const { hostname } = new URL(pageUrl);
    return `https://favicone.com/${hostname}?s=32`;
  } catch {
    return DEFAULT_FAVICON_SVG;
  }
}

export function getDefaultFavicon(): string {
  return DEFAULT_FAVICON_SVG;
}

export const isChromeAvailable =
  typeof chrome !== "undefined" && typeof chrome.bookmarks !== "undefined";
