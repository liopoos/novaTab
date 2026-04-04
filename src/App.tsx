import "./styles/globals.css";
import "@/i18n";
import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { Bookmark, Clock, Folder, PanelLeft, Star, TrendingUp } from "lucide-react";
import novaIconRaw from "@/assets/nova-icon.svg?raw";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { BookmarkTree } from "@/components/BookmarkTree";
import type { BookmarkTreeHandle } from "@/components/BookmarkTree";
import { SearchBar } from "@/components/SearchBar";
import { BreadcrumbNav } from "@/components/BreadcrumbNav";
import { BookmarkGrid } from "@/components/BookmarkGrid";
import { BookmarkCheckerDialog } from "@/components/BookmarkCheckerDialog";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import type { ShortcutsDialogHandle } from "@/components/ShortcutsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarBrowserButtons } from "@/components/SidebarBrowserButtons";
import { RecentlyClosedSection, MostVisitedSection } from "@/components/ExtraBookmarkSections";
import { useBookmarks } from "@/hooks/useBookmarks";
import { applyCustomTheme } from "@/hooks/useTheme";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { usePinnedFolders } from "@/hooks/usePinnedFolders";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SettingsProvider, useSettingsContext } from "@/contexts/SettingsContext";
import type { AppSettings, BookmarkNode } from "@/types";

type ActiveView = "bookmarks" | "recentlyClosed" | "mostVisited";

const ACTIVE_VIEW_KEY = "nova-active-view";

function readActiveView(): ActiveView {
  try {
    const v = localStorage.getItem(ACTIVE_VIEW_KEY);
    if (v === "recentlyClosed" || v === "mostVisited") return v;
  } catch {}
  return "bookmarks";
}

function writeActiveView(view: ActiveView): void {
  try {
    localStorage.setItem(ACTIVE_VIEW_KEY, view);
  } catch {}
}

function NovaPlanetIcon({
  size = 16,
  className,
  color,
}: {
  size?: number;
  className?: string;
  color: string;
}) {
  const svgMarkup = novaIconRaw.replace('stroke="black"', `stroke="${color}"`);
  const svgSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;

  return (
    <img
      src={svgSrc}
      alt=""
      aria-hidden="true"
      className={cn("inline-block", className)}
      style={{
        width: size,
        height: size,
      }}
    />
  );
}

function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement;
  return t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable;
}

interface VirtualFolderGridProps {
  showRecentlyClosed: boolean;
  showMostVisited: boolean;
  subfolders: ReturnType<typeof useBookmarks>["subfolders"];
  onFolderSelect: (id: string | null) => void;
  onViewSelect: (view: ActiveView) => void;
  pinnedIds: string[];
  settings: AppSettings;
}

function VirtualFolderGrid({
  showRecentlyClosed,
  showMostVisited,
  subfolders,
  onFolderSelect,
  onViewSelect,
  pinnedIds,
  settings,
}: VirtualFolderGridProps) {
  const { t } = useTranslation();
  const isElevated =
    settings.preset === "custom" &&
    settings.customTheme.surfaceStyle === "elevated";

  const hasVirtual = showRecentlyClosed || showMostVisited;
  const hasFolders = subfolders.length > 0;

  if (!hasVirtual && !hasFolders) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("folder.subfolders")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {showRecentlyClosed && (
          <button
            onClick={() => onViewSelect("recentlyClosed")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg h-20",
              isElevated
                ? "shadow border-transparent bg-card hover:bg-accent"
                : "border border-border/40 bg-card hover:bg-accent hover:border-accent-foreground/20",
              "transition-colors duration-150 cursor-pointer"
            )}
          >
            <Clock size={28} className="text-primary/60 flex-shrink-0" />
            <span className="text-xs text-center leading-tight truncate w-full">
              {t("sidebar.recentlyClosed")}
            </span>
          </button>
        )}
        {showMostVisited && (
          <button
            onClick={() => onViewSelect("mostVisited")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg h-20",
              isElevated
                ? "shadow border-transparent bg-card hover:bg-accent"
                : "border border-border/40 bg-card hover:bg-accent hover:border-accent-foreground/20",
              "transition-colors duration-150 cursor-pointer"
            )}
          >
            <TrendingUp size={28} className="text-primary/60 flex-shrink-0" />
            <span className="text-xs text-center leading-tight truncate w-full">
              {t("sidebar.mostVisited")}
            </span>
          </button>
        )}
        {subfolders.map((folder) => {
          const pinned = pinnedIds.includes(folder.id);
          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 p-3 rounded-lg h-20",
                isElevated
                  ? "shadow border-transparent bg-card hover:bg-accent"
                  : "border border-border/40 bg-card hover:bg-accent hover:border-accent-foreground/20",
                "transition-colors duration-150 cursor-pointer"
              )}
            >
              {pinned && (
                <Star
                  size={12}
                  className="absolute top-1.5 right-1.5 fill-yellow-400 text-yellow-400"
                />
              )}
              <Folder size={28} className="text-primary/60 flex-shrink-0" />
              <span className="text-xs text-center leading-tight truncate w-full">
                {folder.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SidebarContentProps {
  roots: ReturnType<typeof useBookmarks>["roots"];
  selectedFolderId: string | null;
  setSelectedFolder: (id: string | null) => void;
  pinnedFolders: ReturnType<typeof usePinnedFolders>["pinnedFolders"];
  pinnedIds: string[];
  pin: (id: string) => void;
  unpin: (id: string) => void;
  reorder: (activeId: string, overId: string) => void;
  clearAll: () => void;
  treeRef: React.RefObject<BookmarkTreeHandle>;
  shortcutsRef: React.RefObject<ShortcutsDialogHandle>;
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  showRecentlyClosed: boolean;
  showMostVisited: boolean;
  bookmarks: BookmarkNode[];
  onClose?: () => void;
  onBookmarksReload: () => Promise<void>;
}

function SidebarContent({
  roots,
  selectedFolderId,
  setSelectedFolder,
  pinnedFolders,
  pinnedIds,
  pin,
  unpin,
  reorder,
  clearAll,
  treeRef,
  shortcutsRef,
  activeView,
  setActiveView,
  showRecentlyClosed,
  showMostVisited,
  bookmarks,
  onClose,
  onBookmarksReload,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeContext();
  const logoColor = resolvedTheme === "dark" ? "#E5E5E5" : "#222222";

  const handleFolderSelect = (id: string | null) => {
    setSelectedFolder(id);
    setActiveView("bookmarks");
    onClose?.();
  };

  const handleNavSelect = (view: ActiveView) => {
    setActiveView(view);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar overflow-hidden">
      <div className="flex h-14 shrink-0 items-center gap-1.5 px-4 border-b border-border">
        <NovaPlanetIcon size={15} color={logoColor} className="shrink-0" />
        <span className="font-semibold text-base text-sidebar-foreground tracking-tight">
          {t("sidebar.title")}
        </span>
      </div>

      <div className="px-2 pt-2 space-y-0.5">
        <button
          onClick={() => handleFolderSelect(null)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
            activeView === "bookmarks" && selectedFolderId === null
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Bookmark size={14} className="shrink-0 text-sidebar-foreground/70" />
          <span className="truncate">{t("sidebar.allBookmarks")}</span>
        </button>
        {showRecentlyClosed && (
          <button
            onClick={() => handleNavSelect("recentlyClosed")}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
              activeView === "recentlyClosed"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <Clock size={14} className="shrink-0 text-sidebar-foreground/70" />
            <span className="truncate">{t("sidebar.recentlyClosed")}</span>
          </button>
        )}
        {showMostVisited && (
          <button
            onClick={() => handleNavSelect("mostVisited")}
            className={cn(
              "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
              activeView === "mostVisited"
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <TrendingUp size={14} className="shrink-0 text-sidebar-foreground/70" />
            <span className="truncate">{t("sidebar.mostVisited")}</span>
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0 px-2 py-2">
        <BookmarkTree
          ref={treeRef}
          roots={roots}
          selectedFolderId={activeView === "bookmarks" ? selectedFolderId : null}
          onFolderSelect={handleFolderSelect}
          pinnedFolders={pinnedFolders}
          onReorderPinned={reorder}
          pinnedIds={pinnedIds}
          onPin={pin}
          onUnpin={unpin}
        />
      </ScrollArea>

      <Separator />

      <div className="flex items-center px-2 py-1.5 gap-1">
        <SidebarBrowserButtons />
        <Separator orientation="vertical" className="mx-1 h-5" />
        <div className="flex items-center gap-0.5 ml-auto">
          <BookmarkCheckerDialog bookmarks={bookmarks} onDeleteDone={onBookmarksReload} />
          <ThemeToggle />
          <ShortcutsDialog ref={shortcutsRef} />
          <SettingsDialog onClearAllPins={clearAll} />
        </div>
      </div>
    </div>
  );
}

interface AppContentProps {
  isSidePanel?: boolean;
}

function AppContent({ isSidePanel = false }: AppContentProps) {
  const { t } = useTranslation();
  const { settings } = useSettingsContext();
  const { resolvedTheme, preset } = useThemeContext();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeView, setActiveViewState] = useState<ActiveView>(() => readActiveView());

  const setActiveView = useCallback((view: ActiveView) => {
    setActiveViewState(view);
    writeActiveView(view);
  }, []);
  const sidebarStyle = settings.sidebarStyle ?? "style1";

  useEffect(() => {
    if (preset === "custom" && settings.customTheme) {
      applyCustomTheme(settings.customTheme, resolvedTheme === "dark");
    }
  }, [preset, resolvedTheme, settings.customTheme]);

  useEffect(() => {
    if (activeView === "recentlyClosed" && !settings.showRecentlyClosed) {
      setActiveView("bookmarks");
    }
    if (activeView === "mostVisited" && !settings.showMostVisited) {
      setActiveView("bookmarks");
    }
  }, [settings.showRecentlyClosed, settings.showMostVisited, activeView, setActiveView]);

  const {
    roots,
    selectedFolderId,
    selectedFolder,
    breadcrumb,
    subfolders,
    bookmarks,
    searchQuery,
    loading,
    setSelectedFolder,
    setSearchQuery,
    reloadBookmarks,
  } = useBookmarks();

  const { pinnedIds, pinnedFolders, pin, unpin, togglePin, reorder, clearAll } = usePinnedFolders(roots);

  const treeRef = useRef<BookmarkTreeHandle>(null);
  const shortcutsRef = useRef<ShortcutsDialogHandle>(null);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      // Preserve browser/system shortcuts such as Cmd+R / Ctrl+R.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "[":
          e.preventDefault();
          treeRef.current?.collapseAll();
          break;
        case "]":
          e.preventDefault();
          treeRef.current?.expandAll();
          break;
        case "h":
        case "H":
        case "Home":
          e.preventDefault();
          setSelectedFolder(null);
          setActiveView("bookmarks");
          break;
        case "r":
        case "R":
          e.preventDefault();
          if (settings.showRecentlyClosed) setActiveView("recentlyClosed");
          break;
        case "m":
        case "M":
          e.preventDefault();
          if (settings.showMostVisited) setActiveView("mostVisited");
          break;
        case "p":
        case "P":
          e.preventDefault();
          if (selectedFolderId) togglePin(selectedFolderId);
          break;
        case "?":
          e.preventDefault();
          shortcutsRef.current?.open();
          break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setSelectedFolder, selectedFolderId, togglePin, setActiveView, settings.showRecentlyClosed, settings.showMostVisited]);

  const sidebarProps: SidebarContentProps = {
    roots,
    selectedFolderId,
    setSelectedFolder,
    pinnedFolders,
    pinnedIds,
    pin,
    unpin,
    reorder,
    clearAll,
    treeRef,
    shortcutsRef,
    activeView,
    setActiveView,
    showRecentlyClosed: settings.showRecentlyClosed,
    showMostVisited: settings.showMostVisited,
    bookmarks,
    onBookmarksReload: reloadBookmarks,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      {!isSidePanel && (
        <aside
          className={cn(
            "hidden md:flex flex-col w-60 shrink-0 overflow-hidden",
            sidebarStyle === "style1" && "border-r border-border",
            sidebarStyle === "style2" && "p-2",
            sidebarStyle === "style3" && "border-r border-border",
          )}
        >
          <div
            className={cn(
              "flex flex-col h-full overflow-hidden",
              sidebarStyle === "style2" && "rounded-lg border border-border shadow-lg bg-sidebar",
            )}
          >
            <SidebarContent {...sidebarProps} />
          </div>
        </aside>
      )}

      {!isSidePanel && (
        <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="p-0 w-72 bg-sidebar border-r border-border gap-0"
            aria-describedby={undefined}
          >
            <SidebarContent {...sidebarProps} onClose={closeMobileSidebar} />
          </SheetContent>
        </Sheet>
      )}

      <main
        className={cn(
          "flex flex-col flex-1 overflow-hidden",
          sidebarStyle === "style3" && !isSidePanel && "p-2",
        )}
      >
        <div
          className={cn(
            "flex flex-col flex-1 overflow-hidden",
            sidebarStyle === "style3" && !isSidePanel && "rounded-lg border border-border shadow-lg bg-background overflow-hidden",
          )}
        >
          <div className="flex h-14 shrink-0 items-center border-b border-border px-4 gap-2">
            {!isSidePanel && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:hidden shrink-0"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label={t("sidebar.openSidebar")}
              >
                <PanelLeft size={16} />
              </Button>
            )}

            <SearchBar
              searchQuery={searchQuery}
              onSearch={(q) => { setSearchQuery(q); if (q) setActiveView("bookmarks"); }}
              selectedFolderId={selectedFolderId}
            />
          </div>

          <div className="px-6 py-4.5">
            <BreadcrumbNav
              breadcrumb={breadcrumb}
              selectedFolderId={selectedFolderId}
              selectedFolderTitle={selectedFolder?.title}
              onFolderSelect={setSelectedFolder}
              activeView={activeView}
              onGoHome={() => { setSelectedFolder(null); setActiveView("bookmarks"); }}
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 pb-5 space-y-6">
              {activeView === "recentlyClosed" && settings.showRecentlyClosed && (
                <RecentlyClosedSection settings={settings} />
              )}

              {activeView === "mostVisited" && settings.showMostVisited && (
                <MostVisitedSection settings={settings} />
              )}

              {activeView === "bookmarks" && (
                <>
                  {!searchQuery && (
                    <VirtualFolderGrid
                      showRecentlyClosed={selectedFolderId === null && settings.showRecentlyClosed}
                      showMostVisited={selectedFolderId === null && settings.showMostVisited}
                      subfolders={subfolders}
                      onFolderSelect={setSelectedFolder}
                      onViewSelect={setActiveView}
                      pinnedIds={pinnedIds}
                      settings={settings}
                    />
                  )}

                  <div>
                    {subfolders.length > 0 && !searchQuery && bookmarks.length > 0 && (
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        {t("bookmarks.title")}
                      </h3>
                    )}
                    <BookmarkGrid
                      bookmarks={bookmarks}
                      settings={settings}
                      loading={loading}
                      hasFolders={!searchQuery && subfolders.length > 0}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </main>
    </div>
  );
}

export default function App({ isSidePanel = false }: { isSidePanel?: boolean }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <TooltipProvider>
        <ThemeProvider>
          <SettingsProvider>
            <AppContent isSidePanel={isSidePanel} />
          </SettingsProvider>
        </ThemeProvider>
      </TooltipProvider>
    </Suspense>
  );
}
