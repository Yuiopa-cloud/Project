"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const LOGO_SRC = "/brand/easy-handles-logo.png";
/** Source asset pixel ratio (width / height). */
const LOGO_ASPECT = 902 / 732;

type AtlasLogoProps = {
  className?: string;
  size?: number;
  /** Kept for API compatibility — artwork already includes the wordmark. */
  withWordmark?: boolean;
};

/**
 * Easy Handles brand mark (raster). Float + spring hover, accent glow, shine sweep.
 */
export function AtlasLogo({ className = "", size = 40 }: AtlasLogoProps) {
  const reduceMotion = useReducedMotion();
  const height = Math.max(24, Math.round(size));
  const width = Math.round(height * LOGO_ASPECT);

  return (
    <motion.div
      className="inline-flex shrink-0"
      animate={
        reduceMotion
          ? undefined
          : {
              y: [0, -2.5, 0],
            }
      }
      transition={{
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className={`easy-handles-logo-root group relative inline-flex shrink-0 overflow-visible ${className}`}
        style={{ width, height }}
        initial={false}
        whileHover={{
          scale: 1.06,
          rotate: reduceMotion ? 0 : -0.6,
          transition: {
            type: "spring",
            stiffness: 420,
            damping: 20,
          },
        }}
        whileTap={{ scale: 0.93 }}
      >
        <span
          className="easy-handles-logo-glow pointer-events-none absolute inset-[-10px] rounded-2xl"
          aria-hidden
        />
        <span
          className="easy-handles-logo-ring pointer-events-none absolute inset-0 rounded-xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl"
          aria-hidden
        >
          <div className="easy-handles-logo-shimmer-bar absolute inset-y-[-25%] left-0 w-[38%] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0" />
        </div>
        <Image
          src={LOGO_SRC}
          alt="Easy Handles"
          width={902}
          height={732}
          className="relative z-[1] h-full w-full select-none object-contain mix-blend-multiply contrast-[1.02] transition-[filter,transform] duration-300 group-hover:contrast-[1.06] group-hover:brightness-[1.02]"
          priority
          sizes={`${width}px`}
        />
      </motion.div>
    </motion.div>
  );
}
