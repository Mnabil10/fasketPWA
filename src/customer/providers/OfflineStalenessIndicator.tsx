import { PropsWithChildren, useEffect, useRef } from "react";
import { useToast } from "./ToastProvider";
import { useAppSettings } from "../hooks/useAppSettings";

export function OfflineStalenessIndicator({ children }: PropsWithChildren) {
  const { data } = useAppSettings({ enabled: true });
  const { showToast } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (!data) return;
    const stale = data.stale;
    document.body.dataset.offlineStale = stale ? "true" : "false";
    if (stale && !shown.current) {
      shown.current = true;
      showToast({
        type: "warning",
        message: "Showing offline data. Some info may be outdated.",
      });
    }
  }, [data, showToast]);

  return <>{children}</>;
}
