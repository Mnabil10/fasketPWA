import { api } from "../api/client";
import type { NotificationItem, NotificationPreferences } from "../types/api";

export type RegisterDevicePayload = {
  token: string;
  platform?: "ios" | "android" | "web" | "unknown";
  language?: string;
  appVersion?: string;
  deviceModel?: string;
  deviceId?: string;
  userId?: string;
  preferences?: NotificationPreferences;
};

export async function saveNotificationPreferences(preferences: NotificationPreferences) {
  try {
    await api.patch("/user/notification-preferences", preferences);
  } catch (error) {
    // Preferences syncing is optional; swallow errors to avoid blocking UI.
    console.warn("[notifications] Failed to sync preferences", error);
  }
}

export async function fetchNotificationPreferences(): Promise<NotificationPreferences | null> {
  try {
    const { data } = await api.get("/user/notification-preferences");
    return (data?.data ?? data) as NotificationPreferences;
  } catch (error) {
    console.warn("[notifications] Failed to load preferences", error);
    return null;
  }
}

export async function patchNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<NotificationPreferences | null> {
  try {
    const { data } = await api.patch("/user/notification-preferences", preferences);
    return (data?.data ?? data) as NotificationPreferences;
  } catch (error) {
    console.warn("[notifications] Failed to update preferences", error);
    return null;
  }
}

export async function registerDevice(payload: RegisterDevicePayload) {
  const token = payload.token || (payload as any)?.deviceToken;
  if (!token) return;
  try {
    await api.post("/notifications/register-device", {
      token,
      platform: payload.platform,
      language: payload.language,
      appVersion: payload.appVersion,
      deviceModel: payload.deviceModel,
      deviceId: payload.deviceId,
      userId: payload.userId,
      preferences: payload.preferences,
    });
  } catch (error) {
    console.warn("[notifications] Failed to register device", error);
  }
}

export async function unregisterDevice(deviceToken: string) {
  try {
    await api.post("/notifications/unregister-device", { token: deviceToken });
  } catch (error) {
    console.warn("[notifications] Failed to unregister device", error);
  }
}

export async function listNotifications(params?: { page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const { data } = await api.get(`/notifications${qs ? `?${qs}` : ""}`);
  const payload = (data?.data ?? data) as {
    items?: NotificationItem[];
    notifications?: NotificationItem[];
    total?: number;
    page?: number;
    pageSize?: number;
  };
  return {
    items: payload.items ?? payload.notifications ?? [],
    total: payload.total ?? payload.items?.length ?? payload.notifications?.length ?? 0,
    page: payload.page ?? params?.page ?? 1,
    pageSize: payload.pageSize ?? params?.pageSize ?? payload.items?.length ?? payload.notifications?.length ?? 0,
  };
}

export async function markNotificationRead(id: string) {
  if (!id) return;
  const { data } = await api.post(`/notifications/${id}/read`);
  return data?.data ?? data;
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids?.length) return;
  const { data } = await api.post("/notifications/read", { ids });
  return data?.data ?? data;
}
