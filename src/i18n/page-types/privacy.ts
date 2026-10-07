// The copy shape of /privacy: the KVKK privacy notice (aydınlatma metni) for
// the contact form. Turkish (messages/privacy-page.tr.ts) is the binding text;
// English matches it key for key and says it is a translation.
//
// Structure follows KVKK md. 10 and the Aydınlatma Yükümlülüğü Tebliği, in the
// order Turkish companies publish it (e.g. Logo Yazılım's notice): who the
// data controller is, what is processed and why, the legal ground and how it
// is collected, who receives it, how long it is kept, the md. 11 rights and
// how to apply. "{address}" is filled from src/lib/brand.ts.

export interface PrivacySection {
  title: string;
  paragraphs: string[];
  items?: string[];
  /** Paragraphs printed after the list. */
  after?: string[];
}

export interface PrivacyPageMessages {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  lead: string;
  updated: string;
  /** English only: says the Turkish text is the binding one. */
  translationNote?: string;
  sections: PrivacySection[];
}
