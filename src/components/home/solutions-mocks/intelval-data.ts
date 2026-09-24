import type { Locale } from "@/i18n/config";

// One house feeds both the console under the Intelval card and the draft
// report floating in its media well, so the two can never disagree.
// Values are millions of lira. The three appraisal approaches bracket the range.
export const home = {
  tr: { place: "Moda, Kadıköy", rooms: "3+1", floor: "2. kat", area: "128 m²" },
  en: { place: "Moda, Kadıköy", rooms: "3+1", floor: "2nd floor", area: "128 m²" },
} as const;

export const valuation = { low: 11.8, high: 13.4, concluded: 12.45 } as const;

// Weighted 50/20/30 the approaches land on 12.43, which the report rounds to 12.45.
const METHODS = [
  { key: "EMS", value: 12.1, weight: 50 },
  { key: "MLY", value: 11.8, weight: 20 },
  { key: "GLR", value: 13.4, weight: 30 },
] as const;

type MethodKey = (typeof METHODS)[number]["key"];

const LABELS: Record<Locale, Record<MethodKey, string>> = {
  tr: { EMS: "Emsal satışlar", MLY: "Yeniden inşa", GLR: "Kira geliri" },
  en: { EMS: "Comparable sales", MLY: "Rebuild cost", GLR: "Rental income" },
};

export const numberLocale = (locale: Locale) =>
  locale === "tr" ? "tr-TR" : "en-US";

export function formatValue(locale: Locale, value: number) {
  return new Intl.NumberFormat(numberLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Turkish writes the sign first: %45.
export function formatPercent(locale: Locale, value: number) {
  return locale === "tr" ? `%${value}` : `${value}%`;
}

/** Where a value sits on the low-high range, as a percentage. */
export function positionOnRange(value: number) {
  const ratio = (value - valuation.low) / (valuation.high - valuation.low);
  return Math.round(ratio * 1000) / 10;
}

export function methodsFor(locale: Locale) {
  return METHODS.map((method) => ({
    ...method,
    label: LABELS[locale][method.key],
  }));
}
