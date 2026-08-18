import type { APIRoute } from "astro";

import { locales } from "@/i18n/config";
import { pageKeys, routes } from "@/i18n/routes";

export const prerender = false;

// @astrojs/sitemap only emits prerendered routes and every page here is SSR, so
// the URLs are built by hand from the shared route table. /en is a redirect and
// stays out -- a sitemap that lists redirects is how you teach Google to
// distrust the sitemap.
export const GET: APIRoute = ({ site }) => {
  // `site` is set in astro.config.mjs; the fallback only matters if it is ever
  // unset again, and pointing at www would list URLs that redirect.
  const origin = site ?? new URL("https://gbovision.com");
  const href = (path: string) => new URL(path, origin).href;

  // One cluster per page, each carrying only its own alternates. Computing a
  // single alternate block across a flat list of every URL -- which is what this
  // did when there was only one page -- would give each cluster two `en` and two
  // `tr` entries the moment a second page existed, invalidating all of them.
  const urls = pageKeys.flatMap((page) => {
    const cluster = routes[page];
    const alternates = [
      ...locales.map(
        (code) =>
          `    <xhtml:link rel="alternate" hreflang="${code}" href="${href(cluster[code])}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${href(cluster.en)}"/>`,
    ].join("\n");

    return locales.map(
      (code) => `  <url>
    <loc>${href(cluster[code])}</loc>
${alternates}
  </url>`,
    );
  });

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
