import { getCollection, type CollectionEntry } from "astro:content";
import blogPage from "@/i18n/messages/blog-page.tr";
import { blogArticlePath } from "@/i18n/routes";

// Reading helpers for the blog collection (src/content.config.ts). Pages, the
// feed and the sitemap all list articles through getArticles(), so they agree
// on which articles exist and in what order.

export type Article = CollectionEntry<"blog">;

/** Newest first; the later update breaks a tie, then the title. */
export async function getArticles(): Promise<Article[]> {
  const articles = await getCollection("blog");
  return articles.sort(
    (a, b) =>
      b.data.publishedAt.getTime() - a.data.publishedAt.getTime() ||
      b.data.updatedAt.getTime() - a.data.updatedAt.getTime() ||
      a.data.title.localeCompare(b.data.title, "tr"),
  );
}

/**
 * Words a reader reads: the Markdown with its syntax taken out. Link targets,
 * table rules and heading marks are not words.
 */
export function countWords(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?\s*:?-{3,}.*$/gm, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`|~]/g, " ");
  return text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu)?.length ?? 0;
}

/**
 * A heading's id in ASCII kebab case, by the same rule as the article slugs:
 * "İşi tanımlayın" → "isi-tanimlayin". Markdown's own ids keep the Turkish
 * letters, and lowercasing "İ" leaves an invisible combining dot behind, so a
 * link to a section ("#i̇şi-tanımlayın") broke as soon as someone retyped it.
 */
export function asciiSlug(value: string): string {
  return value
    .replace(/[ıİ]/g, "i")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Anchors of the article page's own sections (ArticlePage.astro). */
export const articleSectionIds = {
  faq: "sorular",
  sources: "kaynaklar",
  product: "ilgili-urun",
  more: "diger-yazilar",
} as const;

// Ids the page already uses around the body. A heading such as "## Kaynaklar"
// or "## Demo" must not take one: two elements would share an id, and the
// header's demo button (a bare "#demo") would scroll into the article.
const reservedIds = [
  ...Object.values(articleSectionIds),
  "demo",
  "main-content",
  "article-title",
  "summary-title",
  "toc-title",
  "final-cta-heading",
];

export interface ArticleHeading {
  depth: number;
  slug: string;
  text: string;
}

/**
 * The rendered body with every heading's id rewritten by asciiSlug(), and the
 * headings with the same ids, for the contents. Two headings that end up with
 * one id get -2, -3 and so on, in reading order.
 */
export function withAsciiHeadingIds(
  html: string,
  headings: readonly ArticleHeading[],
): { html: string; headings: ArticleHeading[] } {
  const ids = new Map<string, string>();
  const taken = new Set<string>(reservedIds);
  const outHeadings = headings.map((heading) => {
    const base = asciiSlug(heading.text) || asciiSlug(heading.slug) || "bolum";
    let id = base;
    for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
    taken.add(id);
    ids.set(heading.slug, id);
    return { ...heading, slug: id };
  });
  const outHtml = html.replace(
    /(<h[1-6]\b[^>]*?\sid=")([^"]*)(")/g,
    (match, open: string, id: string, close: string) => {
      const next = ids.get(id);
      return next ? `${open}${next}${close}` : match;
    },
  );
  return { html: outHtml, headings: outHeadings };
}

/** About 200 words a minute, never under one. */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

export const readingLabel = (minutes: number) =>
  blogPage.article.readingTime.replace("{n}", String(minutes));

const dayFormat = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormat = new Intl.DateTimeFormat("tr-TR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "7 Ekim 2026". Frontmatter dates are calendar days, read in UTC. */
export const formatDate = (date: Date) => dayFormat.format(date);

/** A source date as precise as it was given: "7 Ekim 2026", "Ekim 2026" or "2026". */
export function formatSourceDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (day) return dayFormat.format(new Date(Date.UTC(year, month - 1, day)));
  if (month) return monthFormat.format(new Date(Date.UTC(year, month - 1, 1)));
  return String(year);
}

/** YYYY-MM-DD, as the <time> element, JSON-LD and the sitemap want it. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Two (or `count`) other articles for the foot of an article: the same product
 * first, then the same category, then the newest.
 */
export function relatedArticles(current: Article, all: readonly Article[], count = 2): Article[] {
  const score = (article: Article) =>
    (current.data.relatedProduct && article.data.relatedProduct === current.data.relatedProduct ? 2 : 0) +
    (article.data.category === current.data.category ? 1 : 0);
  return all
    .filter((article) => article.id !== current.id)
    .map((article, index) => ({ article, index, score: score(article) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ article }) => article);
}

/** What a list of articles shows for each one. */
export interface ArticleListItem {
  href: string;
  title: string;
  description: string;
  category: string;
  /** "7 Ekim 2026" */
  date: string;
  /** YYYY-MM-DD */
  dateIso: string;
  reading: string;
  summary: string[];
  /** Frontmatter `featured`: leads the /blog index. */
  featured: boolean;
}

export function toListItem(article: Article): ArticleListItem {
  const { data } = article;
  return {
    href: blogArticlePath(article.id),
    title: data.title,
    description: data.description,
    category: data.category,
    date: formatDate(data.publishedAt),
    dateIso: isoDate(data.publishedAt),
    reading: readingLabel(readingMinutes(countWords(article.body ?? ""))),
    summary: data.summary,
    featured: data.featured === true,
  };
}
