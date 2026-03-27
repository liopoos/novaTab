import { useState, useEffect, useCallback } from "react";
import type { BookmarkNode } from "@/types";
import { findNodeById } from "@/lib/bookmarks";

const PINNED_KEY = "nova-pinned-folders";

function isChromeLocalAvailable(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.local !== "undefined"
  );
}

async function readPinnedIds(): Promise<string[]> {
  if (isChromeLocalAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.get(PINNED_KEY, (result) => {
        const stored = result[PINNED_KEY];
        resolve(Array.isArray(stored) ? (stored as string[]) : []);
      });
    });
  }
  const raw = localStorage.getItem(PINNED_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function writePinnedIds(ids: string[]): Promise<void> {
  if (isChromeLocalAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [PINNED_KEY]: ids }, resolve);
    });
  }
  localStorage.setItem(PINNED_KEY, JSON.stringify(ids));
}

interface UsePinnedFoldersReturn {
  pinnedIds: string[];
  pinnedFolders: BookmarkNode[];
  pin: (id: string) => void;
  unpin: (id: string) => void;
  togglePin: (id: string) => void;
  reorder: (activeId: string, overId: string) => void;
  clearAll: () => void;
  isPinned: (id: string) => boolean;
}

export function usePinnedFolders(roots: BookmarkNode[]): UsePinnedFoldersReturn {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    readPinnedIds().then(setPinnedIds);
  }, []);

  const pin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      writePinnedIds(next);
      return next;
    });
  }, []);

  const unpin = useCallback((id: string) => {
    setPinnedIds((prev) => {
      const next = prev.filter((x) => x !== id);
      writePinnedIds(next);
      return next;
    });
  }, []);

  const togglePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        writePinnedIds(next);
        return next;
      });
    },
    []
  );

  const clearAll = useCallback(() => {
    setPinnedIds([]);
    writePinnedIds([]);
  }, []);

  const reorder = useCallback((activeId: string, overId: string) => {
    setPinnedIds((prev) => {
      const oldIndex = prev.indexOf(activeId);
      const newIndex = prev.indexOf(overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      const next = [...prev];
      next.splice(oldIndex, 1);
      next.splice(newIndex, 0, activeId);
      writePinnedIds(next);
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (id: string) => pinnedIds.includes(id),
    [pinnedIds]
  );

  const pinnedFolders: BookmarkNode[] = pinnedIds
    .map((id) => findNodeById(roots, id))
    .filter((node): node is BookmarkNode => node !== null && node.type === "folder");

  return { pinnedIds, pinnedFolders, pin, unpin, togglePin, reorder, clearAll, isPinned };
}
