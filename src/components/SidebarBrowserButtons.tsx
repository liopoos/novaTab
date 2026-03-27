import { LayoutGrid, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";

function openChromeUrl(url: string): void {
  if (typeof chrome !== "undefined" && chrome.tabs) {
    chrome.tabs.update({ url });
  } else {
    window.location.href = url;
  }
}

export function SidebarBrowserButtons() {
  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => openChromeUrl("chrome://apps")}
      >
        <LayoutGrid size={15} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => openChromeUrl("chrome://bookmarks")}
      >
        <BookMarked size={15} />
      </Button>
    </div>
  );
}
