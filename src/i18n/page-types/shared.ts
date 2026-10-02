// Building blocks shared by the product pages (/kollektor, /hastam). Each page
// composes its own message type from these, so the shared components in
// src/components/product/ can take a slice of copy without knowing the page.

/** One section of a product page: the label on its hairline and its heading. */
export interface ChapterCopy {
  /** Short label that sits on the section's top hairline. */
  label: string;
  /** The section h2. A plain full sentence, not internal vocabulary. */
  title: string;
  /** One sentence beside the heading. */
  lead?: string;
  /** Margin note shown from xl: how to read the section, two lines at most. */
  noteTitle?: string;
  note?: string;
}

export interface RowCopy {
  title: string;
  description: string;
}

/** A row that starts from what the caller says and ends at what the product does. */
export interface SayDoCopy {
  say: string;
  title: string;
  description: string;
}

export interface FaqItemCopy {
  question: string;
  answer: string;
}

export interface ProductHeroCopy {
  /** Names the audience, not the category. */
  eyebrow: string;
  /** The page's only h1. */
  title: string;
  lead: string;
  /** Plain facts, never badges. */
  chips: string[];
  primaryCta: string;
  secondaryCta: string;
  /** The same three steps the hero picture shows, as sentences. */
  steps: [RowCopy, RowCopy, RowCopy];
}

export interface ProductPageBase {
  /** Own title and description: a product page never shares the home page's. */
  metaTitle: string;
  metaDescription: string;
  hero: ProductHeroCopy;
  faq: ChapterCopy & { items: FaqItemCopy[] };
  /** The three short assurances under the demo request. Facts, not badges. */
  ctaAssurances: [string, string, string];
}
