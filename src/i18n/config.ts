export const locales = ["en", "tr"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "gbo_locale";

export function hasLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
