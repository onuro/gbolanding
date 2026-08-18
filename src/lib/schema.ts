import { brand } from "@/lib/brand";
import { locales, type Locale } from "@/i18n/config";
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
      pageType === "AboutPage" ? { "@id": organizationId(origin) } : undefined,
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

/**
 * Kollektor and Intelval only. `solutions.enterprise` describes how the company
 * delivers work, not a piece of software, so it gets no node here.
 *
 * No offers/aggregateRating/review: there are no public prices and no collected
 * reviews, and inventing either is what earns a manual action. These nodes will
 * not produce a rich result -- they exist to thicken the entity graph around the
 * brand name, nothing more.
 */
export function buildProductNodes(origin: URL, messages: Messages): Node[] {
  const { kollektor, intelval } = messages.solutions;

  return [
    // The @id is keyed on the product, not on the anchor it happens to link to:
    // Intelval lives inside the #solutions grid, so deriving the id from the
    // anchor would name it "#app-solutions" and it would stop being a stable
    // identifier the moment the section were renamed.
    { solution: kollektor, slug: "kollektor", anchor: "/#kollektor" },
    { solution: intelval, slug: "intelval", anchor: "/#solutions" },
  ].map(({ solution, slug, anchor }) =>
    prune({
      "@type": "SoftwareApplication",
      "@id": new URL(`/#app-${slug}`, origin).href,
      name: solution.title,
      description: solution.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: new URL(anchor, origin).href,
      provider: { "@id": organizationId(origin) },
      publisher: { "@id": organizationId(origin) },
      featureList: [...solution.highlights],
      inLanguage: [...locales],
    }),
  );
}
