import type {
  ChapterCopy,
  ProductPageBase,
  RowCopy,
} from "@/i18n/page-types/shared";

// The copy shape of /fountible. Turkish (messages/fountible-page.tr.ts)
// defines the content and English must match it key for key.
//
// Fountible has its own site (fountible.com) and app (app.fountible.com). This
// page says what it is, shows it, and links there, as /hastam does for
// hastam.ai. Truth rules: every capability named here is one fountible.com
// itself names; no user counts, prices, plans, customer names or benchmark
// figures; model names only as fountible.com prints them. The pictures are
// screenshots of fountible.com's own product visuals and each says so.

/** A product screenshot: what it shows, for the alt text and its caption. */
export interface FountiblePictureCopy {
  alt: string;
  caption: string;
}

export interface FountiblePageMessages extends ProductPageBase {
  heroPicture: FountiblePictureCopy;
  /** Design on a canvas that is real React and Tailwind; export real code. */
  code: ChapterCopy & { rows: RowCopy[]; picture: FountiblePictureCopy };
  /** Bro, the AI on the canvas: parallel chats, your model, MCP. */
  bro: ChapterCopy & { items: [RowCopy, RowCopy, RowCopy]; picture: FountiblePictureCopy };
  /** Motion timeline, video export and decks on the same canvas. */
  motion: ChapterCopy & { rows: RowCopy[]; picture: FountiblePictureCopy };
  /** The product features fountible.com lists, as plain facts. */
  features: ChapterCopy & { items: RowCopy[] };
  /** Where it runs: the web app, the macOS app, the Chrome capture extension. */
  platforms: ChapterCopy & { items: [RowCopy, RowCopy, RowCopy] };
  /** The row that names the parent company and links to fountible.com. */
  parent: ChapterCopy & { linkLabel: string; externalHint: string };
}
