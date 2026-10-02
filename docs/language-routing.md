# Language routing

Turkish is the default for every visitor. Language is determined only by the
requested URL, never by country, browser language, user agent, or a saved cookie.

| Page | Turkish | English |
| --- | --- | --- |
| Home | `/` | `/en` |
| About | `/about` | `/en/about` |
| Kollektor | `/kollektor` | `/en/kollektor` |
| Hastam | `/hastam` | `/en/hastam` |

Slugs are not translated: the English page is the same slug under `/en`.
`src/i18n/routes.ts` is the one table every canonical, alternate, sitemap entry
and EN/TR switch is built from.

The EN/TR links switch to the equivalent page. Visiting `/` always returns
Turkish, including for visitors with an old `gbo_locale=en` cookie.

## Delivery and redirects

- The marketing pages (home, about and the two product pages, in both
  languages) and `/sitemap.xml` render at build time and are served
  as static files. Interactive React islands still hydrate in the browser.
- `/api/waitlist` and `/gbo/*` remain dynamic. The voice service is unchanged.
- The old `/tr` and `/tr/about` URLs permanently redirect to `/` and `/about`.
  Astro generates hosting-level redirect rules for Vercel, so legacy links
  continue to work without locale middleware.
- Non-root URLs use no trailing slash. Slash variants normalize to their
  canonical URL.
- Canonicals and EN/TR alternate links use the new paths. `x-default` points to
  Turkish, and the sitemap lists only canonical pages, not legacy redirects.

These changes remove automatic locale redirects and request-time HTML rendering
from normal homepage visits. Production TTFB still depends on the CDN, network,
and deployment; it should be measured after deployment.

Run `npm run check` and `npm run check:ssr` before deploying. No Search Console,
DNS, Cloudflare, or live-site settings are changed by the local implementation.

## Adding a page

1. Add a cluster to `routes` in `src/i18n/routes.ts`.
2. Give it a title and description in the `pageCopy` table of
   `src/i18n/metadata.ts`. The table is typed against the route keys, so a page
   without its own metadata is a type error rather than a duplicate title.
3. Add the two wrappers under `src/pages/` and `src/pages/en/`, each with
   `export const prerender = true`. Without it the page becomes a function route.
4. Add the cluster and its two rows to `clusters` and `pages` in
   `scripts/check-ssr.mjs`; the sitemap assertion counts them.

Product pages keep their copy in `src/i18n/messages/<product>-page.<locale>.ts`
and their shape in `src/i18n/page-types/`. `scripts/content-audit.mjs` picks up
every `*-page.<locale>.ts` file by itself, for both readability and metadata.
The shared pieces (chapter frame, hero, numbered tables, FAQ) are in
`src/components/product/`.
