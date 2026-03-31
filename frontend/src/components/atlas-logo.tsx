"use client";

import { motion } from "framer-motion";


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
        className="relative shrink-0"
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
          className="drop-shadow-[0_0_16px_rgba(45,212,191,0.35)]"
          aria-hidden
        >
          <defs>
            <linearGradient id="atlasMetal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0fdfa" />
              <stop offset="28%" stopColor="#5eead4" />
              <stop offset="52%" stopColor="#c4b5fd" />
              <stop offset="78%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
            <linearGradient id="atlasDeep" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0f1115" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <clipPath id="aClip">
              <path d="M8 38 L24 8 L40 38 Z" />
            </clipPath>
          </defs>
          <motion.circle
            cx="24"
            cy="24"
            r="22"
            stroke="url(#atlasMetal)"
            strokeWidth="1.2"
            fill="url(#atlasDeep)"
            initial={{ opacity: 0.75 }}
            animate={{ opacity: [0.75, 1, 0.75] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <path
            d="M8 38 L24 8 L40 38 Z"
            fill="url(#atlasMetal)"
            opacity={0.94}
          />
          <path
            d="M11 32 L37 32"
            stroke="url(#atlasDeep)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity={0.9}
          />
          <path
            d="M14 29 L22 29 M26 29 L34 29"
            stroke="rgba(45,212,191,0.5)"
            strokeWidth="1"
            strokeLinecap="round"
          />
          <g clipPath="url(#aClip)">
            <motion.rect
              x="-24"
              y="0"
              width="40"
              height="48"
              fill="white"
              opacity={0.22}
              animate={{ x: ["-24px", "48px"] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                repeatType: "loop",
                ease: [0.4, 0, 0.2, 1],
                repeatDelay: 0.6,
              }}
              style={{ mixBlendMode: "overlay" }}
            />
          </g>
        </svg>
      </motion.div>
      {withWordmark ? (
        <div className="flex flex-col leading-none">
          <span className="font-semibold tracking-[0.14em] uppercase text-[0.62rem] text-[var(--accent)] min-[400px]:text-[0.68rem]">
            Atlas
          </span>
          <span className="bg-gradient-to-r from-[var(--fg)] via-[var(--accent)] to-[var(--accent-hot)] bg-clip-text text-sm font-bold tracking-tight text-transparent min-[400px]:text-base md:text-lg">
            Auto
          </span>
        </div>
      ) : null}
    </div>
  );
}
