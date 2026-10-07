import { brand } from "@/lib/brand";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { pathFor } from "@/i18n/routes";
import type { Messages } from "@/i18n/types";

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
function organizationNode(origin: URL, description: string): Node {
  return prune({
    "@type": "Organization",
    "@id": organizationId(origin),
    name: brand.name,
    alternateName: [...brand.alternateName],
    legalName: brand.legalName,
    url: new URL("/", origin).href,
    logo: {
      "@type": "ImageObject",
      url: new URL("/gbobo2.svg", origin).href,
      width: 1993,
      height: 852,
      caption: brand.name,
    },
    image: new URL("/og.png", origin).href,
    description,
    email: brand.email,
    contactPoint: brand.email
      ? prune({
          "@type": "ContactPoint",
          contactType: "sales",
          email: brand.email,
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
  pageType: "WebPage" | "AboutPage";
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
    // a URL and an entity belong to each other.
    mainEntity:
      pageType === "AboutPage"
        ? { "@id": organizationId(origin) }
        : mainEntityId
          ? { "@id": mainEntityId }
          : undefined,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(origin, siteDescription),
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
