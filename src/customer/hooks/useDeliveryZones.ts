import { useQuery } from "@tanstack/react-query";
import { getDeliveryZones } from "../../services/settings";
import type { DeliveryZone } from "../../types/api";
import type { CachedResult } from "../../lib/offlineCache";

type UseDeliveryZonesOptions = {
  enabled?: boolean;
};

export function useDeliveryZones(options?: UseDeliveryZonesOptions) {
  return useQuery<CachedResult<DeliveryZone[]>, Error>({
    queryKey: ["settings", "delivery-zones"],
    queryFn: getDeliveryZones,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
    networkMode: "offlineFirst",
    placeholderData: (prev) => prev,
    retry: 1,
  });
}
