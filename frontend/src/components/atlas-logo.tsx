"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const LOGO_SRC = "/brand/good-deals-logo.png";

/**
 * Good Deals brand mark (raster). Interactive shine + hover motion.
 * `withWordmark` kept for API compatibility — artwork already includes “Good Deals” text.
 */
export function AtlasLogo({
  className = "",
  size = 40,
  withWordmark: _withWordmark = true,
}: {
  className?: string;
  size?: number;
  withWordmark?: boolean;
}) {
  const dim = Math.max(40, Math.round(size * 1.75));

  return (
    <motion.div
      className={`good-deals-logo-root group relative inline-flex shrink-0 ${className}`}
      style={{ width: dim, height: dim }}
      initial={false}
      whileHover={{
        scale: 1.06,
        rotate: [0, -1.5, 1.5, 0],
        transition: {
          rotate: { duration: 0.5 },
          scale: { type: "spring", stiffness: 380, damping: 18 },
        },
      }}
      whileTap={{ scale: 0.94 }}
    >
      <span className="good-deals-logo-glow pointer-events-none absolute inset-[-8px] rounded-2xl" aria-hidden />
      <span className="good-deals-logo-ring pointer-events-none absolute inset-0 rounded-2xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
        aria-hidden
      >
        <div className="good-deals-logo-shimmer-bar absolute inset-y-[-20%] left-0 w-[45%] bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      </div>
      <Image
        src={LOGO_SRC}
        alt="Good Deals"
        width={512}
        height={512}
        className="relative z-[1] h-full w-full select-none rounded-2xl object-contain drop-shadow-[0_4px_20px_rgba(45,212,191,0.35)]"
        priority
        sizes={`${dim}px`}
      />
    </motion.div>
  );
}
