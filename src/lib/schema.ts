import { brand, brandUrl } from "@/lib/brand";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { pathFor, turkishOnlyRoutes } from "@/i18n/routes";
import type { Messages } from "@/i18n/types";
import { homeOgImagePath } from "@/lib/og-images";

type Node = Record<string, unknown>;

/**
 * Drops blank strings, empty arrays and undefined. An unfinished field is then
 * simply absent from the graph instead of being published as `""`, which a
 * consumer would read as "this company asserts it has no legal name".
 */
function prune<T extends Node>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  ) as T;
}

export const organizationId = (origin: URL | string) =>
  new URL("/#organization", origin).href;

const websiteId = (origin: URL | string) => new URL("/#website", origin).href;

/**
 * The whole point of the @id/@graph shape: every node names the organisation by
 * reference instead of restating it, so Google sees one entity described from
 * several angles rather than several look-alike entities.
 */
function organizationNode(
  origin: URL,
  description: string,
  // /contact shows the address only, by the owner's rule: no e-mail and no
  // legal name there, even once brand.ts fills them in.
  addressOnly = false,
): Node {
  const email = addressOnly ? "" : brand.email;
  return prune({
    "@type": "Organization",
    "@id": organizationId(origin),
    name: brand.name,
    alternateName: [...brand.alternateName],
    legalName: addressOnly ? "" : brand.legalName,
    url: new URL("/", origin).href,
    logo: {
      "@type": "ImageObject",
      url: new URL("/gbobo2.svg", origin).href,
      width: 1993,
      height: 852,
      caption: brand.name,
    },
    // The home page's own share card once it exists, else the site-wide one.
    image: new URL(homeOgImagePath(), origin).href,
    description,
    email,
    contactPoint: email
      ? prune({
          "@type": "ContactPoint",
          contactType: "sales",
          email,
          availableLanguage: [...locales],
        })
      : undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: brand.streetAddress,
      addressLocality: brand.addressLocality,
      addressRegion: brand.addressRegion,
      addressCountry: brand.addressCountry,
    },
    areaServed: brand.addressCountry,
    knowsLanguage: [...locales],
    sameAs: [...brand.sameAs],
  });
}

function websiteNode(origin: URL, description: string): Node {
  return prune({
    "@type": "WebSite",
    "@id": websiteId(origin),
    name: brand.name,
    alternateName: [...brand.alternateName],
    url: new URL("/", origin).href,
    description,
    inLanguage: [...locales],
    publisher: { "@id": organizationId(origin) },
  });
}

export interface PageSchemaInput {
  origin: URL;
  canonical: URL;
  locale: Locale;
  /** Stable, site-level description of the company -- not the per-page one. */
  siteDescription: string;
  title: string;
  description: string;
  pageType: "WebPage" | "AboutPage" | "CollectionPage" | "ContactPage";
  /**
   * The @id of the thing this page is about, when it is not the organisation.
   * A product page names its SoftwareApplication node here.
   */
  mainEntityId?: string;
  extraNodes?: Node[];
}

export function buildGraph({
  origin,
  canonical,
  locale,
  siteDescription,
  title,
  description,
  pageType,
  mainEntityId,
  extraNodes = [],
}: PageSchemaInput) {
  // A page that ships a BreadcrumbList (the blog) names it from its own node.
  const breadcrumb = extraNodes.find((node) => node["@type"] === "BreadcrumbList");
  const page = prune({
    "@type": pageType,
    "@id": `${canonical.href}#webpage`,
    url: canonical.href,
    name: title,
    description,
    inLanguage: locale,
    isPartOf: { "@id": websiteId(origin) },
    about: { "@id": organizationId(origin) },
    // On /about this is the load-bearing statement: it says the page's subject
    // *is* the organisation, which is the clearest claim schema.org offers that
    // a URL and an entity belong to each other. /contact names it too: the
    // organisation's node carries the address the page shows.
    mainEntity:
      pageType === "AboutPage" || pageType === "ContactPage"
        ? { "@id": organizationId(origin) }
        : mainEntityId
          ? { "@id": mainEntityId }
          : undefined,
    breadcrumb: breadcrumb ? { "@id": breadcrumb["@id"] } : undefined,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(origin, siteDescription, pageType === "ContactPage"),
      websiteNode(origin, siteDescription),
      page,
      ...extraNodes,
    ],
  };
}

export type ProductSlug = "kollektor" | "intelval" | "hastam" | "fountible";

// Keyed on the product, not on the URL it happens to live at: the same @id is
// used on the home page and on the product's own page, so both describe one
// entity instead of two look-alikes.
export const productId = (origin: URL | string, slug: ProductSlug) =>
  new URL(`/#app-${slug}`, origin).href;

/**
 * One product as a SoftwareApplication node.
 *
 * No offers/aggregateRating/review: there are no public prices and no collected
 * reviews, and inventing either is what earns a manual action. These nodes will
 * not produce a rich result -- they exist to thicken the entity graph around the
 * brand name, nothing more.
 */
export function buildProductNode(
  origin: URL,
  messages: Messages,
  slug: ProductSlug,
  locale: Locale = defaultLocale,
  extra: Node = {},
): Node {
  const solution = messages.solutions[slug];

  return prune({
    "@type": "SoftwareApplication",
    "@id": productId(origin, slug),
    name: solution.title,
    description: solution.description,
    // Set here rather than on the product's page, so the home page and the
    // page describe the one @id the same way. Fountible is a design tool with
    // a Mac app; the others are business software in the browser.
    applicationCategory:
      slug === "fountible" ? "DesignApplication" : "BusinessApplication",
    operatingSystem: slug === "fountible" ? "Web, macOS" : "Web",
    // Every product has its own page.
    url: new URL(pathFor(slug, locale), origin).href,
    provider: { "@id": organizationId(origin) },
    publisher: { "@id": organizationId(origin) },
    featureList: [...solution.highlights],
    inLanguage: [...locales],
    ...extra,
  });
}

/**
 * The products shown on the homepage. `solutions.enterprise` describes how the company
 * delivers work, not a piece of software, so it gets no node here.
 */
export function buildProductNodes(
  origin: URL,
  messages: Messages,
  locale: Locale = defaultLocale,
): Node[] {
  return (["kollektor", "intelval", "hastam", "fountible"] as const).map((slug) =>
    buildProductNode(origin, messages, slug, locale),
  );
}

/**
 * Mark up only the questions the page actually renders: feed this the same
 * array the accordion maps over, never a longer or reworded list.
 */
export function faqPageNode(
  canonical: URL,
  items: readonly { question: string; answer: string }[],
): Node {
  return {
    "@type": "FAQPage",
    "@id": `${canonical.href}#faq`,
    mainEntity: items.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };
}

// ---- Blog ---------------------------------------------------------------------

/** The blog as one entity, shared by the index and every article. */
export const blogId = (origin: URL | string) =>
  new URL(`${turkishOnlyRoutes.blog.tr}#blog`, origin).href;

export const articleId = (canonical: URL) => `${canonical.href}#article`;

/** Where a page sits, as the breadcrumb on the page shows it. */
export function breadcrumbNode(
  canonical: URL,
  items: readonly { name: string; url: string }[],
): Node {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonical.href}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// The company writes the articles: there is no named author to show, and
// inventing one is exactly what structured data must not do. Name and URL are
// repeated next to the @id so a reader that does not resolve the graph still
// gets an author it can display.
const organizationRef = (origin: URL) => ({
  "@type": "Organization",
  "@id": organizationId(origin),
  name: brand.name,
  url: brandUrl(origin),
});

export interface BlogPostingInput {
  origin: URL;
  canonical: URL;
  headline: string;
  description: string;
  /** YYYY-MM-DD */
  datePublished: string;
  /** YYYY-MM-DD */
  dateModified: string;
  image: { url: string; width: number; height: number };
  keywords: readonly string[];
  section: string;
  wordCount: number;
  /** The product the article leads to, if any, by its name on the site. */
  product?: { slug: ProductSlug; name: string } | null;
}

/** One article. The page's WebPage node names it as its main entity. */
export function blogPostingNode(input: BlogPostingInput): Node {
  const { origin, canonical } = input;
  return prune({
    "@type": "BlogPosting",
    "@id": articleId(canonical),
    headline: input.headline,
    description: input.description,
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    author: organizationRef(origin),
    publisher: organizationRef(origin),
    image: {
      "@type": "ImageObject",
      url: input.image.url,
      width: input.image.width,
      height: input.image.height,
    },
    inLanguage: "tr-TR",
    url: canonical.href,
    mainEntityOfPage: { "@id": `${canonical.href}#webpage` },
    isPartOf: { "@id": blogId(origin) },
    keywords: [...input.keywords],
    articleSection: input.section,
    wordCount: input.wordCount,
    // The product's full node lives on its own page and the home page; this
    // page names it by the same @id, with a type, name and URL of its own so
    // the reference reads on its own too.
    mentions: input.product
      ? {
          "@type": "SoftwareApplication",
          "@id": productId(origin, input.product.slug),
          name: input.product.name,
          url: new URL(pathFor(input.product.slug, defaultLocale), origin).href,
        }
      : undefined,
  });
}

/** The blog on its index page, with the articles it lists. */
export function blogNode(
  origin: URL,
  blog: { name: string; description: string },
  posts: readonly {
    url: string;
    headline: string;
    datePublished: string;
    dateModified: string;
  }[],
): Node {
  return prune({
    "@type": "Blog",
    "@id": blogId(origin),
    name: blog.name,
    description: blog.description,
    url: new URL(turkishOnlyRoutes.blog.tr, origin).href,
    inLanguage: "tr-TR",
    publisher: { "@id": organizationId(origin) },
    isPartOf: { "@id": websiteId(origin) },
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      "@id": `${post.url}#article`,
      headline: post.headline,
      url: post.url,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
    })),
  });
}
