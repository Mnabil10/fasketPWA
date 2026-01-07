import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listProviders } from "../../services/providers";
import type { ProviderSummary } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

export type UseProvidersParams = {
  search?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
};

type ProvidersQueryKey = [
  "providers",
  string,
  {
    search?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }
];

type UseProvidersOptions<TData = CachedResult<ProviderSummary[]>> = Omit<
  UseQueryOptions<CachedResult<ProviderSummary[]>, Error, TData, ProvidersQueryKey>,
  "queryKey" | "queryFn"
>;

export function useProviders<TData = CachedResult<ProviderSummary[]>>(
  params?: UseProvidersParams,
  options?: UseProvidersOptions<TData>
) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const search = params?.search?.trim() || undefined;
  const type = params?.type;
  const page = params?.page;
  const pageSize = params?.pageSize;
  const enabled = params?.enabled ?? options?.enabled ?? true;

  return useQuery({
    queryKey: [
      "providers",
      lang,
      {
        search,
        type,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      listProviders({
        q: search,
        type,
        page,
        pageSize,
        lang,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    networkMode: "offlineFirst",
    placeholderData: (prev) => prev,
    retry: 1,
    ...options,
  });
}
