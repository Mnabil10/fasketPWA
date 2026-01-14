import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductOptionSelection } from "../../types/api";
import { computeOptionTotals } from "../utils/cart";
import type { CartPreviewItem } from "../types";

export type LocalCartItem = {
  id: string;
  productId: string;
  branchId?: string | null;
  providerId?: string | null;
  name: string;
  image?: string;
  priceCents: number;
  salePriceCents?: number | null;
  optionsKey: string;
  options?: ProductOptionSelection[];
  quantity: number;
  category?: string;
  stock?: number;
};

type LocalCartState = {
  items: Record<string, LocalCartItem>;
  add: (product: Product, qty?: number, options?: ProductOptionSelection[]) => void;
  remove: (itemId: string) => void;
  setQty: (itemId: string, qty: number) => void;
  clear: () => void;
};

const MAX_QTY = 99;
const NO_OPTIONS_KEY = "no-options";

function normalizeOptions(options?: ProductOptionSelection[]) {
  if (!options?.length) return [];
  return options
    .map((opt) => ({
      ...opt,
      optionId: String(opt.optionId),
      qty: Math.max(1, Math.floor(opt.qty ?? 1)),
    }))
    .filter((opt) => opt.optionId);
}

function buildOptionsKey(options?: ProductOptionSelection[]) {
  const normalized = normalizeOptions(options);
  if (!normalized.length) return NO_OPTIONS_KEY;
  return normalized
    .slice()
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((opt) => `${opt.optionId}:${opt.qty}`)
    .join("|");
}

function buildItemKey(productId: string, branchId: string | null | undefined, optionsKey: string) {
  return `${productId}:${branchId ?? "none"}:${optionsKey || NO_OPTIONS_KEY}`;
}

export const useLocalCartStore = create<LocalCartState>()(
  persist(
    (set, get) => ({
      items: {},
      add: (product, qty = 1, options) => {
        const items = { ...get().items };
        const normalizedOptions = normalizeOptions(options);
        const optionsKey = buildOptionsKey(normalizedOptions);
        const itemId = buildItemKey(product.id, product.branchId ?? null, optionsKey);
        const existing = items[itemId];
        const nextQty = Math.max(1, Math.min(MAX_QTY, (existing?.quantity || 0) + qty));
        const { addOnsTotalCents, baseOverrideCents } = computeOptionTotals(normalizedOptions);
        const basePriceCents = baseOverrideCents ?? (product.salePriceCents ?? product.priceCents);
        items[itemId] = {
          id: itemId,
          productId: product.id,
          branchId: product.branchId ?? null,
          providerId: product.providerId ?? null,
          name: product.name,
          image: product.imageUrl ?? undefined,
          priceCents: basePriceCents + addOnsTotalCents,
          salePriceCents: product.salePriceCents,
          optionsKey,
          options: normalizedOptions,
          quantity: nextQty,
          category: product.category?.name,
          stock: product.stock,
        };
        set({ items });
      },
      remove: (itemId) => {
        const items = { ...get().items };
        delete items[itemId];
        set({ items });
      },
      setQty: (itemId, qty) => {
        if (qty <= 0) {
          get().remove(itemId);
          return;
        }
        const items = { ...get().items };
        const existing = items[itemId];
        if (!existing) return;
        items[itemId] = { ...existing, quantity: Math.min(MAX_QTY, qty) };
        set({ items });
      },
      clear: () => set({ items: {} }),
    }),
    {
      name: "fasket-local-cart-v2",
      version: 2,
      migrate: (persistedState: any, version) => {
        if (!persistedState || typeof persistedState !== "object") return { items: {} };
        if (version >= 2) return persistedState;
        const legacyItems = (persistedState as any).items ?? {};
        const nextItems: Record<string, LocalCartItem> = {};
        for (const entry of Object.values(legacyItems) as any[]) {
          if (!entry?.productId) continue;
          const optionsKey = NO_OPTIONS_KEY;
          const itemId = buildItemKey(entry.productId, entry.branchId ?? null, optionsKey);
          nextItems[itemId] = {
            ...entry,
            id: itemId,
            optionsKey,
            options: [],
          } as LocalCartItem;
        }
        return { ...persistedState, items: nextItems };
      },
    }
  )
);

export function mapLocalCartToPreview(items: Record<string, LocalCartItem>): CartPreviewItem[] {
  return Object.values(items).map((item) => ({
    id: item.id,
    productId: item.productId,
    branchId: item.branchId ?? null,
    name: item.name,
    image: item.image,
    price: item.priceCents / 100,
    quantity: item.quantity,
    category: item.category,
    options: item.options,
    product: {
      id: item.productId,
      branchId: item.branchId ?? null,
      providerId: item.providerId ?? null,
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
    return sum + item.priceCents * item.quantity;
  }, 0);
  return { subtotalCents, subtotal: subtotalCents / 100 };
}
