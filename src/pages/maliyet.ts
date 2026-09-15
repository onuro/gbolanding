import type { APIRoute } from "astro";

import document from "@/docs/maliyet.html?raw";

export const prerender = false;

/**
 * The GPU cost model, served to anyone with the link.
 *
 * The document is a standalone HTML file carrying its own <head>, so it goes out
 * verbatim rather than through BaseLayout.
 *
 * It is deliberately absent from src/i18n/routes.ts, which is what the sitemap
 * is built from: this is an unlisted one-off rather than part of the marketing
 * site, and it has no language alternates.
 */
export const GET: APIRoute = () =>
  new Response(document, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Same revalidate-on-every-request policy as the marketing pages.
      "Cache-Control": "public, max-age=0, must-revalidate",
      // Reachable by link but kept out of search results. robots.txt asks for
      // the same thing from crawlers that read it first.
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
