import type { Locale } from "@/i18n/config";
import { routes, type PageKey } from "@/i18n/routes";
import type { Messages } from "@/i18n/types";

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  /**
   * Every locale's URL for *this* page. BaseLayout emits hreflang from this
   * rather than a hardcoded homepage pair, so About also switches correctly.
   */
  alternates: Record<Locale, string>;
  locale: Locale;
  keywords: string[];
  page: PageKey;
  pageType: "WebPage" | "AboutPage";
  /** The company description, identical on every page, for the JSON-LD entity. */
  siteDescription: string;
}

// Each page owns its title and description. A page missing from this table
// would silently publish the home page's metadata under its own URL, which is
// the duplicate-title failure the content audit exists to catch.
const pageCopy = {
  home: (messages) => messages.metadata,
  about: (messages) => ({
    title: messages.about.metaTitle,
    description: messages.about.metaDescription,
  }),
  kollektor: (messages) => ({
    title: messages.kollektorPage.metaTitle,
    description: messages.kollektorPage.metaDescription,
  }),
  intelval: (messages) => ({
    title: messages.intelvalPage.metaTitle,
    description: messages.intelvalPage.metaDescription,
  }),
  hastam: (messages) => ({
    title: messages.hastamPage.metaTitle,
    description: messages.hastamPage.metaDescription,
  }),
  fountible: (messages) => ({
    title: messages.fountiblePage.metaTitle,
    description: messages.fountiblePage.metaDescription,
  }),
} satisfies Record<
  PageKey,
  (messages: Messages) => { title: string; description: string }
>;

export function buildMetadata(
  locale: Locale,
  messages: Messages,
  page: PageKey = "home",
): PageMetadata {
  const isEnglish = locale === "en";
  const canonicalPath = routes[page][locale];
  const keywords = isEnglish
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

  const { title, description } = pageCopy[page](messages);

  return {
    title,
    description,
    canonicalPath,
    alternates: { ...routes[page] },
    locale,
    keywords,
    page,
    pageType: page === "about" ? "AboutPage" : "WebPage",
    siteDescription: messages.metadata.description,
  };
}
