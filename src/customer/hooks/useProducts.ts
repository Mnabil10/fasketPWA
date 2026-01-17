import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { bestSelling, hotOffers, listAllProducts, listProducts } from "../../services/catalog";
import type { Product } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

type ProductQueryKind = "all" | "best-selling" | "hot-offers";

export type UseProductsParams = {
  search?: string;
  categoryId?: string | null;
  categorySlug?: string | null;
  providerId?: string | null;
  minPrice?: number;
  maxPrice?: number;
  orderBy?: "createdAt" | "priceCents" | "name";
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  limit?: number;
  type?: ProductQueryKind;
  fetchAll?: boolean;
  enabled?: boolean;
};

type ProductsQueryKey = [
  "products",
  ProductQueryKind,
  {
    lang: string;
    search?: string;
    categoryId?: string | null;
    categorySlug?: string | null;
    providerId?: string | null;
    minPrice?: number;
    maxPrice?: number;
    orderBy?: "createdAt" | "priceCents" | "name";
    sort?: "asc" | "desc";
    page?: number;
    pageSize?: number;
    limit?: number;
    fetchAll?: boolean;
  }
];

type UseProductsOptions<TData = CachedResult<Product[]>> = Omit<
  UseQueryOptions<CachedResult<Product[]>, Error, TData, ProductsQueryKey>,
  "queryKey" | "queryFn"
>;

export function useProducts<TData = CachedResult<Product[]>>(
  params?: UseProductsParams,
  options?: UseProductsOptions<TData>
) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const type: ProductQueryKind = params?.type ?? "all";
  const search = params?.search?.trim() || undefined;
  const categoryId = params?.categoryId || undefined;
  const categorySlug = params?.categorySlug || undefined;
  const providerId = params?.providerId || undefined;
  const minPrice = params?.minPrice;
  const maxPrice = params?.maxPrice;
  const orderBy = params?.orderBy;
  const sort = params?.sort;
  const page = params?.page;
  const pageSize = params?.pageSize;
  const limit = params?.limit;
  const fetchAll = params?.fetchAll ?? false;
  const enabled = params?.enabled ?? true;

  return useQuery({
    queryKey: [
      "products",
      type,
      {
        lang,
        search,
        categoryId,
        categorySlug,
        providerId,
        minPrice,
        maxPrice,
        orderBy,
        sort,
        page,
        pageSize,
        limit,
        fetchAll,
      },
    ],
    queryFn: () => {
      if (type === "best-selling") {
        return bestSelling({ pageSize: limit ?? pageSize ?? 10, lang, providerId });
      }
      if (type === "hot-offers") {
        return hotOffers({ pageSize: limit ?? pageSize ?? 10, lang, providerId });
      }
      const listFn = fetchAll ? listAllProducts : listProducts;
      return listFn({
        q: search,
        categoryId,
        categorySlug,
        providerId,
        min: minPrice,
        max: maxPrice,
        orderBy,
        sort,
        page,
        pageSize: pageSize ?? limit,
        lang,
      });
    },
    enabled,
    staleTime: type === "all" ? 30 * 1000 : 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
    networkMode: "offlineFirst",
    retry: 1,
    ...options,
  });
}
