import { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS, isExtraSectionCount } from "@/types";

const STORAGE_KEY = "nova-settings";

function shouldForceDisableBrowserPages(): boolean {
  return !isChromeStorageAvailable();
}

function enforceEnvironmentSettings(settings: AppSettings): AppSettings {
  if (!shouldForceDisableBrowserPages()) return settings;

  return {
    ...settings,
    showRecentlyClosed: false,
    showMostVisited: false,
  };
}

function mergeSettings(stored: Partial<AppSettings>): AppSettings {
  const recentlyClosedCount = isExtraSectionCount(stored.recentlyClosedCount)
    ? stored.recentlyClosedCount
    : DEFAULT_SETTINGS.recentlyClosedCount;
  const mostVisitedCount = isExtraSectionCount(stored.mostVisitedCount)
    ? stored.mostVisitedCount
    : DEFAULT_SETTINGS.mostVisitedCount;

  return enforceEnvironmentSettings({
    ...DEFAULT_SETTINGS,
    ...stored,
    recentlyClosedCount,
    mostVisitedCount,
    customTheme: {
      ...DEFAULT_SETTINGS.customTheme,
      ...(stored.customTheme ?? {}),
    },
  });
}

function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.sync !== "undefined"
  );
}

function readSettingsCache(): AppSettings {
  const fallback = enforceEnvironmentSettings(DEFAULT_SETTINGS);
  let raw: string | null = null;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallback;
  }

  if (!raw) return fallback;

  try {
    return mergeSettings(JSON.parse(raw));
  } catch {
    return fallback;
  }
}

function writeSettingsCache(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore cache write failures.
  }
}

async function readSettings(): Promise<AppSettings> {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        const stored = result[STORAGE_KEY] as Partial<AppSettings> | undefined;
        const resolved = stored ? mergeSettings(stored) : readSettingsCache();
        writeSettingsCache(resolved);
        resolve(resolved);
      });
    });
  }
  return readSettingsCache();
}

async function writeSettings(settings: AppSettings): Promise<void> {
  const normalized = enforceEnvironmentSettings(settings);
  writeSettingsCache(normalized);

  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: normalized }, resolve);
    });
  }
}

interface UseSettingsReturn {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loading: boolean;
}

function readSettingsSync(): AppSettings {
  return readSettingsCache();
}

export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>(() => readSettingsSync());
  const [loading, setLoading] = useState(() => isChromeStorageAvailable());

  useEffect(() => {
    if (!isChromeStorageAvailable()) return;
    readSettings().then((s) => {
      setSettings(s);
      setLoading(false);
    });

    if (!isChromeStorageAvailable()) return;

    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync" && changes[STORAGE_KEY]) {
        const newVal = changes[STORAGE_KEY].newValue;
        if (newVal && typeof newVal === "object") {
          const merged = mergeSettings(newVal as Partial<AppSettings>);
          writeSettingsCache(merged);
          setSettings(merged);
        }
        if (newVal === undefined) {
          const fallback = enforceEnvironmentSettings(DEFAULT_SETTINGS);
          writeSettingsCache(fallback);
          setSettings(fallback);
        }
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      const next = enforceEnvironmentSettings({ ...settings, ...partial });
      setSettings(next);
      writeSettings(next);
    },
    [settings]
  );

  return { settings, updateSettings, loading };
}
