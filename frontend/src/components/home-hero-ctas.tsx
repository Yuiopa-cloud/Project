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

function TrustBadge({
  icon,
  label,
}: {
  icon: string;
  label: string;
}) {
  return (
    <motion.div
      className="flex items-center gap-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2.5 text-xs font-medium text-[var(--fg)] backdrop-blur-md sm:text-[0.8rem]"
      whileHover={{ scale: 1.06, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
    >
      <motion.span
        className="text-base leading-none"
        whileHover={{ scale: 1.15, rotate: [0, -6, 6, 0] }}
        transition={{ duration: 0.45 }}
        aria-hidden
      >
        {icon}
      </motion.span>
      <span className="leading-tight">{label}</span>
    </motion.div>
  );
}

export function HomeHeroCtas({
  ctaOrder,
  ctaWhatsApp,
  waHref,
  offerToday,
  offerShipping,
  urgency,
  trustCod,
  trustFast,
  trustWhatsapp,
  codReassurance,
}: {
  ctaOrder: string;
  ctaWhatsApp: string;
  waHref: string;
  offerToday: string;
  offerShipping: string;
  urgency: string;
  trustCod: string;
  trustFast: string;
  trustWhatsapp: string;
  codReassurance: string;
}) {
  return (
    <motion.div
      className="flex flex-col gap-4 pt-1"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.02 } },
      }}
    >
      <motion.div
        variants={item}
        className="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_22%,var(--glass-border))] bg-[color-mix(in_srgb,var(--glass-bg)_100%,transparent)] px-4 py-3 backdrop-blur-md"
      >
        <p className="text-sm font-semibold text-[var(--fg)]">{offerToday}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{offerShipping}</p>
      </motion.div>

      <motion.p
        variants={item}
        className="text-sm font-semibold text-amber-400/95"
      >
        {urgency}
      </motion.p>

      <motion.div
        variants={item}
        className="flex flex-wrap gap-2.5"
      >
        <TrustBadge icon="📦" label={trustCod} />
        <TrustBadge icon="⚡" label={trustFast} />
        <TrustBadge icon="💬" label={trustWhatsapp} />
      </motion.div>

      <motion.div
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap"
        variants={{
          visible: { transition: { staggerChildren: 0.1, delayChildren: 0.06 } },
        }}
      >
        <motion.div variants={item} className="w-full sm:w-auto sm:flex-1">
          <MotionLink
            href="/shop"
            className="btn-primary w-full min-h-[3.35rem] justify-center sm:w-auto"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.96 }}
          >
            {ctaOrder}
          </MotionLink>
        </motion.div>
        <motion.div variants={item} className="w-full sm:w-auto sm:flex-1">
          <motion.a
            href={waHref}
            className="btn-whatsapp flex w-full min-h-[3.35rem] justify-center sm:w-auto"
            target="_blank"
            rel="noreferrer"
            whileHover={{
              scale: 1.05,
              y: -2,
              boxShadow: "0 16px 40px -12px rgba(16,185,129,0.45)",
            }}
            whileTap={{ scale: 0.96 }}
            transition={spring}
          >
            {ctaWhatsApp}
          </motion.a>
        </motion.div>
      </motion.div>

      <motion.p
        variants={item}
        className="text-sm leading-relaxed text-[var(--muted)]"
      >
        {codReassurance}
      </motion.p>
    </motion.div>
  );
}
