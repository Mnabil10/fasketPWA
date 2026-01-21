import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  cancelOrderGroup,
  getDriverLocation,
  getOrderById,
  getOrderGroupById,
  getOrderTimeline,
  listMyOrderGroups,
  listMyOrders,
  type PlaceOrderBody,
} from "../../services/orders";
import type {
  DriverLocation,
  OrderDetail,
  OrderGroupCancelResult,
  OrderGroupDetail,
  OrderGroupSummary,
  OrderSummary,
  OrderTimelineEntry,
} from "../../types/api";
import { getSessionTokens } from "../../store/session";
import { useNetworkStatus } from "./useNetworkStatus";

type OrdersKey = ["orders", { status?: string | undefined; page?: number | undefined; pageSize?: number | undefined }];
type OrderDetailKey = ["order", string];
type OrderTimelineKey = ["order-timeline", string];
type OrderDriverLocationKey = ["order-driver-location", string];
type OrderGroupsKey = ["order-groups"];
type OrderGroupDetailKey = ["order-group", string];

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

type UseOrderGroupsOptions<TData = OrderGroupSummary[]> = Omit<
  UseQueryOptions<OrderGroupSummary[], Error, TData, OrderGroupsKey>,
  "queryKey" | "queryFn"
>;

type UseOrderGroupDetailOptions<TData = OrderGroupDetail> = Omit<
  UseQueryOptions<OrderGroupDetail, Error, TData, OrderGroupDetailKey>,
  "queryKey" | "queryFn"
> & {
  enabled?: boolean;
};

type UseOrderTimelineOptions<TData = OrderTimelineEntry[]> = Omit<
  UseQueryOptions<OrderTimelineEntry[], Error, TData, OrderTimelineKey>,
  "queryKey" | "queryFn"
> & {
  enabled?: boolean;
};

type UseOrderDriverLocationOptions<TData = DriverLocation | null> = Omit<
  UseQueryOptions<DriverLocation | null, Error, TData, OrderDriverLocationKey>,
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

export function useOrderGroups<TData = OrderGroupSummary[]>(options?: UseOrderGroupsOptions<TData>) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};

  return useQuery({
    queryKey: ["order-groups"],
    queryFn: () => listMyOrderGroups(),
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
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: ["order", orderId || "unknown"],
    queryFn: () => {
      if (!orderId) {
        throw new Error(t("errors.orderIdRequired", "Order ID is required."));
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

export function useOrderGroupDetail<TData = OrderGroupDetail>(
  orderGroupId?: string | null,
  options?: UseOrderGroupDetailOptions<TData>
) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: ["order-group", orderGroupId || "unknown"],
    queryFn: () => {
      if (!orderGroupId) {
        throw new Error(t("errors.orderGroupIdRequired", "Order group ID is required."));
      }
      return getOrderGroupById(orderGroupId);
    },
    enabled: isAuthenticated && !isOffline && Boolean(orderGroupId) && (enabled ?? true),
    networkMode: "online",
    staleTime: 15 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useOrderTimeline<TData = OrderTimelineEntry[]>(
  orderId?: string | null,
  options?: UseOrderTimelineOptions<TData>
) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: ["order-timeline", orderId || "unknown"],
    queryFn: () => {
      if (!orderId) {
        throw new Error(t("errors.orderIdRequired", "Order ID is required."));
      }
      return getOrderTimeline(orderId);
    },
    enabled: isAuthenticated && !isOffline && Boolean(orderId) && (enabled ?? true),
    networkMode: "online",
    staleTime: 20 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useOrderDriverLocation<TData = DriverLocation | null>(
  orderId?: string | null,
  options?: UseOrderDriverLocationOptions<TData>
) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};
  return useQuery({
    queryKey: ["order-driver-location", orderId || "unknown"],
    queryFn: () => {
      if (!orderId) {
        throw new Error(t("errors.orderIdRequired", "Order ID is required."));
      }
      return getDriverLocation(orderId);
    },
    enabled: isAuthenticated && !isOffline && Boolean(orderId) && (enabled ?? true),
    networkMode: "online",
    staleTime: 5 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useCancelOrderGroup() {
  const queryClient = useQueryClient();
  return useMutation<OrderGroupCancelResult, Error, string>({
    mutationFn: (orderGroupId: string) => cancelOrderGroup(orderGroupId),
    onSuccess: (_result, orderGroupId) => {
      queryClient.invalidateQueries({ queryKey: ["order-groups"] });
      queryClient.invalidateQueries({ queryKey: ["order-group", orderGroupId] });
    },
  });
}

export type { PlaceOrderBody };
