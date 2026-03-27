import { useTranslation } from "react-i18next";
import { BookmarkCard } from "./BookmarkCard";
import type { BookmarkNode } from "@/types";
import type { AppSettings } from "@/types";
import { Bookmark } from "lucide-react";

interface BookmarkGridProps {
  bookmarks: BookmarkNode[];
  settings: AppSettings;
  loading?: boolean;
  hasFolders?: boolean;
}

export function BookmarkGrid({ bookmarks, settings, loading, hasFolders }: BookmarkGridProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (bookmarks.length === 0 && !hasFolders) {
    return (
      <div className="flex w-full min-h-[50vh] flex-col items-center justify-center text-muted-foreground">
        <Bookmark size={40} className="mb-3 opacity-30" />
        <p className="text-sm">{t("bookmarks.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {bookmarks.map((node) => (
        <BookmarkCard key={node.id} node={node} settings={settings} />
      ))}
    </div>
  );
}
