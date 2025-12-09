import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";

type RetryBlockProps = {
  message?: string;
  onRetry: () => void;
  compact?: boolean;
};

export function RetryBlock({ message, onRetry, compact = false }: RetryBlockProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`bg-white rounded-xl ${compact ? "p-3 text-sm" : "p-5"} shadow-sm text-center text-gray-700 space-y-3`}
    >
      <p>{message || t("common.errorGeneric", "Something went wrong. Please try again.")}</p>
      <Button size="sm" onClick={onRetry} className="rounded-full px-4">
        {t("common.retry", "Retry")}
      </Button>
    </div>
  );
}

