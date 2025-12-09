// src/services/orders.ts
import { api } from "../api/client";

/** أنواع مفيدة للـ UI (اختياري) */
export type OrderListItem = {
  id: string;
  totalCents: number;
  status: string;
  createdAt: string;
};

export type OrderDetail = {
  id: string;
  status: string;
  paymentMethod: "COD" | "CARD";
  subtotalCents: number;
  shippingFeeCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  address?: {
    id: string;
    label?: string;
    city?: string;
    zone?: string;
    street?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    productNameSnapshot: string;
    priceSnapshotCents: number;
    qty: number;
  }>;
};

export type PlaceOrderBody =
  | {
      // checkout via cart
      addressId: string;
      paymentMethod: "COD" | "CARD";
      cartId: string;
      notes?: string;
      couponCode?: string;
    }
  | {
      // buy-now
      addressId: string;
      paymentMethod: "COD" | "CARD";
      items: Array<{ productId: string; qty: number }>;
      notes?: string;
      couponCode?: string;
    };

/** GET /orders */
export async function listMyOrders(): Promise<OrderListItem[]> {
  const { data } = await api.get("/orders");
  return data;
}

/** GET /orders/:id */
export async function getOrderById(id: string): Promise<OrderDetail> {
  const { data } = await api.get(`/orders/${id}`);
  return data;
}

/** POST /orders */
export async function placeOrder(body: PlaceOrderBody): Promise<OrderDetail> {
  const { data } = await api.post("/orders", body);
  return data;
}
