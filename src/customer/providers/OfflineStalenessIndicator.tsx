import { PropsWithChildren, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "./ToastProvider";
import { useAppSettings } from "../hooks/useAppSettings";

export function OfflineStalenessIndicator({ children }: PropsWithChildren) {
  const { data } = useAppSettings({ enabled: true });
  const { showToast } = useToast();
  const { t } = useTranslation();
  const shown = useRef(false);

  useEffect(() => {
    if (!data) return;
    const stale = data.stale;
    document.body.dataset.offlineStale = stale ? "true" : "false";
    if (stale && !shown.current) {
      shown.current = true;
      showToast({
        type: "warning",
        message: t("offline.staleWarning", "You're viewing cached data. Some details may be outdated."),
      });
    }
  }, [data, showToast, t]);

  return <>{children}</>;
}
