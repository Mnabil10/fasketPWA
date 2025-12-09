import { api } from "../api/client";
import type { AppSettings, DeliveryZone } from "../types/api";
import { withOfflineCache, type CachedResult } from "../lib/offlineCache";
import { APP_VERSION } from "../version";

type DeliveryZonesResponse =
  | DeliveryZone[]
  | {
      data?: {
        deliveryZones?: DeliveryZone[];
        zones?: DeliveryZone[];
        items?: DeliveryZone[];
      };
      deliveryZones?: DeliveryZone[];
      zones?: DeliveryZone[];
      items?: DeliveryZone[];
    };

function normalizeZones(payload: DeliveryZonesResponse | undefined | null): DeliveryZone[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.deliveryZones)) return payload.deliveryZones;
  if (Array.isArray((payload as any).zones)) return (payload as any).zones;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data) {
    if (Array.isArray(payload.data.zones)) return payload.data.zones;
    if (Array.isArray(payload.data.deliveryZones)) return payload.data.deliveryZones;
    if (Array.isArray(payload.data.items)) return payload.data.items;
  }
  return [];
}

export async function getDeliveryZones(): Promise<CachedResult<DeliveryZone[]>> {
  async function fetchZones(path: string) {
    try {
      const { data } = await api.get<DeliveryZonesResponse>(path);
      const payload = data as any;
      return payload?.data ?? data;
    } catch (error: any) {
      if (error?.response?.status === 404 && path !== "/settings/delivery-config") {
        const { data } = await api.get<DeliveryZonesResponse>("/settings/delivery-config");
        const payload = data as any;
        return payload?.data ?? data;
      }
      throw error;
    }
  }

  return withOfflineCache(
    "delivery-zones",
    async () => {
      const payload = await fetchZones("/settings/delivery-zones");
      return normalizeZones(payload);
    },
    { ttlMs: 10 * 60 * 1000, version: APP_VERSION }
  );
}

type AppSettingsPayload =
  | AppSettings
  | {
      data?: AppSettings | null;
      settings?: AppSettings | null;
    };

function normalizeSettings(payload: AppSettingsPayload | null | undefined): AppSettings {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const dataLayer = (payload as any).data;
  if (dataLayer && typeof dataLayer === "object") {
    return dataLayer as AppSettings;
  }
  const settingsLayer = (payload as any).settings;
  if (settingsLayer && typeof settingsLayer === "object") {
    return settingsLayer as AppSettings;
  }
  return (payload as AppSettings) || {};
}

export async function getAppSettings(): Promise<CachedResult<AppSettings>> {
  async function fetchSettings(path: string) {
    const { data } = await api.get<AppSettingsPayload>(path);
    const payload = data as any;
    return payload?.data ?? data;
  }
  return withOfflineCache(
    "app-settings",
    async () => {
      try {
        const payload = await fetchSettings("/app/config");
        return normalizeSettings(payload);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          const fallback = await fetchSettings("/settings/app");
          return normalizeSettings(fallback);
        }
        throw error;
      }
    },
    { ttlMs: 10 * 60 * 1000, version: APP_VERSION }
  );
}
