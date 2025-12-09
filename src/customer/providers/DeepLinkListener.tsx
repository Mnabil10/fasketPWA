import { PropsWithChildren, useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { hashFromUrl } from "../navigation/deepLinking";

export function DeepLinkListener({ children }: PropsWithChildren) {
  useEffect(() => {
    const listener = CapacitorApp.addListener("appUrlOpen", ({ url }) => {
      const hash = hashFromUrl(url);
      if (hash) {
        window.location.hash = hash;
      }
    });
    return () => listener.remove();
  }, []);

  return <>{children}</>;
}
