import type { Metadata } from "next";

import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/types";

export function buildMetadata(locale: Locale, messages: Messages): Metadata {
  const isDefault = locale === "en";
  const canonicalPath = isDefault ? "/" : `/${locale}`;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
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
    authors: [{ name: "GBO Vision Team" }],
    alternates: {
      canonical: canonicalPath,
      languages: {
        en: "/",
        tr: "/tr",
      },
    },
    openGraph: {
      title: messages.metadata.title,
      description: messages.metadata.description,
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: messages.metadata.title,
      description: messages.metadata.description,
    },
  };
}
