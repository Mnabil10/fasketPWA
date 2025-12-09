import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { listCategories } from "../../services/catalog";
import type { Category } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

type UseCategoriesOptions<TData = CachedResult<Category[]>> = Omit<
  UseQueryOptions<CachedResult<Category[]>, Error, TData, ["categories", string]>,
  "queryKey" | "queryFn"
>;

export function useCategories<TData = CachedResult<Category[]>>(options?: UseCategoriesOptions<TData>) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";

  return useQuery({
    queryKey: ["categories", lang],
    queryFn: () => listCategories({ lang }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
    networkMode: "offlineFirst",
    placeholderData: (prev) => prev,
    retry: 1,
    ...options,
  });
}
