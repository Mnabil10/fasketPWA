import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/button";

type EmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className={`bg-white rounded-xl p-8 text-center text-gray-700 flex flex-col items-center gap-3 ${className}`}>
      {icon && <div className="text-4xl">{icon}</div>}
      <h3 className="font-poppins text-lg text-gray-900" style={{ fontWeight: 600 }}>
        {title || t("common.emptyStateTitle")}
      </h3>
      {subtitle && <p className="text-sm text-gray-600 max-w-md">{subtitle}</p>}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-1 rounded-xl px-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

