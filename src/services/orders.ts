// src/services/orders.ts
import { api } from "../api/client";
import type { ApiCart } from "./cart";
import type { OrderDetail, OrderReceipt, OrderSummary } from "../types/api";

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
export async function placeOrder(body: PlaceOrderBody): Promise<OrderDetail> {
  if (!body.addressId) {
    throw new Error("addressId is required");
  }
  const idempotencyKey =
    body.idempotencyKey ??
    (typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `order-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const { data } = await api.post("/orders", { ...body, idempotencyKey });
  return normalizeOrderDetail(data?.data ?? data);
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

export async function getOrderTimeline(id: string) {
  const { data } = await api.get(`/orders/${id}/timeline`);
  return (data?.data ?? data) as Array<{ from?: string | null; to?: string; note?: string; createdAt: string }>;
}

export async function getDriverLocation(id: string) {
  const { data } = await api.get(`/orders/${id}/driver-location`);
  return data?.data ?? data;
}
