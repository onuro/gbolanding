import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/types";

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  locale: Locale;
  keywords: string[];
}

export function buildMetadata(locale: Locale, messages: Messages): PageMetadata {
  const isDefault = locale === "en";
  const canonicalPath = isDefault ? "/" : `/${locale}`;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    canonicalPath,
    locale,
    keywords: [
      "GBO Vision",
      "Enterprise AI",
      "AI Platforms",
      "Kollektor",
      "Intelval",
      "Debt Collection AI",
      "Real Estate Valuation",
      "Legal AI",
    ],
  };
}
