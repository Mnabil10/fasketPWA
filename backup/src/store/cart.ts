import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../data/types';

export type CartItem = { product: Product; qty: number };

type CartState = {
  items: Record<string, CartItem>;
  add: (product: Product, qty?: number) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (product, qty = 1) => {
        const items = { ...get().items };
        const existing = items[product.id];
        items[product.id] = { product, qty: (existing?.qty || 0) + qty };
        set({ items });
      },
      remove: (id) => set((s) => ({ items: Object.fromEntries(Object.entries(s.items).filter(([k]) => k !== id)) })),
      setQty: (id, qty) => set((s) => ({ items: { ...s.items, [id]: { ...(s.items[id] || {} as any), qty } } })),
      clear: () => set({ items: {} }),
    }),
    { name: 'fasket-cart' }
  )
);

export const calcTotals = (items: Record<string, CartItem>) => {
  const subtotal = Object.values(items).reduce((sum, it) => sum + it.product.price * it.qty, 0);
  const delivery = subtotal > 50 ? 0 : 4.99;
  const total = subtotal + delivery;
  return { subtotal, delivery, total };
};

