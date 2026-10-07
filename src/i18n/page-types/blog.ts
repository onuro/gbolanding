import type { ChapterCopy } from "@/i18n/page-types/shared";

// The copy shape of /blog and /blog/<slug>. Turkish only: the blog has no
// English edition (docs/language-routing.md), so there is no blog-page.en.ts
// and this copy is not part of Messages. The articles themselves are Markdown
// in src/content/blog/.

export interface BlogPageMessages {
  /** Own title and description: the index never shares the home page's. */
  metaTitle: string;
  metaDescription: string;
  /** Name of the blog, for the feed, the JSON-LD Blog node and breadcrumbs. */
  name: string;
  index: {
    eyebrow: string;
    /** The index's h1. */
    title: string;
    lead: string;
    /** Label on the hairline above the newest article. */
    featuredLabel: string;
    /** Label on the hairline above the rest. */
    listLabel: string;
    /** Shown while no article is published. */
    empty: string;
    feed: string;
  };
  article: {
    /** aria-label of the breadcrumb. */
    breadcrumbLabel: string;
    home: string;
    /** "{n}" is replaced with the minutes. */
    readingTime: string;
    /** Name of the reading time, for screen readers. */
    readingTimeLabel: string;
    published: string;
    updated: string;
    summary: string;
    toc: string;
    read: string;
    faq: ChapterCopy;
    sources: ChapterCopy;
    /** The h2 comes from the product (messages.solutions). */
    related: { label: string; demo: string };
    more: ChapterCopy;
    allPosts: string;
  };
  /** The chapter on a Turkish product page that links to its articles. */
  productPosts: ChapterCopy;
}
