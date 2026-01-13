import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { CheckCircle, Clock, MapPin, Phone, Star, CreditCard, MessageCircle } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { useProducts, useCart, useCartGuard, useApiErrorToast } from "../hooks";
import type { OrderDetail, OrderGroupSummary, Product } from "../../types/api";
import { fmtEGP, fromCents } from "../../lib/money";
import { NetworkBanner, ProductCard, ProductCardSkeleton } from "../components";
import { trackAddToCart, trackOrderPlaced } from "../../lib/analytics";
import { goToHome, goToProduct } from "../navigation/navigation";
import { useToast } from "../providers/ToastProvider";
import { openExternalUrl } from "../../lib/fasketLinks";
import { resolveSupportConfig } from "../utils/mobileAppConfig";
import { useNotificationPreferences } from "../stores/notificationPreferences";

interface OrderSuccessScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

export function OrderSuccessScreen({ appState, updateAppState }: OrderSuccessScreenProps) {
  const order = appState.lastOrder;
  const { t, i18n } = useTranslation();
  const { showToast } = useToast();
  const isGuest = !appState.user;
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const supportConfig = resolveSupportConfig(appState.settings?.mobileApp ?? null, lang);
  const whatsappOrderUpdatesEnabled = useNotificationPreferences((state) => state.preferences.whatsappOrderUpdates ?? true);
  const isGroupSummary = (value: any): value is OrderGroupSummary =>
    Boolean(value && typeof value === "object" && "orderGroupId" in value);
  const isGroup = isGroupSummary(order);
  const detailOrder = !isGroup && order ? (order as OrderDetail) : null;
  const groupOrder = isGroup && order ? (order as OrderGroupSummary) : null;
  const bestQuery = useProducts(
    { type: "best-selling", limit: 6 },
    { enabled: !detailOrder?.recommendedProducts?.length }
  );
  const [showConfetti, setShowConfetti] = useState(true);
  const cart = useCart({ userId: appState.user?.id });
  const cartGuard = useCartGuard(cart);
  const apiErrorToast = useApiErrorToast("cart.updateError");

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!order) return;
    if (isGroup && groupOrder?.orderGroupId) {
      trackOrderPlaced(groupOrder.orderGroupId, order.totalCents);
      return;
    }
    if (detailOrder?.id) {
      trackOrderPlaced(detailOrder.id, order.totalCents);
    }
  }, [order, isGroup, groupOrder?.orderGroupId, detailOrder?.id]);

  useEffect(() => {
    if (!order) {
      goToHome(updateAppState);
    }
  }, [order, updateAppState]);

  const recommendations: Product[] = detailOrder?.recommendedProducts?.length
    ? detailOrder.recommendedProducts
    : bestQuery.data?.data ?? [];
  const staleData = bestQuery.data?.stale ?? false;

  const totalDisplay = order ? fmtEGP(fromCents(order.totalCents)) : "";
  const subtotalDisplay = order ? fmtEGP(fromCents(order.subtotalCents ?? 0)) : "";
  const shippingDisplay = order ? fmtEGP(fromCents(order.shippingFeeCents || 0)) : "";
  const serviceFeeDisplay = order ? fmtEGP(fromCents(order.serviceFeeCents || 0)) : "";
  const discountDisplay =
    order && order.discountCents ? fmtEGP(fromCents(order.discountCents)) : null;

  const etaText = useMemo(() => {
    if (!order) return "";
    if (detailOrder?.deliveryEstimateMinutes && detailOrder.deliveryEstimateMinutes > 0) {
      return `${detailOrder.deliveryEstimateMinutes} ${t("checkout.summary.minutes", "min")}`;
    }
    return t("orderSuccess.etaFallback");
  }, [order, detailOrder?.deliveryEstimateMinutes, t]);

  const scheduledLabel = useMemo(() => {
    if (!detailOrder) return null;
    if (!detailOrder.scheduledAt && !detailOrder.deliveryWindowId && !detailOrder.deliveryWindow) return null;
    const window = detailOrder.deliveryWindow ?? null;
    const windowName = window
      ? lang === "ar"
        ? window.nameAr || window.name
        : window.name || window.nameAr
      : null;
    const startLabel =
      window && typeof window.startMinutes === "number"
        ? dayjs().startOf("day").add(window.startMinutes, "minute").format("HH:mm")
        : null;
    const endLabel =
      window && typeof window.endMinutes === "number"
        ? dayjs().startOf("day").add(window.endMinutes, "minute").format("HH:mm")
        : null;
    const range = startLabel && endLabel ? `${startLabel} - ${endLabel}` : null;
    const windowLabel = windowName && range ? `${windowName} ${range}` : windowName || range;
    const scheduledAtLabel = detailOrder.scheduledAt
      ? dayjs(detailOrder.scheduledAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"))
      : null;
    if (scheduledAtLabel && windowLabel) return `${scheduledAtLabel} (${windowLabel})`;
    return scheduledAtLabel || windowLabel;
  }, [detailOrder, lang, t]);

  const addressLine = useMemo(() => {
    if (detailOrder?.address) {
      const parts = [detailOrder.address.label, detailOrder.address.street, detailOrder.address.city, detailOrder.address.zone]
        .filter(Boolean)
        .join(", ");
      return parts || t("orderSuccess.addressMissing");
    }
    if (isGuest && appState.guestSession?.address?.fullAddress) {
      return appState.guestSession.address.fullAddress;
    }
    return t("orderSuccess.addressMissing");
  }, [detailOrder?.address, t, isGuest, appState.guestSession?.address?.fullAddress]);

  if (!order) {
    return null;
  }

  const goToTrackOrder = () => {
    const trackCode = isGroup
      ? groupOrder?.code ?? groupOrder?.orderGroupId ?? null
      : detailOrder?.code ?? detailOrder?.id ?? null;
    if (isGuest) {
      updateAppState((prev) => ({
        ...prev,
        guestTracking: {
          phone: prev.guestTracking?.phone ?? prev.guestSession?.phone ?? undefined,
          code: trackCode ?? undefined,
        },
        currentScreen: "help",
      }));
      return;
    }
    if (isGroup) {
      updateAppState({
        selectedOrderId: null,
        selectedOrder: order,
        lastOrderId: null,
        selectedOrderSummary: null,
        currentScreen: "order-detail",
      });
      return;
    }
    if (!detailOrder) return;
    updateAppState({
      selectedOrderId: detailOrder.id,
      selectedOrder: detailOrder,
      lastOrderId: detailOrder.id,
      selectedOrderSummary: {
        id: detailOrder.id,
        totalCents: detailOrder.totalCents,
        status: detailOrder.status,
        createdAt: detailOrder.createdAt,
      },
      currentScreen: "order-detail",
    });
  };

  const handleAddRecommendation = async (product: Product) => {
    try {
      const added = await cartGuard.requestAdd(product, 1, undefined, () => {
        trackAddToCart(product.id, 1);
        showToast({ type: "success", message: t("products.buttons.added") });
      });
      if (!added) return;
    } catch (error: any) {
      apiErrorToast(error, "cart.updateError");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-green-50 to-white">
      <NetworkBanner stale={staleData} />
      <div className="flex-1 flex flex-col items-center justify-start lg:justify-center px-4 sm:px-6 py-6 sm:py-8 overflow-y-auto gap-6">
        <div className={`relative ${showConfetti ? "animate-bounce" : ""}`}>
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
          </div>
        </div>

        <h1 className="font-poppins text-2xl sm:text-3xl text-gray-900 text-center" style={{ fontWeight: 700 }}>
          {t("orderSuccess.title")}
        </h1>
        <p className="text-gray-600 text-center text-sm sm:text-base px-2">{t("orderSuccess.subtitle")}</p>

        <div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl p-4 sm:p-5 space-y-3 sm:space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-500">{t("orderSuccess.total")}</p>
              <p className="font-semibold text-2xl sm:text-3xl text-gray-900">{totalDisplay}</p>
            </div>
            <Badge variant="secondary">{t("orders.status.delivered")}</Badge>
          </div>
          {isGroup && (
            <div className="text-sm text-gray-700">
              {t("orderSuccess.groupNotice", {
                count: groupOrder?.orders.length ?? groupOrder?.providers?.length ?? 0,
                defaultValue: `Your order was split into ${groupOrder?.orders.length ?? groupOrder?.providers?.length ?? 0} orders.`,
              })}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{t("orderSuccess.estimated")} {etaText}</span>
          </div>
          {!isGroup && scheduledLabel && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-700">
                {t("orderSuccess.scheduledLabel", "Scheduled delivery")}: {scheduledLabel}
              </span>
            </div>
          )}
          {!isGroup && (
            <>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">{t("orderSuccess.address")}</p>
                  <p className="text-sm text-gray-900">{addressLine}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  {detailOrder?.paymentMethod === "COD"
                    ? t("checkout.payment.cod")
                    : detailOrder?.paymentMethod === "WALLET"
                      ? t("checkout.payment.wallet", "Wallet")
                      : t("checkout.payment.card")}
                </span>
              </div>
            </>
          )}
          {isGuest && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-xl p-2">
              {t("orderSuccess.guestHint", "Track your order using your phone number from the Help screen.")}
            </div>
          )}
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>
              {whatsappOrderUpdatesEnabled
                ? t(
                    "orderSuccess.whatsappUpdatesHint",
                    "Order updates are sent via WhatsApp. Check WhatsApp for updates."
                  )
                : t(
                    "orderSuccess.whatsappUpdatesOffHint",
                    "WhatsApp updates are off. Enable them in Settings."
                  )}
            </span>
          </div>
        </div>

        {isGroup && (
          <div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl p-4 sm:p-5 space-y-2 sm:space-y-3">
            <p className="text-sm text-gray-500">{t("orderSuccess.groupOrders", "Orders in this group")}</p>
            {(groupOrder?.orders ?? []).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">#{sub.code ?? sub.id}</p>
                  <p className="text-xs text-gray-500">{t(`orders.status.${sub.status.toLowerCase()}`)}</p>
                </div>
                <span className="font-semibold text-gray-900">{fmtEGP(fromCents(sub.totalCents))}</span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full max-w-3xl flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Button onClick={goToTrackOrder} className="rounded-xl w-full sm:w-auto justify-center">
            {t("orderSuccess.buttons.track")}
          </Button>
          <Button variant="outline" onClick={() => goToHome(updateAppState)} className="rounded-xl w-full sm:w-auto justify-center">
            {t("orderSuccess.buttons.continue")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => openExternalUrl(`tel:${supportConfig.supportPhone}`)}
            className="rounded-xl w-full sm:w-auto justify-center"
          >
            <Phone className="w-4 h-4 mr-1" /> {t("orderSuccess.buttons.call")}
          </Button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm w-full max-w-2xl p-4 sm:p-5 space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("checkout.summary.subtotal")}</span>
            <span className="font-semibold text-gray-900">{subtotalDisplay}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("checkout.summary.delivery")}</span>
            <span className="font-semibold text-gray-900">{shippingDisplay}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">{t("checkout.summary.serviceFee", "Service fee")}</span>
            <span className="font-semibold text-gray-900">{serviceFeeDisplay}</span>
          </div>
          {discountDisplay && (
            <div className="flex items-center justify-between text-red-500">
              <span>{t("checkout.summary.discount", "Discount")}</span>
              <span>-{discountDisplay}</span>
            </div>
          )}
        </div>

        <div className="w-full max-w-6xl mt-6 sm:mt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1 sm:px-2 mb-3 sm:mb-4">
            <h3 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
              {t("orderSuccess.recommendationsTitle")}
            </h3>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Star className="w-3 h-3" />
              {t("orderSuccess.specialOfferTitle")}
            </Badge>
          </div>
          {bestQuery.isLoading && recommendations.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Array.from({ length: 4 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {recommendations.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  adding={cart.addingProductId === product.id}
                  onAddToCart={handleAddRecommendation}
                  onPress={(p) => goToProduct(p.slug || p.id, updateAppState, { product: p })}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      {cartGuard.dialog}
    </div>
  );
}
