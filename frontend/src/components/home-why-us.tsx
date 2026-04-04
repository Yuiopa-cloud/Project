"use client";

import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeWhyUs({
  title,
  items,
  trustAlt,
}: {
  title: string;
  items: { title: string; body: string }[];
  trustAlt: string;
}) {
  const reduce = useReducedMotion();

  return (
    <section className="mt-16 sm:mt-20" aria-labelledby="why-us-heading">
      <h2 id="why-us-heading" className="section-headline text-xl text-[var(--fg)] sm:text-2xl">
        {title}
      </h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease, delay: i * 0.06 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-[var(--fg)]">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-6 shadow-sm sm:px-8">
        <Image
          src="/brand/trust-badges.png"
          alt={trustAlt}
          width={790}
          height={241}
          className="mx-auto h-auto max-h-24 w-full object-contain sm:max-h-28"
          sizes="(max-width: 768px) 100vw, 672px"
        />
      </div>
    </section>
  );
}
