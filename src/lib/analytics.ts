type AnalyticsPayload = Record<string, any>;

const STORAGE_KEY = "fasket-analytics-events";
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

export const analytics = {
  trackAppOpen,
  trackViewProduct,
  trackAddToCart,
  trackCheckoutStarted,
  trackOrderPlaced,
  trackOrderFailed,
};

export function getStoredEvents() {
  return loadEvents();
}

export function clearStoredEvents() {
  persistEvents([]);
}
