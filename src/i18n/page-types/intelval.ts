import type { Locale } from "@/i18n/config";
import type {
  ChapterCopy,
  ProductPageBase,
  RowCopy,
  SayDoCopy,
} from "@/i18n/page-types/shared";

// The copy shape of /intelval. Turkish (messages/intelval-page.tr.ts) defines
// the content and English must match it key for key.
//
// Truth rules every string here is written against:
//   - Intelval reads, calculates, drafts and checks. The licensed valuer who
//     inspected the property on site reviews the draft, edits it and signs
//     it. Intelval never signs, never replaces the site visit and never fixes
//     the value on its own (BDDK valuation regulation, Art. 14).
//   - No accuracy figure, price, plan, client or bank name, compliance badge,
//     hosting or data-residency claim, and not the home page's "800+" figure.
//   - The property, the comparables, the people and every number in the
//     pictures are sample data, and each picture says so once (MockWindow).
//   - Write "emsal" only where it plainly means a comparable property, never
//     bare in a heading: to most readers it means a court precedent or a
//     floor-area ratio. Never "AVM" (a shopping mall in Turkish).
// The sample file's numbers live in components/intelval-page/sample-file.ts;
// copy holds labels only, so a picture can never disagree with its own sums.
// Where a string has to name one of the sample's facts it uses a token
// ({file}, {place}, {rooms}, {floor}, {built}, {site}, {legal}, {comps}, and
// the check counts {checks}, {passed}, {informed}, {flagged}) that the picture
// fills from sample-file.ts.

/** Chip colours inside the pictures: fine, needs the valuer, or neutral. */
export type IntelvalTone = "ok" | "flag" | "info";

/** A labelled value in a picture (a deed field, a site-note field). */
export interface IntelvalField {
  label: string;
  value: string;
}

/** What every picture's window says about itself (see MockWindow). */
export interface IntelvalWindowCopy {
  /** One sentence screen readers get in place of the decorative picture.
   *  Counts and facts go in by token, so it says what the picture shows. */
  label: string;
  /** Whose screen this is, printed above the window. */
  owner: string;
  title: string;
  /** One short line under the title, e.g. "{file} · {place}" (tokens). */
  meta: string;
}

/**
 * The hero picture: a photograph of the valuer on site with three numbered
 * objects on it, in the order of the hero's three steps (as on /kollektor).
 */
export interface IntelvalHeroPictureCopy {
  /** Read by screen readers in place of the picture. */
  label: string;
  /** Names of the three numbered objects: the valuer, what Intelval read,
   *  the firm's screen. */
  labels: [string, string, string];
  /** What Intelval read: the valuer's spoken note and a line off the deed
   *  (tokens allowed). */
  note: { who: string; text: string };
  deed: { who: string; text: string };
  cardTitle: string;
  marketLabel: string;
  legalLabel: string;
  compsLabel: string;
  /** e.g. "{comps} taşınmaz". */
  compsValue: string;
  /** Unit after a value, e.g. "milyon TL". */
  million: string;
  /** The card's last line: the file and who signs (tokens allowed). */
  cardFoot: string;
}

/** One encumbrance on the deed; its tone is in sample-file.ts. */
export interface IntelvalEncumbrance {
  kind: string;
  detail: string;
}

/** Fields read off a title deed, and the encumbrances on it. */
export interface IntelvalDeedMockCopy extends IntelvalWindowCopy {
  fieldsLabel: string;
  /** Values may use tokens, e.g. the unit's "{floor}". */
  fields: IntelvalField[];
  encumbrancesLabel: string;
  /** One per deedTones entry in sample-file.ts, in that order. */
  encumbrances: [
    IntelvalEncumbrance,
    IntelvalEncumbrance,
    IntelvalEncumbrance,
    IntelvalEncumbrance,
  ];
  /** Where each line came from, one short line under the window. */
  footnote: string;
}

/** The valuer's spoken site note becoming report fields and a flag. */
export interface IntelvalFieldMockCopy extends IntelvalWindowCopy {
  transcriptLabel: string;
  /** What the valuer said on site, as typed by Intelval. */
  transcript: string;
  fieldsLabel: string;
  fields: IntelvalField[];
  photosLabel: string;
  /** Room names on the photo sheet, in order: eight, two rows of four. */
  photos: [string, string, string, string, string, string, string, string];
  /** The detail names the two areas by token ({site}, {legal}). */
  flag: { title: string; detail: string };
}

/** The comparables table, the conclusion and the two cross-checks. */
export interface IntelvalCompsMockCopy extends IntelvalWindowCopy {
  columns: {
    comp: string;
    source: string;
    area: string;
    price: string;
    discount: string;
    adjustment: string;
    unitPrice: string;
  };
  /** Source label per kind of comparable. */
  kinds: { listing: string; archive: string };
  /** Names of the adjustments, keyed as in sample-file.ts. */
  adjustments: {
    time: string;
    location: string;
    size: string;
    age: string;
    floor: string;
    condition: string;
  };
  averageLabel: string;
  marketLabel: string;
  legalLabel: string;
  checksLabel: string;
  costLabel: string;
  incomeLabel: string;
  /** "TL/m²" */
  perSqm: string;
  million: string;
  note: string;
  /** The legend on the street map: the flat being valued, a comparable. */
  mapLegend: { subject: string; comp: string };
}

/** One page of the draft, in the bank's template and in two languages. */
export interface IntelvalReportMockCopy extends IntelvalWindowCopy {
  templateLabel: string;
  template: string;
  languagesLabel: string;
  /** Each language's name in the page's language. The paragraph itself is
   *  the sample report's text (draftParagraph in sample-file.ts). */
  languages: Record<Locale, string>;
  /** Marks on the text that point to its sources. */
  sourceHint: string;
  /** The page's two values, as on the hero's card; the figures are in
   *  sample-file.ts. */
  marketLabel: string;
  legalLabel: string;
  /** Unit after a value, e.g. "milyon TL". */
  million: string;
  /** The area under each value, by token: "Yerinde {site} m²" and the
   *  approved plans' "{legal}". */
  siteArea: string;
  legalArea: string;
  /** The signature box the valuer signs; Intelval leaves it empty. */
  signLabel: string;
  signState: string;
}

/** One check and what it found; its tone is in sample-file.ts. */
export interface IntelvalCheck {
  text: string;
  detail: string;
}

/** The checks run before the draft reaches the valuer's signature. */
export interface IntelvalChecksMockCopy extends IntelvalWindowCopy {
  /** One per checkTones entry in sample-file.ts, in that order; the detail
   *  may use tokens. */
  items: [
    IntelvalCheck,
    IntelvalCheck,
    IntelvalCheck,
    IntelvalCheck,
    IntelvalCheck,
  ];
  /** Where the file stands; names checkTones' counts by token ({flagged}). */
  summary: string;
}

export interface IntelvalPageMessages extends ProductPageBase {
  heroPicture: IntelvalHeroPictureCopy;
  /** The documents Intelval reads and what it takes from each. */
  reads: ChapterCopy & {
    sayLabel: string;
    doLabel: string;
    rows: SayDoCopy[];
    mock: IntelvalDeedMockCopy;
  };
  /** Photos, plan against reality, condition and the spoken site note. */
  field: ChapterCopy & { rows: RowCopy[]; mock: IntelvalFieldMockCopy };
  /** Comparables, adjustments, land and commercial work, the value range. */
  value: ChapterCopy & { rows: RowCopy[]; mock: IntelvalCompsMockCopy };
  /** The draft in the bank's template, with reasons, in two languages. */
  writes: ChapterCopy & { rows: RowCopy[]; mock: IntelvalReportMockCopy };
  /** Sources behind every figure, checks, deviations, two-report review. */
  checks: ChapterCopy & { rows: RowCopy[]; mock: IntelvalChecksMockCopy };
  /** The valuer reviews, edits and signs. */
  signoff: ChapterCopy & { steps: [RowCopy, RowCopy, RowCopy] };
  /** The same voice AI as Kollektor and Hastam, on the firm's phone line. */
  phone: ChapterCopy & { sayLabel: string; doLabel: string; rows: SayDoCopy[] };
  audience: ChapterCopy & { imageAlt: string; rows: RowCopy[] };
  /** What Intelval does not do (four), then two rules every draft follows.
   *  Six, so FactCells' three columns close on two full rows. */
  rules: ChapterCopy & {
    items: [RowCopy, RowCopy, RowCopy, RowCopy, RowCopy, RowCopy];
  };
}
