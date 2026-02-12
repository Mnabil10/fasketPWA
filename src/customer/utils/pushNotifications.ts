import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications, type LocalNotificationSchema } from "@capacitor/local-notifications";
import { PushNotifications, type PushNotificationSchema, type Token } from "@capacitor/push-notifications";
import i18n from "../../i18n";
import { registerDevice, type RegisterDevicePayload } from "../../services/notifications";
import type { NotificationPreferences } from "../../types/api";
import { APP_VERSION } from "../../version";

export type NotificationPayload = {
  type?: string;
  orderId?: string;
  points?: number;
  title?: string;
  body?: string;
  route?: string;
  priority?: string;
  sound?: string;
  vibrate?: string | boolean;
  origin?: "receive" | "tap";
  data?: Record<string, unknown>;
};

type NotificationListener = (payload: NotificationPayload) => void;

let cachedToken: string | null = null;
let initializing: Promise<string | null> | null = null;
const listeners = new Set<NotificationListener>();
const LOCAL_NOTIFICATION_CHANNEL_ID = "fasket_notifications";
const MAX_NOTIFICATION_ID = 2147483647;
const DEVICE_ID_KEY = "fasket-push-device-id";
let localNotificationSeed = Math.floor(Date.now() % MAX_NOTIFICATION_ID);
let localNotificationsReady = false;
let localNotificationsInitializing: Promise<boolean> | null = null;
let localNotificationListenerBound = false;

const isNative = () => {
  const platform = Capacitor.getPlatform?.() ?? "web";
  return platform === "ios" || platform === "android";
};

function notifyListeners(payload: NotificationPayload) {
  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.warn("[push] listener error", error);
    }
  });
}

function nextLocalNotificationId() {
  localNotificationSeed = (localNotificationSeed + 1) % MAX_NOTIFICATION_ID;
  return localNotificationSeed || 1;
}

function normalizeData(data?: unknown): Record<string, unknown> | undefined {
  if (!data || typeof data !== "object") return undefined;
  return data as Record<string, unknown>;
}

function mapNotificationData(data: Record<string, unknown> | undefined, base: NotificationPayload): NotificationPayload {
  if (!data) return base;
  const type = typeof data.type === "string" ? data.type : typeof data.eventType === "string" ? data.eventType : undefined;
  const orderId =
    typeof data.orderId === "string"
      ? data.orderId
      : typeof data.order_id === "string"
        ? data.order_id
        : undefined;
  const pointsRaw = data.points;
  const points = typeof pointsRaw === "number" ? pointsRaw : Number(pointsRaw) || undefined;
  const title = typeof data.title === "string" ? data.title : undefined;
  const body = typeof data.body === "string" ? data.body : undefined;
  const route =
    typeof data.route === "string" ? data.route : typeof data.url === "string" ? data.url : undefined;
  const priority = typeof data.priority === "string" ? data.priority : undefined;
  const sound = typeof data.sound === "string" ? data.sound : undefined;
  const vibrate = typeof data.vibrate === "string" || typeof data.vibrate === "boolean" ? data.vibrate : undefined;
  return {
    ...base,
    type: type ?? base.type,
    orderId: orderId ?? base.orderId,
    points: points ?? base.points,
    title: base.title ?? title,
    body: base.body ?? body,
    route: route ?? base.route,
    priority: priority ?? base.priority,
    sound: sound ?? base.sound,
    vibrate: vibrate ?? base.vibrate,
    data,
  };
}

function mapNotification(notification: PushNotificationSchema | NotificationPayload): NotificationPayload {
  if (!notification) return {};
  if ("data" in notification && notification.data) {
    const data = normalizeData(notification.data);
    return mapNotificationData(data, {
      title: notification.title,
      body: notification.body,
      data,
    });
  }
  return notification as NotificationPayload;
}

function mapLocalNotification(notification: LocalNotificationSchema): NotificationPayload {
  const data = normalizeData(notification.extra);
  return mapNotificationData(data, {
    title: notification.title,
    body: notification.body,
    data,
  });
}

function buildNotificationExtra(payload: NotificationPayload): Record<string, unknown> {
  const extra = { ...(payload.data ?? {}) } as Record<string, unknown>;
  if (payload.type !== undefined && extra.type === undefined) extra.type = payload.type;
  if (payload.orderId !== undefined && extra.orderId === undefined && extra.order_id === undefined) {
    extra.orderId = payload.orderId;
  }
  if (payload.points !== undefined && extra.points === undefined) extra.points = payload.points;
  if (payload.route !== undefined && extra.route === undefined) extra.route = payload.route;
  if (payload.priority !== undefined && extra.priority === undefined) extra.priority = payload.priority;
  if (payload.sound !== undefined && extra.sound === undefined) extra.sound = payload.sound;
  if (payload.vibrate !== undefined && extra.vibrate === undefined) extra.vibrate = payload.vibrate;
  if (payload.title !== undefined && extra.title === undefined) extra.title = payload.title;
  if (payload.body !== undefined && extra.body === undefined) extra.body = payload.body;
  return extra;
}

function getDeviceId(): string {
  if (typeof window === "undefined") {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  try {
    const storage = window.localStorage;
    const existing = storage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    storage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

async function ensureLocalNotificationsReady(): Promise<boolean> {
  if (!isNative()) return false;
  if (localNotificationsReady) return true;
  if (localNotificationsInitializing) return localNotificationsInitializing;
  localNotificationsInitializing = (async () => {
    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== "granted") {
        const requested = await LocalNotifications.requestPermissions();
        if (requested.display !== "granted") {
          return false;
        }
      }
      if (Capacitor.getPlatform?.() === "android") {
        await LocalNotifications.createChannel({
          id: LOCAL_NOTIFICATION_CHANNEL_ID,
          name: "Fasket",
          importance: 4,
          vibration: true,
        });
      }
        if (!localNotificationListenerBound) {
          localNotificationListenerBound = true;
          void LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
            const { notification } = action;
            notifyListeners({ ...mapLocalNotification(notification), origin: "tap" });
          });
        }
      localNotificationsReady = true;
      return true;
    } catch (error) {
      console.warn("[push] local notifications init failed", error);
      return false;
    } finally {
      localNotificationsInitializing = null;
    }
  })();
  return localNotificationsInitializing;
}

async function isAppActive(): Promise<boolean> {
  if (!isNative() || !App?.getState) return false;
  try {
    const state = await App.getState();
    return state.isActive;
  } catch {
    return true;
  }
}

async function showLocalNotification(payload: NotificationPayload): Promise<void> {
  if (!isNative()) return;
  const active = await isAppActive();
  if (!active) {
    console.debug("[push] app not active, skipping local notification");
    return;
  }
  const ready = await ensureLocalNotificationsReady();
  if (!ready) {
    console.warn("[push] local notifications not ready/permitted");
    return;
  }
  const title = payload.title ?? i18n.t("notifications.title", "Notification");
  const body = payload.body ?? i18n.t("notifications.orderUpdated", "Your order was updated");

  console.debug("[push] showing local notification", { title, body, payload });

  const notification: LocalNotificationSchema = {
    id: nextLocalNotificationId(),
    title,
    body,
    extra: buildNotificationExtra(payload),
  };
  if (Capacitor.getPlatform?.() === "android") {
    notification.channelId = LOCAL_NOTIFICATION_CHANNEL_ID;
  }
  if (Capacitor.getPlatform?.() === "ios") {
    notification.schedule = { at: new Date(Date.now() + 100) };
  }
  try {
    await LocalNotifications.schedule({ notifications: [notification] });
  } catch (error) {
    console.warn("[push] local notification schedule failed", error);
  }
}

export async function initializePushNotifications(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  if (initializing) return initializing;
  initializing = new Promise((resolve) => {
    const bootstrap = async () => {
      if (!isNative()) {
        cachedToken = cachedToken || `mock-web-token-${Date.now()}`;
        resolve(cachedToken);
        return;
      }
      try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive !== "granted") {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive !== "granted") {
          resolve(null);
          return;
        }
        await ensureLocalNotificationsReady();

        PushNotifications.addListener("registration", (token: Token) => {
          cachedToken = token.value;
          resolve(token.value);
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.warn("[push] registration error", error);
          resolve(null);
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          const payload: NotificationPayload = { ...mapNotification(notification), origin: "receive" };
          notifyListeners(payload);
          void showLocalNotification(payload);
        });

        PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          notifyListeners({ ...mapNotification(notification), origin: "tap" } as NotificationPayload);
        });

        await PushNotifications.register();
      } catch (error) {
        console.warn("[push] initialization failed", error);
        resolve(null);
      }
    };

    void bootstrap();
  });
  const token = await initializing;
  initializing = null;
  return token;
}

export async function registerDeviceToken(
  userId?: string | null,
  preferences?: NotificationPreferences
): Promise<void> {
  if (!userId) return;
  const token = cachedToken || (await initializePushNotifications());
  if (!token) return;
  try {
    const payload: RegisterDevicePayload = {
      token,
      platform: detectPlatform(),
      appVersion: APP_VERSION,
      language: i18n.language?.split("-")[0] ?? "en",
      deviceId: getDeviceId(),
      userId,
      preferences,
    };
    await registerDevice(payload);
  } catch (error) {
    console.warn("[push] registerDeviceToken failed", error);
  }
}

export function subscribeToNotifications(listener: NotificationListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function handleIncomingNotification(payload: NotificationPayload) {
  notifyListeners(payload);
}

function detectPlatform(): "ios" | "android" | "web" {
  const platform = Capacitor.getPlatform?.() ?? "web";
  if (platform === "ios" || platform === "android") {
    return platform;
  }
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent?.toLowerCase?.() ?? "";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  if (ua.includes("android")) {
    return "android";
  }
  return "web";
}
