import { useCallback } from "react";
import { useToast } from "../providers/ToastProvider";
import { mapApiErrorToMessage } from "../../utils/mapApiErrorToMessage";

export function useApiErrorToast(defaultFallbackKey: string = "common.errorGeneric") {
  const { showToast } = useToast();

  return useCallback(
    (error: unknown, fallbackKey?: string) => {
      const message = mapApiErrorToMessage(error, fallbackKey ?? defaultFallbackKey);
      showToast({ type: "error", message });
      return message;
    },
    [defaultFallbackKey, showToast]
  );
}
