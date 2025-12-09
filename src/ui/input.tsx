import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-12 w-full min-w-0 rounded-xl border border-gray-200 bg-white/95 px-4 py-3 text-base font-medium text-gray-900 placeholder:text-muted-foreground shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-[color,box-shadow,border] outline-none selection:bg-primary/10 selection:text-gray-900",
        "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        "file:text-foreground file:inline-flex file:h-9 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
