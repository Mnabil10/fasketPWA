import React, { useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { cn } from "../../ui/utils";

type MobileCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function MobileCheckbox({
  checked,
  onChange,
  children,
  className,
  id,
}: MobileCheckboxProps) {
  const platform = useMemo(() => Capacitor.getPlatform?.() ?? "web", []);
  const isIOS = platform === "ios";
  const isAndroid = platform === "android";

  return (
    <label
      htmlFor={id}
      className={cn(
        "mobile-checkbox-label flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-4 min-h-[52px] cursor-pointer active:bg-gray-50 touch-manipulation select-none",
        className
      )}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        className={cn(
          "shrink-0 flex items-center justify-center transition-all duration-200",
          "border-2 border-gray-300 w-[22px] h-[22px] min-w-[22px] min-h-[22px]",
          "peer-checked:bg-primary peer-checked:border-primary",
          "peer-checked:[&>svg]:opacity-100",
          isIOS && "rounded-[6px]",
          isAndroid && "rounded-[3px]"
        )}
      >
        <svg
          className="w-3.5 h-3.5 text-white opacity-0 transition-opacity"
          viewBox="0 0 12 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 5l3 3 7-7" />
        </svg>
      </span>
      <span className="text-sm text-gray-700 leading-relaxed flex-1 pt-0.5">
        {children}
      </span>
    </label>
  );
}
