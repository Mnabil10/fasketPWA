import { api } from "../api/client";
import type { LoyaltySummary, LoyaltyTransaction } from "../types/api";

type LoyaltyHistoryPayload =
  | {
      items?: LoyaltyTransaction[];
      recentTransactions?: LoyaltyTransaction[];
      transactions?: LoyaltyTransaction[];
      nextCursor?: string | null;
      data?: {
        items?: LoyaltyTransaction[];
        recentTransactions?: LoyaltyTransaction[];
        transactions?: LoyaltyTransaction[];
        nextCursor?: string | null;
      };
    }
  | LoyaltyTransaction[];

export type LoyaltyHistoryResponse = {
  items: LoyaltyTransaction[];
  nextCursor?: string | null;
};

const LOYALTY_PATHS = ["/me/loyalty", "/users/me/loyalty", "/me/loyalty/summary"];

async function fetchLoyalty<T = any>(path: string, fallbacks: string[] = []) {
  try {
    const { data } = await api.get<T>(path);
    return data;
  } catch (error: any) {
    const status = error?.response?.status;
    const nextPath = fallbacks.shift();
    if (status === 404 && nextPath) {
      return fetchLoyalty<T>(nextPath, fallbacks);
    }
    throw error;
  }
}

function normalizeHistory(payload: LoyaltyHistoryPayload): LoyaltyHistoryResponse {
  if (Array.isArray(payload)) {
    return { items: payload, nextCursor: null };
  }
  if (!payload || typeof payload !== "object") {
    return { items: [], nextCursor: null };
  }
  const dataLayer = (payload as any).data && typeof (payload as any).data === "object" ? (payload as any).data : payload;
  const items =
    dataLayer.recentTransactions ||
    dataLayer.transactions ||
    dataLayer.items ||
    (Array.isArray((payload as any).items) ? (payload as any).items : []) ||
    [];
  const normalizedItems = Array.isArray(items) ? (items as LoyaltyTransaction[]) : [];
  const nextCursor = dataLayer.nextCursor ?? (payload as any).nextCursor ?? null;
  return { items: normalizedItems, nextCursor };
}

export async function getLoyaltyHistory(params?: { cursor?: string | null; limit?: number }) {
  const search = new URLSearchParams();
  if (params?.cursor) search.set("cursor", params.cursor);
  if (params?.limit) search.set("limit", String(Math.min(Math.max(params.limit, 1), 50)));
  const qs = search.toString();
  const pathWithParams = (path: string) => `${path}${qs ? `?${qs}` : ""}`;
  const [primary, ...rest] = LOYALTY_PATHS;
  const data = await fetchLoyalty<LoyaltyHistoryPayload>(pathWithParams(primary), rest.map(pathWithParams));
  return normalizeHistory(data);
}

function normalizeSummary(payload: any): LoyaltySummary {
  if (!payload || typeof payload !== "object") {
    return { balance: 0 };
  }
  if ("data" in payload && payload.data && typeof payload.data === "object") {
    return normalizeSummary(payload.data);
  }
  return {
    balance: Number((payload as any).balance ?? (payload as any).points ?? 0) || 0,
    totalEarned: "totalEarned" in payload ? Number((payload as any).totalEarned) || 0 : undefined,
    totalRedeemed: "totalRedeemed" in payload ? Number((payload as any).totalRedeemed) || 0 : undefined,
    tier: (payload as any).tier ?? null,
    nextResetAt: (payload as any).nextResetAt ?? (payload as any).nextReset ?? null,
    recentTransactions: Array.isArray((payload as any).recentTransactions)
      ? ((payload as any).recentTransactions as LoyaltyTransaction[])
      : undefined,
  };
}

export async function getLoyaltySummary(params?: { limit?: number }): Promise<LoyaltySummary> {
  const search = new URLSearchParams();
  if (params?.limit) search.set("limit", String(Math.min(Math.max(params.limit, 1), 50)));
  const qs = search.toString();
  const pathWithParams = (path: string) => `${path}${qs ? `?${qs}` : ""}`;
  const [primary, ...rest] = LOYALTY_PATHS;
  const data = await fetchLoyalty<LoyaltySummary | { data?: LoyaltySummary }>(pathWithParams(primary), rest.map(pathWithParams));
  return normalizeSummary(data);
}
