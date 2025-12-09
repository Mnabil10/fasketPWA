import React from "react";
import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "../hooks";

type NetworkBannerProps = {
  className?: string;
  stale?: boolean;
};

export function NetworkBanner({ className = "", stale = false }: NetworkBannerProps) {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  if (!isOffline && !stale) return null;

  const message = isOffline
    ? t("offline.banner", "You are offline - showing cached data if available.")
    : t("offline.stale", "You are seeing cached data that may be outdated.");

  return (
    <div
      className={`bg-amber-50 text-amber-900 px-4 py-2 flex items-center gap-2 text-sm justify-center ${className}`}
      role="status"
    >
      <AlertCircle className="w-4 h-4" />
      {message}
    </div>
  );
}


