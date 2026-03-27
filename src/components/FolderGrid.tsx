import { Folder, Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { BookmarkNode, AppSettings } from "@/types";

interface FolderGridProps {
  folders: BookmarkNode[];
  onFolderSelect: (id: string | null) => void;
  pinnedIds?: string[];
  settings: AppSettings;
}

export function FolderGrid({
  folders,
  onFolderSelect,
  pinnedIds = [],
  settings,
}: FolderGridProps) {
  const { t } = useTranslation();
  const isElevated =
    settings.preset === "custom" &&
    settings.customTheme.surfaceStyle === "elevated";

  if (folders.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {t("folder.subfolders")}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {folders.map((folder) => {
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
