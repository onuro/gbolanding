import type { Locale } from "@/i18n/config";

// The one place a page's URLs are declared. BaseLayout's hreflang, the sitemap's
// alternate clusters, the locale redirect in middleware and the canonical in
// buildMetadata all read this, so adding a page cannot leave three of the four
// silently pointing at the wrong URL -- which is how hreflang usually breaks.
export const routes = {
  home: { en: "/", tr: "/tr" },
  about: { en: "/about", tr: "/tr/about" },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof routes;

export const pageKeys = Object.keys(routes) as PageKey[];

/** The English path of every localised page, for the middleware redirect. */
export const localisablePaths = pageKeys.map((page) => routes[page].en);

export function pathFor(page: PageKey, locale: Locale) {
  return routes[page][locale];
}

/** English path -> the Turkish path that mirrors it, or undefined if unlocalised. */
export function turkishCounterpart(pathname: string) {
  const page = pageKeys.find((key) => routes[key].en === pathname);
  return page ? routes[page].tr : undefined;
}
