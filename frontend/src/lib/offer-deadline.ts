/** ISO 8601 deadline from product.metadata.saleEndsAt (admin). */
export function parseConfiguredSaleEnd(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).saleEndsAt;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw.trim());
  return Number.isFinite(ms) ? ms : null;
}

export function endOfLocalDayMs(now = new Date()): number {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Effective countdown target for PDP:
 * - If admin set `saleEndsAt` in the future → use it.
 * - If set but already passed → showExpired (dedicated UI).
 * - If unset → end of today (local) so every product shows urgency.
 */
export function resolveOfferCountdownEndMs(metadata: unknown): {
  endMs: number | null;
  showExpired: boolean;
} {
  const configured = parseConfiguredSaleEnd(metadata);
  const now = Date.now();
  if (configured != null) {
    if (configured > now) {
      return { endMs: configured, showExpired: false };
    }
    return { endMs: null, showExpired: true };
  }
  const eod = endOfLocalDayMs();
  if (eod > now) {
    return { endMs: eod, showExpired: false };
  }
  return { endMs: null, showExpired: false };
}
