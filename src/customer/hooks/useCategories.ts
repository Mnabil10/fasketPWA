import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listCategories } from "../../services/catalog";
import type { Category } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

type UseCategoriesOptions<TData = CachedResult<Category[]>> = Omit<
  UseQueryOptions<CachedResult<Category[]>, Error, TData, ["categories", string, string]>,
  "queryKey" | "queryFn"
>;

type UseCategoriesParams = {
  providerId?: string | null;
};

export function useCategories<TData = CachedResult<Category[]>>(
  params?: UseCategoriesParams,
  options?: UseCategoriesOptions<TData>
) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const providerId = params?.providerId || "all";

  return useQuery({
    queryKey: ["categories", lang, providerId],
    queryFn: () => listCategories({ lang, providerId: providerId === "all" ? undefined : providerId }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
    networkMode: "offlineFirst",
    placeholderData: (prev) => prev,
    retry: 1,
    ...options,
  });
}
