"use client";

import { useId } from "react";
import { motion } from "framer-motion";

function svgIds(hookId: string) {
  const safe = hookId.replace(/[^a-zA-Z0-9_-]/g, "") || "x";
  return {
    metal: `atlas-metal-${safe}`,
    deep: `atlas-deep-${safe}`,
    clip: `atlas-clip-${safe}`,
  };
}

export function AtlasLogo({
  className = "",
  size = 40,
  withWordmark = true,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  const { metal, deep, clip } = svgIds(useId());
  const h = size;
  const w = size * 1.05;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.div
        className="relative isolate shrink-0 [&_svg]:block"
        style={{ width: w, height: h }}
        whileHover={{ scale: 1.04 }}
        transition={{ type: "spring" as const, stiffness: 400, damping: 22 }}
      >
        <svg
          width={w}
          height={h}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="overflow-visible drop-shadow-[0_2px_12px_rgba(45,212,191,0.22)]"
          aria-hidden
        >
          <defs>
            <linearGradient id={metal} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdfa" />
              <stop offset="28%" stopColor="#5eead4" />
              <stop offset="52%" stopColor="#c4b5fd" />
              <stop offset="78%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id={deep} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f1115" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <clipPath id={clip}>
              <path d="M8 38 L24 8 L40 38 Z" />
            </clipPath>
          </defs>
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke={`url(#${metal})`}
            strokeWidth="1.25"
            fill={`url(#${deep})`}
            opacity={1}
          />
          <path
            d="M8 38 L24 8 L40 38 Z"
            fill={`url(#${metal})`}
            stroke={`url(#${deep})`}
            strokeWidth="0.5"
            strokeLinejoin="round"
            opacity={1}
          />
          <path
            d="M11 32 L37 32"
            stroke={`url(#${deep})`}
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.92}
          />
          <path
            d="M14 29 L22 29 M26 29 L34 29"
            stroke="rgba(45,212,191,0.55)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          {/* Static sheen inside triangle (no blend-mode sweep — avoids navbar / duplicate-id glitches) */}
          <g clipPath={`url(#${clip})`} opacity={0.35}>
            <path
              d="M-8 40 L24 -4 L56 40 Z"
              fill="white"
              style={{ mixBlendMode: "soft-light" }}
            />
          </g>
        </svg>
      </motion.div>
      {withWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="font-semibold tracking-[0.14em] uppercase text-[0.62rem] text-[var(--accent)] min-[400px]:text-[0.68rem]">
            Atlas
          </span>
          <span className="text-sm font-bold tracking-tight text-[var(--fg)] min-[400px]:text-base md:text-lg">
            Auto
          </span>
        </div>
      ) : null}
    </div>
  );
}
