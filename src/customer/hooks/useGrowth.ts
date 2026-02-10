import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { getSessionTokens } from "../../store/session";
import { useNetworkStatus } from "./useNetworkStatus";
import { getFirstOrderWizard, getFrequentlyBought, getLastOrders } from "../../services/growth";
import type { FirstOrderWizardResponse, LastOrderSummary, Product } from "../../types/api";

type UseLastOrdersOptions<TData = LastOrderSummary[]> = Omit<
  UseQueryOptions<LastOrderSummary[], Error, TData, ["growth", "last-orders", number]>,
  "queryKey" | "queryFn"
>;

type UseFrequentlyBoughtOptions<TData = Product[]> = Omit<
  UseQueryOptions<Product[], Error, TData, ["growth", "frequently-bought", number]>,
  "queryKey" | "queryFn"
>;

type UseFirstOrderWizardOptions<TData = FirstOrderWizardResponse> = Omit<
  UseQueryOptions<FirstOrderWizardResponse, Error, TData, ["growth", "first-order-wizard"]>,
  "queryKey" | "queryFn"
>;

export function useLastOrders<TData = LastOrderSummary[]>(
  limit = 2,
  options?: UseLastOrdersOptions<TData>
) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};

  return useQuery({
    queryKey: ["growth", "last-orders", limit],
    queryFn: () => getLastOrders(limit),
    enabled: isAuthenticated && !isOffline && (enabled ?? true),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useFrequentlyBought<TData = Product[]>(
  limit = 8,
  options?: UseFrequentlyBoughtOptions<TData>
) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};

  return useQuery({
    queryKey: ["growth", "frequently-bought", limit],
    queryFn: () => getFrequentlyBought(limit),
    enabled: isAuthenticated && !isOffline && (enabled ?? true),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}

export function useFirstOrderWizard<TData = FirstOrderWizardResponse>(options?: UseFirstOrderWizardOptions<TData>) {
  const { isOffline } = useNetworkStatus();
  const { accessToken } = getSessionTokens();
  const isAuthenticated = Boolean(accessToken);
  const { enabled, ...restOptions } = options ?? {};

  return useQuery({
    queryKey: ["growth", "first-order-wizard"],
    queryFn: () => getFirstOrderWizard(),
    enabled: isAuthenticated && !isOffline && (enabled ?? true),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    ...restOptions,
  });
}
