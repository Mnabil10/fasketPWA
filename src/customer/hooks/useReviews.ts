import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createReview, getOrderReview, updateReview } from "../../services/reviews";
import { useNetworkStatus } from "./useNetworkStatus";
import { getSessionTokens } from "../../store/session";
import type { Review } from "../../types/api";

type UseOrderReviewOptions = {
  enabled?: boolean;
};

export function useOrderReview(orderId?: string | null, options?: UseOrderReviewOptions) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const enabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["order-review", orderId || "unknown"],
    queryFn: () => {
      if (!orderId) {
        throw new Error("Order id is required");
      }
      return getOrderReview(orderId);
    },
    enabled: isAuthenticated && !isOffline && Boolean(orderId) && enabled,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useSaveReview(orderId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { reviewId?: string | null; rating: number; comment?: string | null }) => {
      if (!orderId) {
        throw new Error("Order id is required");
      }
      if (payload.reviewId) {
        return updateReview(payload.reviewId, { rating: payload.rating, comment: payload.comment });
      }
      return createReview({ orderId, rating: payload.rating, comment: payload.comment });
    },
    onSuccess: (review: Review) => {
      queryClient.invalidateQueries({ queryKey: ["order-review", orderId || "unknown"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      if (review?.id) {
        queryClient.invalidateQueries({ queryKey: ["order", orderId || "unknown"] });
      }
    },
  });
}
