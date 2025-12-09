import { useQuery } from "@tanstack/react-query";
import { getAppSettings } from "../../services/settings";
import type { AppSettings } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

export function useAppSettings(options?: { enabled?: boolean }) {
  return useQuery<CachedResult<AppSettings>>({
    queryKey: ["app-settings"],
    queryFn: () => getAppSettings(),
    enabled: options?.enabled ?? true,
    networkMode: "offlineFirst",
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });
}
