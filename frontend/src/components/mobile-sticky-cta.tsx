"use client";

import { MotionLink } from "@/components/motion-link";

export function MobileStickyCta({
  label,
  href = "/shop",
}: {
  label: string;
  href?: string;
}) {
  return (
    <div
      className="mobile-cta-dock fixed inset-x-0 bottom-0 z-[44] border-t border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      role="region"
      aria-label={label}
    >
      <MotionLink
        href={href}
        className="btn-primary !min-h-[3.35rem] w-full justify-center text-base shadow-[0_-8px_40px_-12px_color-mix(in_srgb,var(--primary-mid)_35%,transparent)]"
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.97 }}
      >
        {label}
      </MotionLink>
    </div>
  );
}
