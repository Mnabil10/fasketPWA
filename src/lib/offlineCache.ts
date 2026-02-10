const CACHE_PREFIX = "fasket-cache::";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

export type CacheEntry<T> = {
  data: T;
  timestamp: number;
  ttl: number;
  version?: string;
  lang?: string;
};

export type CachedResult<T> = {
  data: T;
  stale: boolean;
  fromCache: boolean;
  fetchedAt: number | null;
};

export type CacheOptions = {
  ttlMs?: number;
  ttlMsResolver?: (data: unknown) => number | null | undefined;
  version?: string;
  lang?: string;
  allowStaleOnFailure?: boolean;
};

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getKey(key: string) {
  return `${CACHE_PREFIX}${key}`;
}

function readCacheEntry<T>(key: string, opts?: CacheOptions): CacheEntry<T> | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(getKey(key));
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (!parsed) return null;
    if (opts?.version && parsed.version && parsed.version !== opts.version) return null;
    if (opts?.lang && parsed.lang && parsed.lang !== opts.lang) return null;
    return parsed;
  } catch {
    return null;
  }
}

function resolveTtlMs(data: unknown, opts?: CacheOptions) {
  const resolved = opts?.ttlMsResolver ? opts.ttlMsResolver(data) : undefined;
  if (typeof resolved === "number" && Number.isFinite(resolved) && resolved > 0) {
    return resolved;
  }
  if (typeof opts?.ttlMs === "number" && Number.isFinite(opts.ttlMs) && opts.ttlMs > 0) {
    return opts.ttlMs;
  }
  return DEFAULT_TTL_MS;
}

function writeCacheEntry<T>(key: string, data: T, opts?: CacheOptions) {
  const storage = getStorage();
  if (!storage) return;
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: resolveTtlMs(data, opts),
      version: opts?.version,
      lang: opts?.lang,
    };
    storage.setItem(getKey(key), JSON.stringify(entry));
  } catch {
    // ignore quota errors
  }
}

export function clearCache(key: string) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(getKey(key));
  } catch {
    // ignore removal failure
  }
}

function shouldUseCache(error: any) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (!error) return false;
  if (error?.code === "ECONNABORTED") return true;
  if (!error.response) return true;
  return false;
}

export async function withOfflineCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts?: CacheOptions
): Promise<CachedResult<T>> {
  const entry = readCacheEntry<T>(key, opts);
  const ttl = entry?.ttl ?? opts?.ttlMs ?? DEFAULT_TTL_MS;
  const expired = entry ? Date.now() - entry.timestamp > ttl : false;

  try {
    const data = await fetcher();
    writeCacheEntry(key, data, opts);
    return { data, stale: false, fromCache: false, fetchedAt: Date.now() };
  } catch (error) {
    const canFallback = shouldUseCache(error) || opts?.allowStaleOnFailure;
    if (entry && canFallback) {
      return {
        data: entry.data,
        stale: expired,
        fromCache: true,
        fetchedAt: entry.timestamp ?? null,
      };
    }
    throw error;
  }
}
