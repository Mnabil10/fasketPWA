import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product } from "../../types/api";

type WishlistState = {
  items: Record<string, Product>;
  toggle: (product: Product) => void;
  has: (productId: string) => boolean;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: {},
      toggle: (product) => {
        const items = { ...get().items };
        if (items[product.id]) {
          delete items[product.id];
        } else {
          items[product.id] = product;
        }
        set({ items });
      },
      has: (productId) => Boolean(get().items[productId]),
      remove: (productId) => {
        const items = { ...get().items };
        delete items[productId];
        set({ items });
      },
      clear: () => set({ items: {} }),
    }),
    { name: "fasket-wishlist", version: 1 }
  )
);
