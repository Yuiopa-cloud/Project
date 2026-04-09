export function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const normalized =
    typeof value === "number"
      ? String(value)
      : value.replace(",", ".").replace(/[^\d.-]/g, "");
  const num = Number.parseFloat(normalized);
  return Number.isFinite(num) ? num : 0;
}

export function formatSar(
  value: string | number | null | undefined,
  locale: string = "ar",
): string {
  const amount = parseAmount(value);
  const localeTag = locale === "ar" ? "ar-SA" : "en-SA";
  return new Intl.NumberFormat(localeTag, {
    style: "currency",
    currency: "SAR",
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(amount);
}
