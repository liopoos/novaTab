import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { getFaviconUrl, getFaviconeUrl, getDefaultFavicon, isChromeAvailable } from "@/lib/favicon";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecentlyClosed } from "@/hooks/useRecentlyClosed";
import type { ClosedTab } from "@/hooks/useRecentlyClosed";
import { useMostVisited } from "@/hooks/useMostVisited";
import type { AppSettings } from "@/types";

function FaviconImage({ url }: { url: string }) {
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

interface TabCardProps {
  title: string;
  url: string;
  isElevated: boolean;
  onClick: () => void;
}

function TabCard({ title, url, isElevated, onClick }: TabCardProps) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-150 h-16 py-0 gap-0 rounded-lg border-border/40",
        isElevated
          ? "shadow border-transparent hover:bg-accent"
          : "shadow-none hover:bg-accent"
      )}
    >
      <CardContent className="flex items-center gap-3 p-3 h-full">
        {url ? (
          <FaviconImage url={url} />
        ) : (
          <span className="flex-shrink-0 w-8 h-8 xl:w-6 xl:h-6 flex items-center justify-center text-muted-foreground">
            <ExternalLink size={16} />
          </span>
        )}
        <div className="flex flex-col justify-center min-w-0 flex-1 gap-0.5">
          <span className="text-sm font-medium truncate leading-tight">{title || url}</span>
          {url && (
            <span className="text-xs text-muted-foreground truncate leading-tight">{url}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function openUrl(url: string, openInNewTab: boolean): void {
  if (!url) return;
  if (openInNewTab) {
    window.open(url, "_blank", "noopener,noreferrer");
  } else if (isChromeAvailable && chrome.tabs) {
    chrome.tabs.update({ url });
  } else {
    window.location.href = url;
  }
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
      {children}
    </h3>
  );
}

interface RecentlyClosedSectionProps {
  settings: AppSettings;
}

export function RecentlyClosedSection({ settings }: RecentlyClosedSectionProps) {
  const { t } = useTranslation();
  const { closedTabs, restore } = useRecentlyClosed(settings.recentlyClosedCount);

  const isElevated =
    settings.preset === "custom" &&
    settings.customTheme.surfaceStyle === "elevated";

  const handleRestore = (item: ClosedTab) => {
    if (item.url) {
      openUrl(item.url, settings.openInNewTab);
    } else {
      restore(item);
    }
  };

  if (closedTabs.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {closedTabs.map((item, i) => (
          <TabCard
            key={i}
            title={
              item.isWindow
                ? t("sidebar.closedWindow", { count: item.tabCount ?? 0 })
                : item.title
            }
            url={item.isWindow ? "" : item.url}
            isElevated={isElevated}
            onClick={() => handleRestore(item)}
          />
        ))}
      </div>
    </div>
  );
}

interface MostVisitedSectionProps {
  settings: AppSettings;
}

export function MostVisitedSection({ settings }: MostVisitedSectionProps) {
  const { t } = useTranslation();
  const { sites } = useMostVisited(settings.mostVisitedCount);

  const isElevated =
    settings.preset === "custom" &&
    settings.customTheme.surfaceStyle === "elevated";

  if (sites.length === 0) return null;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {sites.map((site, i) => (
          <TabCard
            key={i}
            title={site.title || site.url}
            url={site.url}
            isElevated={isElevated}
            onClick={() => openUrl(site.url, settings.openInNewTab)}
          />
        ))}
      </div>
    </div>
  );
}
