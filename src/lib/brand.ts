// Every brand fact Google is asked to believe about this company lives here, so
// the layout, the footer, the manifest and the JSON-LD can never drift apart and
// contradict each other. A search for "gbovision" is currently corrected to
// "globovision" because the string has no entity behind it; a consistent, single
// account of who we are is the part of that we control.
export const brand = {
  name: "GBO Vision",

  // The solid spelling is what people type and what the domain is, but the site
  // only ever writes the spaced form. Listing both is a plain statement of fact
  // rather than a trick, and it is the field schema.org provides for exactly it.
  alternateName: ["GBOVision", "gbovision", "GBO"],

  domain: "gbovision.com",

  // Empty until the real values are supplied. The schema builder drops any key
  // that is blank, so an unfinished field is simply absent rather than published
  // as a placeholder that Google would read as fact.
  legalName: "",
  email: "",

  addressCountry: "TR",

  // Deliberately empty. Pointing sameAs at a profile that is not ours, or not
  // live, is worse than pointing it nowhere. The moment an official profile
  // exists, adding the URL here is the only change needed to emit it -- and it
  // is worth more than every other on-site signal combined, because it is the
  // only one Google can corroborate against a source that is not us.
  sameAs: [] as readonly string[],
} as const;

export const brandUrl = (origin: URL | string) => new URL("/", origin).href;
