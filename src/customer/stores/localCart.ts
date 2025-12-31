import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../../types/api";
import type { CartPreviewItem } from "../types";

export type LocalCartItem = {
  productId: string;
  branchId?: string | null;
  name: string;
  image?: string;
  priceCents: number;
  salePriceCents?: number | null;
  quantity: number;
  category?: string;
  stock?: number;
};

type LocalCartState = {
  items: Record<string, LocalCartItem>;
  add: (product: Product, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
};

const MAX_QTY = 99;

export const useLocalCartStore = create<LocalCartState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (product, qty = 1) => {
        const items = { ...get().items };
        const existing = items[product.id];
        const nextQty = Math.max(1, Math.min(MAX_QTY, (existing?.quantity || 0) + qty));
        items[product.id] = {
          productId: product.id,
          branchId: product.branchId ?? null,
          name: product.name,
          image: product.imageUrl ?? undefined,
          priceCents: product.priceCents,
          salePriceCents: product.salePriceCents,
          quantity: nextQty,
          category: product.category?.name,
          stock: product.stock,
        };
        set({ items });
      },
      remove: (productId) => {
        const items = { ...get().items };
        delete items[productId];
        set({ items });
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().remove(productId);
          return;
        }
        const items = { ...get().items };
        const existing = items[productId];
        if (!existing) return;
        items[productId] = { ...existing, quantity: Math.min(MAX_QTY, qty) };
        set({ items });
      },
      clear: () => set({ items: {} }),
    }),
    { name: "fasket-local-cart-v2", version: 1 }
  )
);

export function mapLocalCartToPreview(items: Record<string, LocalCartItem>): CartPreviewItem[] {
  return Object.values(items).map((item) => ({
    id: item.productId,
    productId: item.productId,
    branchId: item.branchId ?? null,
    name: item.name,
    image: item.image,
    price: ((item.salePriceCents ?? item.priceCents) || item.priceCents) / 100,
    quantity: item.quantity,
    category: item.category,
    product: {
      id: item.productId,
      branchId: item.branchId ?? null,
      name: item.name,
      imageUrl: item.image,
      priceCents: item.priceCents,
      salePriceCents: item.salePriceCents ?? undefined,
      stock: item.stock,
      category: item.category
        ? { id: item.category, name: item.category, slug: item.category }
        : undefined,
    },
  }));
}

export function getLocalCartPreview() {
  return mapLocalCartToPreview(useLocalCartStore.getState().items);
}

export function getLocalCartTotals() {
  const items = useLocalCartStore.getState().items;
  const subtotalCents = Object.values(items).reduce((sum, item) => {
    const effective = item.salePriceCents ?? item.priceCents;
    return sum + effective * item.quantity;
  }, 0);
  return { subtotalCents, subtotal: subtotalCents / 100 };
}
