import React from "react";
import { Skeleton } from "../../ui/skeleton";

type SkeletonListProps = {
  count?: number;
  lines?: number;
};

export function SkeletonList({ count = 4, lines = 2 }: SkeletonListProps) {
  const items = Array.from({ length: count });
  return (
    <div className="space-y-3">
      {items.map((_, idx) => (
        <div key={idx} className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <Skeleton className="h-4 w-1/3" />
          {Array.from({ length: lines }).map((__, lineIdx) => (
            <Skeleton key={lineIdx} className="h-3 w-2/3" />
          ))}
          <Skeleton className="h-5 w-20" />
        </div>
      ))}
    </div>
  );
}

