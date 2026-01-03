import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { ArrowLeft, Clock, Truck, CheckCircle2, XCircle, AlertTriangle, MapPin, CreditCard, MessageCircle } from "lucide-react";
import { Badge } from "../../ui/badge";
import { Separator } from "../../ui/separator";
import dayjs from "dayjs";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { fmtEGP, fromCents } from "../../lib/money";
import { MobileNav } from "../MobileNav";
import { NetworkBanner, RetryBlock, SkeletonList, EmptyState } from "../components";
import { useOrderDetail, useNetworkStatus, useOrderTimeline, useOrderDriverLocation } from "../hooks";
import { goToOrders } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { openMapLocation, openWhatsapp } from "../../lib/fasketLinks";
import type { OrderDetail, OrderGroupSummary } from "../../types/api";

interface OrderDetailScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const STATUS_VARIANTS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { icon: Clock, variant: "secondary" },
  CONFIRMED: { icon: CheckCircle2, variant: "default" },
  DELIVERING: { icon: Truck, variant: "default" },
  COMPLETED: { icon: CheckCircle2, variant: "default" },
  PROCESSING: { icon: Clock, variant: "default" },
  SHIPPED: { icon: Truck, variant: "default" },
  DELIVERED: { icon: CheckCircle2, variant: "default" },
  CANCELED: { icon: XCircle, variant: "destructive" },
  FAILED: { icon: AlertTriangle, variant: "destructive" },
};

export function OrderDetailScreen({ appState, updateAppState }: OrderDetailScreenProps) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const selectedOrder = appState.selectedOrder;
  const isGroupSummary = (value: any): value is OrderGroupSummary =>
    Boolean(value && typeof value === "object" && Array.isArray(value.orders) && value.orderGroupId);
  const isGroup = isGroupSummary(selectedOrder);
  const fallbackId = isGroup
    ? null
    : appState.selectedOrderId ||
      (appState.selectedOrder as any)?.id ||
      (appState.lastOrder as any)?.id ||
      appState.lastOrderId ||
      appState.selectedOrderSummary?.id;

  const orderQuery = useOrderDetail(fallbackId, {
    initialData: !isGroup ? (selectedOrder as any) : undefined,
    enabled: !isGroup && Boolean(fallbackId),
  });
  const order = isGroup ? (selectedOrder as OrderGroupSummary) : orderQuery.data ?? null;
  const orderDetail = !isGroup && order ? (order as OrderDetail) : null;
  const groupOrder = isGroup && order ? (order as OrderGroupSummary) : null;
  const loadErrorMessage = mapApiErrorToMessage(orderQuery.error, "orderDetail.messages.notFound");
  const distancePricingEnabled = appState.settings?.delivery?.distancePricingEnabled ?? true;

  const statusKey = order?.status?.toUpperCase?.() || "PENDING";
  const statusMeta = STATUS_VARIANTS[statusKey] || { icon: Clock, variant: "outline" };
  const StatusIcon = statusMeta.icon;

  const timelineQuery = useOrderTimeline(fallbackId, {
    enabled: !isGroup && Boolean(fallbackId),
  });
  const shouldTrackDriver =
    distancePricingEnabled &&
    !isGroup &&
    Boolean(orderDetail?.driver?.id || orderDetail?.driver?.fullName) &&
    statusKey === "DELIVERING";
  const driverLocationQuery = useOrderDriverLocation(fallbackId, {
    enabled: shouldTrackDriver && Boolean(fallbackId),
    refetchInterval: shouldTrackDriver ? 15000 : false,
  });
  const driverLocation = driverLocationQuery.data ?? null;
  const showTrackingCard =
    distancePricingEnabled && !isGroup && Boolean(orderDetail?.driver?.id || orderDetail?.driver?.fullName);
  const hasDriverLocation =
    Number.isFinite(driverLocation?.lat) && Number.isFinite(driverLocation?.lng);

  const timeline = React.useMemo(() => {
    if (!order || isGroup) return [];
    const steps = [
      { key: "PENDING", label: t("orders.status.pending", "Pending") },
      { key: "CONFIRMED", label: t("orders.status.confirmed", "Confirmed") },
      { key: "DELIVERING", label: t("orders.status.delivering", "Out for delivery") },
      { key: "COMPLETED", label: t("orders.status.completed", "Delivered") },
    ];
    const history = (timelineQuery.data ?? []).map((entry) => ({
      status: (entry.to || "").toUpperCase(),
      at: entry.createdAt || orderDetail?.createdAt,
      note: entry.note ?? null,
    }));
    const hasCancel =
      history.some((entry) => entry.status === "CANCELED") || statusKey === "CANCELED";
    const mergedSteps = hasCancel
      ? [...steps, { key: "CANCELED", label: t("orders.status.canceled", "Canceled") }]
      : steps;
    const reached = new Set(history.map((h) => h.status));
    const currentReached = mergedSteps.findIndex((s) => s.key === statusKey);
    return mergedSteps.map((step, idx) => {
      const historyMatch = history.find((h) => h.status === step.key);
      const at = historyMatch?.at || (idx === 0 ? orderDetail?.createdAt : null);
      const completed = reached.has(step.key) || (currentReached >= 0 && idx <= currentReached);
      return { ...step, at, completed, note: historyMatch?.note };
    });
  }, [orderDetail?.createdAt, statusKey, t, isGroup, timelineQuery.data]);

  const etaText = React.useMemo(() => {
    if (!orderDetail) return null;
    if (orderDetail.estimatedDeliveryTime) {
      return dayjs(orderDetail.estimatedDeliveryTime).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"));
    }
    if (orderDetail.deliveryEtaMinutes != null) {
      const minutes = orderDetail.deliveryEtaMinutes;
      return t("orderDetail.etaMinutes", { count: minutes, defaultValue: `${minutes} min` });
    }
    return null;
  }, [orderDetail?.estimatedDeliveryTime, orderDetail?.deliveryEtaMinutes, t]);

  const driverLocationTimestamp = driverLocation?.recordedAt
    ? dayjs(driverLocation.recordedAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"))
    : null;

  const addressLine = orderDetail?.address
    ? [orderDetail.address.label, orderDetail.address.street, orderDetail.address.city, orderDetail.address.zone]
        .filter(Boolean)
        .join(", ")
    : t("orderDetail.addressMissing", "No address provided");
  const helpId = isGroup && groupOrder ? groupOrder.orderGroupId : fallbackId || "";
  const helpMessage = t("orderDetail.helpMessage", {
    id: helpId,
    defaultValue: `Hi, I need help with my Fasket order${helpId ? " #" + helpId : ""}.`,
  });

  const goBack = () => {
    goToOrders(updateAppState);
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={goBack} className="p-2 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("orderDetail.title")}
            </h1>
            {fallbackId && <p className="text-xs text-gray-500">#{fallbackId}</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {orderQuery.isLoading && <SkeletonList />}
        {orderQuery.isError && (
          <RetryBlock message={loadErrorMessage} onRetry={() => orderQuery.refetch()} />
        )}

        {!orderQuery.isLoading && !orderQuery.isError && !order && (
          <EmptyState
            title={t("orderDetail.messages.notFound")}
            subtitle={t("orderDetail.messages.missing")}
            actionLabel={t("orders.startShopping", "Start shopping")}
            onAction={() => goToOrders(updateAppState)}
          />
        )}

        {order && (
          <>
            <section className="section-card space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {isGroup ? t("orderDetail.orderGroupId", "Order group") : t("orderDetail.orderId")}
                  </p>
                  <p className="font-medium text-gray-900">#{isGroup ? groupOrder?.orderGroupId : orderDetail?.id}</p>
                </div>
                <Badge variant={statusMeta.variant} className="flex items-center gap-1">
                  <StatusIcon className="w-3 h-3" />
                  <span className="text-xs">{t(`orders.status.${statusKey.toLowerCase()}`)}</span>
                </Badge>
              </div>
              <div className="text-sm text-gray-600">
                {t("orderDetail.createdAt", {
                  date: dayjs(order.createdAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm")),
                })}
              </div>
              <Separator />
              {!isGroup && (
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-500" />
                    <span>
                      {t("orderDetail.paymentMethod")} :{" "}
                      {orderDetail?.paymentMethod === "COD"
                        ? t("checkout.payment.cod")
                        : t("checkout.payment.card")}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("orderDetail.address")}</p>
                      <p className="font-medium text-gray-900">{addressLine}</p>
                    </div>
                  </div>
                  {etaText && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          {t("orderDetail.etaLabel", "Estimated arrival")}
                        </p>
                        <p className="font-medium text-gray-900">{etaText}</p>
                      </div>
                    </div>
                  )}
                  {(orderDetail?.deliveryZone?.nameEn || orderDetail?.deliveryZoneName) && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t("orderDetail.deliveryZone", "Delivery zone")}</p>
                        <p className="font-medium text-gray-900">
                          {orderDetail?.deliveryZone?.nameEn || orderDetail?.deliveryZoneName}
                        </p>
                      </div>
                    </div>
                  )}
                  {orderDetail?.driver?.fullName && (
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t("orderDetail.driver", "Driver")}</p>
                        <p className="font-medium text-gray-900">{orderDetail.driver.fullName}</p>
                        {orderDetail.driver.phone && <p className="text-gray-500">{orderDetail.driver.phone}</p>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>

            {isGroup ? (
              <section className="section-card space-y-2">
                <h2 className="font-medium text-gray-900">
                  {t("orderDetail.groupOrders", "Orders in this group")}
                </h2>
                <div className="space-y-3">
                  {(groupOrder?.orders ?? []).map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        updateAppState({
                          selectedOrderId: item.id,
                          selectedOrder: null,
                          currentScreen: "order-detail",
                        })
                      }
                      className="w-full text-left inline-card flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-medium text-gray-900">#{item.code ?? item.id}</p>
                        <p className="text-xs text-gray-500">
                          {t(`orders.status.${item.status.toLowerCase()}`)}
                        </p>
                      </div>
                      <div className="font-semibold text-gray-900 price-text">
                        {fmtEGP(fromCents(item.totalCents))}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ) : (
              <section className="section-card space-y-2">
                <h2 className="font-medium text-gray-900">{t("orderDetail.items")}</h2>
                <div className="space-y-3">
                  {(orderDetail?.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 pr-3">
                        <p className="font-medium text-gray-900 line-clamp-2">
                          {item.productNameSnapshot}
                        </p>
                        <p className="text-gray-500">
                          {t("orderDetail.quantity", { count: item.qty })}
                        </p>
                      </div>
                      <div className="font-semibold text-gray-900 price-text">
                        {fmtEGP(fromCents(item.priceSnapshotCents) * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="section-card space-y-2">
              <h2 className="font-medium text-gray-900">{t("orderDetail.summary")}</h2>
              <div className="space-y-1 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>{t("checkout.summary.subtotal")}</span>
                  <span className="price-text">{fmtEGP(fromCents(order.subtotalCents))}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("checkout.summary.delivery")}</span>
                  <span className="price-text">{fmtEGP(fromCents(order.shippingFeeCents || 0))}</span>
                </div>
                {order.discountCents ? (
                  <div className="flex justify-between text-red-500">
                    <span>{t("checkout.summary.discount", "Discount")}</span>
                    <span className="price-text">-{fmtEGP(fromCents(order.discountCents))}</span>
                  </div>
                ) : null}
                {orderDetail?.loyaltyDiscountCents ? (
                  <div className="flex justify-between text-green-700">
                    <span>{t("orderDetail.loyaltyDiscount", "Loyalty discount")}</span>
                    <span className="price-text">-{fmtEGP(fromCents(orderDetail.loyaltyDiscountCents))}</span>
                  </div>
                ) : null}
                {orderDetail?.loyaltyPointsRedeemed != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>{t("orderDetail.pointsRedeemed", "Points used")}</span>
                    <span>{orderDetail.loyaltyPointsRedeemed}</span>
                  </div>
                )}
                {orderDetail?.loyaltyPointsEarned != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>{t("orderDetail.pointsEarned", "Points earned")}</span>
                    <span>{orderDetail.loyaltyPointsEarned}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-poppins text-lg text-gray-900">
                  <span>{t("checkout.summary.total")}</span>
                  <span className="text-primary price-text">{fmtEGP(fromCents(order.totalCents))}</span>
                </div>
              </div>
            </section>

            {showTrackingCard && (
              <section className="section-card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-gray-900">{t("orderDetail.trackingTitle", "Live tracking")}</h2>
                  {driverLocationQuery.isFetching && (
                    <span className="text-xs text-gray-500">{t("orderDetail.trackingUpdating", "Updating")}</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {hasDriverLocation
                    ? t("orderDetail.trackingLastSeen", {
                        date: driverLocationTimestamp ?? "",
                        defaultValue: `Last update ${driverLocationTimestamp ?? ""}`.trim(),
                      })
                    : t("orderDetail.trackingWaiting", "Waiting for driver location updates.")}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    hasDriverLocation
                      ? openMapLocation({
                          lat: driverLocation!.lat,
                          lng: driverLocation!.lng,
                          label: orderDetail?.driver?.fullName ?? "Driver location",
                        })
                      : undefined
                  }
                  disabled={!hasDriverLocation || isOffline}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  {t("orderDetail.trackingOpenMap", "Open live map")}
                </Button>
              </section>
            )}

            {!isGroup && (
              <section className="section-card space-y-2">
                <h2 className="font-medium text-gray-900">{t("orderDetail.timeline", "Order timeline")}</h2>
                <div className="space-y-3">
                  {timeline.map((step) => (
                    <div key={step.key} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-1 ${step.completed ? "bg-green-500" : "bg-gray-300"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{step.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.at ? dayjs(step.at).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm")) : t("orderDetail.pendingTimestamp", "Pending update")}
                        </p>
                        {step.note && <p className="text-xs text-muted-foreground">{step.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="section-card space-y-2">
              <h2 className="font-medium text-gray-900">{t("orderDetail.helpTitle", "Need help with this order?")}</h2>
              <p className="text-sm text-gray-600">
                {t("orderDetail.helpSubtitle", "Chat with us on WhatsApp and we'll assist right away.")}
              </p>
              <Button
                className="rounded-xl w-full"
                onClick={() => openWhatsapp(helpMessage)}
                disabled={isOffline}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {t("orderDetail.helpButton", "Contact via WhatsApp")}
              </Button>
            </section>
          </>
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
