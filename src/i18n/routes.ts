import type { Locale } from "@/i18n/config";

// Turkish is served directly at the root; English is an explicit /en choice.
// Navigation, canonicals and language alternates all share these URL clusters.
export const routes = {
  home: { tr: "/", en: "/en" },
  about: { tr: "/about", en: "/en/about" },
} as const satisfies Record<string, Record<Locale, string>>;

export type PageKey = keyof typeof routes;

export const pageKeys = Object.keys(routes) as PageKey[];

export function pathFor(page: PageKey, locale: Locale) {
  return routes[page][locale];
}
