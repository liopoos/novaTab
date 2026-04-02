import { useState, useEffect, useCallback } from "react";
import { isChromeAvailable } from "@/lib/favicon";

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

const MAX_RESULTS = 10;

function fetchClosed(): Promise<ClosedTab[]> {
  return new Promise((resolve) => {
    if (!isChromeAvailable || !chrome.sessions) {
      resolve([]);
      return;
    }
    chrome.sessions.getRecentlyClosed({ maxResults: MAX_RESULTS }, (sessions) => {
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
      resolve(nodes.slice(0, MAX_RESULTS));
    });
  });
}

export function useRecentlyClosed(): UseRecentlyClosedReturn {
  const [closedTabs, setClosedTabs] = useState<ClosedTab[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchClosed()
      .then(setClosedTabs)
      .finally(() => setLoading(false));
  }, []);

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
