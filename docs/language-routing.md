# Language routing

Turkish is the default for every visitor. Language is determined only by the
requested URL, never by country, browser language, user agent, or a saved cookie.

| Page | Turkish | English |
| --- | --- | --- |
| Home | `/` | `/en` |
| About | `/about` | `/en/about` |
| Kollektor | `/kollektor` | `/en/kollektor` |
| Intelval | `/intelval` | `/en/intelval` |
| Hastam | `/hastam` | `/en/hastam` |
| Fountible | `/fountible` | `/en/fountible` |
| Contact | `/contact` | `/en/contact` |
| Privacy notice (KVKK) | `/privacy` | `/en/privacy` |
| Blog | `/blog`, `/blog/<slug>`, `/blog/rss.xml` | none (Turkish only) |

Slugs are not translated: the English page is the same slug under `/en`.
`src/i18n/routes.ts` is the one table every canonical, alternate, sitemap entry
and EN/TR switch is built from.

The EN/TR links switch to the equivalent page. Visiting `/` always returns
Turkish, including for visitors with an old `gbo_locale=en` cookie.

## The blog is Turkish only

The articles are written for Turkish readers and have no English edition, so
there is no `/en/blog`. The blog routes live in `turkishOnlyRoutes` in
`src/i18n/routes.ts`, not in `routes`, and behave like this:

- **hreflang:** each blog page names itself as `tr` and as `x-default`, and
  nothing else, in its `<head>` and in the sitemap. hreflang may only point at
  a translation of the same content; an English page that lists Turkish
  articles is not one.
- **Why no `/en/blog`:** the article contract has no English fields, so such a
  page could only repeat Turkish titles under an English heading: thin
  content with nothing to rank for, and a second URL that competes with
  `/blog`.
- **EN/TR switch:** on a blog page TR stays on the page and EN goes to the
  English home page, `/en` (`languageSwitch()` in `src/i18n/routes.ts`). That
  is navigation, not an alternate.
- **Navigation:** the header (after About) and the footer link "Blog" to
  `/blog` in both languages; the word is the same in Turkish and English.
- **Sitemap and feed:** `/blog` and every article are in `/sitemap.xml`, each
  article with its `updatedAt` as `lastmod` and the index with the newest of
  them. `/blog/rss.xml` lists every article (RSS 2.0, prerendered).

### Writing an article

Articles are Markdown files, `src/content/blog/<slug>.md`. The frontmatter
contract (title, seoTitle, description, slug, dates, category, tags, keyword,
relatedProduct, ogImage, summary, faq, sources) is the zod schema in
`src/content.config.ts`, so a file that breaks it fails in the dev overlay and
in the build. The slug is the URL: `/blog/<slug>`, ASCII kebab case. A file
whose name starts with `_` is a draft: the collection skips it, so it never
reaches a page, the sitemap or the feed.

The article page (`src/components/blog/ArticlePage.astro`) builds the rest:
the breadcrumb, the reading time (about 200 words a minute), "Kısaca" from
`summary`, "İçindekiler" from the `##` headings, the FAQ (and the FAQPage
JSON-LD from the same array), "Kaynaklar", the related product from
`messages.solutions`, "Benzer yazılar" and the demo request. Heading ids are
ASCII (`## İşi tanımlayın` becomes `#isi-tanimlayin`) and never take one of
the page's own ids such as `#demo` or `#kaynaklar`.

## Share images

Every page has its own 1200×630 card under `public/og/`, listed in
`src/data/og-images.json` by key: `home-tr`, `about-en`, `kollektor-tr`, …,
`blog-tr` for the blog index and `blog-<slug>` for an article
(`scripts/og/README.md` renders them). `src/lib/og-images.ts` resolves a page's
card; an article uses its frontmatter `ogImage`, `/og/blog-<slug>.png`. A card
that is missing falls back to the site-wide `/og.png` with its real size, so
no page advertises an image that answers 404. Articles also set
`og:type` `article` with `article:published_time` and `article:modified_time`.

## Delivery and redirects

- The marketing pages (home, about, the four product pages and contact, in
  both languages), the blog (`/blog`, every article and `/blog/rss.xml`) and
  `/sitemap.xml` render at build time and are served as static files.
  Interactive React islands still hydrate in the browser.
- `/api/waitlist`, `/api/contact` and `/gbo/*` remain dynamic. The voice
  service is unchanged.
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
5. Add its share card to `scripts/og/pages.json` and render it; until then the
   page shares `/og.png`.

A Turkish-only page goes in `turkishOnlyRoutes` instead, with one wrapper under
`src/pages/` and no English one. `scripts/check-ssr.mjs` finds blog articles
in the build output by itself; it needs no list of them.

Product pages keep their copy in `src/i18n/messages/<product>-page.<locale>.ts`
and their shape in `src/i18n/page-types/`. `scripts/content-audit.mjs` picks up
every `*-page.<locale>.ts` file by itself, for both readability and metadata.
The shared pieces (chapter frame, hero, numbered tables, FAQ) are in
`src/components/product/`.
