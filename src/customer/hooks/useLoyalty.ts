import { useQuery } from "@tanstack/react-query";
import { getLoyaltySummary } from "../../services/loyalty";
import { getSessionTokens } from "../../store/session";
import { useNetworkStatus } from "./useNetworkStatus";
import type { LoyaltySummary } from "../../types/api";

export function useLoyalty(options?: { enabled?: boolean }) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);

  return useQuery<LoyaltySummary>({
    queryKey: ["loyalty", "summary"],
    queryFn: () => getLoyaltySummary(),
    enabled: isAuthenticated && !isOffline && (options?.enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

