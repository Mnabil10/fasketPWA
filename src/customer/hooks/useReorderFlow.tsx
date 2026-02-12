import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../providers/ToastProvider";
import { useCart } from "./useCart";
import { useNetworkStatus } from "./useNetworkStatus";
import { useProviders } from "./useProviders";
import { getReorderPreview } from "../../services/orders";
import { fillFromOrder } from "../../services/cart";
import { extractApiError } from "../../utils/mapApiErrorToMessage";
import type { ReorderFillResult, ReorderPreview } from "../../types/api";
import { Button } from "../../ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetTitle,
} from "../../ui/bottom-sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../ui/dialog";
import { fmtEGP, fromCents } from "../../lib/money";
import { trackReorderClick, trackReorderSuccess } from "../../lib/analytics";

export type UseReorderFlowOptions = {
  userId?: string | null;
  allowAutoReplace?: boolean;
  showChangesSummary?: boolean;
  onNavigateToCart?: () => void;
};

export type UseReorderFlowResult = {
  reorder: (orderId: string | null, vendorId?: string | null) => Promise<void>;
  reorderLoadingId: string | null;
  dialogs: React.ReactNode;
};

export function useReorderFlow(options?: UseReorderFlowOptions): UseReorderFlowResult {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const queryClient = useQueryClient();
  const cart = useCart({ userId: options?.userId });
  const providersQuery = useProviders();
  const providers = providersQuery.data?.data ?? [];
  const providerMap = useMemo(() => new Map(providers.map((p) => [p.id, p])), [providers]);

  const allowAutoReplace = options?.allowAutoReplace ?? false;
  const showChangesSummary = options?.showChangesSummary ?? true;

  const [reorderLoadingId, setReorderLoadingId] = useState<string | null>(null);
  const [reorderSummary, setReorderSummary] = useState<ReorderFillResult | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [pendingReorder, setPendingReorder] = useState<{
    orderId: string;
    strategy: "SKIP_MISSING" | "REPLACE_IF_POSSIBLE";
    preview?: ReorderPreview | null;
    vendorId?: string | null;
  } | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const reorder = async (orderId: string | null, vendorId?: string | null) => {
    if (!orderId) return;
    if (isOffline) {
      showToast({
        type: "error",
        message: t("orders.reorderOffline", "You are offline. Please reconnect to reorder."),
      });
      return;
    }
    let preview: ReorderPreview | null = null;
    const initialVendorId = vendorId ?? null;
    try {
      const strategy = allowAutoReplace ? "REPLACE_IF_POSSIBLE" : "SKIP_MISSING";
      setReorderLoadingId(orderId);
      trackReorderClick(orderId, initialVendorId);
      preview = await getReorderPreview(orderId);
      const resolvedVendorId = preview.vendorId ?? initialVendorId;
      if (!preview.itemsAvailable || preview.itemsAvailable.length === 0) {
        showToast({
          type: "error",
          message: t("orders.reorderEmpty", "We couldn't find available items to reorder."),
        });
        return;
      }
      const result = await fillFromOrder({ orderId, strategy });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      trackReorderSuccess(orderId, resolvedVendorId);
      if (showChangesSummary && hasReorderChanges(result)) {
        setReorderSummary(result);
        setSummaryOpen(true);
      } else {
        showToast({ type: "success", message: t("orders.reorderSuccess", "Items added to your cart.") });
        options?.onNavigateToCart?.();
      }
    } catch (error) {
      const { code } = extractApiError(error);
      if (code === "CART_PROVIDER_MISMATCH" || code === "CART_BRANCH_MISMATCH") {
        setPendingReorder({
          orderId,
          strategy: allowAutoReplace ? "REPLACE_IF_POSSIBLE" : "SKIP_MISSING",
          preview,
          vendorId: preview?.vendorId ?? initialVendorId,
        });
        setConflictOpen(true);
        return;
      }
      showToast({
        type: "error",
        message: t("orders.reorderError", "Unable to reorder right now."),
      });
    } finally {
      setReorderLoadingId(null);
    }
  };

  const handleConfirmConflict = async () => {
    if (!pendingReorder) return;
    const { orderId, strategy, vendorId } = pendingReorder;
    setConflictOpen(false);
    setReorderLoadingId(orderId);
    try {
      const result = await fillFromOrder({ orderId, strategy, clearExistingCart: true });
      await queryClient.invalidateQueries({ queryKey: ["cart"] });
      trackReorderSuccess(orderId, vendorId ?? null);
      if (showChangesSummary && hasReorderChanges(result)) {
        setReorderSummary(result);
        setSummaryOpen(true);
      } else {
        showToast({ type: "success", message: t("orders.reorderSuccess", "Items added to your cart.") });
        options?.onNavigateToCart?.();
      }
    } catch {
      showToast({
        type: "error",
        message: t("orders.reorderError", "Unable to reorder right now."),
      });
    } finally {
      setReorderLoadingId(null);
      setPendingReorder(null);
    }
  };

  const resolveCartProviderLabel = () => {
    const groups = cart.rawCart?.groups ?? [];
    const group = groups[0];
    if (!group) return null;
    const isArabic = i18n.language?.startsWith("ar");
    return isArabic ? group.branchNameAr || group.branchName : group.branchName || group.branchNameAr;
  };

  const resolveOrderProviderLabel = () => {
    const previewVendorId = pendingReorder?.preview?.vendorId ?? null;
    if (!previewVendorId) return null;
    const provider = providerMap.get(previewVendorId);
    if (!provider) return null;
    const isArabic = i18n.language?.startsWith("ar");
    return isArabic ? provider.nameAr || provider.name : provider.name || provider.nameAr;
  };

  const cartProviderLabel = resolveCartProviderLabel() || t("providers.providerFallback", "Provider");
  const orderProviderLabel = resolveOrderProviderLabel() || t("providers.providerFallback", "Provider");
  const conflictMessage = t("orders.reorderConflict", {
    current: cartProviderLabel,
    next: orderProviderLabel,
    defaultValue: `Your cart is currently from ${cartProviderLabel}. Clear it to reorder from ${orderProviderLabel}.`,
  });

  const dialogs = (
    <>
      <BottomSheet open={conflictOpen} onOpenChange={(open) => !open && setConflictOpen(false)}>
        <BottomSheetContent>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("orders.reorderConflictTitle", "Replace cart?")}</BottomSheetTitle>
            <BottomSheetDescription>{conflictMessage}</BottomSheetDescription>
          </BottomSheetHeader>
          <BottomSheetFooter>
            <Button variant="outline" onClick={() => setConflictOpen(false)}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button onClick={handleConfirmConflict} className="bg-primary hover:bg-primary/90 text-white">
              {t("orders.reorderConflictConfirm", "Clear cart & continue")}
            </Button>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheet>
      <Dialog
        open={summaryOpen}
        onOpenChange={(open) => {
          setSummaryOpen(open);
          if (!open) setReorderSummary(null);
        }}
      >
        <DialogContent
          className="max-h-[80vh] overflow-y-auto space-y-4"
          aria-describedby={undefined}
        >
          <DialogHeader>
            <DialogTitle>{t("orders.reorderSummaryTitle", "Reorder changes")}</DialogTitle>
          </DialogHeader>
          {(() => {
            const skipped = reorderSummary?.changes?.skipped ?? [];
            const replaced = reorderSummary?.changes?.replaced ?? [];
            const priceChanged = reorderSummary?.changes?.priceChanged ?? [];
            return (
              <div className="space-y-4">
                {skipped.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("orders.reorderSummaryMissing", "Unavailable items")}
                    </p>
                    <div className="rounded-xl bg-amber-50 text-amber-900 text-xs p-3 space-y-1">
                      {skipped.map((item) => (
                        <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <span>x{item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {replaced.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("orders.reorderSummaryReplaced", "Replaced items")}
                    </p>
                    <div className="rounded-xl bg-blue-50 text-blue-900 text-xs p-3 space-y-1">
                      {replaced.map((item) => (
                        <div key={`${item.fromProductId}-${item.toProductId}`} className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <span>{t("orders.reorderSummaryReplacedLabel", "Replacement")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {priceChanged.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("orders.reorderSummaryPrice", "Price updates")}
                    </p>
                    <div className="rounded-xl bg-gray-50 text-gray-700 text-xs p-3 space-y-1">
                      {priceChanged.map((item) => (
                        <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between gap-2">
                          <span className="flex-1">{item.name}</span>
                          <span className="text-gray-500 line-through">{fmtEGP(fromCents(item.oldPriceCents))}</span>
                          <span className="font-semibold text-gray-900">{fmtEGP(fromCents(item.newPriceCents))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSummaryOpen(false);
                setReorderSummary(null);
              }}
            >
              {t("common.close", "Close")}
            </Button>
            <Button
              onClick={() => {
                setSummaryOpen(false);
                setReorderSummary(null);
                options?.onNavigateToCart?.();
              }}
            >
              {t("orders.reorderSummaryCta", "View cart")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { reorder, reorderLoadingId, dialogs };
}

function hasReorderChanges(result: ReorderFillResult | null) {
  if (!result?.changes) return false;
  return (
    (result.changes.skipped?.length ?? 0) > 0 ||
    (result.changes.replaced?.length ?? 0) > 0 ||
    (result.changes.priceChanged?.length ?? 0) > 0
  );
}
