import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  addItem,
  applyCoupon as applyCartCoupon,
  clearCart as clearServerCart,
  getCart,
  removeItem,
  updateItemQty,
  type ApiCart,
} from "../../services/cart";
import type { Product, ProductOptionSelection } from "../../types/api";
import { computeOptionTotals, mapServerCartToUiItems } from "../utils/cart";
import {
  getLocalCartTotals,
  mapLocalCartToPreview,
  useLocalCartStore,
  type LocalCartItem,
} from "../stores/localCart";
import type { CartPreviewItem } from "../types";
import { mergeLocalCartIntoServer } from "../utils/cartSync";
import { useNetworkStatus } from "./useNetworkStatus";

type AddPayload = {
  productId: string;
  qty: number;
  product?: Product;
  branchId?: string | null;
  options?: ProductOptionSelection[];
};
type UpdatePayload = { itemId?: string; productId: string; qty: number };
type RemovePayload = { itemId?: string; productId: string };

type UseCartOptions = {
  userId?: string | null;
  addressId?: string | null;
};

export type UseCartResult = {
  source: "server" | "local";
  items: CartPreviewItem[];
  rawCart: ApiCart | null;
  cartId: string | null;
  subtotalCents: number;
  subtotal: number;
  discountCents: number;
  shippingFeeCents: number;
  serviceFeeCents: number;
  loyaltyDiscountCents: number;
  loyaltyAppliedPoints: number;
  loyaltyAvailablePoints: number;
  loyaltyMaxRedeemablePoints: number;
  deliveryEstimateMinutes: number | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  isMerging: boolean;
  mergeError: Error | null;
  isOffline: boolean;
  addProduct: (product: Product, qty?: number, options?: ProductOptionSelection[]) => Promise<void>;
  updateQuantity: (payload: { itemId?: string; productId: string; qty: number }) => Promise<void>;
  removeItem: (payload: { itemId?: string; productId: string }) => Promise<void>;
  clearLocal: () => void;
  clearCart: () => Promise<void>;
  refetch: () => Promise<ApiCart | undefined>;
  updatingItemId: string | null;
  removingItemId: string | null;
  addingProductId: string | null;
  isMutating: boolean;
  applyCoupon: (code: string) => Promise<void>;
  applyingCoupon: boolean;
  couponError: Error | null;
  couponCode: string | null;
  cartProviderId: string | null;
  cartBranchId: string | null;
  cartScopeMixed: boolean;
};

let lastMergedUserId: string | null = null;
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

function buildOptionsKey(options?: Array<{ optionId?: string; id?: string; qty?: number }> | null) {
  if (!options?.length) return NO_OPTIONS_KEY;
  return options
    .map((opt) => ({
      optionId: String(opt.optionId ?? opt.id ?? "").trim(),
      qty: Math.max(1, Math.floor(opt.qty ?? 1)),
    }))
    .filter((opt) => opt.optionId)
    .sort((a, b) => a.optionId.localeCompare(b.optionId))
    .map((opt) => `${opt.optionId}:${opt.qty}`)
    .join("|");
}

function mapOptionsPayload(options?: ProductOptionSelection[]) {
  const normalized = normalizeOptions(options);
  if (!normalized.length) return undefined;
  return normalized.map((opt) => ({ optionId: opt.optionId, qty: opt.qty }));
}

export function useCart(options?: UseCartOptions): UseCartResult {
  const userId = options?.userId ?? null;
  const addressId = options?.addressId ?? null;
  const isAuthenticated = Boolean(userId);
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const localItems = useLocalCartStore((state) => state.items);
  const addLocal = useLocalCartStore((state) => state.add);
  const setLocalQty = useLocalCartStore((state) => state.setQty);
  const removeLocal = useLocalCartStore((state) => state.remove);
  const clearLocal = useLocalCartStore((state) => state.clear);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState<Error | null>(null);
  const mergingRef = useRef(false);
  const localCount = Object.keys(localItems).length;

  const cartQueryKey = ["cart", lang, addressId || "none"] as const;

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    queryFn: () => getCart({ lang, addressId: addressId ?? undefined }),
    enabled: isAuthenticated && !isOffline,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      lastMergedUserId = null;
      setMergeError(null);
      setIsMerging(false);
      mergingRef.current = false;
      return;
    }
    if (!localCount) {
      if (lastMergedUserId !== userId) {
        lastMergedUserId = userId;
      }
      return;
    }
    if (lastMergedUserId === userId) return;
    if (isOffline || mergingRef.current) return;

    setIsMerging(true);
    setMergeError(null);
    mergingRef.current = true;

    mergeLocalCartIntoServer(lang)
      .then(() => {
        lastMergedUserId = userId;
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      })
      .catch((error: Error) => {
        setMergeError(error);
      })
      .finally(() => {
        mergingRef.current = false;
        setIsMerging(false);
      });
  }, [isAuthenticated, localCount, userId, isOffline, queryClient, lang]);

  const serverCart = (cartQuery.data ?? null) as ApiCart | null;
  const serverPreview = useMemo(() => mapServerCartToUiItems(serverCart), [serverCart]);
  const localPreview = useMemo(
    () => mapLocalCartToPreview(localItems as Record<string, LocalCartItem>),
    [localItems]
  );
  const preview = isAuthenticated ? serverPreview : localPreview;
  const localTotals = getLocalCartTotals();
  const subtotalCents = isAuthenticated ? serverCart?.subtotalCents ?? 0 : localTotals.subtotalCents ?? 0;
  const subtotal = isAuthenticated ? (subtotalCents || 0) / 100 : localTotals.subtotal;
  const discountCents = isAuthenticated ? serverCart?.discountCents ?? 0 : 0;
  const shippingFeeCents = isAuthenticated ? serverCart?.shippingFeeCents ?? 0 : 0;
  const serviceFeeCents = isAuthenticated ? serverCart?.serviceFeeCents ?? 0 : 0;
  const loyaltyDiscountCents = isAuthenticated ? serverCart?.loyaltyDiscountCents ?? 0 : 0;
  const loyaltyAppliedPoints = isAuthenticated ? serverCart?.loyaltyAppliedPoints ?? 0 : 0;
  const loyaltyAvailablePoints = isAuthenticated ? serverCart?.loyaltyAvailablePoints ?? 0 : 0;
  const loyaltyMaxRedeemablePoints =
    isAuthenticated ? serverCart?.loyaltyMaxRedeemablePoints ?? loyaltyAvailablePoints : 0;
  const deliveryEstimateMinutes = isAuthenticated ? serverCart?.deliveryEstimateMinutes ?? null : null;
  const cartScope = useMemo(() => {
    const providerSet = new Set<string>();
    const branchSet = new Set<string>();
    if (isAuthenticated) {
      (serverCart?.groups ?? []).forEach((group) => {
        if (group.providerId) providerSet.add(group.providerId);
        if (group.branchId) branchSet.add(group.branchId);
      });
    } else {
      Object.values(localItems).forEach((item) => {
        if (item.providerId) providerSet.add(item.providerId);
        if (item.branchId) branchSet.add(item.branchId);
      });
    }
    return {
      providerId: providerSet.size === 1 ? Array.from(providerSet)[0] : null,
      branchId: branchSet.size === 1 ? Array.from(branchSet)[0] : null,
      isMixed: providerSet.size > 1 || branchSet.size > 1,
    };
  }, [isAuthenticated, serverCart?.groups, localItems]);

  function cloneCart(cart: ApiCart): ApiCart {
    return JSON.parse(JSON.stringify(cart)) as ApiCart;
  }

  function optimisticUpdate(updater: (cart: ApiCart) => ApiCart | null) {
    const prev = queryClient.getQueryData<ApiCart>(cartQueryKey);
    if (!prev) return { previous: prev ?? null };
    const next = updater(cloneCart(prev));
    if (next) {
      queryClient.setQueryData(cartQueryKey, next);
    }
    return { previous: prev };
  }

  const addMutation = useMutation({
    mutationFn: ({ productId, qty, branchId, options }: AddPayload) =>
      addItem(
        { productId, qty, branchId, options: mapOptionsPayload(options) },
        { addressId }
      ),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      return optimisticUpdate((cart) => {
        if (!cart) return cart;
        const optionsKey = buildOptionsKey(variables.options);
        const { addOnsTotalCents, baseOverrideCents } = computeOptionTotals(variables.options);
        const basePriceCents =
          baseOverrideCents ?? variables.product?.salePriceCents ?? variables.product?.priceCents;
        const existing = cart.items.find(
          (it) =>
            it.productId === variables.productId &&
            (it.branchId ?? null) === (variables.branchId ?? null) &&
            buildOptionsKey((it as any).options) === optionsKey
        );
        const priceCents =
          basePriceCents != null
            ? basePriceCents + addOnsTotalCents
            : existing?.priceCents ?? addOnsTotalCents;
        if (existing) {
          existing.qty += variables.qty;
        } else {
          cart.items.push({
            id: `temp-${variables.productId}-${Date.now()}`,
            cartId: cart.cartId,
            productId: variables.productId,
            branchId: variables.branchId ?? null,
            qty: variables.qty,
            priceCents,
            options: normalizeOptions(variables.options),
            product: variables.product
              ? {
                  name: variables.product.name,
                  imageUrl: variables.product.imageUrl ?? undefined,
                  priceCents: variables.product.priceCents,
                  salePriceCents: variables.product.salePriceCents,
                }
              : undefined,
          });
        }
        cart.subtotalCents += priceCents * variables.qty;
        return cart;
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, qty }: UpdatePayload) => {
      if (!itemId) {
        throw new Error("Missing cart item id");
      }
      return updateItemQty(itemId, qty, { addressId });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      return optimisticUpdate((cart) => {
        if (!cart) return cart;
        const item = variables.itemId
          ? cart.items.find((it) => it.id === variables.itemId)
          : cart.items.find((it) => it.productId === variables.productId);
        if (!item) return cart;
        const diff = variables.qty - item.qty;
        item.qty = variables.qty;
        cart.subtotalCents += item.priceCents * diff;
        return cart;
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: ({ itemId }: RemovePayload) => {
      if (!itemId) {
        throw new Error("Missing cart item id");
        }
      return removeItem(itemId, { addressId });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      return optimisticUpdate((cart) => {
        if (!cart) return cart;
        const idx = variables.itemId
          ? cart.items.findIndex((it) => it.id === variables.itemId)
          : cart.items.findIndex((it) => it.productId === variables.productId);
        if (idx === -1) return cart;
        const [removed] = cart.items.splice(idx, 1);
        cart.subtotalCents -= removed.priceCents * removed.qty;
        return cart;
      });
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(cartQueryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  const couponMutation = useMutation({
    mutationFn: ({ code }: { code: string }) =>
      applyCartCoupon(code, { addressId: addressId ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
  });

  async function addProduct(product: Product, qty = 1, options?: ProductOptionSelection[]) {
    if (!product?.id) {
      throw new Error("Product must include an id");
    }
    const branchId = product.branchId ?? null;
    if (!isAuthenticated) {
      addLocal(product, qty, options);
      return;
    }
    if (isOffline) {
      throw new Error("You are offline. Cannot add items to the cart.");
    }
    await addMutation.mutateAsync({ productId: product.id, qty, product, branchId, options });
  }

  async function updateQuantity(payload: { itemId?: string; productId: string; qty: number }) {
    const { itemId, productId, qty } = payload;
    if (!isAuthenticated) {
      if (!itemId) {
        throw new Error("Missing cart item id");
      }
      setLocalQty(itemId, qty);
      return;
    }
    if (!itemId) {
      throw new Error("Missing cart item id");
    }
    if (isOffline) {
      throw new Error("You are offline. Cannot update the cart.");
    }
    await updateMutation.mutateAsync({ itemId, productId, qty });
  }

  async function removeItemFromCart(payload: { itemId?: string; productId: string }) {
    const { itemId, productId } = payload;
    if (!isAuthenticated) {
      if (!itemId) {
        throw new Error("Missing cart item id");
      }
      removeLocal(itemId);
      return;
    }
    if (!itemId) {
      throw new Error("Missing cart item id");
    }
    if (isOffline) {
      throw new Error("You are offline. Cannot update the cart.");
    }
    await removeMutation.mutateAsync({ itemId, productId });
  }

  async function applyCoupon(code: string) {
    if (!isAuthenticated) {
      throw new Error("You need to sign in to apply a coupon.");
    }
    const trimmed = code.trim();
    if (!trimmed) {
      throw new Error("Coupon code is required.");
    }
    if (isOffline) {
      throw new Error("You are offline. Cannot apply a coupon.");
    }
    await couponMutation.mutateAsync({ code: trimmed });
  }

  async function clearCart() {
    if (!isAuthenticated) {
      clearLocal();
      return;
    }
    if (isOffline) {
      throw new Error("You are offline. Cannot clear the cart.");
    }
    await clearServerCart({ addressId: addressId ?? undefined });
    queryClient.invalidateQueries({ queryKey: ["cart"] });
  }

  return {
    source: isAuthenticated ? "server" : "local",
    items: preview,
    rawCart: serverCart,
    cartId: serverCart?.cartId ?? null,
    subtotalCents,
    subtotal,
    discountCents,
    shippingFeeCents,
    serviceFeeCents,
    loyaltyDiscountCents,
    loyaltyAppliedPoints,
    loyaltyAvailablePoints,
    loyaltyMaxRedeemablePoints,
    deliveryEstimateMinutes,
    isLoading: cartQuery.isLoading,
    isFetching: cartQuery.isFetching,
    isError: cartQuery.isError,
    error: (cartQuery.error as Error) ?? null,
    isMerging,
    mergeError,
    isOffline,
    addProduct,
    updateQuantity,
    removeItem: removeItemFromCart,
    clearLocal,
    clearCart,
    refetch: () => cartQuery.refetch().then((res) => res.data),
    updatingItemId: updateMutation.isPending
      ? ((updateMutation.variables as UpdatePayload | undefined)?.itemId ?? null)
      : null,
    removingItemId: removeMutation.isPending
      ? ((removeMutation.variables as RemovePayload | undefined)?.itemId ?? null)
      : null,
    addingProductId: addMutation.isPending
      ? ((addMutation.variables as AddPayload | undefined)?.productId ?? null)
      : null,
    isMutating:
      addMutation.isPending || updateMutation.isPending || removeMutation.isPending || couponMutation.isPending || isMerging,
    applyCoupon,
    applyingCoupon: couponMutation.isPending,
    couponError: (couponMutation.error as Error) ?? null,
    couponCode: serverCart?.couponCode ?? serverCart?.coupon?.code ?? null,
    cartProviderId: cartScope.providerId,
    cartBranchId: cartScope.branchId,
    cartScopeMixed: cartScope.isMixed,
  };
}
