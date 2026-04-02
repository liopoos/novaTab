import { useState, useEffect } from "react";
import { isChromeAvailable } from "@/lib/favicon";

export interface MostVisitedSite {
  title: string;
  url: string;
}

interface UseMostVisitedReturn {
  sites: MostVisitedSite[];
  loading: boolean;
}

const MAX_RESULTS = 10;

export function useMostVisited(): UseMostVisitedReturn {
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
        topSites.slice(0, MAX_RESULTS).map((s) => ({ title: s.title, url: s.url }))
      );
      setLoading(false);
    });
  }, []);

  return { sites, loading };
}
