import { useCallback, useEffect, useMemo, useState } from "react";

const KEY_PREFIX = "fasket-search-history::";

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadHistory(key: string): string[] {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(KEY_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistHistory(key: string, values: string[]) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY_PREFIX + key, JSON.stringify(values));
  } catch {
    // ignore quota errors
  }
}

export function useSearchHistory(scope = "default", limit = 10) {
  const [history, setHistory] = useState<string[]>(() => loadHistory(scope));

  useEffect(() => {
    setHistory(loadHistory(scope));
  }, [scope]);

  const addQuery = useCallback(
    (query: string) => {
      const q = query.trim();
      if (!q) return;
      setHistory((prev) => {
        const deduped = prev.filter((item) => item.toLowerCase() !== q.toLowerCase());
        const next = [q, ...deduped].slice(0, limit);
        persistHistory(scope, next);
        return next;
      });
    },
    [limit, scope]
  );

  const clearHistory = useCallback(() => {
    persistHistory(scope, []);
    setHistory([]);
  }, [scope]);

  return useMemo(
    () => ({
      history,
      addQuery,
      clearHistory,
    }),
    [history, addQuery, clearHistory]
  );
}

