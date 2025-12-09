import { PropsWithChildren, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { App as CapacitorApp } from "@capacitor/app";

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
    const resumeListener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) invalidate();
    });

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resumeListener.remove();
    };
  }, [queryClient]);

  return <>{children}</>;
}
