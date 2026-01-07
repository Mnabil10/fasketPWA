import { request } from "../api/client";
import { getActiveLang, withLang } from "../lib/i18nParam";
import type { ProviderSummary } from "../types/api";
import { withOfflineCache, type CachedResult } from "../lib/offlineCache";
import { APP_VERSION } from "../version";

function cacheKey(name: string, parts: Array<string | number | undefined | null>) {
  return [name, ...parts.map((part) => (part === undefined || part === null || part === "" ? "all" : part))].join(":");
}

type ProvidersPayload =
  | ProviderSummary[]
  | {
      items?: ProviderSummary[];
      data?: ProviderSummary[] | { items?: ProviderSummary[] | null } | null;
      providers?: ProviderSummary[];
      [key: string]: any;
    };

function normalizeProviders(payload: ProvidersPayload): ProviderSummary[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.providers)) return payload.providers;

  const data = payload.data;
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: ProviderSummary[] | null }).items)) {
    return ((data as { items?: ProviderSummary[] | null }).items as ProviderSummary[]) ?? [];
  }

  return [];
}

export const listProviders = (params?: {
  q?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  lang?: "ar" | "en";
}): Promise<CachedResult<ProviderSummary[]>> => {
  const lang = params?.lang ?? getActiveLang("en");
  const qs = withLang(
    {
      q: params?.q,
      type: params?.type,
      page: params?.page ?? 1,
      pageSize: params?.pageSize ?? 20,
    },
    lang
  );

  return withOfflineCache(
    cacheKey("providers", [lang, params?.q, params?.type, params?.page ?? 1, params?.pageSize ?? 20]),
    async () => {
      const res = await request<ProvidersPayload>({ url: `/providers${qs}`, method: "GET" });
      return normalizeProviders(res);
    },
    { ttlMs: 10 * 60 * 1000, version: APP_VERSION, lang }
  );
};
