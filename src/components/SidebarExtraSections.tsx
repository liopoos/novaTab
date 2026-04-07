import { useState } from "react";
import { Clock, TrendingUp, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";
import { useRecentlyClosed } from "@/hooks/useRecentlyClosed";
import type { ClosedTab } from "@/hooks/useRecentlyClosed";
import { useMostVisited } from "@/hooks/useMostVisited";
import type { MostVisitedSite } from "@/hooks/useMostVisited";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { getFaviconUrl, isChromeAvailable } from "@/lib/favicon";

function openUrl(url: string): void {
  if (isChromeAvailable && chrome.tabs) {
    chrome.tabs.update({ url });
  } else {
    window.location.href = url;
  }
}

interface SectionHeaderProps {
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function SectionHeader({ label, icon, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50 select-none"
    >
      <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </span>
      <span className="flex-shrink-0 text-sidebar-foreground/70">{icon}</span>
      <span className="truncate font-medium">{label}</span>
    </button>
  );
}

interface TabItemProps {
  title: string;
  url: string;
  onClick: () => void;
}

function TabItem({ title, url, onClick }: TabItemProps) {
  const displayTitle = title || url;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="flex items-center gap-1.5 py-1 rounded-md cursor-pointer select-none text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
      style={{ paddingLeft: "28px", paddingRight: "8px" }}
      title={url}
    >
      {url ? (
        <img
          src={getFaviconUrl(url)}
          alt=""
          className="flex-shrink-0 w-3.5 h-3.5"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <ExternalLink size={12} className="flex-shrink-0 text-sidebar-foreground/50" />
      )}
      <span className="truncate flex-1">{displayTitle}</span>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p
      className="text-xs text-muted-foreground py-1"
      style={{ paddingLeft: "28px" }}
    >
      {text}
    </p>
  );
}

export function RecentlyClosedSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSettingsContext();
  const { closedTabs, restore } = useRecentlyClosed(settings.recentlyClosedCount);

  return (
    <div>
      <SectionHeader
        label={t("sidebar.recentlyClosed")}
        icon={<Clock size={14} />}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {closedTabs.length === 0 ? (
            <EmptyHint text={t("sidebar.noRecentlyClosed")} />
          ) : (
            closedTabs.map((item, i) => (
              <ClosedItem key={i} item={item} onRestore={restore} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ClosedItemProps {
  item: ClosedTab;
  onRestore: (item: ClosedTab) => void;
}

function ClosedItem({ item, onRestore }: ClosedItemProps) {
  const { t } = useTranslation();

  if (item.isWindow) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onRestore(item)}
        onKeyDown={(e) => e.key === "Enter" && onRestore(item)}
        className="flex items-center gap-1.5 py-1 rounded-md cursor-pointer select-none text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
        style={{ paddingLeft: "28px", paddingRight: "8px" }}
      >
        <ExternalLink size={12} className="flex-shrink-0 text-sidebar-foreground/50" />
        <span className="truncate flex-1">
          {t("sidebar.closedWindow", { count: item.tabCount ?? 0 })}
        </span>
      </div>
    );
  }

  return (
    <TabItem
      title={item.title}
      url={item.url}
      onClick={() => onRestore(item)}
    />
  );
}

export function MostVisitedSection() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSettingsContext();
  const { sites } = useMostVisited(settings.mostVisitedCount);

  return (
    <div>
      <SectionHeader
        label={t("sidebar.mostVisited")}
        icon={<TrendingUp size={14} />}
        isOpen={isOpen}
        onToggle={() => setIsOpen((v) => !v)}
      />
      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {sites.length === 0 ? (
            <EmptyHint text={t("sidebar.noMostVisited")} />
          ) : (
            sites.map((site, i) => (
              <MostVisitedItem key={i} site={site} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface MostVisitedItemProps {
  site: MostVisitedSite;
}

function MostVisitedItem({ site }: MostVisitedItemProps) {
  return (
    <TabItem
      title={site.title || site.url}
      url={site.url}
      onClick={() => openUrl(site.url)}
    />
  );
}

export function SidebarExtraSections() {
  return (
    <>
      <Separator className="my-2" />
      <div className="space-y-0.5">
        <RecentlyClosedSection />
        <MostVisitedSection />
      </div>
    </>
  );
}
