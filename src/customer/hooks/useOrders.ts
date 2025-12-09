import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { listMyOrders, getOrderById, type PlaceOrderBody } from "../../services/orders";
import type { OrderDetail, OrderSummary } from "../../types/api";
import { getSessionTokens } from "../../store/session";
import { useNetworkStatus } from "./useNetworkStatus";

type OrdersKey = ["orders", { status?: string | undefined; page?: number | undefined; pageSize?: number | undefined }];
type OrderDetailKey = ["order", string];

type UseOrdersOptions<TData = OrderSummary[]> = Omit<
  UseQueryOptions<OrderSummary[], Error, TData, OrdersKey>,
  "queryKey" | "queryFn"
>;

type UseOrderDetailOptions<TData = OrderDetail> = Omit<
  UseQueryOptions<OrderDetail, Error, TData, OrderDetailKey>,
  "queryKey" | "queryFn"
> & {
  enabled?: boolean;
};

export function useOrders<TData = OrderSummary[]>(
  filters?: { status?: string; page?: number; pageSize?: number },
  options?: UseOrdersOptions<TData>
) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  const mergedFilters = filters ?? {};

  return useQuery({
    queryKey: ["orders", mergedFilters],
    queryFn: () => listMyOrders(mergedFilters),
    enabled: isAuthenticated && !isOffline && (enabled ?? true),
    networkMode: "online",
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useOrderDetail<TData = OrderDetail>(
  orderId?: string | null,
  options?: UseOrderDetailOptions<TData>
) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: ["order", orderId || "unknown"],
    queryFn: () => {
      if (!orderId) {
        throw new Error("Order id is required");
      }
      return getOrderById(orderId);
    },
    enabled: isAuthenticated && !isOffline && Boolean(orderId) && (enabled ?? true),
    networkMode: "online",
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export type { PlaceOrderBody };
