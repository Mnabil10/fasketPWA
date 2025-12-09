// src/services/cart.ts
import { request } from "../api/client";
import { getActiveLang } from "../lib/i18nParam";

export type ApiCartItem = {
  id: string;
  cartId: string;
  productId: string;
  qty: number;
  priceCents: number;
  product?: {
    name: string;
    imageUrl?: string;
    priceCents: number;
    salePriceCents?: number | null;
  };
};

export type ApiCart = {
  cartId: string;
  items: ApiCartItem[];
  subtotalCents: number;
  totalCents?: number;
  shippingFeeCents?: number;
  deliveryEstimateMinutes?: number | null;
  discountCents?: number;
  couponCode?: string | null;
  coupon?: { code: string; discountCents?: number } | null;
  couponNotice?: Record<string, unknown> | null;
  delivery?: {
    addressId?: string | null;
    zoneId?: string | null;
    zoneName?: string | null;
    estimatedDeliveryTime?: string | null;
    etaMinutes?: number | null;
  };
  deliveryZone?: string | null;
  loyaltyDiscountCents?: number;
  loyaltyAppliedPoints?: number;
  loyaltyAvailablePoints?: number;
  loyaltyMaxRedeemablePoints?: number;
  deliveryZoneId?: string | null;
  addressId?: string | null;
  requiresAddress?: boolean;
  quote?: unknown;
};

type CartPayload =
  | ApiCart
  | {
      success?: boolean;
      data?: ApiCart | { cart?: ApiCart | null } | null;
      cart?: ApiCart | null;
      [key: string]: unknown;
    };

function normalizeCart(payload: CartPayload): ApiCart {
  if (!payload || typeof payload !== "object") {
    return payload as ApiCart;
  }
  const candidates = [
    (payload as any).data?.cart,
    (payload as any).cart,
    (payload as any).data,
    payload,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && ((candidate as any).cartId || (candidate as any).items)) {
      const cart = candidate as ApiCart;
      if (!cart.couponCode && (cart as any).coupon?.code) {
        cart.couponCode = (cart as any).coupon.code;
      }
      if (cart.delivery) {
        if (cart.delivery.etaMinutes !== undefined && cart.deliveryEstimateMinutes === undefined) {
          cart.deliveryEstimateMinutes = cart.delivery.etaMinutes ?? null;
        }
        if (!cart.addressId && cart.delivery.addressId) {
          cart.addressId = cart.delivery.addressId;
        }
        if (!cart.deliveryZoneId && cart.delivery.zoneId) {
          cart.deliveryZoneId = cart.delivery.zoneId;
        }
      }
      return cart;
    }
  }
  return payload as ApiCart;
}

const buildQueryString = (params: Record<string, string | number | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const getCart = async (options?: { lang?: "ar" | "en"; addressId?: string | null }) => {
  const finalLang = options?.lang ?? getActiveLang() ?? "en";
  const qs = buildQueryString({ lang: finalLang, addressId: options?.addressId ?? undefined });
  const data = await request<CartPayload>({ url: `/cart${qs}`, method: "GET" });
  return normalizeCart(data);
};

export const addItem = (body: { productId: string; qty: number }, options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({ url: `/cart/items${qs}`, method: "POST", data: body }).then(normalizeCart);
};

export const updateItemQty = (id: string, qty: number, options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({ url: `/cart/items/${id}${qs}`, method: "PATCH", data: { qty } }).then(normalizeCart);
};

export const removeItem = (id: string, options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({ url: `/cart/items/${id}${qs}`, method: "DELETE" }).then(normalizeCart);
};

export const applyCoupon = (code: string, options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({
    url: `/cart/apply-coupon${qs}`,
    method: "POST",
    data: { couponCode: code },
  }).then(normalizeCart);
};

export const removeCoupon = (options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({ url: `/cart/coupon${qs}`, method: "DELETE" }).then(normalizeCart);
};

export const clearCart = (options?: { addressId?: string | null }) => {
  const lang = getActiveLang() ?? "en";
  const qs = buildQueryString({ lang, addressId: options?.addressId ?? undefined });
  return request<CartPayload>({ url: `/cart/clear${qs}`, method: "POST" }).then(normalizeCart);
};
