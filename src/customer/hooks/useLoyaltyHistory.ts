import { useInfiniteQuery } from "@tanstack/react-query";
import { getSessionTokens } from "../../store/session";
import { getLoyaltyHistory, type LoyaltyHistoryResponse } from "../../services/loyalty";
import { useNetworkStatus } from "./useNetworkStatus";

export function useLoyaltyHistory(options?: { enabled?: boolean }) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  return useInfiniteQuery<LoyaltyHistoryResponse>({
    queryKey: ["loyalty", "history"],
    queryFn: ({ pageParam }) =>
      getLoyaltyHistory({
        cursor: (pageParam as string | null | undefined) ?? undefined,
        limit: 20,
      }),
    initialPageParam: null,
    enabled: isAuthenticated && !isOffline && (options?.enabled ?? true),
    refetchOnWindowFocus: false,
    getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
  });
}
