import { Capacitor } from "@capacitor/core";
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
};

type NotificationListener = (payload: NotificationPayload) => void;

let cachedToken: string | null = null;
let initializing: Promise<string | null> | null = null;
const listeners = new Set<NotificationListener>();

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

function mapNotification(notification: PushNotificationSchema | NotificationPayload): NotificationPayload {
  if (!notification) return {};
  if ("data" in notification && notification.data) {
    const { type, orderId, points, route, priority, sound, vibrate } = notification.data;
    return {
      type: type ?? notification.data?.eventType,
      orderId: orderId ?? notification.data?.order_id,
      points: typeof points === "number" ? points : Number(points) || undefined,
      title: notification.title ?? notification.data?.title,
      body: notification.body ?? notification.data?.body,
      route: route ?? notification.data?.route,
      priority: priority ?? notification.data?.priority,
      sound: sound ?? notification.data?.sound,
      vibrate: vibrate ?? notification.data?.vibrate,
    };
  }
  return notification as NotificationPayload;
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

        PushNotifications.addListener("registration", (token: Token) => {
          cachedToken = token.value;
          resolve(token.value);
        });

        PushNotifications.addListener("registrationError", (error) => {
          console.warn("[push] registration error", error);
          resolve(null);
        });

        PushNotifications.addListener("pushNotificationReceived", (notification) => {
          notifyListeners(mapNotification(notification));
        });

        PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          notifyListeners(mapNotification(notification));
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
