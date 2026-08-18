import type { Locale } from "@/i18n/config";
import { routes, type PageKey } from "@/i18n/routes";
import type { Messages } from "@/i18n/types";

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  /**
   * Every locale's URL for *this* page. BaseLayout emits hreflang from this
   * rather than from hardcoded "/" and "/tr", which would otherwise advertise
   * the home page as the Turkish alternate of /about.
   */
  alternates: Record<Locale, string>;
  locale: Locale;
  keywords: string[];
  page: PageKey;
  pageType: "WebPage" | "AboutPage";
  /** The company description, identical on every page, for the JSON-LD entity. */
  siteDescription: string;
}

export function buildMetadata(
  locale: Locale,
  messages: Messages,
  page: PageKey = "home",
): PageMetadata {
  const isDefault = locale === "en";
  const canonicalPath = routes[page][locale];
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

  const isAbout = page === "about";

  return {
    title: isAbout ? messages.about.metaTitle : messages.metadata.title,
    description: isAbout
      ? messages.about.metaDescription
      : messages.metadata.description,
    canonicalPath,
    alternates: { ...routes[page] },
    locale,
    keywords,
    page,
    pageType: isAbout ? "AboutPage" : "WebPage",
    siteDescription: messages.metadata.description,
  };
}
