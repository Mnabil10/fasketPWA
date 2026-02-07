import React from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

type OrderProgressProps = {
  status?: string | null;
  className?: string;
};

const normalizeStatus = (value?: string | null) => (value || "").toUpperCase();

export function OrderProgress({ status, className }: OrderProgressProps) {
  const { t } = useTranslation();
  const key = normalizeStatus(status);
  const isFailed = key === "DELIVERY_FAILED" || key === "FAILED";
  const isCanceled = key === "CANCELED" || key === "CANCELLED";
  const activeIndex = (() => {
    if (isFailed || isCanceled) return -1;
    if (["DELIVERED", "COMPLETED"].includes(key)) return 3;
    if (["OUT_FOR_DELIVERY", "DELIVERING", "SHIPPED"].includes(key)) return 2;
    if (["PREPARING"].includes(key)) return 1;
    return 0;
  })();

  const steps = [
    { label: t("orders.status.pending", "Pending confirmation") },
    { label: t("orders.status.preparing", "Preparing") },
    { label: t("orders.status.out_for_delivery", "Out for delivery") },
    { label: t("orders.status.delivered", "Delivered") },
  ];

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {steps.map((step, idx) => {
          const isComplete = activeIndex >= idx && activeIndex >= 0;
          const isCurrent = activeIndex === idx;
          return (
            <div key={step.label} className="flex items-center flex-1 gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isComplete ? "bg-primary text-white" : isCurrent ? "bg-primary/20 text-primary" : "bg-gray-200 text-gray-500"
                }`}
              >
                {isComplete ? <Check className="w-3 h-3" /> : idx + 1}
              </div>
              <span className={`text-[11px] sm:text-xs ${isComplete || isCurrent ? "text-gray-900" : "text-gray-500"}`}>
                {step.label}
              </span>
              {idx < steps.length - 1 && (
                <div className={`h-1 flex-1 rounded-full ${isComplete ? "bg-primary" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
      {(isFailed || isCanceled) && (
        <p className="text-xs text-red-600 mt-2">
          {isCanceled ? t("orders.status.canceled", "Canceled") : t("orders.status.delivery_failed", "Delivery failed")}
        </p>
      )}
    </div>
  );
}
