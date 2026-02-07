import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "../../ui/bottom-sheet";
import { useToast } from "../providers/ToastProvider";
import type { Product, ProductOptionSelection } from "../../types/api";
import type { UseCartResult } from "./useCart";

type PendingAdd = {
  product: Product;
  qty: number;
  options?: ProductOptionSelection[];
  onAdded?: () => void;
  context?: {
    nextProviderLabel?: string | null;
  };
};

export function useCartGuard(cart: UseCartResult) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [open, setOpen] = useState(false);

  const hasConflict = useMemo(() => {
    return (product: Product) => {
      if (!cart.items.length) return false;
      if (cart.cartScopeMixed) return true;
      const cartProvider = cart.cartProviderId;
      const cartBranch = cart.cartBranchId;
      if (cartProvider && product.providerId && cartProvider !== product.providerId) return true;
      if (cartBranch && product.branchId && cartBranch !== product.branchId) return true;
      return false;
    };
  }, [cart.cartBranchId, cart.cartProviderId, cart.cartScopeMixed, cart.items.length]);

  const reset = () => {
    setPending(null);
    setOpen(false);
  };

  const requestAdd = async (
    product: Product,
    qty = 1,
    options?: ProductOptionSelection[],
    onAdded?: () => void,
    context?: { nextProviderLabel?: string | null }
  ) => {
    if (hasConflict(product)) {
      setPending({ product, qty, options, onAdded, context });
      setOpen(true);
      return false;
    }
    await cart.addProduct(product, qty, options);
    onAdded?.();
    return true;
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      await cart.clearCart();
      await cart.addProduct(pending.product, pending.qty, pending.options);
      pending.onAdded?.();
    } catch (error: any) {
      showToast({
        type: "error",
        message: t("cart.conflict.clearFailed", "Unable to clear the cart. Please try again."),
      });
    } finally {
      reset();
    }
  };

  const resolveCartLabel = () => {
    const groups = cart.rawCart?.groups ?? [];
    const group = groups[0];
    if (!group) return null;
    const isArabic = i18n.language?.startsWith("ar");
    return isArabic ? group.branchNameAr || group.branchName : group.branchName || group.branchNameAr;
  };

  const currentLabel = resolveCartLabel() || t("providers.providerFallback", "Provider");
  const nextLabel = pending?.context?.nextProviderLabel || t("providers.providerFallback", "Provider");
  const conflictMessage = t("cart.conflict.message", {
    current: currentLabel,
    next: nextLabel,
    defaultValue: `Your cart is currently from ${currentLabel}. Clear it to add items from ${nextLabel}.`,
  });

  const dialog = (
    <BottomSheet open={open} onOpenChange={(next) => !next && reset()}>
      <BottomSheetContent>
        <BottomSheetHeader>
          <BottomSheetTitle>{t("cart.conflict.title", "Replace cart?")}</BottomSheetTitle>
          <BottomSheetDescription>{conflictMessage}</BottomSheetDescription>
        </BottomSheetHeader>
        <BottomSheetFooter>
          <Button variant="outline" onClick={reset}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-white">
            {t("cart.conflict.clearAction", "Continue")}
          </Button>
        </BottomSheetFooter>
      </BottomSheetContent>
    </BottomSheet>
  );

  return { requestAdd, dialog };
}
