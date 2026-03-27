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
    const settings = syncResult[SETTINGS_KEY] as { rememberLastFolder?: boolean } | undefined;
    rememberEnabled = settings?.rememberLastFolder === true;
    lastFolderId = (localResult[LAST_FOLDER_KEY] as string | undefined) ?? null;
  } else {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        const settings = JSON.parse(raw) as { rememberLastFolder?: boolean };
        rememberEnabled = settings.rememberLastFolder === true;
      } catch {
        rememberEnabled = false;
      }
    }
    lastFolderId = localStorage.getItem(LAST_FOLDER_KEY);
  }

  return rememberEnabled ? lastFolderId : null;
}

async function writeLastFolderId(id: string | null): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    if (id === null) {
      chrome.storage.local.remove(LAST_FOLDER_KEY);
    } else {
      chrome.storage.local.set({ [LAST_FOLDER_KEY]: id });
    }
    return;
  }
  if (id === null) {
    localStorage.removeItem(LAST_FOLDER_KEY);
  } else {
    localStorage.setItem(LAST_FOLDER_KEY, id);
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
}

export function useBookmarks(): UseBookmarksReturn {
  const [roots, setRoots] = useState<BookmarkNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [data, lastFolderId] = await Promise.all([
          isChromeAvailable ? fetchBookmarks() : Promise.resolve(MOCK_BOOKMARKS),
          readLastFolderIdIfEnabled(),
        ]);
        setRoots(data);
        if (lastFolderId) {
          const cachedFolderStillExists = findNodeById(data, lastFolderId);
          if (cachedFolderStillExists) {
            setSelectedFolderId(lastFolderId);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load bookmarks");
        setRoots(MOCK_BOOKMARKS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
  };
}
