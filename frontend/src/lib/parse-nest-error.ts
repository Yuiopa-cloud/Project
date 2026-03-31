/** Best-effort parse of NestJS `{ message: string | string[] }` error bodies. */
export function parseNestErrorMessage(raw: string): string | undefined {
  const t = raw?.trim();
  if (!t || t.startsWith("<")) return undefined;
  try {
    const j = JSON.parse(t) as { message?: string | string[] };
    const m = j.message;
    if (Array.isArray(m) && m[0]) return String(m[0]);
    if (typeof m === "string" && m.length) return m;
  } catch {
    /* plain text */
  }
  return t.length <= 800 ? t : `${t.slice(0, 400)}…`;
}
