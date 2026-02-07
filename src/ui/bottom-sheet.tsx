"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "./utils";

function BottomSheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="bottom-sheet" {...props} />;
}

const BottomSheetTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ ...props }, ref) => (
  <DialogPrimitive.Trigger ref={ref} data-slot="bottom-sheet-trigger" {...props} />
));

BottomSheetTrigger.displayName = DialogPrimitive.Trigger.displayName;

function BottomSheetPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="bottom-sheet-portal" {...props} />;
}

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="bottom-sheet-overlay"
    className={cn(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]",
      className,
    )}
    {...props}
  />
));

BottomSheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

function BottomSheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <BottomSheetPortal>
      <BottomSheetOverlay />
      <DialogPrimitive.Content
        data-slot="bottom-sheet-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 w-full max-w-2xl mx-auto rounded-t-3xl border border-gray-100 bg-white p-5 pb-[calc(env(safe-area-inset-bottom,12px)+16px)] shadow-strong data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-6 data-[state=closed]:slide-out-to-bottom-6",
          className,
        )}
        {...props}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
        {children}
      </DialogPrimitive.Content>
    </BottomSheetPortal>
  );
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bottom-sheet-footer"
      className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

function BottomSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="bottom-sheet-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  );
}

function BottomSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="bottom-sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

const BottomSheetClose = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ ...props }, ref) => (
  <DialogPrimitive.Close ref={ref} data-slot="bottom-sheet-close" {...props} />
));

BottomSheetClose.displayName = DialogPrimitive.Close.displayName;

export {
  BottomSheet,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetFooter,
  BottomSheetHeader,
  BottomSheetOverlay,
  BottomSheetPortal,
  BottomSheetTitle,
  BottomSheetTrigger,
};
