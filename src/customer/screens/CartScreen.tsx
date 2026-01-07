import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Separator } from "../../ui/separator";
import { Skeleton } from "../../ui/skeleton";
import { AlertTriangle, ArrowLeft, Minus, Plus, ShoppingCart, Trash2, WifiOff, Clock } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { SmartImage } from "../../components/SmartImage";
import { useToast } from "../providers/ToastProvider";
import { fmtEGP, fromCents } from "../../lib/money";
import { useCart, useNetworkStatus, useApiErrorToast, useAddresses } from "../hooks";
import { NetworkBanner } from "../components";
import { goToHome } from "../navigation/navigation";
import type { CartPreviewItem } from "../types";
import type { ApiCart } from "../../services/cart";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { extractNoticeMessage } from "../../utils/extractNoticeMessage";
import { isFeatureEnabled } from "../utils/mobileAppConfig";

interface CartScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

type DisplayCartItem = {
  id: string;
  productId: string;
  name: string;
  image?: string;
  qty: number;
  priceCents: number;
  salePriceCents?: number | null;
};

function computeDisplayItems(
  source: "server" | "local",
  rawCart: ApiCart | null,
  previewItems: CartPreviewItem[]
) {
  if (source === "server") {
    return (rawCart?.items ?? []).map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.product?.name ?? "",
      image: item.product?.imageUrl ?? undefined,
      qty: item.qty,
      priceCents: item.priceCents,
      salePriceCents: item.product?.salePriceCents ?? null,
    }));
  }

  return previewItems.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.name,
    image: item.image,
    qty: item.quantity,
    priceCents: Math.round(item.price * 100),
    salePriceCents: item.product?.salePriceCents ?? null,
  }));
}

export function CartScreen({ appState, updateAppState }: CartScreenProps) {
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const addressesQuery = useAddresses({ enabled: Boolean(appState.user?.id) });
  const primaryAddress = useMemo(() => {
    const list = addressesQuery.addresses ?? [];
    return (
      list.find((addr) => addr.isDefault && addr.zoneId) ??
      list.find((addr) => addr.zoneId) ??
      list[0] ??
      null
    );
  }, [addressesQuery.addresses]);
  const cart = useCart({ userId: appState.user?.id, addressId: primaryAddress?.id ?? null });
  const apiErrorToast = useApiErrorToast("cart.updateError");
  const isAuthenticated = Boolean(appState.user);
  const guestCheckoutEnabled = isFeatureEnabled(appState.settings?.mobileApp, "guestCheckout", true);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"inc" | "dec" | "remove" | null>(null);
  const isRTL = i18n.dir() === "rtl";

  const displayItems = useMemo(
    () => computeDisplayItems(cart.source, cart.rawCart, cart.items),
    [cart.source, cart.rawCart, cart.items]
  );

  const loading = cart.isLoading || cart.isFetching || cart.isMerging;
  const cartError = cart.isError ? cart.error : cart.mergeError;
  const showEmptyState = !loading && displayItems.length === 0 && !cartError;
  const cartGroups = cart.rawCart?.groups ?? [];
  const deliveryRequiresLocation = Boolean(
    cart.rawCart?.delivery?.requiresLocation || cartGroups.some((group) => group.deliveryRequiresLocation)
  );
  const locationMissing = !primaryAddress || primaryAddress.lat == null || primaryAddress.lng == null;
  const subtotalDisplay = fmtEGP(cart.subtotal);
  const shippingDisplay = fmtEGP(fromCents(cart.shippingFeeCents));
  const serviceFeeDisplay = fmtEGP(fromCents(cart.serviceFeeCents));
  const couponDisplay = cart.discountCents ? fmtEGP(fromCents(cart.discountCents)) : null;
  const loyaltyDisplay = cart.loyaltyDiscountCents ? fmtEGP(fromCents(cart.loyaltyDiscountCents)) : null;
  const totalCents = Math.max(
    0,
    cart.subtotalCents +
      cart.shippingFeeCents +
      cart.serviceFeeCents -
      cart.discountCents -
      cart.loyaltyDiscountCents
  );
  const totalDisplay = fmtEGP(fromCents(totalCents));
  const couponNoticeText = extractNoticeMessage(cart.rawCart?.couponNotice);
  const loyaltyLimitText =
    cart.loyaltyMaxRedeemablePoints && cart.loyaltyMaxRedeemablePoints > 0
      ? t("cart.loyaltyLimit", {
          value: cart.loyaltyMaxRedeemablePoints,
          defaultValue: `Up to ${cart.loyaltyMaxRedeemablePoints} loyalty points can be used at checkout.`,
        })
      : null;
  const etaLabel = cart.deliveryEstimateMinutes
    ? t("checkout.summary.etaValue", {
        value: `${cart.deliveryEstimateMinutes} ${t("checkout.summary.minutes", "min")}`,
      })
    : t("cart.summaryEtaFallback");
  const addressWarningText = deliveryRequiresLocation
    ? t("cart.locationRequired", "Add a delivery location to calculate delivery fees.")
    : t("cart.addressWarning");
  const showAddressWarning = Boolean(
    appState.user &&
      !addressesQuery.isLoading &&
      !addressesQuery.isFetching &&
      (deliveryRequiresLocation ? locationMissing : !primaryAddress || !primaryAddress.zoneId)
  );
  const cartErrorMessage = cartError
    ? mapApiErrorToMessage(cartError, "cart.loadError")
    : t("cart.loadError", "We couldn't load your cart. Please try again.");

  async function withFeedback<T>(itemId: string, action: "inc" | "dec" | "remove", fn: () => Promise<T>) {
    setPendingItemId(itemId);
    setPendingAction(action);
    try {
      await fn();
    } catch (error: any) {
      apiErrorToast(error, "cart.updateError");
    } finally {
      setPendingItemId(null);
      setPendingAction(null);
    }
  }

  const onInc = (item: DisplayCartItem) =>
    withFeedback(item.id, "inc", () =>
      cart.updateQuantity({
        itemId: cart.source === "server" ? item.id : undefined,
        productId: item.productId,
        qty: item.qty + 1,
      })
    );

  const onDec = (item: DisplayCartItem) => {
    if (item.qty <= 1) return;
    return withFeedback(item.id, "dec", () =>
      cart.updateQuantity({
        itemId: cart.source === "server" ? item.id : undefined,
        productId: item.productId,
        qty: item.qty - 1,
      })
    );
  };

  const onRemove = (item: DisplayCartItem) =>
    withFeedback(item.id, "remove", () =>
      cart.removeItem({
        itemId: cart.source === "server" ? item.id : undefined,
        productId: item.productId,
      })
    );

  const handleCheckout = () => {
    if (!isAuthenticated) {
      if (!guestCheckoutEnabled) {
        showToast({
          type: "info",
          message: t("cart.loginToCheckout", "Sign in to checkout and sync your cart."),
          actionLabel: t("auth.signIn"),
          onAction: () => updateAppState({ currentScreen: "auth" }),
        });
        return;
      }
      if (isOffline) {
        showToast({
          type: "error",
          message: t("cart.offlineCheckout", "You are offline. Please reconnect to continue."),
        });
        return;
      }
      updateAppState({ currentScreen: "checkout" });
      return;
    }
    if (isOffline) {
      showToast({
        type: "error",
        message: t("cart.offlineCheckout", "You are offline. Please reconnect to continue."),
      });
      return;
    }
    updateAppState({ currentScreen: "checkout" });
  };

  const disabledBecausePending = (item: DisplayCartItem) =>
    pendingItemId === item.id || cart.updatingItemId === item.id || cart.removingItemId === item.id;

  const renderItem = (item: DisplayCartItem) => {
    const effectiveCents = item.salePriceCents ?? item.priceCents;
    const totalLabel = fmtEGP(fromCents(effectiveCents * item.qty));
    const unitLabel = fmtEGP(fromCents(effectiveCents));
    const disabled = disabledBecausePending(item);

    return (
      <div
        key={item.id}
        className="inline-card shadow-card flex gap-3 border border-border rounded-2xl hover:-translate-y-0.5 transition-transform duration-200"
      >
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {item.image ? (
            <SmartImage src={item.image} alt={item.name} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400 px-2 text-center">
              {t("cart.imageUnavailable", "No image")}
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500">{unitLabel}</p>
            </div>
            <button
              aria-label={t("cart.remove", "Remove item")}
              className="text-gray-400 hover:text-red-500 transition"
              onClick={() => onRemove(item)}
              disabled={disabled}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className={`flex items-center justify-between mt-3 ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className="inline-flex items-center border border-gray-200 rounded-full bg-gray-50 shadow-inner">
              <button
                className="px-3 py-1 text-gray-600 disabled:text-gray-300"
                onClick={() => onDec(item)}
                disabled={disabled || item.qty <= 1}
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold min-w-[40px] text-center">{item.qty}</span>
              <button
                className="px-3 py-1 text-gray-600 disabled:text-gray-300"
                onClick={() => onInc(item)}
                disabled={disabled || item.qty >= 99}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="font-poppins text-lg text-gray-900 price-text" style={{ fontWeight: 600 }}>
              {totalLabel}
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (showEmptyState) {
    return (
      <div className="page-shell">
        <NetworkBanner />
        <div className="section-card">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => goToHome(updateAppState)} className="p-2 mr-2 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("cart.title")}
            </h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-card text-primary">
            <ShoppingCart className="w-10 h-10" />
          </div>
          <h2 className="font-poppins text-xl text-gray-900 mb-2" style={{ fontWeight: 600 }}>
            {t("cart.emptyTitle")}
          </h2>
          <p className="text-gray-600">{t("cart.emptySubtitle")}</p>
          <Button onClick={() => goToHome(updateAppState)} className="h-12 px-8 rounded-xl">
            {t("cart.startShopping")}
          </Button>
        </div>
        <MobileNav appState={appState} updateAppState={updateAppState} />
      </div>
    );
  }

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => goToHome(updateAppState)} className="p-2 mr-2 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("cart.title")}
            </h1>
          </div>
          {!isAuthenticated && displayItems.length > 0 && (
            <Button variant="ghost" size="sm" className="text-primary" onClick={() => cart.clearLocal()}>
              {t("cart.clear", "Clear")}
            </Button>
          )}
        </div>
      </div>

      {isOffline && (
        <div className="inline-card bg-amber-50 text-amber-900 flex items-center gap-2 text-sm justify-center">
          <WifiOff className="w-4 h-4" />
          {t("offline.message", "You are offline. Changes will sync once you reconnect.")}
        </div>
      )}

      {cart.isMerging && (
        <div className="inline-card bg-blue-50 text-blue-900 text-xs text-center">
          {t("cart.syncing", "Syncing your local cart...")}
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 w-full">
        {cartError ? (
          <div className="section-card text-center text-gray-700 space-y-3">
            <p>{cartErrorMessage}</p>
            <Button size="sm" onClick={() => cart.refetch()} className="rounded-full px-4">
              {t("common.retry", "Retry")}
            </Button>
          </div>
        ) : loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="inline-card shadow-card flex gap-3 border border-border rounded-2xl">
              <Skeleton className="w-20 h-20 rounded-xl skeleton-soft" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-2/3 skeleton-soft" />
                <Skeleton className="h-4 w-1/3 skeleton-soft" />
                <Skeleton className="h-8 w-full skeleton-soft" />
              </div>
            </div>
          ))
        ) : (
          displayItems.map(renderItem)
        )}
      </div>

      <div className="section-card space-y-3">
        {showAddressWarning && (
          <div className="bg-amber-50 text-amber-900 text-sm rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{addressWarningText}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-amber-900 border-amber-200"
              onClick={() => updateAppState({ currentScreen: "addresses" })}
            >
              {t("cart.manageAddresses")}
            </Button>
          </div>
        )}
        {addressesQuery.isError && (
          <p className="text-xs text-red-500">
            {t("cart.addressError")}
          </p>
        )}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-inner">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{t("cart.etaLabel", "Estimated delivery time")}</p>
            <p className="text-sm font-semibold text-gray-900">{etaLabel}</p>
          </div>
        </div>
        {cartGroups.length > 0 && (
          <div className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600 space-y-2">
            <p className="font-semibold text-gray-900">{t("cart.groupsTitle", "Delivery by branch")}</p>
            {cartGroups.map((group) => {
              const branchName = i18n.language?.startsWith("ar")
                ? group.branchNameAr || group.branchName || group.branchId
                : group.branchName || group.branchNameAr || group.branchId;
              const feeLabel = group.deliveryUnavailable
                ? t("cart.deliveryUnavailable", "Unavailable")
                : fmtEGP(fromCents(group.shippingFeeCents ?? 0));
              return (
                <div key={group.branchId} className="flex items-center justify-between">
                  <span className="text-gray-700">{branchName}</span>
                  <span className="font-medium text-gray-900">{feeLabel}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between text-gray-600 text-sm">
          <span>{t("cart.subtotalLabel", "Subtotal")}</span>
          <span className="font-medium text-gray-900 price-text">{subtotalDisplay}</span>
        </div>
        <div className="flex items-center justify-between text-gray-600 text-sm">
          <span>{t("cart.shippingLabel")}</span>
          <span className="font-medium text-gray-900 price-text">{shippingDisplay}</span>
        </div>
        {cart.source === "server" && (
          <div className="flex items-center justify-between text-gray-600 text-sm">
            <span>{t("cart.serviceFeeLabel", "Service fee")}</span>
            <span className="font-medium text-gray-900 price-text">{serviceFeeDisplay}</span>
          </div>
        )}
        {couponDisplay && (
          <div className="flex items-center justify-between text-red-500 text-sm">
            <span>{t("cart.couponLabel")}</span>
            <span className="price-text">-{couponDisplay}</span>
          </div>
        )}
        {loyaltyDisplay && (
          <div className="flex items-center justify-between text-red-500 text-sm">
            <span>{t("cart.loyaltyLabel")}</span>
            <span className="price-text">-{loyaltyDisplay}</span>
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between text-gray-900 text-lg font-semibold">
          <span>{t("cart.totalLabel")}</span>
          <span className="text-primary price-text">{totalDisplay}</span>
        </div>
        <p className="text-xs text-gray-500">{etaLabel}</p>
        {couponNoticeText && (
          <div className="bg-amber-50 text-amber-900 text-xs rounded-xl p-2 border border-amber-100">
            {couponNoticeText}
          </div>
        )}
        {loyaltyLimitText && <p className="text-xs text-gray-500">{loyaltyLimitText}</p>}
        <p className="text-xs text-gray-500">
          {isAuthenticated
            ? t("cart.summaryNote", "Delivery fees and discounts are calculated at checkout.")
            : guestCheckoutEnabled
              ? t("cart.guestSummaryNote", "Delivery fees are calculated at checkout.")
              : t("cart.localSummaryNote", "Login to see delivery fees and synced totals.")}
        </p>
        <Button
          onClick={handleCheckout}
          className="w-full h-12 rounded-xl"
          disabled={displayItems.length === 0 || pendingAction !== null}
        >
          {isAuthenticated
            ? t("cart.checkout", "Go to checkout")
            : guestCheckoutEnabled
              ? t("cart.checkoutGuest", "Checkout as guest")
              : t("cart.saveAndLogin", "Save & login to checkout")}
        </Button>
      </div>
      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}

