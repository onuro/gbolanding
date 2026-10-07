import type { APIRoute } from "astro";

import blogPage from "@/i18n/messages/blog-page.tr";
import { blogArticlePath, blogFeedPath, turkishOnlyRoutes } from "@/i18n/routes";
import { getArticles } from "@/lib/blog";

export const prerender = true;

const escape = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

// RSS 2.0, written by hand: it is a few lines, and a dependency for it is not.
// lastBuildDate is the newest article's update, not the build's clock, so an
// unchanged blog publishes an unchanged feed.
export const GET: APIRoute = async ({ site }) => {
  const origin = site ?? new URL("https://gbovision.com");
  const href = (path: string) => new URL(path, origin).href;
  const articles = await getArticles();
  const newest = articles
    .map((article) => article.data.updatedAt)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const items = articles.map((article) => {
    const url = href(blogArticlePath(article.id));
    return `    <item>
      <title>${escape(article.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escape(article.data.description)}</description>
      <pubDate>${article.data.publishedAt.toUTCString()}</pubDate>
      <category>${escape(article.data.category)}</category>
    </item>`;
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(blogPage.name)}</title>
    <link>${href(turkishOnlyRoutes.blog.tr)}</link>
    <description>${escape(blogPage.metaDescription)}</description>
    <language>tr-TR</language>
    <atom:link href="${href(blogFeedPath)}" rel="self" type="application/rss+xml"/>${
      newest ? `\n    <lastBuildDate>${newest.toUTCString()}</lastBuildDate>` : ""
    }
${items.join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
