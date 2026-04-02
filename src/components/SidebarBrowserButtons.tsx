import { LayoutGrid, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BROWSER_ENV } from "@/lib/appInfo";

const BROWSER_URLS = {
  chrome: { apps: "chrome://apps", bookmarks: "chrome://bookmarks" },
  edge:   { apps: "edge://apps",   bookmarks: "edge://favorites"   },
  browser: { apps: "",              bookmarks: ""                   },
} as const satisfies Record<typeof BROWSER_ENV, { apps: string; bookmarks: string }>;

function openInternalUrl(url: string): void {
  if (!url) return;
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.update({ url });
  } else {
    window.location.href = url;
  }
}

export function SidebarBrowserButtons() {
  const urls = BROWSER_URLS[BROWSER_ENV];

  return (
    <div className="flex items-center gap-0.5">
      {urls.apps && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => openInternalUrl(urls.apps)}
        >
          <LayoutGrid size={15} />
        </Button>
      )}

      {urls.bookmarks && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => openInternalUrl(urls.bookmarks)}
        >
          <BookMarked size={15} />
        </Button>
      )}
    </div>
  );
}
