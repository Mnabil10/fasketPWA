// src/services/cart.ts
import { request } from "../api/client";

// لو عندك تايبات:
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
};

export const getCart = () =>
  request<ApiCart>({ url: "/cart", method: "GET" });

export const addItem = (body: { productId: string; qty: number }) =>
  request<ApiCartItem>({ url: "/cart/items", method: "POST", data: body });

export const updateItemQty = (id: string, qty: number) =>
  request<ApiCartItem>({ url: `/cart/items/${id}`, method: "PATCH", data: { qty } });

export const removeItem = (id: string) =>
  request<{ ok: true }>({ url: `/cart/items/${id}`, method: "DELETE" });
