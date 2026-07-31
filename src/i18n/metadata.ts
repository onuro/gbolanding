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
  const keywords = isDefault
    ? [
        "GBO Vision",
        "enterprise AI agency",
        "enterprise AI",
        "AI business growth",
        "custom software development",
        "AI consulting",
        "workflow automation",
        "data integration",
        "legal AI",
        "debt collection AI",
        "valuation intelligence",
      ]
    : [
        "GBO Vision",
        "kurumsal yapay zeka",
        "yapay zeka ajansı",
        "iş büyümesi için yapay zeka",
        "özel yazılım geliştirme",
        "iş akışı otomasyonu",
        "veri entegrasyonu",
        "hukukta yapay zeka",
        "alacak tahsilatı otomasyonu",
        "değerleme yazılımı",
      ];

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
    canonicalPath,
    locale,
    keywords,
  };
}
