import { PropsWithChildren, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";

export function TabRefetchProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") invalidate();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    let resumeListener: PluginListenerHandle | undefined;
    let cancelled = false;
    const sub = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) invalidate();
    });
    if ("then" in sub && typeof sub.then === "function") {
      sub.then((handle) => {
        if (cancelled) {
          handle.remove?.();
          return;
        }
        resumeListener = handle;
      }).catch(() => {
        resumeListener = undefined;
      });
    } else {
      resumeListener = sub as unknown as PluginListenerHandle;
    }

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelled = true;
      resumeListener?.remove?.();
    };
  }, [queryClient]);

  return <>{children}</>;
}
