import React, { useState } from "react";
import { Skeleton } from "../ui/skeleton";

type SmartImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  objectFit?: "cover" | "contain";
  onError?: () => void;
};

export function SmartImage({ src, alt, className = "", objectFit = "cover", onError }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const showSkeleton = !loaded && !failed;
  const showImage = Boolean(src) && !failed;
  const fitClass = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {showSkeleton && <Skeleton className="absolute inset-0 w-full h-full" />}
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt}
          className={`w-full h-full ${fitClass} transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(true);
            onError?.();
          }}
        />
      ) : null}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
          {alt || "Image"}
        </div>
      )}
    </div>
  );
}
