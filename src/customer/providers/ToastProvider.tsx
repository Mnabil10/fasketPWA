import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = {
  id: number;
  type: "success" | "error" | "info" | "warning";
  message: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (toast: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextValue>({
  showToast: () => undefined,
});

const MAX_TOASTS = 3;
const TOAST_DURATION = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => {
      const next = [...prev.slice(-(MAX_TOASTS - 1)), { ...toast, id }];
      return next;
    });
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const placement = useMemo(() => {
    if (typeof document === "undefined") return "right-4";
    const dir = document?.documentElement?.getAttribute("dir") || "ltr";
    return dir === "rtl" ? "left-4" : "right-4";
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`fixed top-4 ${placement} z-50 flex flex-col gap-2 max-w-xs`} role="region" aria-live="assertive">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl shadow-2xl px-4 py-3 text-sm text-white flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-green-600"
                : toast.type === "error"
                ? "bg-red-600"
                : toast.type === "warning"
                ? "bg-amber-500"
                : "bg-gray-900"
            }`}
          >
            <div className="flex-1">
              {toast.title && <p className="font-semibold mb-0.5">{toast.title}</p>}
              <p>{toast.message}</p>
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                className="text-xs font-semibold underline decoration-white/60 decoration-2"
                onClick={() => toast.onAction?.()}
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
