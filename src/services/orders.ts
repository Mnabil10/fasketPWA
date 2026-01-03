// src/services/orders.ts
import { api } from "../api/client";
import type { ApiCart } from "./cart";
import type {
  DriverLocation,
  OrderDetail,
  OrderGroupSummary,
  OrderReceipt,
  OrderSummary,
  OrderTimelineEntry,
} from "../types/api";

type OrdersPayload =
  | OrderSummary[]
  | {
      success?: boolean;
      data?: OrderSummary[] | { items?: OrderSummary[] | null } | null;
      items?: OrderSummary[];
      orders?: OrderSummary[];
      [key: string]: any;
    };

const ORDER_STATUS_MAP: Record<string, string> = {
  PROCESSING: "CONFIRMED",
  OUT_FOR_DELIVERY: "DELIVERING",
  DELIVERED: "COMPLETED",
};

function mapOrderStatus(status: string | undefined | null) {
  if (!status) return "PENDING";
  const key = status.toString().toUpperCase();
  if (ORDER_STATUS_MAP[key]) return ORDER_STATUS_MAP[key];
  if (key === "CANCELED" || key === "CANCELLED") return "CANCELED";
  if (key === "CONFIRMED" || key === "DELIVERING" || key === "COMPLETED" || key === "PENDING") return key;
  return "PENDING";
}

function normalizeOrderSummary(record: any): OrderSummary {
  const driver = record?.driver
    ? {
        ...record.driver,
        fullName: record.driver.fullName ?? record.driver.name,
        phone: record.driver.phone ?? "",
      }
    : null;
  return {
    id: record.id,
    code: record.code || record.orderCode || record.id,
    totalCents: record.totalCents,
    status: mapOrderStatus(record.status),
    createdAt: record.createdAt,
    driver,
  };
}

function normalizeOrders(payload: OrdersPayload): OrderSummary[] {
  if (Array.isArray(payload)) return payload.map(normalizeOrderSummary);
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items.map(normalizeOrderSummary);
  if (Array.isArray(payload.orders)) return payload.orders.map(normalizeOrderSummary);
  const dataLayer = payload.data;
  if (Array.isArray(dataLayer)) return dataLayer.map(normalizeOrderSummary);
  if (dataLayer && typeof dataLayer === "object" && Array.isArray((dataLayer as { items?: OrderSummary[] }).items)) {
    return ((dataLayer as { items?: OrderSummary[] }).items as OrderSummary[]).map(normalizeOrderSummary);
  }
  return [];
}

function normalizeOrderDetail(payload: any): OrderDetail {
  const node =
    payload?.order && typeof payload.order === "object"
      ? payload.order
      : payload?.data && typeof payload.data === "object"
        ? payload.data
        : payload;

  const deliveryEtaMinutes = node.deliveryEtaMinutes ?? node.delivery?.etaMinutes ?? node.etaMinutes ?? null;
  const estimatedDeliveryTime = node.estimatedDeliveryTime ?? node.delivery?.estimatedDeliveryTime ?? null;
  const items = Array.isArray(node.items)
    ? node.items.map((item: any) => ({
        id: item.id ?? item.productId,
        productId: item.productId,
        productNameSnapshot: item.productNameSnapshot ?? item.productName,
        priceSnapshotCents: item.priceSnapshotCents ?? item.unitPriceCents ?? 0,
        qty: item.qty ?? item.quantity ?? 0,
      }))
    : [];

  const driver = node.driver
    ? {
        ...node.driver,
        fullName: node.driver.fullName ?? node.driver.name,
        phone: node.driver.phone ?? "",
        vehicle: node.driver.vehicle
          ? {
              type: node.driver.vehicle.type,
              plateNumber: node.driver.vehicle.plateNumber,
              color: node.driver.vehicle.color,
              licenseImage: node.driver.vehicle.licenseImageUrl,
            }
          : node.driver.vehicle,
      }
    : null;

  return {
    ...(node as any),
    id: node.id,
    code: node.code || node.id,
    status: mapOrderStatus(node.status),
    statusHistory: Array.isArray(node.statusHistory)
      ? node.statusHistory.map((h: any) => ({
          id: h.id ?? `${h.from || ""}-${h.to}-${h.createdAt || ""}`,
          from: h.from ?? h.fromStatus ?? null,
          to: h.to ?? h.toStatus ?? "",
          note: h.note ?? null,
          createdAt: h.createdAt ?? h.at ?? node.createdAt,
        }))
      : null,
    driver,
    deliveryZone: node.deliveryZone || node.zone || node.address?.deliveryZone || null,
    address: node.address,
    items,
    loyaltyPointsRedeemed: node.loyaltyPointsRedeemed ?? node.loyaltyPointsUsed ?? null,
    loyaltyPointsEarned: node.loyaltyPointsEarned ?? null,
    deliveryEtaMinutes,
    deliveryEstimateMinutes: node.deliveryEstimateMinutes ?? deliveryEtaMinutes,
    estimatedDeliveryTime,
  } as OrderDetail;
}

function normalizeOrderGroupSummary(payload: any): OrderGroupSummary | null {
  const node =
    payload?.orderGroup && typeof payload.orderGroup === "object"
      ? payload.orderGroup
      : payload?.data && typeof payload.data === "object"
        ? payload.data
        : payload;

  if (!node || typeof node !== "object") return null;
  if (!node.orderGroupId && !Array.isArray(node.orders)) return null;

  const orders = Array.isArray(node.orders)
    ? node.orders.map((order: any) => ({
        id: order.id,
        code: order.code ?? order.id ?? null,
        status: mapOrderStatus(order.status),
        subtotalCents: order.subtotalCents ?? 0,
        shippingFeeCents: order.shippingFeeCents ?? 0,
        discountCents: order.discountCents ?? 0,
        totalCents: order.totalCents ?? 0,
        providerId: order.providerId ?? null,
        branchId: order.branchId ?? null,
        createdAt: order.createdAt ?? node.createdAt,
      }))
    : [];

  return {
    orderGroupId: node.orderGroupId ?? node.id,
    code: node.code ?? null,
    status: mapOrderStatus(node.status),
    subtotalCents: node.subtotalCents ?? 0,
    shippingFeeCents: node.shippingFeeCents ?? 0,
    discountCents: node.discountCents ?? 0,
    totalCents: node.totalCents ?? 0,
    createdAt: node.createdAt ?? new Date().toISOString(),
    orders,
    skippedBranchIds: node.skippedBranchIds ?? undefined,
  } as OrderGroupSummary;
}

function normalizeOrderDetailOrGroup(payload: any): OrderDetail | OrderGroupSummary {
  const group = normalizeOrderGroupSummary(payload);
  if (group) return group;
  return normalizeOrderDetail(payload);
}

function normalizeOrderReceipt(payload: any): OrderReceipt {
  const node =
    payload?.receipt && typeof payload.receipt === "object"
      ? payload.receipt
      : payload?.data && typeof payload.data === "object"
        ? payload.data
        : payload;

  const items = Array.isArray(node.items)
    ? node.items.map((item: any) => {
        const quantity = item.quantity ?? item.qty ?? 0;
        const unitPriceCents = item.unitPriceCents ?? item.priceSnapshotCents ?? 0;
        return {
          productId: item.productId,
          productName: item.productName,
          quantity,
          unitPriceCents,
          lineTotalCents: item.lineTotalCents ?? item.totalPriceCents ?? unitPriceCents * quantity,
        };
      })
    : [];

  return {
    id: node.id ?? node.orderId,
    code: node.code || node.orderId || node.id,
    status: mapOrderStatus(node.status),
    createdAt: node.createdAt,
    customer:
      node.customer ??
      {
        id: node.customerId,
        name: node.customerName,
        phone: node.customerPhone,
      },
    address: {
      street: node.address?.street,
      city: node.address?.city,
      region: node.address?.region ?? node.address?.notes,
      building: node.address?.building,
      apartment: node.address?.apartment,
      notes: node.address?.notes,
      label: node.address?.label,
    },
    deliveryZone: node.deliveryZone
      ? {
          id: node.deliveryZone.id,
          name: node.deliveryZone.name,
          city: node.deliveryZone.city ?? null,
          region: node.deliveryZone.region ?? null,
          deliveryFeeCents: node.deliveryZone.deliveryFeeCents ?? node.deliveryZone.feeCents ?? 0,
          freeDeliveryThresholdCents: node.deliveryZone.freeDeliveryThresholdCents ?? null,
          minOrderCents: node.deliveryZone.minOrderCents ?? node.deliveryZone.minOrderAmountCents ?? null,
          etaMinutes: node.deliveryZone.etaMinutes ?? null,
          isActive: node.deliveryZone.isActive,
        }
      : null,
    driver: node.driver
      ? {
          id: node.driver.id,
          fullName: node.driver.fullName ?? node.driver.name,
          phone: node.driver.phone ?? "",
          vehicleType: node.driver.vehicleType ?? node.driver.vehicle?.type ?? null,
          plateNumber: node.driver.plateNumber ?? node.driver.vehicle?.plateNumber ?? null,
        }
      : null,
    items,
    couponDiscountCents: node.couponDiscountCents ?? node.discountCents ?? 0,
    loyaltyDiscountCents: node.loyaltyDiscountCents ?? 0,
    loyaltyPointsEarned: node.loyaltyPointsEarned ?? 0,
    loyaltyPointsRedeemed: node.loyaltyPointsRedeemed ?? node.loyaltyPointsUsed ?? 0,
    shippingFeeCents: node.shippingFeeCents ?? 0,
    subtotalCents: node.subtotalCents ?? 0,
    totalCents: node.totalCents ?? 0,
    currency: node.currency ?? "",
  } as OrderReceipt;
}

export type PlaceOrderBody = {
  addressId: string;
  paymentMethod: "COD" | "CARD";
  note?: string;
  couponCode?: string;
  loyaltyPointsToRedeem?: number;
  idempotencyKey?: string;
};

export type GuestOrderItem = {
  productId: string;
  qty: number;
  branchId?: string | null;
};

export type GuestAddressInput = {
  fullAddress: string;
  city?: string;
  region?: string;
  street?: string;
  building?: string;
  apartment?: string;
  notes?: string;
  lat?: number;
  lng?: number;
};

export type GuestOrderQuoteRequest = {
  items: GuestOrderItem[];
  address: GuestAddressInput;
  splitFailurePolicy?: "PARTIAL" | "CANCEL_GROUP";
};

export type GuestOrderGroup = {
  branchId: string;
  providerId?: string | null;
  branchName?: string | null;
  branchNameAr?: string | null;
  subtotalCents: number;
  shippingFeeCents: number;
  distanceKm?: number | null;
  ratePerKmCents?: number | null;
  deliveryMode?: string | null;
  deliveryRequiresLocation?: boolean;
  deliveryUnavailable?: boolean;
};

export type GuestOrderQuote = {
  subtotalCents: number;
  shippingFeeCents: number;
  totalCents: number;
  groups: GuestOrderGroup[];
  skippedBranchIds?: string[];
};

export type PlaceGuestOrderBody = GuestOrderQuoteRequest & {
  name: string;
  phone: string;
  note?: string;
  paymentMethod?: "COD" | "CARD";
  idempotencyKey?: string;
};

/** GET /orders */
export async function listMyOrders(params?: { page?: number; pageSize?: number; status?: string }): Promise<OrderSummary[]> {
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  if (params?.status) search.set("status", params.status);
  const qs = search.toString();
  const { data } = await api.get(`/orders${qs ? `?${qs}` : ""}`);
  return normalizeOrders(data?.data ?? data);
}

/** GET /orders/:id */
export async function getOrderById(id: string): Promise<OrderDetail> {
  const { data } = await api.get(`/orders/${id}`);
  return normalizeOrderDetail(data?.data ?? data);
}

/** POST /orders */
export async function placeOrder(body: PlaceOrderBody): Promise<OrderDetail | OrderGroupSummary> {
  if (!body.addressId) {
    throw new Error("addressId is required");
  }
  const idempotencyKey =
    body.idempotencyKey ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const { data } = await api.post("/orders", { ...body, idempotencyKey });
  return normalizeOrderDetailOrGroup(data?.data ?? data);
}

export async function getOrderReceipt(id: string): Promise<OrderReceipt> {
  const { data } = await api.get(`/orders/${id}/receipt`);
  return normalizeOrderReceipt(data?.data ?? data);
}

export async function cancelOrder(id: string): Promise<OrderDetail> {
  const { data } = await api.post(`/orders/${id}/cancel`);
  return normalizeOrderDetail(data?.data ?? data);
}

export async function reorderOrder(id: string): Promise<ApiCart> {
  const { data } = await api.post(`/orders/${id}/reorder`);
  return (data?.data?.cart ?? data?.data ?? data) as ApiCart;
}

export async function getOrderTimeline(id: string): Promise<OrderTimelineEntry[]> {
  try {
    const { data } = await api.get(`/orders/${id}/timeline`);
    return (data?.data ?? data) as OrderTimelineEntry[];
  } catch {
    return [];
  }
}

export async function getDriverLocation(id: string): Promise<DriverLocation | null> {
  try {
    const { data } = await api.get(`/orders/${id}/driver-location`);
    return (data?.data ?? data) as DriverLocation | null;
  } catch {
    return null;
  }
}

function normalizeGuestQuote(payload: any): GuestOrderQuote {
  const node = payload?.data ?? payload ?? {};
  const groups = Array.isArray(node.groups)
    ? node.groups.map((group: any) => ({
        branchId: group.branchId,
        providerId: group.providerId ?? null,
        branchName: group.branchName ?? null,
        branchNameAr: group.branchNameAr ?? null,
        subtotalCents: group.subtotalCents ?? 0,
        shippingFeeCents: group.shippingFeeCents ?? 0,
        distanceKm: group.distanceKm ?? null,
        ratePerKmCents: group.ratePerKmCents ?? null,
        deliveryMode: group.deliveryMode ?? null,
        deliveryRequiresLocation: group.deliveryRequiresLocation ?? false,
        deliveryUnavailable: group.deliveryUnavailable ?? false,
      }))
    : [];
  const subtotalCents = node.subtotalCents ?? 0;
  const shippingFeeCents = node.shippingFeeCents ?? 0;
  const totalCents = node.totalCents ?? subtotalCents + shippingFeeCents;
  return {
    subtotalCents,
    shippingFeeCents,
    totalCents,
    groups,
    skippedBranchIds: node.skippedBranchIds ?? undefined,
  };
}

export async function quoteGuestOrder(body: GuestOrderQuoteRequest): Promise<GuestOrderQuote> {
  const { data } = await api.post("/orders/guest/quote", body, { skipAuth: true });
  return normalizeGuestQuote(data?.data ?? data);
}

export async function placeGuestOrder(body: PlaceGuestOrderBody): Promise<OrderDetail | OrderGroupSummary> {
  const idempotencyKey =
    body.idempotencyKey ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `guest-order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const { data } = await api.post("/orders/guest", { ...body, idempotencyKey }, { skipAuth: true });
  return normalizeOrderDetailOrGroup(data?.data ?? data);
}

export async function trackGuestOrders(params: { phone: string; code?: string }): Promise<OrderGroupSummary> {
  const search = new URLSearchParams();
  search.set("phone", params.phone);
  if (params.code) {
    search.set("code", params.code);
  }
  const { data } = await api.get(`/orders/guest/track?${search.toString()}`, { skipAuth: true });
  const summary = normalizeOrderGroupSummary(data?.data ?? data);
  if (!summary) {
    throw new Error("Order not found");
  }
  return summary;
}
