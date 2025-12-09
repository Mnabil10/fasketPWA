import React from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ArrowLeft, Clock, Gift, RefreshCcw } from "lucide-react";
import { AppState, type UpdateAppState } from "../CustomerApp";
import { Button } from "../../ui/button";
import { NetworkBanner, EmptyState, RetryBlock } from "../components";
import { useLoyaltyHistory } from "../hooks";

interface LoyaltyHistoryScreenProps {
  appState: AppState;
  updateAppState: UpdateAppState;
}

const TYPE_BADGE: Record<string, { labelKey: string; tone: string }> = {
  EARN: { labelKey: "loyaltyHistory.types.earn", tone: "text-green-600 bg-green-50" },
  REDEEM: { labelKey: "loyaltyHistory.types.redeem", tone: "text-red-600 bg-red-50" },
  ADJUST: { labelKey: "loyaltyHistory.types.adjust", tone: "text-blue-600 bg-blue-50" },
};

export function LoyaltyHistoryScreen({ updateAppState }: LoyaltyHistoryScreenProps) {
  const { t } = useTranslation();
  const historyQuery = useLoyaltyHistory();
  const items = historyQuery.data?.pages?.flatMap((page) => page.items) ?? [];

  const goBack = () => {
    updateAppState({ currentScreen: "profile" });
  };

  return (
    <div className="page-shell">
      <NetworkBanner />
      <div className="bg-white px-4 py-4 shadow-sm flex items-center">
        <Button variant="ghost" size="sm" onClick={goBack} className="p-2 mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-poppins text-xl text-gray-900" style={{ fontWeight: 600 }}>
            {t("loyaltyHistory.title")}
          </h1>
          <p className="text-xs text-gray-500">{t("loyaltyHistory.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {historyQuery.isError && (
          <RetryBlock
            message={t("loyaltyHistory.error")}
            onRetry={() => historyQuery.refetch()}
          />
        )}

        {historyQuery.isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="bg-white p-4 rounded-xl shadow-sm animate-pulse space-y-3">
                <div className="h-4 w-32 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
                <div className="h-3 w-16 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {!historyQuery.isLoading && !historyQuery.isError && items.length === 0 && (
          <EmptyState
            icon={<Gift className="w-10 h-10 text-primary" />}
            title={t("loyaltyHistory.emptyTitle")}
            subtitle={t("loyaltyHistory.emptySubtitle")}
            actionLabel={t("common.back")}
            onAction={goBack}
          />
        )}

        {items.map((txn) => {
          const meta = TYPE_BADGE[txn.type] || TYPE_BADGE.ADJUST;
          return (
            <div key={txn.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${meta.tone}`}>
                    {t(meta.labelKey)}
                  </div>
                  {txn.orderId && (
                    <button
                      className="text-primary text-xs underline"
                      onClick={() =>
                        updateAppState({
                          selectedOrderId: txn.orderId!,
                          currentScreen: "order-detail",
                        })
                      }
                    >
                      {t("loyaltyHistory.viewOrder", { id: txn.orderId })}
                    </button>
                  )}
                </div>
                <span
                  className={`font-semibold text-lg ${
                    txn.type === "REDEEM" ? "text-red-600" : txn.type === "EARN" ? "text-green-600" : "text-gray-900"
                  }`}
                >
                  {txn.type === "REDEEM" ? "-" : "+"}
                  {txn.points}
                </span>
              </div>
              {txn.description && <p className="text-sm text-gray-700 mb-1">{txn.description}</p>}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{dayjs(txn.createdAt).format(t("orders.dateFormat", "DD MMM YYYY - HH:mm"))}</span>
              </div>
            </div>
          );
        })}

        {historyQuery.hasNextPage && !historyQuery.isLoading && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full flex items-center gap-2"
              onClick={() => historyQuery.fetchNextPage()}
              disabled={historyQuery.isFetchingNextPage}
            >
              <RefreshCcw className="w-4 h-4" />
              {historyQuery.isFetchingNextPage ? t("common.loading") : t("loyaltyHistory.loadMore")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
