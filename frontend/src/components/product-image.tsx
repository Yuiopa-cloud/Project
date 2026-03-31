"use client";

import { useState } from "react";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  /** Parent must be `relative` with defined size */
  fill?: boolean;
  className?: string;
  priority?: boolean;
};

/**
 * Plain <img> so product URLs work from any CDN, localhost uploads, or relative paths
 * without Next/Image remotePatterns configuration.
 */
export function ProductImage({
  src,
  alt,
  fill,
  className = "",
  priority = false,
}: ProductImageProps) {
  const [broken, setBroken] = useState(false);
  const ok = Boolean(src) && !broken;

  if (fill) {
    if (!ok) {
      return (
        <div
          className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 ${className}`}
          role="img"
          aria-label={alt}
        >
          <span className="text-4xl opacity-35 grayscale">🚗</span>
        </div>
      );
    }
    return (
      <img
        src={src!}
        alt={alt}
        onError={() => setBroken(true)}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        referrerPolicy="no-referrer-when-downgrade"
        className={`absolute inset-0 h-full w-full object-cover ${className}`}
      />
    );
  }

  if (!ok) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 ${className}`}
        role="img"
        aria-label={alt}
      >
        <span className="text-3xl opacity-35">🚗</span>
      </div>
    );
  }

  return (
    <img
      src={src!}
      alt={alt}
      onError={() => setBroken(true)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer-when-downgrade"
      className={className}
    />
  );
}
