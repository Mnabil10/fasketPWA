import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getProduct } from "../../services/catalog";
import type { Product } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

type ProductDetailKey = ["product", { lang: string; idOrSlug?: string | null }];

type UseProductDetailOptions<TData = CachedResult<Product>> = Omit<
  UseQueryOptions<CachedResult<Product>, Error, TData, ProductDetailKey>,
  "queryKey" | "queryFn"
>;

export type UseProductDetailParams = {
  idOrSlug?: string | null;
  initialData?: Product | null;
  enabled?: boolean;
};

export function useProductDetail<TData = CachedResult<Product>>(
  params: UseProductDetailParams,
  options?: UseProductDetailOptions<TData>
) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const idOrSlug = params.idOrSlug ?? null;
  const enabled = params.enabled ?? true;

  return useQuery({
    queryKey: ["product", { lang, idOrSlug }],
    queryFn: () => {
      if (!idOrSlug) {
        throw new Error("Product id is required when fetching details");
      }
      return getProduct(idOrSlug, lang);
    },
    enabled: Boolean(idOrSlug) && enabled,
    initialData: params.initialData
      ? { data: params.initialData, stale: false, fromCache: false, fetchedAt: Date.now() }
      : undefined,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    networkMode: "offlineFirst",
    retry: 1,
    ...options,
  });
}
