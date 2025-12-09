import { PropsWithChildren, useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { hashFromUrl } from "../navigation/deepLinking";

export function DeepLinkListener({ children }: PropsWithChildren) {
  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    let cancelled = false;
    const sub = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const hash = hashFromUrl(url);
      if (hash) {
        window.location.hash = hash;
      }
    });
    if ("then" in sub && typeof sub.then === "function") {
      sub.then((handle) => {
        if (cancelled) {
          handle.remove?.();
          return;
        }
        listener = handle;
      }).catch(() => {
        listener = undefined;
      });
    } else {
      listener = sub as unknown as PluginListenerHandle;
    }
    return () => {
      cancelled = true;
      listener?.remove?.();
    };
  }, []);

  return <>{children}</>;
}
