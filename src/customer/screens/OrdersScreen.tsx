import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";
import { ArrowLeft, PackageSearch, Clock, Truck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { MobileNav } from "../MobileNav";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { Badge } from "../../ui/badge";
import dayjs from "dayjs";
import { NetworkBanner, RetryBlock, SkeletonList, EmptyState, OrderProgress } from "../components";
import { useOrderGroups, useNetworkStatus, useApiErrorToast } from "../hooks";
import { goToHome } from "../navigation/navigation";
import { fmtEGP, fromCents } from "../../lib/money";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";
import type { OrderGroupSummary } from "../../types/api";
import { reorderOrder } from "../../services/orders";
import { useToast } from "../providers/ToastProvider";
import { useQueryClient } from "@tanstack/react-query";

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
  DELIVERY_FAILED: { icon: AlertTriangle, variant: "destructive" },
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
  const { t, i18n } = useTranslation();
  const lang = i18n.language?.startsWith("ar") ? "ar" : "en";
  const { showToast } = useToast();
  const { isOffline } = useNetworkStatus();
  const ordersQuery = useOrderGroups();
  const apiErrorToast = useApiErrorToast("orders.error");
  const queryClient = useQueryClient();
  const rawItems = ordersQuery.data;
  const hasInvalidShape = !ordersQuery.isLoading && !ordersQuery.isError && rawItems !== undefined && !Array.isArray(rawItems);
  const items = useMemo(() => (Array.isArray(rawItems) ? (rawItems as OrderGroupSummary[]) : []), [rawItems]);
  const ordersErrorMessage = mapApiErrorToMessage(ordersQuery.error, "orders.error");

  const titleHint = useMemo(() => {
    if (ordersQuery.isLoading) return t("orders.loading");
    if (items.length === 0) return t("orders.empty");
    return t("orders.count", { count: items.length, defaultValue: `${items.length}` });
  }, [ordersQuery.isLoading, items.length, t]);

  const openDetail = (orderId: string) => {
    const selected = items.find((o) => o.orderGroupId === orderId) || null;
    updateAppState({
      selectedOrderId: orderId,
      selectedOrderSummary: null,
      selectedOrder: selected,
      currentScreen: "order-detail",
    });
  };

  const handleError = (error: unknown) => {
    apiErrorToast(error, "orders.error");
  };

  const handleReorder = async (orderId: string | null) => {
    if (!orderId) return;
    if (isOffline) {
      showToast({
        type: "error",
        message: t("orders.reorderOffline", "You are offline. Please reconnect to reorder."),
      });
      return;
    }
    try {
      await reorderOrder(orderId);
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      showToast({ type: "success", message: t("orders.reorderSuccess", "Items added to your cart.") });
      updateAppState({ currentScreen: "cart" });
    } catch (error) {
      apiErrorToast(error, "orders.reorderError");
    }
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
            const providerStatuses =
              o.providers && o.providers.length
                ? o.providers.map((p) => p.status)
                : (o.orders ?? []).map((order) => order.status);
            const statusCounts = providerStatuses.reduce<Record<string, number>>((acc, status) => {
              const key = (status || "").toUpperCase();
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {});
            const statusSummary = Object.entries(statusCounts)
              .map(([key, count]) => `${t(`orders.status.${key.toLowerCase()}`)} x${count}`)
              .join(" | ");
            const providersCount = (o.providers?.length ?? o.orders?.length ?? 0);
            const providerList =
              o.providers && o.providers.length
                ? o.providers.map((p) => ({
                  id: p.orderId || p.providerId || `${o.orderGroupId}-${p.status}`,
                  name: lang === "ar" ? p.providerNameAr || p.providerName : p.providerName || p.providerNameAr || t("orders.providerFallback", "Provider"),
                  status: p.status,
                  orderId: p.orderId ?? null,
                }))
                : (o.orders ?? []).map((order) => ({
                  id: order.id,
                  name: lang === "ar" ? order.providerNameAr || order.providerName : order.providerName || order.providerNameAr || t("orders.providerFallback", "Provider"),
                  status: order.status,
                  orderId: order.id,
                }));
            const singleOrderId =
              providerList.length === 1 ? providerList[0]?.orderId ?? null : null;
            return (
              <div
                key={o.orderGroupId}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (isOffline) return;
                  openDetail(o.orderGroupId);
                }}
                onKeyDown={(e) => {
                  if (isOffline) return;
                  if (e.key === "Enter" || e.key === " ") openDetail(o.orderGroupId);
                }}
                aria-disabled={isOffline}
                className={`w-full text-left section-card hover:-translate-y-0.5 transition ${isOffline ? "opacity-70" : ""}`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-medium text-gray-900">#{o.orderGroupId}</div>
                  <StatusPill statusKey={statusKey} label={t(`orders.status.${statusKey.toLowerCase()}`)} />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  {dayjs(o.createdAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"))}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  {t("orders.providersCount", { count: providersCount, defaultValue: `${providersCount} providers` })}
                  {statusSummary ? ` | ${statusSummary}` : ""}
                </div>
                <OrderProgress status={statusKey} className="mt-3" />
                {providersCount > 1 && providerList.length > 0 && (
                  <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600 space-y-2">
                    <p className="font-semibold text-gray-900">
                      {t("orders.groupProviders", { count: providersCount, defaultValue: `This order contains ${providersCount} providers` })}
                    </p>
                    {providerList.map((provider) => (
                      <div key={provider.id} className="flex items-center justify-between">
                        <span className="text-gray-700">{provider.name}</span>
                        <span className="font-medium text-gray-900">
                          {t(`orders.status.${String(provider.status || "pending").toLowerCase()}`)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 font-poppins text-primary price-text" style={{ fontWeight: 600 }}>
                  {fmtEGP(fromCents(o.totalCents))}
                </div>
                {singleOrderId && (
                  <div className="mt-3 flex items-center justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReorder(singleOrderId);
                      }}
                    >
                      {t("orders.reorder", "Reorder")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <MobileNav appState={appState} updateAppState={updateAppState} />
    </div>
  );
}

