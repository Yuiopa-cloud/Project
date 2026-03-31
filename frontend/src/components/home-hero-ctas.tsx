"use client";

import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const spring = { type: "spring" as const, stiffness: 420, damping: 28 };

export function HomeHeroCtas({
  ctaShop,
  ctaWhatsApp,
  waHref,
}: {
  ctaShop: string;
  ctaWhatsApp: string;
  waHref: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <MotionLink href="/shop" className="btn-primary">
        {ctaShop}
      </MotionLink>
      <motion.a
        href={waHref}
        className="btn-whatsapp"
        target="_blank"
        rel="noreferrer"
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.96 }}
        transition={spring}
      >
        {ctaWhatsApp}
      </motion.a>
    </div>
  );
}
