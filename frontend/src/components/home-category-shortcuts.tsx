"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MotionLink } from "@/components/motion-link";

const ease = [0.22, 1, 0.36, 1] as const;

function IconCar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M5 17h14v-5l-2-4H7L5 12v5z" strokeLinejoin="round" />
      <circle cx="7.5" cy="17.5" r="1.5" />
      <circle cx="16.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeLinecap="round" />
      <path d="m7 7 2 2m6 6 2 2m-6-8 2-2m6 6-2-2" strokeLinecap="round" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
    </svg>
  );
}

function IconDroplet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M12 2.5c-3 4.5-6 7.8-6 11.3a6 6 0 1 0 12 0c0-3.5-3-6.8-6-11.3z" strokeLinejoin="round" />
    </svg>
  );
}

const icons = [IconCar, IconSpark, IconShield, IconDroplet];

export function HomeCategoryShortcuts({
  title,
  items,
}: {
  title: string;
  items: { slug: string; label: string }[];
}) {
  const reduce = useReducedMotion();

  return (
    <section className="mt-12 sm:mt-16" aria-labelledby="cat-shortcuts-heading">
      <h2 id="cat-shortcuts-heading" className="section-headline text-xl text-[var(--fg)] sm:text-2xl">
        {title}
      </h2>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {items.map((c, i) => {
          const Icon = icons[i % icons.length];
          return (
            <motion.div
              key={c.slug}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, ease, delay: i * 0.05 }}
            >
              <MotionLink
                href={`/shop?category=${c.slug}`}
                className="flex flex-col items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-center shadow-sm transition hover:border-[var(--accent)]/25 hover:shadow-md"
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.99 }}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-[var(--fg)]">{c.label}</span>
              </MotionLink>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
