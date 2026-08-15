import type { APIRoute } from "astro";

export const prerender = false;

// @astrojs/sitemap only emits prerendered routes and every page here is SSR, so
// the two real URLs are listed by hand. /en is a redirect and stays out — a
// sitemap that lists redirects is how you teach Google to distrust the sitemap.
const pages = [
  { path: "/", hreflang: "en" },
  { path: "/tr", hreflang: "tr" },
] as const;

export const GET: APIRoute = ({ site }) => {
  // `site` is set in astro.config.mjs; the fallback only matters if it is ever
  // unset again, and pointing at www would list URLs that redirect.
  const origin = site ?? new URL("https://gbovision.com");
  const href = (path: string) => new URL(path, origin).href;

  // Both pages carry the full alternate set, which is what pairs them as one
  // localised cluster rather than two unrelated pages.
  const alternates = [
    ...pages.map(
      ({ path, hreflang }) =>
        `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${href(path)}"/>`,
    ),
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${href("/")}"/>`,
  ].join("\n");

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${pages
  .map(
    ({ path }) => `  <url>
    <loc>${href(path)}</loc>
${alternates}
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
