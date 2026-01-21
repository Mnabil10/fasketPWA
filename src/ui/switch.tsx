"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-[#34C759] data-[state=unchecked]:bg-[#E9E9EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34C759]/30 inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200 ease-in-out disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_3px_1px_rgba(0,0,0,0.06)] ring-0 transition-transform duration-200 ease-in-out data-[state=checked]:translate-x-[22px] data-[state=unchecked]:translate-x-[2px] rtl:data-[state=checked]:-translate-x-[22px] rtl:data-[state=unchecked]:-translate-x-[2px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
