import type { Locale } from "@/i18n/config";
import type { IntelvalTone } from "@/i18n/page-types/intelval";

// The one sample file every picture on /intelval shows: a flat in Göztepe,
// valued for a bank loan. Inputs are written out; every result is computed
// here, so the hero, the comparables table and the checks can never disagree
// with their own sums. All of it is invented and each picture says so.
//
// A bank's flat report rests on the comparables: the market value is the
// average adjusted price per m² times the area. Cost and income are worked
// out only as cross-checks, with no weights, because averaging divergent
// approaches is what IVS warns against.

export const fileId = "IV-0587";

export const subject = {
  tr: { place: "Göztepe, Kadıköy", rooms: "3+1", floor: "4. kat", built: "2004" },
  en: { place: "Göztepe, Kadıköy", rooms: "3+1", floor: "4th floor", built: "2004" },
} as const;

/** Gross area on site, and in the approved project (a balcony was joined to a room). */
export const area = { site: 135, legal: 128 } as const;

export type AdjustmentKey =
  | "time"
  | "location"
  | "size"
  | "age"
  | "floor"
  | "condition";

interface CompInput {
  id: string;
  /** listing: an asking price; archive: a comparable recorded in one of the
   *  firm's earlier reports, at its recorded price. */
  kind: "listing" | "archive";
  area: number;
  price: number;
  /** Bargaining discount on an asking price, percent. */
  discount: number;
  /** Adjustments in percent; omitted keys are zero. */
  adjustments: Partial<Record<AdjustmentKey, number>>;
  /** Where it stands on the sample's street map, in percent of its width and
   *  height (assets/editorial/intelval-map-goztepe.png). */
  pin: MapPin;
}

export interface MapPin {
  x: number;
  y: number;
}

/** The flat being valued on the same map. The comparables sit a few blocks
 *  from it, as the draft says; E-02, the one with a better location, is
 *  nearer the sea, and E-04, the one with a worse one, is across the second
 *  avenue. Every pin stands on a block, not on a street. */
export const subjectPin: MapPin = { x: 54, y: 39 };

const COMPS: CompInput[] = [
  {
    id: "E-01",
    kind: "listing",
    area: 130,
    price: 14_700_000,
    discount: 6,
    adjustments: { size: -1, age: -2, floor: 1 },
    pin: { x: 43, y: 32 },
  },
  {
    id: "E-02",
    kind: "listing",
    area: 142,
    price: 15_200_000,
    discount: 6,
    adjustments: { location: 2, size: 1 },
    pin: { x: 37, y: 64 },
  },
  {
    id: "E-03",
    kind: "archive",
    area: 135,
    price: 13_900_000,
    discount: 0,
    adjustments: { time: 2, floor: -1 },
    pin: { x: 60, y: 57 },
  },
  {
    id: "E-04",
    kind: "listing",
    area: 125,
    price: 13_950_000,
    discount: 6,
    adjustments: { location: -1, size: -2, condition: 2 },
    pin: { x: 80, y: 49 },
  },
];

export const comps = COMPS.map((comp) => {
  const net = comp.price * (1 - comp.discount / 100);
  const unit = net / comp.area;
  const adjustment = Object.values(comp.adjustments).reduce(
    (sum, value) => sum + (value ?? 0),
    0,
  );
  return {
    ...comp,
    adjustment,
    adjustedUnit: Math.round(unit * (1 + adjustment / 100)),
  };
});

/** Average adjusted price per m², rounded to the lira. */
export const averageUnit = Math.round(
  comps.reduce((sum, comp) => sum + comp.adjustedUnit, 0) / comps.length,
);

/** Values are rounded to the nearest 10,000 TL, as a report would print them. */
const roundValue = (value: number) => Math.round(value / 10_000) * 10_000;

export const marketValue = roundValue(averageUnit * area.site);
export const legalValue = roundValue(averageUnit * area.legal);

/** Cross-checks only. Neither is weighted into the value. */
export const crossChecks = { cost: 13_400_000, income: 14_000_000 } as const;

/** Percent difference from the market value, one decimal. */
export const deviation = (value: number) =>
  Math.round(((value - marketValue) / marketValue) * 1000) / 10;

export const numberLocale = (locale: Locale) =>
  locale === "tr" ? "tr-TR" : "en-US";

/** 14030000 -> "14,03" (tr) / "14.03" (en): millions with two decimals. */
export function formatMillions(locale: Locale, value: number) {
  return new Intl.NumberFormat(numberLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 1_000_000);
}

/** Whole lira with grouping: 103913 -> "103.913" (tr) / "103,913" (en). */
export function formatLira(locale: Locale, value: number) {
  return new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Signed percent, Turkish puts the sign first: "+%2" / "+2%". */
export function formatSignedPercent(locale: Locale, value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  const amount = new Intl.NumberFormat(numberLocale(locale), {
    maximumFractionDigits: 1,
  }).format(Math.abs(value));
  return locale === "tr" ? `${sign}%${amount}` : `${sign}${amount}%`;
}

// What each line means for the file is sample data too, so it lives here and
// both locales mark the same lines. Copy holds one line per entry, in order.

/** The deed: mortgage and declaration noted, no attachment, the annotation
 *  goes to the valuer. */
export const deedTones = ["info", "ok", "flag", "info"] as const satisfies readonly IntelvalTone[];

// The deed itself, as DeedMock prints it: a TAKBİS "tapu kayıt bilgisi". It
// is a Turkish document, so it stays Turkish on the English page too and
// lives here once, like the draft paragraph. A row with `reads` is one
// Intelval read into a line of the extracted card (a field or an encumbrance,
// by index in copy); those rows carry the numbered highlights, in order.
export interface DeedRow {
  label: string;
  value: string;
  reads?: readonly ["field" | "encumbrance", number];
}

const [neighbourhood, district] = subject.tr.place.split(", ");

export const deedRecord: {
  kicker: string;
  title: string;
  system: string;
  sections: readonly { heading: string; rows: readonly DeedRow[] }[];
} = {
  kicker: "TAŞINMAZA AİT",
  title: "TAPU KAYIT BİLGİSİ",
  system: "TAKBİS",
  sections: [
    {
      heading: "TAŞINMAZ BİLGİLERİ",
      rows: [
        { label: "İl / İlçe", value: `İstanbul / ${district}` },
        { label: "Mahalle", value: neighbourhood ?? "" },
        { label: "Ada / Parsel", value: "1043 / 27", reads: ["field", 0] },
        { label: "Nitelik", value: "Mesken" },
        { label: "Bağımsız bölüm", value: `${subject.tr.floor} · 9 no` },
        { label: "Arsa payı", value: "40/1000" },
      ],
    },
    {
      heading: "MÜLKİYET BİLGİLERİ",
      rows: [
        { label: "Malik", value: "A*** Y***", reads: ["field", 4] },
        { label: "Hisse", value: "1/1" },
      ],
    },
    {
      // One line per encumbrance in copy, in the same order.
      heading: "TAKYİDAT",
      rows: [
        { label: "Rehinler", value: "İpotek · 1. derece · Banka lehine", reads: ["encumbrance", 0] },
        { label: "Hacizler", value: "Kayıt bulunmamaktadır" },
        { label: "Şerhler", value: "Aile konutu şerhi", reads: ["encumbrance", 2] },
        { label: "Beyanlar", value: "Yönetim planı" },
      ],
    },
  ],
};

/** The checks: two pass, one is for information, two wait for the valuer. */
export const checkTones = ["ok", "ok", "info", "flag", "flag"] as const satisfies readonly IntelvalTone[];

// The draft's reasoning paragraph (ReportMock). It is the sample report's own
// text, shown in Turkish and in English on both pages, so it lives here once
// rather than twice in each copy file. Its counts and figures come from the
// comparables; a marked figure carries the number of its source mark.
const listings = comps.filter((comp) => comp.kind === "listing");
const archived = comps.length - listings.length;
const areas = comps.map((comp) => comp.area);
const smallest = Math.min(...areas);
const largest = Math.max(...areas);
// The paragraph names one bargaining discount, so every listing must carry it.
const discount = listings[0]?.discount ?? 0;
if (listings.some((comp) => comp.discount !== discount)) {
  throw new Error("draftParagraph assumes one bargaining discount for every listing");
}

const WORDS = {
  tr: ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
} as const;
const word = (locale: Locale, count: number) => WORDS[locale][count] ?? String(count);
const capital = (locale: Locale, text: string) =>
  text.charAt(0).toLocaleUpperCase(numberLocale(locale)) + text.slice(1);
const plural = (count: number, noun: string) => (count === 1 ? noun : `${noun}s`);

export type DraftPart = string | { figure: string; mark: number };

export const draftParagraph: Record<Locale, { heading: string; parts: DraftPart[] }> = {
  tr: {
    heading: "Karşılaştırma ve düzeltmeler",
    parts: [
      // Written as a Turkish report is, in the formal -mıştır.
      `${capital("tr", word("tr", comps.length))} emsal seçilmiştir: ${word("tr", listings.length)} güncel ilan ve firmanın önceki ${word("tr", archived)} raporundan alınan ${word("tr", archived)} emsal. Hepsi yakın sokaklarda, `,
      { figure: `${formatLira("tr", smallest)} ile ${formatLira("tr", largest)} m²`, mark: 1 },
      " arası dairelerdir. İlan fiyatlarından ",
      { figure: `%${discount}`, mark: 2 },
      " pazarlık payı düşülmüştür. Zaman, konum, alan, yaş, kat ve durum farkları için düzeltme yapılmıştır.",
    ],
  },
  en: {
    heading: "Comparables and adjustments",
    parts: [
      `${capital("en", word("en", comps.length))} comparables were chosen: ${word("en", listings.length)} current ${plural(listings.length, "listing")} and ${word("en", archived)} taken from ${archived === 1 ? "an earlier report" : "earlier reports"} by the firm. All are flats of `,
      { figure: `${formatLira("en", smallest)} to ${formatLira("en", largest)} m²`, mark: 1 },
      " on nearby streets. A ",
      { figure: `${discount}%`, mark: 2 },
      " bargaining discount was taken off the asking prices. Adjustments were made for time, location, size, age, floor and condition.",
    ],
  },
};

// Copy names the sample's facts by token ("{file} · {place}"), so a window's
// meta line or a flag can never disagree with the numbers the pictures sum.
const tokens = (locale: Locale): Record<string, string> => ({
  file: fileId,
  ...subject[locale],
  site: formatLira(locale, area.site),
  legal: formatLira(locale, area.legal),
  comps: String(comps.length),
  // The checks list's counts, for its screen-reader label and its summary.
  checks: String(checkTones.length),
  passed: String(checkTones.filter((tone) => tone === "ok").length),
  informed: String(checkTones.filter((tone) => tone === "info").length),
  flagged: String(checkTones.filter((tone) => tone === "flag").length),
});

/** "Yerinde {site} m²" -> "Yerinde 135 m²". An unknown token fails the page
 *  rather than printing braces into a picture. */
export function fill(locale: Locale, text: string) {
  const values = tokens(locale);
  return text.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined) throw new Error(`Unknown sample-file token {${key}} in "${text}"`);
    return value;
  });
}
