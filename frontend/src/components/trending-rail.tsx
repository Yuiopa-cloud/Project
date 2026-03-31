"use client";

import type { CSSProperties } from "react";
import type { ProductList } from "@/lib/api";
import { TrendingCard } from "@/components/trending-card";

type TrendingRailProps = {
  items: ProductList["items"];
  locale: string;
  durationSec?: number;
};

export function TrendingRail({
  items,
  locale,
  durationSec = 48,
}: TrendingRailProps) {
  if (items.length === 0) return null;

  return (
    <div className="trending-rail relative -mx-4 py-1 md:-mx-6">
      <div
        className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-[var(--bg)] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-[var(--bg)] to-transparent"
        aria-hidden
      />
      <div className="overflow-hidden">
        <div
          className="trending-marquee-track flex"
          style={
            {
              "--marquee-duration": `${durationSec}s`,
            } as CSSProperties
          }
        >
          <div className="flex shrink-0 gap-4 pe-4">
            {items.map((item, i) => (
              <div
                key={item.id}
                className="w-[min(280px,82vw)] shrink-0 self-stretch"
              >
                <TrendingCard product={item} index={i} locale={locale} />
              </div>
            ))}
          </div>
          <div className="flex shrink-0 gap-4 pe-4" aria-hidden>
            {items.map((item, i) => (
              <div
                key={`${item.id}-marquee`}
                className="w-[min(280px,82vw)] shrink-0 self-stretch"
              >
                <TrendingCard product={item} index={i} locale={locale} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
