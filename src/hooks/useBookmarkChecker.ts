import { useState, useCallback, useRef } from "react";
import type { BookmarkNode } from "@/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type CheckStatus = "idle" | "pending" | "ok" | "fail";

export interface BookmarkCheckResult {
  bookmark: BookmarkNode;
  status: CheckStatus;
  /** HTTP status code if received, undefined if network error */
  httpStatus?: number;
}

export type CheckerPhase = "idle" | "running" | "done" | "cancelled";

export interface UseBookmarkCheckerReturn {
  phase: CheckerPhase;
  results: BookmarkCheckResult[];
  checkedCount: number;
  totalCount: number;
  okCount: number;
  failCount: number;
  /** Domain currently being probed (last one started) */
  currentDomain: string | null;
  start: (bookmarks: BookmarkNode[], config?: { concurrency?: number; timeoutMs?: number }) => void;
  cancel: () => void;
  reset: () => void;
  deleteFailedBookmarks: () => Promise<void>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_CONCURRENCY = 6;
const DEFAULT_TIMEOUT_MS = 8_000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * Probe a single URL. Returns { ok, httpStatus }.
 * Strategy:
 *   1. fetch() with no-cors — always opaque, but throws on hard network failure
 *   2. If fetch resolves → treat as reachable (opaque response = site exists)
 *   3. If fetch rejects (TypeError) → not reachable
 *
 * Chrome extensions can make cross-origin requests. We use mode: "no-cors"
 * to avoid CORS rejections while still distinguishing "network error" from
 * "got a response" at the TCP/TLS level.
 */
async function probeUrl(
  url: string,
  signal: AbortSignal
): Promise<{ ok: boolean; httpStatus?: number }> {
  try {
    // First try: mode no-cors gives an opaque response for any HTTP reply.
    // An opaque 4xx/5xx still resolves — we treat those as "reachable".
    // Only a hard network error rejects.
    const res = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      redirect: "follow",
      signal,
    });
    // For same-origin/cors requests we can read status; for opaque always 0.
    return { ok: true, httpStatus: res.status === 0 ? undefined : res.status };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err; // propagate abort
    }
    return { ok: false };
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBookmarkChecker(): UseBookmarkCheckerReturn {
  const [phase, setPhase] = useState<CheckerPhase>("idle");
  const [results, setResults] = useState<BookmarkCheckResult[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // ── derived counts ──────────────────────────────────────────────────────
  const checkedCount = results.filter((r) => r.status === "ok" || r.status === "fail").length;
  const totalCount = results.length;
  const okCount = results.filter((r) => r.status === "ok").length;
  const failCount = results.filter((r) => r.status === "fail").length;

  // ── start ───────────────────────────────────────────────────────────────
  const start = useCallback((bookmarks: BookmarkNode[], config?: { concurrency?: number; timeoutMs?: number }) => {
    const concurrency = config?.concurrency ?? DEFAULT_CONCURRENCY;
    const timeoutMs = config?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    // Only links with URLs
    const links = bookmarks.filter((b) => b.type === "link" && b.url);
    if (links.length === 0) return;

    // Cancel any previous run
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;

    // Init state
    const initial: BookmarkCheckResult[] = links.map((b) => ({
      bookmark: b,
      status: "pending",
    }));
    setResults(initial);
    setCurrentDomain(null);
    setPhase("running");

    // ── Semaphore-based concurrent runner ─────────────────────────────────
    let cursor = 0;
    let active = 0;
    let finished = 0;

    function updateResult(index: number, patch: Partial<BookmarkCheckResult>) {
      setResults((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], ...patch };
        return next;
      });
    }

    async function runOne(index: number): Promise<void> {
      const bm = links[index];
      const url = bm.url!;
      setCurrentDomain(extractDomain(url));

      let result: Partial<BookmarkCheckResult>;
      try {
        const timeout = AbortSignal.timeout
          ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])
          : signal;
        const { ok, httpStatus } = await probeUrl(url, timeout);
        result = { status: ok ? "ok" : "fail", httpStatus };
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          result = { status: "fail" };
        } else {
          result = { status: "fail" };
        }
      }

      updateResult(index, result);
      active--;
      finished++;

      if (signal.aborted) return;

      // Dispatch next work item
      if (cursor < links.length) {
        const next = cursor++;
        active++;
        void runOne(next);
      } else if (active === 0) {
        // All done
        setPhase("done");
        setCurrentDomain(null);
      }
    }

    // Kick off initial batch
    const batch = Math.min(concurrency, links.length);
    cursor = batch;
    active = batch;
    for (let i = 0; i < batch; i++) {
      void runOne(i);
    }
  }, []);

  // ── cancel ──────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setPhase("cancelled");
    setCurrentDomain(null);
    // Mark any still-pending as fail
    setResults((prev) =>
      prev.map((r) => (r.status === "pending" ? { ...r, status: "fail" } : r))
    );
  }, []);

  // ── reset ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    abortRef.current?.abort();
    setPhase("idle");
    setResults([]);
    setCurrentDomain(null);
  }, []);

  // ── delete failed bookmarks ─────────────────────────────────────────────
  const deleteFailedBookmarks = useCallback(async () => {
    const failed = results.filter((r) => r.status === "fail");
    const deleteOne = (id: string): Promise<void> =>
      new Promise<void>((resolve) => {
        if (typeof chrome !== "undefined" && chrome.bookmarks) {
          chrome.bookmarks.remove(id, () => resolve());
        } else {
          resolve();
        }
      });

    await Promise.all(failed.map((r) => deleteOne(r.bookmark.id)));

    // Remove deleted items from results
    const failedIds = new Set(failed.map((r) => r.bookmark.id));
    setResults((prev) => prev.filter((r) => !failedIds.has(r.bookmark.id)));
  }, [results]);

  return {
    phase,
    results,
    checkedCount,
    totalCount,
    okCount,
    failCount,
    currentDomain,
    start,
    cancel,
    reset,
    deleteFailedBookmarks,
  };
}
