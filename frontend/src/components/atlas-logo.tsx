"use client";

import { motion } from "framer-motion";

/**
 * Portable Blender / Atlas mark — no SVG fragments (url(#id)), gradients, or clipPath.
 * Those break in some production builds / browsers and leave only the two “grill” strokes visible.
 */
export function AtlasLogo({
  className = "",
  size = 40,
  withWordmark = true,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  const h = size;
  const w = size * 1.05;

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <motion.div
        className="relative shrink-0 [&_svg]:block"
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
          className="overflow-visible"
          aria-hidden
        >
          <circle
            cx="24"
            cy="24"
            r="21"
            fill="#0f172a"
            stroke="#2dd4bf"
            strokeWidth="1.5"
          />
          <path
            d="M8 38 L24 8 L40 38 Z"
            fill="#0d9488"
            stroke="#0f172a"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
          <path
            d="M11 32 L37 32"
            stroke="#0f172a"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.95}
          />
          <path
            d="M14 29 L22 29 M26 29 L34 29"
            stroke="#99f6e4"
            strokeWidth="1"
            strokeLinecap="round"
            opacity={0.9}
          />
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
