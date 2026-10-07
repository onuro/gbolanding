import type { Locale } from "@/i18n/config";

// Turkish is served directly at the root; English is an explicit /en choice.
// Navigation, canonicals and language alternates all share these URL clusters.
export const routes = {
  home: { tr: "/", en: "/en" },
  about: { tr: "/about", en: "/en/about" },
  kollektor: { tr: "/kollektor", en: "/en/kollektor" },
  intelval: { tr: "/intelval", en: "/en/intelval" },
  hastam: { tr: "/hastam", en: "/en/hastam" },
  fountible: { tr: "/fountible", en: "/en/fountible" },
  contact: { tr: "/contact", en: "/en/contact" },
  privacy: { tr: "/privacy", en: "/en/privacy" },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof routes;

export const pageKeys = Object.keys(routes) as PageKey[];

export function pathFor(page: PageKey, locale: Locale) {
  return routes[page][locale];
}

/**
 * Pages that exist in Turkish only. The blog is written for Turkish readers and
 * has no English edition, so there is no /en/blog: an English page listing
 * Turkish articles would be thin, and hreflang may only name a real
 * translation. These pages publish hreflang tr and x-default and nothing else.
 * Their EN switch still has to go somewhere; it goes to the English home page
 * (see languageSwitch), as navigation, never as an alternate.
 */
export const turkishOnlyRoutes = {
  blog: { tr: "/blog" },
} as const satisfies Record<string, { tr: string }>;

export type TurkishOnlyPageKey = keyof typeof turkishOnlyRoutes;

/** The page of one article. The slug is ASCII kebab case (src/content.config.ts). */
export const blogArticlePath = (slug: string) => `${turkishOnlyRoutes.blog.tr}/${slug}`;

export const blogFeedPath = `${turkishOnlyRoutes.blog.tr}/rss.xml`;

/** The locales a page exists in. Turkish always; English only for a translated page. */
export type Alternates = { tr: string; en?: string };

const isTurkishOnly = (path: string) =>
  Object.values(turkishOnlyRoutes).some(
    ({ tr }) => path === tr || path.startsWith(`${tr}/`),
  );

/**
 * Where the EN and TR links of the header and footer lead from `pathname`.
 * A translated page switches to its own other language. A Turkish-only page
 * keeps TR on itself and sends EN to the English home page. Anything unknown
 * falls back to the two home pages.
 */
export function languageSwitch(pathname: string): Record<Locale, string> {
  const path = pathname.replace(/\/+$/, "") || "/";
  const page = pageKeys.find((key) =>
    Object.values(routes[key]).some((candidate) => candidate === path),
  );
  if (page) return routes[page];
  if (isTurkishOnly(path)) return { tr: path, en: routes.home.en };
  return routes.home;
}
