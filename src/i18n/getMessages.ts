import "server-only";

import { defaultLocale, type Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/types";

const loaders = {
  en: () => import("@/i18n/messages/en").then((module) => module.default),
  tr: () => import("@/i18n/messages/tr").then((module) => module.default),
} as const;

export async function getMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}

export async function getSafeMessages(locale?: string): Promise<Messages> {
  if (!locale || !(locale in loaders)) {
    return getMessages(defaultLocale);
  }

  return loaders[locale as Locale]();
}
