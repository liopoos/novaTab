import { useState, useEffect, useCallback } from "react";
import type { BookmarkNode, BreadcrumbItem } from "@/types";
import {
  fetchBookmarks,
  findNodeById,
  getAncestors,
  searchInFolder,
  getDirectLinks,
  getDirectFolders,
} from "@/lib/bookmarks";
import { MOCK_BOOKMARKS } from "@/lib/mock-bookmarks";
import { isChromeAvailable } from "@/lib/favicon";

const LAST_FOLDER_KEY = "nova-last-folder";
const SETTINGS_KEY = "nova-settings";

function readRememberLastFolderFromCache(): boolean {
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return false;
  }

  if (!raw) return false;

  try {
    const settings = JSON.parse(raw) as { rememberLastFolder?: boolean };
    return settings.rememberLastFolder === true;
  } catch {
    return false;
  }
}

function readLastFolderIdFromCache(): string | null {
  try {
    return localStorage.getItem(LAST_FOLDER_KEY);
  } catch {
    return null;
  }
}

function readLastFolderIdIfEnabledSync(): string | null {
  if (!readRememberLastFolderFromCache()) return null;
  return readLastFolderIdFromCache();
}

async function readLastFolderIdIfEnabled(): Promise<string | null> {
  let rememberEnabled = false;
  let lastFolderId: string | null = null;

  if (typeof chrome !== "undefined" && chrome.storage?.local && chrome.storage?.sync) {
    const [localResult, syncResult] = await Promise.all([
      new Promise<Record<string, unknown>>((resolve) =>
        chrome.storage.local.get(LAST_FOLDER_KEY, resolve)
      ),
      new Promise<Record<string, unknown>>((resolve) =>
        chrome.storage.sync.get(SETTINGS_KEY, resolve)
      ),
    ]);
    const settings = syncResult[SETTINGS_KEY];
    if (settings && typeof settings === "object") {
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      } catch {
        // Ignore cache write failures.
      }
    }
    const typedSettings = settings as { rememberLastFolder?: boolean } | undefined;
    rememberEnabled = typedSettings?.rememberLastFolder === true;
    lastFolderId = (localResult[LAST_FOLDER_KEY] as string | undefined) ?? null;

    try {
      if (lastFolderId === null) {
        localStorage.removeItem(LAST_FOLDER_KEY);
      } else {
        localStorage.setItem(LAST_FOLDER_KEY, lastFolderId);
      }
    } catch {
      // Ignore cache write failures.
    }
  } else {
    rememberEnabled = readRememberLastFolderFromCache();
    lastFolderId = readLastFolderIdFromCache();
  }

  return rememberEnabled ? lastFolderId : null;
}

async function writeLastFolderId(id: string | null): Promise<void> {
  try {
    if (id === null) {
      localStorage.removeItem(LAST_FOLDER_KEY);
    } else {
      localStorage.setItem(LAST_FOLDER_KEY, id);
    }
  } catch {
    // Ignore cache write failures.
  }

  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    if (id === null) {
      chrome.storage.local.remove(LAST_FOLDER_KEY);
    } else {
      chrome.storage.local.set({ [LAST_FOLDER_KEY]: id });
    }
  }
}

interface UseBookmarksReturn {
  roots: BookmarkNode[];
  selectedFolderId: string | null;
  selectedFolder: BookmarkNode | null;
  breadcrumb: BreadcrumbItem[];
  subfolders: BookmarkNode[];
  bookmarks: BookmarkNode[];
  searchQuery: string;
  loading: boolean;
  error: string | null;
  setSelectedFolder: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  reloadBookmarks: () => Promise<void>;
}

export function useBookmarks(): UseBookmarksReturn {
  const [roots, setRoots] = useState<BookmarkNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(() =>
    readLastFolderIdIfEnabledSync()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      const [data, lastFolderId] = await Promise.all([
        isChromeAvailable ? fetchBookmarks() : Promise.resolve(MOCK_BOOKMARKS),
        readLastFolderIdIfEnabled(),
      ]);
      setRoots(data);
      const resolvedFolderId =
        lastFolderId && findNodeById(data, lastFolderId) ? lastFolderId : null;
      setSelectedFolderId(resolvedFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bookmarks");
      setRoots(MOCK_BOOKMARKS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const setSelectedFolder = useCallback((id: string | null) => {
    setSelectedFolderId(id);
    setSearchQuery("");
    writeLastFolderId(id);
  }, []);

  const selectedFolder = selectedFolderId
    ? findNodeById(roots, selectedFolderId)
    : null;

  const breadcrumb: BreadcrumbItem[] = selectedFolderId
    ? getAncestors(roots, selectedFolderId)
    : [];

  const subfolders: BookmarkNode[] = searchQuery
    ? []
    : selectedFolder
      ? getDirectFolders(selectedFolder)
      : roots.filter((n) => n.type === "folder");

  const bookmarks: BookmarkNode[] = (() => {
    if (searchQuery && selectedFolder) {
      return searchInFolder(selectedFolder, searchQuery);
    }
    if (searchQuery && !selectedFolder) {
      const allResults: BookmarkNode[] = [];
      for (const root of roots) {
        allResults.push(...searchInFolder(root, searchQuery));
      }
      return allResults;
    }
    if (selectedFolder) {
      return getDirectLinks(selectedFolder);
    }
    return roots.flatMap((r) => getDirectLinks(r));
  })();

  return {
    roots,
    selectedFolderId,
    selectedFolder,
    breadcrumb,
    subfolders,
    bookmarks,
    searchQuery,
    loading,
    error,
    setSelectedFolder,
    setSearchQuery,
    reloadBookmarks: loadBookmarks,
  };
}
