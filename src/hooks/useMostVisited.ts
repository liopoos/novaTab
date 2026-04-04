import { useState, useEffect } from "react";
import { isChromeAvailable } from "@/lib/favicon";
import { DEFAULT_SETTINGS } from "@/types";
import type { ExtraSectionCount } from "@/types";

export interface MostVisitedSite {
  title: string;
  url: string;
}

interface UseMostVisitedReturn {
  sites: MostVisitedSite[];
  loading: boolean;
}

export function useMostVisited(
  limit: ExtraSectionCount = DEFAULT_SETTINGS.mostVisitedCount
): UseMostVisitedReturn {
  const [sites, setSites] = useState<MostVisitedSite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isChromeAvailable || !chrome.topSites) {
      setSites([]);
      return;
    }
    setLoading(true);
    chrome.topSites.get((topSites) => {
      if (chrome.runtime.lastError) {
        setSites([]);
        setLoading(false);
        return;
      }
      setSites(
        topSites.slice(0, limit).map((s) => ({ title: s.title, url: s.url }))
      );
      setLoading(false);
    });
  }, [limit]);

  return { sites, loading };
}
