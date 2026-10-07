import type { Locale } from "@/i18n/config";
import blogPage from "@/i18n/messages/blog-page.tr";
import {
  blogArticlePath,
  routes,
  turkishOnlyRoutes,
  type Alternates,
  type PageKey,
  type TurkishOnlyPageKey,
} from "@/i18n/routes";
import type { Messages } from "@/i18n/types";
import { articleOgImage, genericOgAlt, ogImageFor, type OgImage } from "@/lib/og-images";

/** What an article adds to the head: og:type article and its two dates. */
export interface ArticleMetadata {
  /** YYYY-MM-DD */
  publishedTime: string;
  /** YYYY-MM-DD */
  modifiedTime: string;
  section: string;
  tags: string[];
}

export interface PageMetadata {
  title: string;
  description: string;
  canonicalPath: string;
  /**
   * Every locale's URL for *this* page. BaseLayout emits hreflang from this
   * rather than a hardcoded homepage pair, so About also switches correctly.
   * A Turkish-only page (the blog) has no `en`, and so no English alternate.
   */
  alternates: Alternates;
  locale: Locale;
  keywords: string[];
  page: PageKey | TurkishOnlyPageKey | "article";
  pageType: "WebPage" | "AboutPage" | "CollectionPage" | "ContactPage";
  /** The company description, identical on every page, for the JSON-LD entity. */
  siteDescription: string;
  /** This page's own share card (src/data/og-images.json), else /og.png. */
  ogImage: OgImage;
  /** Set on an article only. */
  article?: ArticleMetadata;
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
  contact: (messages) => ({
    title: messages.contactPage.metaTitle,
    description: messages.contactPage.metaDescription,
  }),
  privacy: (messages) => ({
    title: messages.privacyPage.metaTitle,
    description: messages.privacyPage.metaDescription,
  }),
} satisfies Record<
  PageKey,
  (messages: Messages) => { title: string; description: string }
>;

const siteKeywords = {
  en: [
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
  ],
  tr: [
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
  ],
} as const satisfies Record<Locale, readonly string[]>;

/**
 * The card's alt text. The card carries the page's subject, so the alt says
 * it in the page title's words; the brand suffix is dropped because the card
 * shows the logo anyway, and a remaining "|" reads as a colon: "Blog:
 * Kurumsal yapay zeka yazıları". A manifest entry written as
 * { "src", "alt" } (src/lib/og-images.ts) overrides this with the card's own
 * words.
 */
const cardAlt = (title: string) =>
  title.replace(/\s*\|\s*GBO Vision$/, "").replace(/\s+\|\s+/g, ": ");

export function buildMetadata(
  locale: Locale,
  messages: Messages,
  page: PageKey = "home",
): PageMetadata {
  const canonicalPath = routes[page][locale];
  const { title, description } = pageCopy[page](messages);

  return {
    title,
    description,
    canonicalPath,
    alternates: { ...routes[page] },
    locale,
    keywords: [...siteKeywords[locale]],
    page,
    pageType:
      page === "about" ? "AboutPage" : page === "contact" ? "ContactPage" : "WebPage",
    siteDescription: messages.metadata.description,
    ogImage: ogImageFor(`${page}-${locale}`, cardAlt(title), genericOgAlt[locale]),
  };
}

/** /blog. Turkish only: `messages` must be the Turkish set. */
export function buildBlogIndexMetadata(messages: Messages): PageMetadata {
  const canonicalPath = turkishOnlyRoutes.blog.tr;
  return {
    title: blogPage.metaTitle,
    description: blogPage.metaDescription,
    canonicalPath,
    alternates: { tr: canonicalPath },
    locale: "tr",
    keywords: ["GBO Vision blog", ...siteKeywords.tr],
    page: "blog",
    pageType: "CollectionPage",
    siteDescription: messages.metadata.description,
    ogImage: ogImageFor("blog-tr", cardAlt(blogPage.metaTitle), genericOgAlt.tr),
  };
}

/** The frontmatter fields an article's head is built from. */
export interface ArticleFrontmatter {
  title: string;
  seoTitle: string;
  description: string;
  slug: string;
  publishedAt: Date;
  updatedAt: Date;
  category: string;
  tags: string[];
  keyword: string;
  ogImage: string;
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/** /blog/<slug>. Turkish only, like the index. */
export function buildArticleMetadata(
  messages: Messages,
  article: ArticleFrontmatter,
): PageMetadata {
  const canonicalPath = blogArticlePath(article.slug);
  return {
    title: article.seoTitle,
    description: article.description,
    canonicalPath,
    alternates: { tr: canonicalPath },
    locale: "tr",
    keywords: [...new Set([article.keyword, ...article.tags, "GBO Vision"])],
    page: "article",
    pageType: "WebPage",
    siteDescription: messages.metadata.description,
    ogImage: articleOgImage(article.ogImage, article.title, genericOgAlt.tr),
    article: {
      publishedTime: isoDate(article.publishedAt),
      modifiedTime: isoDate(article.updatedAt),
      section: article.category,
      tags: article.tags,
    },
  };
}
