import { useState, useEffect, useCallback } from "react";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

const STORAGE_KEY = "nova-settings";

function mergeSettings(stored: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    customTheme: {
      ...DEFAULT_SETTINGS.customTheme,
      ...(stored.customTheme ?? {}),
    },
  };
}

function isChromeStorageAvailable(): boolean {
  return (
    typeof chrome !== "undefined" &&
    typeof chrome.storage !== "undefined" &&
    typeof chrome.storage.sync !== "undefined"
  );
}

async function readSettings(): Promise<AppSettings> {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(STORAGE_KEY, (result) => {
        const stored = result[STORAGE_KEY];
        resolve(stored ? mergeSettings(stored) : DEFAULT_SETTINGS);
      });
    });
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return mergeSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
}

async function writeSettings(settings: AppSettings): Promise<void> {
  if (isChromeStorageAvailable()) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [STORAGE_KEY]: settings }, resolve);
    });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface UseSettingsReturn {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  loading: boolean;
}

function readSettingsSync(): AppSettings {
  if (isChromeStorageAvailable()) return DEFAULT_SETTINGS;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      return mergeSettings(JSON.parse(raw));
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
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
        if (newVal) setSettings(mergeSettings(newVal));
      }
    };

    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const updateSettings = useCallback(
    (partial: Partial<AppSettings>) => {
      const next = { ...settings, ...partial };
      setSettings(next);
      writeSettings(next);
    },
    [settings]
  );

  return { settings, updateSettings, loading };
}
