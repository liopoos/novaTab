import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { getFaviconUrl, getFaviconeUrl, getDefaultFavicon } from "@/lib/favicon";
import { cn } from "@/lib/utils";
import type { BookmarkNode } from "@/types";
import type { AppSettings } from "@/types";

interface FaviconImageProps {
  url: string;
}

function FaviconImage({ url }: FaviconImageProps) {
  const attemptRef = useRef(0);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    attemptRef.current += 1;
    if (attemptRef.current === 1) {
      img.src = getFaviconeUrl(url);
    } else {
      img.src = getDefaultFavicon();
      img.onerror = null;
    }
  };

  return (
    <img
      src={getFaviconUrl(url)}
      onError={handleError}
      className="rounded-sm flex-shrink-0 object-contain w-8 h-8 xl:w-6 xl:h-6"
      alt=""
    />
  );
}

interface BookmarkCardProps {
  node: BookmarkNode;
  settings: AppSettings;
}

export function BookmarkCard({ node, settings }: BookmarkCardProps) {
  const url = node.url ?? "";
  const isElevated =
    settings.preset === "custom" &&
    settings.customTheme.surfaceStyle === "elevated";

  const handleClick = () => {
    if (settings.openInNewTab) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = url;
    }
  };

  return (
    <Card
      onClick={handleClick}
      className={cn(
        "cursor-pointer transition-all duration-150 h-16 py-0 gap-0 rounded-lg border-border/40",
        isElevated
          ? "shadow border-transparent hover:bg-accent"
          : "shadow-none hover:bg-accent"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3 h-full">
        <FaviconImage url={url} />
        <div className="flex flex-col justify-center min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium truncate leading-tight">
            {node.title}
          </span>
          <span className="text-xs text-muted-foreground truncate leading-tight">
            {url}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
