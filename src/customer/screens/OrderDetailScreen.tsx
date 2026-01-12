import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { ArrowLeft, Clock, Truck, CheckCircle2, XCircle, AlertTriangle, MapPin, CreditCard, MessageCircle, Star } from "lucide-react";
import { Badge } from "../../ui/badge";
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
import { Separator } from "../../ui/separator";
import { Textarea } from "../../ui/textarea";
import dayjs from "dayjs";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { fmtEGP, fromCents } from "../../lib/money";
import { MobileNav } from "../MobileNav";
import { NetworkBanner, RetryBlock, SkeletonList, EmptyState, OrderProgress } from "../components";
import {
  useApiErrorToast,
  useCancelOrderGroup,
  useNetworkStatus,
  useOrderDetail,
  useOrderDriverLocation,
  useOrderGroupDetail,
  useOrderReview,
  useOrderTimeline,
  useSaveReview,
} from "../hooks";
import { goToOrders } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { openMapLocation, openWhatsapp } from "../../lib/fasketLinks";
import type { OrderDetail, OrderGroupDetail, OrderGroupSummary } from "../../types/api";
import { useToast } from "../providers/ToastProvider";
import { useNotificationPreferences } from "../stores/notificationPreferences";

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
  PREPARING: { icon: Clock, variant: "default" },
  OUT_FOR_DELIVERY: { icon: Truck, variant: "default" },
  DELIVERY_FAILED: { icon: AlertTriangle, variant: "destructive" },
  DELIVERED: { icon: CheckCircle2, variant: "default" },
  CANCELED: { icon: XCircle, variant: "destructive" },
  FAILED: { icon: AlertTriangle, variant: "destructive" },
  DELIVERING: { icon: Truck, variant: "default" },
  COMPLETED: { icon: CheckCircle2, variant: "default" },
  PROCESSING: { icon: Clock, variant: "default" },
  SHIPPED: { icon: Truck, variant: "default" },
};

export function OrderDetailScreen({ appState, updateAppState }: OrderDetailScreenProps) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const { showToast } = useToast();
  const whatsappOrderUpdatesEnabled = useNotificationPreferences((state) => state.preferences.whatsappOrderUpdates ?? true);
  const apiErrorToast = useApiErrorToast("reviews.error");
  const cancelGroup = useCancelOrderGroup();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const selectedOrder = appState.selectedOrder;
  const isGroupSummary = (value: any): value is OrderGroupSummary =>
    Boolean(value && typeof value === "object" && "orderGroupId" in value);
  const isGroup = isGroupSummary(selectedOrder);
  const groupId = isGroup ? (selectedOrder as OrderGroupSummary).orderGroupId : null;
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
  const groupQuery = useOrderGroupDetail(groupId, {
    initialData: isGroup ? (selectedOrder as any) : undefined,
    enabled: isGroup && Boolean(groupId),
  });
  const orderDetail = !isGroup ? (orderQuery.data ?? null) : null;
  const groupOrder = isGroup ? ((groupQuery.data ?? selectedOrder) as OrderGroupDetail | null) : null;
  const order = isGroup ? groupOrder : orderDetail;
  const activeQuery = isGroup ? groupQuery : orderQuery;
  const loadErrorMessage = mapApiErrorToMessage(
    isGroup ? groupQuery.error : orderQuery.error,
    "orderDetail.messages.notFound"
  );
  const distancePricingEnabled = appState.settings?.delivery?.distancePricingEnabled ?? true;

  const statusKey = order?.status?.toUpperCase?.() || "PENDING";
  const statusMeta = STATUS_VARIANTS[statusKey] || { icon: Clock, variant: "outline" };
  const StatusIcon = statusMeta.icon;

  const reviewQuery = useOrderReview(!isGroup ? fallbackId : null, {
    enabled: !isGroup && Boolean(fallbackId),
  });
  const saveReview = useSaveReview(!isGroup ? fallbackId : null);
  const existingReview = reviewQuery.data ?? null;
  const [rating, setRating] = React.useState<number>(existingReview?.rating ?? 0);
  const [comment, setComment] = React.useState<string>(existingReview?.comment ?? "");

  React.useEffect(() => {
    if (!existingReview) {
      setRating(0);
      setComment("");
      return;
    }
    setRating(existingReview.rating ?? 0);
    setComment(existingReview.comment ?? "");
  }, [existingReview?.id]);

  const timelineQuery = useOrderTimeline(fallbackId, {
    enabled: !isGroup && Boolean(fallbackId),
  });
  const shouldTrackDriver =
    distancePricingEnabled &&
    !isGroup &&
    Boolean(orderDetail?.driver?.id || orderDetail?.driver?.fullName) &&
    (statusKey === "OUT_FOR_DELIVERY" || statusKey === "DELIVERING");
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
    const history = (timelineQuery.data ?? []).map((entry) => ({
      status: (entry.to || "").toUpperCase(),
      at: entry.createdAt || orderDetail?.createdAt,
      note: entry.note ?? null,
    }));
    const hasFailed =
      history.some((entry) => entry.status === "DELIVERY_FAILED") || statusKey === "DELIVERY_FAILED";
    const steps = [
      { key: "PENDING", label: t("orders.status.pending", "Pending") },
      { key: "CONFIRMED", label: t("orders.status.confirmed", "Confirmed") },
      { key: "PREPARING", label: t("orders.status.preparing", "Preparing") },
      { key: "OUT_FOR_DELIVERY", label: t("orders.status.out_for_delivery", "Out for delivery") },
      ...(hasFailed ? [{ key: "DELIVERY_FAILED", label: t("orders.status.delivery_failed", "Delivery failed") }] : []),
      { key: "DELIVERED", label: t("orders.status.delivered", "Delivered") },
    ];
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
  const groupSubOrders = groupOrder?.providerOrders ?? groupOrder?.orders ?? [];
  const cancelableStatuses = new Set(["PENDING", "CONFIRMED"]);
  const cancelableProviders = groupSubOrders.filter((sub) =>
    cancelableStatuses.has((sub.status || "").toUpperCase())
  );
  const blockedProviders = groupSubOrders.filter(
    (sub) => !cancelableStatuses.has((sub.status || "").toUpperCase())
  );
  const helpId = isGroup && groupOrder ? groupOrder.orderGroupId : fallbackId || "";
  const headerId = isGroup && groupOrder ? groupOrder.orderGroupId : fallbackId || "";
  const helpMessage = t("orderDetail.helpMessage", {
    id: helpId,
    defaultValue: `Hi, I need help with my Fasket order${helpId ? " #" + helpId : ""}.`,
  });
  const failedProvider = groupSubOrders.find(
    (sub) => (sub.status || "").toUpperCase() === "DELIVERY_FAILED"
  );
  const failureReason = isGroup ? failedProvider?.deliveryFailedReason : orderDetail?.deliveryFailedReason;
  const failureNote = isGroup ? failedProvider?.deliveryFailedNote : orderDetail?.deliveryFailedNote;

  const goBack = () => {
    goToOrders(updateAppState);
  };

  const canReview = !isGroup && statusKey === "DELIVERED";

  const reviewStatusLabel = (value?: string | null) => {
    if (!value) return "";
    const key = value.toLowerCase();
    if (key === "approved") return t("reviews.statusApproved", "Approved");
    if (key === "rejected") return t("reviews.statusRejected", "Rejected");
    return t("reviews.statusPending", "Pending");
  };

  const failureReasonLabel = (value?: string | null) => {
    if (!value) return t("orders.failureReasonUnknown", "Unknown");
    const key = value.toUpperCase();
    return t(`orders.failureReasons.${key}`, value);
  };

  const handleSubmitReview = async () => {
    if (!fallbackId) return;
    if (!rating || rating < 1) {
      showToast({ type: "warning", message: t("reviews.selectRating", "Please select a rating") });
      return;
    }
    try {
      await saveReview.mutateAsync({
        reviewId: existingReview?.id ?? null,
        rating,
        comment: comment.trim() || undefined,
      });
      showToast({
        type: "success",
        message: existingReview ? t("reviews.updated", "Review updated") : t("reviews.submitted", "Review submitted"),
      });
    } catch (error) {
      apiErrorToast(error, "reviews.submitError");
    }
  };

  const handleCancelGroup = async () => {
    if (!groupId) return;
    try {
      const result = await cancelGroup.mutateAsync(groupId);
      setCancelDialogOpen(false);
      if (groupQuery?.refetch) {
        groupQuery.refetch();
      }
      const cancelledCount = result.cancelledProviders?.length ?? 0;
      const blockedCount = result.blockedProviders?.length ?? 0;
      const message =
        blockedCount > 0
          ? t("orders.cancelPartialSuccess", {
              cancelled: cancelledCount,
              blocked: blockedCount,
              defaultValue: `Canceled ${cancelledCount} providers, ${blockedCount} locked.`,
            })
          : t("orders.cancelSuccess", "Order canceled");
      showToast({ type: "success", message });
    } catch (error) {
      apiErrorToast(error, "orders.cancelError");
    }
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
            {headerId && <p className="text-xs text-gray-500">#{headerId}</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {activeQuery.isLoading && <SkeletonList />}
        {activeQuery.isError && (
          <RetryBlock message={loadErrorMessage} onRetry={() => activeQuery.refetch()} />
        )}

        {!activeQuery.isLoading && !activeQuery.isError && !order && (
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
              <OrderProgress status={statusKey} className="mt-3" />
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  {whatsappOrderUpdatesEnabled
                    ? t(
                        "orderDetail.whatsappUpdatesHint",
                        "Order updates are sent via WhatsApp. Check WhatsApp for updates."
                      )
                    : t(
                        "orderDetail.whatsappUpdatesOffHint",
                        "WhatsApp updates are off. Enable them in Settings."
                      )}
                </span>
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
                      : orderDetail?.paymentMethod === "WALLET"
                        ? t("checkout.payment.wallet", "Wallet")
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

            {statusKey === "DELIVERY_FAILED" && (
              <section className="section-card space-y-2 border border-red-100 bg-red-50">
                <div className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-700">
                      {t("orders.deliveryFailedTitle", "Delivery failed")}
                    </p>
                    <p className="text-xs text-red-600">
                      {t("orders.deliveryFailedReason", {
                        reason: failureReasonLabel(failureReason),
                        defaultValue: `Reason: ${failureReasonLabel(failureReason)}`,
                      })}
                    </p>
                    {failureNote && <p className="text-xs text-red-600 mt-1">{failureNote}</p>}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => openWhatsapp(helpMessage)}
                  disabled={isOffline}
                >
                  {t("orders.contactSupport", "Contact support")}
                </Button>
              </section>
            )}

            {isGroup ? (
              <section className="section-card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-gray-900">
                    {t("orderDetail.groupProviders", {
                      count: groupSubOrders.length,
                      defaultValue: `This order contains ${groupSubOrders.length} providers`,
                    })}
                  </h2>
                </div>
                <div className="space-y-3">
                  {groupSubOrders.map((sub) => {
                    const subStatusKey = (sub.status || "").toUpperCase() || "PENDING";
                    const subStatusMeta = STATUS_VARIANTS[subStatusKey] || {
                      icon: Clock,
                      variant: "outline",
                    };
                    const SubIcon = subStatusMeta.icon;
                    return (
                      <div key={sub.id} className="rounded-xl border border-gray-200 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {sub.providerName || t("orders.providerFallback", "Provider")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t(`orders.status.${subStatusKey.toLowerCase()}`)}
                            </p>
                          </div>
                          <Badge variant={subStatusMeta.variant} className="flex items-center gap-1">
                            <SubIcon className="w-3 h-3" />
                            <span className="text-xs">{t(`orders.status.${subStatusKey.toLowerCase()}`)}</span>
                          </Badge>
                        </div>
                        {subStatusKey === "DELIVERY_FAILED" && (
                          <p className="text-xs text-red-600">
                            {t("orders.deliveryFailedReason", {
                              reason: failureReasonLabel(sub.deliveryFailedReason),
                              defaultValue: `Reason: ${failureReasonLabel(sub.deliveryFailedReason)}`,
                            })}
                          </p>
                        )}
                        {(sub.items ?? []).length > 0 && (
                          <div className="space-y-2 text-sm">
                            {(sub.items ?? []).map((item) => (
                              <div key={item.id} className="flex items-center justify-between">
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
                        )}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                          <div className="flex justify-between">
                            <span>{t("checkout.summary.subtotal")}</span>
                            <span>{fmtEGP(fromCents(sub.subtotalCents || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t("checkout.summary.serviceFee", "Service fee")}</span>
                            <span>{fmtEGP(fromCents(sub.serviceFeeCents || 0))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{t("checkout.summary.delivery")}</span>
                            <span>{fmtEGP(fromCents(sub.shippingFeeCents || 0))}</span>
                          </div>
                          <div className="flex justify-between font-semibold text-gray-900">
                            <span>{t("checkout.summary.total")}</span>
                            <span>{fmtEGP(fromCents(sub.totalCents || 0))}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <div className="flex justify-between">
                  <span>{t("checkout.summary.serviceFee", "Service fee")}</span>
                  <span className="price-text">{fmtEGP(fromCents(order.serviceFeeCents || 0))}</span>
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

            {isGroup && (
              <section className="section-card space-y-3">
                <h2 className="font-medium text-gray-900">{t("orders.manageGroup", "Manage order")}</h2>
                {cancelableProviders.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">
                      {blockedProviders.length > 0
                        ? t("orders.cancelPartialHint", "You can only cancel some providers in this order.")
                        : t("orders.cancelHint", "You can cancel this order before preparation starts.")}
                    </p>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => setCancelDialogOpen(true)}
                      disabled={cancelGroup.isPending || isOffline}
                    >
                      {cancelGroup.isPending
                        ? t("orders.canceling", "Canceling...")
                        : t("orders.cancel", "Cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      {t("orders.cancelLocked", "Cancellation is locked after preparation starts.")}
                    </p>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => openWhatsapp(helpMessage)}
                      disabled={isOffline}
                    >
                      {t("orders.contactSupport", "Contact support")}
                    </Button>
                  </>
                )}
              </section>
            )}

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

            {canReview && (
              <section className="section-card space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-medium text-gray-900">{t("reviews.title", "Rate this order")}</h2>
                  {existingReview?.status && (
                    <Badge variant="outline">{reviewStatusLabel(existingReview.status)}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }, (_, idx) => {
                    const value = idx + 1;
                    const active = value <= rating;
                    return (
                      <button
                        key={value}
                        type="button"
                        className="p-1"
                        onClick={() => setRating(value)}
                        aria-label={t("reviews.star", { count: value, defaultValue: `${value} stars` })}
                      >
                        <Star
                          className={`w-5 h-5 ${active ? "text-yellow-500" : "text-gray-300"}`}
                          fill={active ? "currentColor" : "none"}
                        />
                      </button>
                    );
                  })}
                </div>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder={t("reviews.commentPlaceholder", "Share your experience (optional)")}
                  rows={3}
                />
                <Button
                  className="w-full"
                  onClick={handleSubmitReview}
                  disabled={saveReview.isPending || isOffline}
                >
                  {existingReview ? t("reviews.updateButton", "Update review") : t("reviews.submitButton", "Submit review")}
                </Button>
                {reviewQuery.isError && (
                  <p className="text-xs text-red-600">
                    {t("reviews.loadError", "Unable to load your review right now.")}
                  </p>
                )}
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

            {isGroup && (
              <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("orders.cancelConfirmTitle", "Cancel order")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {blockedProviders.length > 0
                        ? t(
                            "orders.cancelPartialWarning",
                            "Some providers already started preparing. We will cancel only eligible providers."
                          )
                        : t("orders.cancelConfirm", "Are you sure you want to cancel this order?")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleCancelGroup} disabled={cancelGroup.isPending}>
                      {cancelGroup.isPending
                        ? t("orders.canceling", "Canceling...")
                        : t("orders.cancel", "Cancel")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}
