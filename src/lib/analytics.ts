import { api } from "../api/client";
import { getSessionTokens } from "../store/session";

type AnalyticsPayload = Record<string, any>;

const STORAGE_KEY = "fasket-analytics-events";
const DEVICE_KEY = "fasket-analytics-device-id";
const MAX_EVENTS = 50;

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadEvents(): Array<{ name: string; params?: AnalyticsPayload; ts: number }> {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistEvents(events: Array<{ name: string; params?: AnalyticsPayload; ts: number }>) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  } catch {
    // ignore quota issues
  }
}

function getDeviceId() {
  const storage = getStorage();
  if (!storage) return "web";
  const existing = storage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const generated =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  storage.setItem(DEVICE_KEY, generated);
  return generated;
}

export function trackEvent(name: string, params?: AnalyticsPayload) {
  const event = { name, params, ts: Date.now() };
  // console.log("[analytics]", name, params || {});
  const existing = loadEvents();
  existing.push(event);
  persistEvents(existing);
  // TODO: integrate with a real analytics SDK or backend endpoint
}

export function trackAppOpen() {
  trackEvent("app_open");
}

export function trackViewProduct(productId: string) {
  trackEvent("view_product", { productId });
}

export function trackAddToCart(productId: string, qty = 1) {
  trackEvent("add_to_cart", { productId, qty });
}

export function trackCheckoutStarted(cartId?: string | null) {
  trackEvent("checkout_started", { cartId });
}

export function trackOrderPlaced(orderId: string, totalCents: number) {
  trackEvent("order_placed", { orderId, totalCents });
}

export function trackOrderFailed(reason?: string) {
  trackEvent("order_failed", { reason });
}

export function trackPromoClick(promoId: string, action?: string | null, link?: string | null) {
  trackEvent("promo_click", { promoId, action, link });
}

export function trackSmartCtaClick(ruleId?: string, actionType?: string, vendorId?: string | null) {
  trackEvent("SMART_CTA_CLICK", { ruleId, actionType, vendorId: vendorId ?? undefined });
}

export function trackReorderClick(orderId: string, vendorId?: string | null) {
  trackEvent("REORDER_CLICK", { orderId, vendorId: vendorId ?? undefined });
}

export function trackReorderSuccess(orderId: string, vendorId?: string | null) {
  trackEvent("REORDER_SUCCESS", { orderId, vendorId: vendorId ?? undefined });
}

export function trackWizardShown(source?: string) {
  trackEvent("WIZARD_SHOWN", { source });
}

export function trackWizardCompleted(optionId?: string, vendorId?: string | null) {
  trackEvent("WIZARD_COMPLETED", { optionId, vendorId: vendorId ?? undefined });
}

export function trackNotificationOpened(params?: {
  notificationType?: string;
  orderId?: string;
  vendorId?: string;
  campaignId?: string;
  url?: string;
}) {
  trackEvent("NOTIF_OPENED", params);
}

export const analytics = {
  trackAppOpen,
  trackViewProduct,
  trackAddToCart,
  trackCheckoutStarted,
  trackOrderPlaced,
  trackOrderFailed,
  trackPromoClick,
  trackSmartCtaClick,
  trackReorderClick,
  trackReorderSuccess,
  trackWizardShown,
  trackWizardCompleted,
  trackNotificationOpened,
};

export function getStoredEvents() {
  return loadEvents();
}

export function clearStoredEvents() {
  persistEvents([]);
}

export async function flushAnalytics(source = "mobile") {
  const { accessToken } = getSessionTokens();
  if (!accessToken) return { success: false, skipped: true };
  const events = loadEvents();
  if (!events.length) return { success: true, skipped: true };
  const deviceId = getDeviceId();
  const payload = {
    source,
    deviceId,
    events: events.map((evt) => ({
      name: evt.name,
      ts: new Date(evt.ts).toISOString(),
      params: evt.params,
    })),
  };
  try {
    await api.post("/analytics/events", payload);
    clearStoredEvents();
    return { success: true, count: events.length };
  } catch {
    return { success: false, count: 0 };
  }
}
