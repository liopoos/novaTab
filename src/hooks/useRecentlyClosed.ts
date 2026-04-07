import { useState, useEffect, useCallback } from "react";
import { isChromeAvailable } from "@/lib/favicon";
import { DEFAULT_SETTINGS } from "@/types";
import type { ExtraSectionCount } from "@/types";

export interface ClosedTab {
  title: string;
  url: string;
  sessionId: string | undefined;
  isWindow: boolean;
  tabCount?: number;
}

interface UseRecentlyClosedReturn {
  closedTabs: ClosedTab[];
  loading: boolean;
  restore: (item: ClosedTab) => void;
  refresh: () => void;
}

function fetchClosed(maxResults: ExtraSectionCount): Promise<ClosedTab[]> {
  return new Promise((resolve) => {
    if (!isChromeAvailable || !chrome.sessions) {
      resolve([]);
      return;
    }
    chrome.sessions.getRecentlyClosed({ maxResults }, (sessions) => {
      if (chrome.runtime.lastError) {
        resolve([]);
        return;
      }
      const nodes: ClosedTab[] = [];
      for (const session of sessions) {
        if (session.window && session.window.tabs && session.window.tabs.length === 1) {
          const tab = session.window.tabs[0];
          nodes.push({
            title: tab.title ?? tab.url ?? "",
            url: tab.url ?? "",
            sessionId: session.window.sessionId,
            isWindow: false,
          });
        } else if (session.window && session.window.tabs) {
          nodes.push({
            title: "",
            url: "",
            sessionId: session.window.sessionId,
            isWindow: true,
            tabCount: session.window.tabs.length,
          });
        } else if (session.tab) {
          nodes.push({
            title: session.tab.title ?? session.tab.url ?? "",
            url: session.tab.url ?? "",
            sessionId: session.tab.sessionId,
            isWindow: false,
          });
        }
      }
      resolve(nodes.slice(0, maxResults));
    });
  });
}

export function useRecentlyClosed(
  limit: ExtraSectionCount = DEFAULT_SETTINGS.recentlyClosedCount
): UseRecentlyClosedReturn {
  const [closedTabs, setClosedTabs] = useState<ClosedTab[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchClosed(limit)
      .then(setClosedTabs)
      .finally(() => setLoading(false));
  }, [limit]);

  useEffect(() => {
    refresh();

    if (!isChromeAvailable || !chrome.sessions?.onChanged) return;
    chrome.sessions.onChanged.addListener(refresh);
    return () => {
      chrome.sessions.onChanged.removeListener(refresh);
    };
  }, [refresh]);

  const restore = useCallback((item: ClosedTab) => {
    if (!isChromeAvailable || !chrome.sessions || !item.sessionId) return;
    chrome.sessions.restore(item.sessionId, () => {
      setTimeout(refresh, 300);
    });
  }, [refresh]);

  return { closedTabs, loading, restore, refresh };
}
