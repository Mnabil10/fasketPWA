import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { ArrowLeft, PackageSearch, Clock, Truck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { Badge } from "../../ui/badge";
import dayjs from "dayjs";
import { NetworkBanner, RetryBlock, SkeletonList, EmptyState } from "../components";
import { useOrders, useNetworkStatus, useApiErrorToast } from "../hooks";
import { goToHome } from "../navigation/navigation";
import { fmtEGP, fromCents } from "../../lib/money";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";

interface OrdersScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const STATUS_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  PENDING: { icon: Clock, variant: "secondary" },
  CONFIRMED: { icon: CheckCircle2, variant: "default" },
  PREPARING: { icon: Clock, variant: "default" },
  OUT_FOR_DELIVERY: { icon: Truck, variant: "default" },
  DELIVERED: { icon: CheckCircle2, variant: "default" },
  CANCELED: { icon: XCircle, variant: "destructive" },
  FAILED: { icon: AlertTriangle, variant: "destructive" },
  DELIVERING: { icon: Truck, variant: "default" },
  COMPLETED: { icon: CheckCircle2, variant: "default" },
  PROCESSING: { icon: Clock, variant: "default" },
  SHIPPED: { icon: Truck, variant: "default" },
};

function StatusPill({ statusKey, label }: { statusKey: string; label: string }) {
  const meta = STATUS_ICONS[statusKey] || { icon: Clock, variant: "outline" };
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      <span className="text-xs">{label}</span>
    </Badge>
  );
}

export function OrdersScreen({ appState, updateAppState }: OrdersScreenProps) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  const ordersQuery = useOrders();
  const apiErrorToast = useApiErrorToast("orders.error");
  const rawItems = ordersQuery.data;
  const hasInvalidShape = !ordersQuery.isLoading && !ordersQuery.isError && rawItems !== undefined && !Array.isArray(rawItems);
  const items = useMemo(() => (Array.isArray(rawItems) ? rawItems : []), [rawItems]);
  const ordersErrorMessage = mapApiErrorToMessage(ordersQuery.error, "orders.error");

  const titleHint = useMemo(() => {
    if (ordersQuery.isLoading) return t("orders.loading");
    if (items.length === 0) return t("orders.empty");
    return t("orders.count", { count: items.length, defaultValue: `${items.length}` });
  }, [ordersQuery.isLoading, items.length, t]);

  const openDetail = (orderId: string) => {
    updateAppState({
      selectedOrderId: orderId,
      selectedOrderSummary: items.find((o) => o.id === orderId) || null,
      currentScreen: "order-detail",
    });
  };

  const handleError = (error: unknown) => {
    apiErrorToast(error, "orders.error");
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="section-card">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              goToHome(updateAppState);
            }}
            className="p-2 mr-2 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
              {t("orders.title")}
            </h1>
            <p className="text-xs text-gray-500">{titleHint}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 w-full">
        {ordersQuery.isLoading && <SkeletonList />}

        {(ordersQuery.isError || hasInvalidShape) && (
          <RetryBlock
            message={
              hasInvalidShape
                ? t("orders.errorInvalidPayload", "Orders response format is invalid.")
                : ordersErrorMessage
            }
            onRetry={() => {
              ordersQuery.refetch().catch((err) => handleError(err));
            }}
          />
        )}

        {!ordersQuery.isLoading && !ordersQuery.isError && !hasInvalidShape && items.length === 0 && (
          <EmptyState
            icon={<PackageSearch className="w-10 h-10 text-gray-400" />}
            title={t("orders.empty")}
            subtitle={t("orders.emptyCta", "Browse products to place your first order.")}
            actionLabel={t("orders.startShopping", "Start shopping")}
            onAction={() => goToHome(updateAppState)}
          />
        )}

        {!ordersQuery.isLoading &&
          !ordersQuery.isError &&
          items.map((o) => {
            const statusKey = o.status?.toUpperCase?.() || "PENDING";
            return (
              <button
                key={o.id}
                onClick={() => openDetail(o.id)}
                disabled={isOffline}
                className="w-full text-left section-card hover:-translate-y-0.5 transition disabled:opacity-70"
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-900">#{o.id}</div>
                  <StatusPill statusKey={statusKey} label={t(`orders.status.${statusKey.toLowerCase()}`)} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {dayjs(o.createdAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"))}
                </div>
                <div className="mt-2 font-poppins text-primary price-text" style={{ fontWeight: 600 }}>
                  {fmtEGP(fromCents(o.totalCents))}
                </div>
              </button>
            );
          })}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}

