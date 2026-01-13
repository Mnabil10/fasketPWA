import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { useToast } from "../providers/ToastProvider";
import type { Product, ProductOptionSelection } from "../../types/api";
import type { UseCartResult } from "./useCart";

type PendingAdd = {
  product: Product;
  qty: number;
  options?: ProductOptionSelection[];
  onAdded?: () => void;
};

export function useCartGuard(cart: UseCartResult) {
  const { t } = useTranslation();
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
    onAdded?: () => void
  ) => {
    if (hasConflict(product)) {
      setPending({ product, qty, options, onAdded });
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

  const dialog = (
    <AlertDialog open={open} onOpenChange={(next) => !next && reset()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("cart.conflict.title", "Replace cart?")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(
              "cart.conflict.message",
              "Your cart already has items from another provider. Clear it to add this item."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
            {t("cart.conflict.clearAction", "Clear cart")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { requestAdd, dialog };
}
