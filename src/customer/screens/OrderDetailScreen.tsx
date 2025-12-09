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
import { useOrderDetail, useNetworkStatus } from "../hooks";
import { goToOrders } from "../navigation/navigation";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import { openWhatsapp } from "../../lib/fasketLinks";

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
  const fallbackId =
    appState.selectedOrderId ||
    appState.selectedOrder?.id ||
    appState.lastOrder?.id ||
    appState.lastOrderId ||
    appState.selectedOrderSummary?.id;

  const orderQuery = useOrderDetail(fallbackId, {
    initialData: appState.selectedOrder || undefined,
  });
  const order = orderQuery.data ?? null;
  const loadErrorMessage = mapApiErrorToMessage(orderQuery.error, "orderDetail.messages.notFound");

  const statusKey = order?.status?.toUpperCase?.() || "PENDING";
  const statusMeta = STATUS_VARIANTS[statusKey] || { icon: Clock, variant: "outline" };
  const StatusIcon = statusMeta.icon;

  const addressLine = order?.address
    ? [order.address.label, order.address.street, order.address.city, order.address.zone]
        .filter(Boolean)
        .join(", ")
    : t("orderDetail.addressMissing", "No address provided");
  const helpMessage = t("orderDetail.helpMessage", {
    id: fallbackId || "",
    defaultValue: `Hi, I need help with my Fasket order${fallbackId ? " #" + fallbackId : ""}.`,
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
                  <p className="text-sm text-gray-500">{t("orderDetail.orderId")}</p>
                  <p className="font-medium text-gray-900">#{order.id}</p>
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
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-500" />
                  <span>
                    {t("orderDetail.paymentMethod")} :{" "}
                    {order.paymentMethod === "COD"
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
                {(order.deliveryZone?.nameEn || order.deliveryZoneName) && (
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("orderDetail.deliveryZone", "Delivery zone")}</p>
                      <p className="font-medium text-gray-900">
                        {order.deliveryZone?.nameEn || order.deliveryZoneName}
                      </p>
                    </div>
                  </div>
                )}
                {order.driver?.fullName && (
                  <div className="flex items-start gap-2">
                    <Truck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 mb-1">{t("orderDetail.driver", "Driver")}</p>
                      <p className="font-medium text-gray-900">{order.driver.fullName}</p>
                      {order.driver.phone && <p className="text-gray-500">{order.driver.phone}</p>}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section-card space-y-2">
              <h2 className="font-medium text-gray-900">{t("orderDetail.items")}</h2>
              <div className="space-y-3">
                {order.items.map((item) => (
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
                {order.loyaltyDiscountCents ? (
                  <div className="flex justify-between text-green-700">
                    <span>{t("orderDetail.loyaltyDiscount", "Loyalty discount")}</span>
                    <span className="price-text">-{fmtEGP(fromCents(order.loyaltyDiscountCents))}</span>
                  </div>
                ) : null}
                {order.loyaltyPointsRedeemed != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>{t("orderDetail.pointsRedeemed", "Points used")}</span>
                    <span>{order.loyaltyPointsRedeemed}</span>
                  </div>
                )}
                {order.loyaltyPointsEarned != null && (
                  <div className="flex justify-between text-gray-600">
                    <span>{t("orderDetail.pointsEarned", "Points earned")}</span>
                    <span>{order.loyaltyPointsEarned}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-poppins text-lg text-gray-900">
                  <span>{t("checkout.summary.total")}</span>
                  <span className="text-primary price-text">{fmtEGP(fromCents(order.totalCents))}</span>
                </div>
              </div>
            </section>

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


