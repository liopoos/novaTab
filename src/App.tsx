import "./styles/globals.css";
import "@/i18n";
import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { PanelLeft } from "lucide-react";
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
import { FolderGrid } from "@/components/FolderGrid";
import { BookmarkGrid } from "@/components/BookmarkGrid";
import { SettingsDialog } from "@/components/SettingsDialog";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";
import type { ShortcutsDialogHandle } from "@/components/ShortcutsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarBrowserButtons } from "@/components/SidebarBrowserButtons";
import { useBookmarks } from "@/hooks/useBookmarks";
import { applyCustomTheme } from "@/hooks/useTheme";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { usePinnedFolders } from "@/hooks/usePinnedFolders";
import { useTranslation } from "react-i18next";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsProvider, useSettingsContext } from "@/contexts/SettingsContext";

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
  onClose?: () => void;
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
  onClose,
}: SidebarContentProps) {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeContext();
  const logoColor = resolvedTheme === "dark" ? "#E5E5E5" : "#222222";

  const handleFolderSelect = (id: string | null) => {
    setSelectedFolder(id);
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

      <div className="px-2 pt-2">
        <button
          onClick={() => handleFolderSelect(null)}
          className={cn(
            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
            selectedFolderId === null
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          )}
        >
          <Bookmark size={14} className="shrink-0 text-sidebar-foreground/70" />
          <span className="truncate">{t("sidebar.allBookmarks")}</span>
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0 px-2 py-2">
        <BookmarkTree
          ref={treeRef}
          roots={roots}
          selectedFolderId={selectedFolderId}
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
  const sidebarStyle = settings.sidebarStyle ?? "style1";

  useEffect(() => {
    if (preset === "custom" && settings.customTheme) {
      applyCustomTheme(settings.customTheme, resolvedTheme === "dark");
    }
  }, [preset, resolvedTheme, settings.customTheme]);

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
  } = useBookmarks();

  const { pinnedIds, pinnedFolders, pin, unpin, togglePin, reorder, clearAll } = usePinnedFolders(roots);

  const treeRef = useRef<BookmarkTreeHandle>(null);
  const shortcutsRef = useRef<ShortcutsDialogHandle>(null);

  const closeMobileSidebar = useCallback(() => setMobileSidebarOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;

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
  }, [setSelectedFolder, selectedFolderId, togglePin]);

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
              onSearch={setSearchQuery}
              selectedFolderId={selectedFolderId}
            />
          </div>

          <div className="px-6 py-4.5">
            <BreadcrumbNav
              breadcrumb={breadcrumb}
              selectedFolderId={selectedFolderId}
              selectedFolderTitle={selectedFolder?.title}
              onFolderSelect={setSelectedFolder}
            />
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 pb-5 space-y-6">
              {!searchQuery && subfolders.length > 0 && (
                <FolderGrid
                  folders={subfolders}
                  onFolderSelect={setSelectedFolder}
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
