"use client";

import { motion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const spring = { type: "spring" as const, stiffness: 440, damping: 24 };

const item = {
  hidden: { opacity: 0, scale: 0.88, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 520, damping: 22 },
  },
};

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
    <motion.div
      className="flex flex-wrap gap-3 pt-2"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
      }}
    >
      <motion.div variants={item}>
        <MotionLink
          href="/shop"
          className="btn-primary"
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          {ctaShop}
        </MotionLink>
      </motion.div>
      <motion.div variants={item}>
        <motion.a
          href={waHref}
          className="btn-whatsapp"
          target="_blank"
          rel="noreferrer"
          whileHover={{
            scale: 1.06,
            y: -2,
            boxShadow: "0 14px 36px -12px rgba(37,211,102,0.45)",
          }}
          whileTap={{ scale: 0.95 }}
          transition={spring}
        >
          {ctaWhatsApp}
        </motion.a>
      </motion.div>
    </motion.div>
  );
}
