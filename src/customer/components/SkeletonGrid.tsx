import React from "react";
import { Skeleton } from "../../ui/skeleton";

type SkeletonGridProps = {
  count?: number;
  columns?: number;
};

export function SkeletonGrid({ count = 6, columns = 2 }: SkeletonGridProps) {
  const items = Array.from({ length: count });
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {items.map((_, idx) => (
        <div key={idx} className="bg-white rounded-xl p-3 shadow-sm space-y-3">
          <Skeleton className="w-full h-28 rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
