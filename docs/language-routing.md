# Language routing

Turkish is the default for every visitor. Language is determined only by the
requested URL, never by country, browser language, user agent, or a saved cookie.

| Page | Turkish | English |
| --- | --- | --- |
| Home | `/` | `/en` |
| About | `/about` | `/en/about` |

The EN/TR links switch to the equivalent page. Visiting `/` always returns
Turkish, including for visitors with an old `gbo_locale=en` cookie.

## Delivery and redirects

- The four marketing pages and `/sitemap.xml` render at build time and are served
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
