import { useEffect, useState } from "react";

function getInitialOfflineState() {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
}

export function useNetworkStatus() {
  const [isOffline, setIsOffline] = useState(getInitialOfflineState);

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return {
    isOffline,
    isOnline: !isOffline,
    status: isOffline ? "offline" : "online",
  };
}

