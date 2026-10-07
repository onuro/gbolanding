// Run after `astro build`. Marketing pages are static: asking the SSR handler
// for them can return 404, which the old status < 500 smoke check falsely passed.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL(".vercel/output/", root);
const staticRoot = new URL("static/", output);
const origin = "https://gbovision.com";
const clusters = {
  home: { tr: "/", en: "/en" },
  about: { tr: "/about", en: "/en/about" },
  kollektor: { tr: "/kollektor", en: "/en/kollektor" },
  intelval: { tr: "/intelval", en: "/en/intelval" },
  hastam: { tr: "/hastam", en: "/en/hastam" },
  fountible: { tr: "/fountible", en: "/en/fountible" },
  contact: { tr: "/contact", en: "/en/contact" },
  privacy: { tr: "/privacy", en: "/en/privacy" },
};
const pages = [
  { path: "/", locale: "tr", page: "home", title: "Kurumsal Yapay Zeka" },
  { path: "/en", locale: "en", page: "home", title: "Enterprise AI Agency" },
  { path: "/about", locale: "tr", page: "about", title: "GBO Vision Hakkında" },
  { path: "/en/about", locale: "en", page: "about", title: "About GBO Vision" },
  { path: "/kollektor", locale: "tr", page: "kollektor", title: "Kollektor" },
  { path: "/en/kollektor", locale: "en", page: "kollektor", title: "Kollektor" },
  { path: "/intelval", locale: "tr", page: "intelval", title: "Intelval" },
  { path: "/en/intelval", locale: "en", page: "intelval", title: "Intelval" },
  { path: "/hastam", locale: "tr", page: "hastam", title: "Hastam" },
  { path: "/en/hastam", locale: "en", page: "hastam", title: "Hastam" },
  { path: "/fountible", locale: "tr", page: "fountible", title: "Fountible" },
  { path: "/en/fountible", locale: "en", page: "fountible", title: "Fountible" },
  { path: "/contact", locale: "tr", page: "contact", title: "İletişim" },
  { path: "/en/contact", locale: "en", page: "contact", title: "Contact" },
  { path: "/privacy", locale: "tr", page: "privacy", title: "KVKK aydınlatma metni" },
  { path: "/en/privacy", locale: "en", page: "privacy", title: "Privacy notice" },
];
const absolute = (path) => new URL(path, origin).href;

// The blog is Turkish only (docs/language-routing.md): its pages name tr and
// x-default and no English alternate, and their EN switch leads to the English
// home page. The articles are whatever the build produced: every directory
// under static/blog/ is one, so a new article is checked without editing this
// list.
const turkishOnly = (path) => ({ alternates: { tr: path }, switches: { tr: path, en: clusters.home.en } });
const blogIndex = { path: "/blog", locale: "tr", page: "blog", title: "Blog", ...turkishOnly("/blog") };
const articles = (await readdir(new URL("blog/", staticRoot), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map(({ name: slug }) => ({
    path: `/blog/${slug}`,
    locale: "tr",
    page: "article",
    slug,
    // An article's <title> is its seoTitle: 30 to 60 characters ending on the brand.
    title: " | GBO Vision",
    ...turkishOnly(`/blog/${slug}`),
  }));
const blogPages = [blogIndex, ...articles];
const alternatesOf = (page) => page.alternates ?? clusters[page.page];
const switchesOf = (page) => page.switches ?? clusters[page.page];

// Per-page share cards: src/data/og-images.json names each page's 1200x630 PNG;
// a page whose PNG is missing falls back to the site-wide /og.png at its own
// size. An article's card is the frontmatter's /og/blog-<slug>.png.
const manifestFile = new URL("src/data/og-images.json", root);
const manifest = existsSync(manifestFile) ? JSON.parse(await readFile(manifestFile, "utf8")) : {};
const manifestPath = (key) => {
  const value = manifest[key];
  return typeof value === "string" ? value : (value?.src ?? value?.path ?? value?.url);
};
function expectedOgImage(page) {
  const path =
    page.page === "article" ? `/og/blog-${page.slug}.png` : manifestPath(`${page.page}-${page.locale}`);
  return path && existsSync(new URL(path.slice(1), staticRoot))
    ? { path, width: "1200", height: "630" }
    : { path: "/og.png", width: "1733", height: "907" };
}

// Only parse known generated tags/quoted attributes, not arbitrary HTML.
function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
      ([, name, double, single]) => [name.toLowerCase(), double ?? single],
    ),
  );
}

function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    ([tag]) => attributes(tag),
  );
}

function assertAlternates(links, cluster, label) {
  const alternates = links.filter((link) => link.hreflang);
  const expected = { ...cluster, "x-default": cluster.tr };
  assert.equal(
    alternates.length,
    Object.keys(expected).length,
    `${label}: exactly ${Object.keys(expected).join(", ")} alternates`,
  );
  for (const [language, path] of Object.entries(expected)) {
    assert.equal(
      alternates.find((link) => link.hreflang === language)?.href,
      absolute(path),
      `${label}: ${language} alternate`,
    );
  }
}

function metaContent(html, key) {
  return tags(html, "meta").find((tag) => tag.property === key || tag.name === key)?.content;
}

function assertPage(html, page, label = page.path) {
  assert.equal(tags(html, "html")[0]?.lang, page.locale, `${label}: HTML language`);
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
  assert.ok(title.includes(page.title), `${label}: localized page title`);
  if (page.page === "article") {
    assert.ok(title.length >= 30 && title.length <= 60, `${label}: title of 30 to 60 characters`);
  }
  assert.ok(/<h1\b/i.test(html), `${label}: rendered content, not a redirect shell`);
  const links = tags(html, "link");
  assert.deepEqual(
    links.filter((link) => link.rel === "canonical").map((link) => link.href),
    [absolute(page.path)],
    `${label}: self canonical`,
  );
  assertAlternates(
    links.filter((link) => link.rel === "alternate"),
    alternatesOf(page),
    label,
  );
  for (const region of ["header", "footer"]) {
    const markup = html.match(new RegExp(`<${region}\\b[\\s\\S]*?<\\/${region}>`, "i"))?.[0];
    assert.ok(markup, `${label}: ${region} exists`);
    const switches = tags(markup, "a").filter((link) => link.hreflang);
    for (const [locale, href] of Object.entries(switchesOf(page))) {
      const localized = switches.filter((link) => link.hreflang === locale);
      assert.ok(localized.length > 0, `${label}: ${region} ${locale} switch exists`);
      assert.ok(
        localized.every((link) => link.href === href),
        `${label}: ${region} ${locale} switch retains the current page`,
      );
    }
  }
  const card = expectedOgImage(page);
  assert.equal(metaContent(html, "og:image"), absolute(card.path), `${label}: its own og:image`);
  assert.equal(metaContent(html, "twitter:image"), absolute(card.path), `${label}: twitter:image is the og:image`);
  assert.equal(metaContent(html, "og:image:width"), card.width, `${label}: og:image:width`);
  assert.equal(metaContent(html, "og:image:height"), card.height, `${label}: og:image:height`);
  assert.ok(metaContent(html, "og:image:alt"), `${label}: og:image:alt`);
  assert.equal(
    metaContent(html, "og:type"),
    page.page === "article" ? "article" : "website",
    `${label}: og:type`,
  );
  assert.ok(!/gbo_locale|cf-ipcountry|x-vercel-ip-country/i.test(html), `${label}: no locale detection`);
}

for (const page of pages) {
  const relative = page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
  const html = await readFile(new URL(relative, staticRoot), "utf8");
  assertPage(html, page);
  console.log(`ok static ${page.path}: ${page.locale}, canonical, alternates, language switches`);

  if (page.page === "home") {
    const media = [...html.matchAll(/<product-video\b[\s\S]*?<\/product-video>/g)];
    assert.equal(media.length, 2, `${page.path}: both product videos have a still fallback`);
    const assets = new Set();
    for (const [markup] of media) {
      const video = tags(markup, "video")[0];
      assert.equal(video.preload, "none", "video must not compete with initial images");
      assert.ok(!video.poster && !video.src, "no original PNG poster or eager video URL");
      assert.ok(!/<video\b[^>]*\sautoplay(?:\s|=|>)/.test(markup), "playback starts only when visible");
      const still = tags(markup, "img")[0];
      assert.equal(still.loading, "lazy", "responsive still is lazy-loaded");
      assert.ok(still.srcset && still.sizes, "still has viewport-specific image candidates");
      assets.add(still.src);
      still.srcset.split(",").forEach((candidate) => assets.add(candidate.trim().split(/\s+/)[0]));
      for (const source of tags(markup, "source")) {
        assert.ok(!source.src && source["data-src"], "video URL stays deferred in rendered HTML");
        const file = new URL(source["data-src"].slice(1), staticRoot);
        assert.ok((await stat(file)).size < 1_000_000, `${file.pathname}: product clip stays below 1 MB`);
      }
    }
    for (const asset of assets) {
      assert.ok(asset.endsWith(".webp"), "stills must use optimized images");
      assert.ok((await stat(new URL(asset.slice(1), staticRoot))).size < 150_000, `${asset}: still stays below 150 KB`);
    }
    console.log(`ok static ${page.path}: deferred product videos and media size budgets`);
  }
}

// ---- Blog: the index and every article ------------------------------------
const graphOf = (html) =>
  JSON.parse(html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)[1])["@graph"];
const plainText = (markup) =>
  markup
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .trim();
const feedHref = absolute("/blog/rss.xml");
const articleModified = new Map();

for (const page of blogPages) {
  const html = await readFile(new URL(`${page.path.slice(1)}/index.html`, staticRoot), "utf8");
  const label = page.path;
  assertPage(html, page);
  const canonical = absolute(page.path);
  const graph = graphOf(html);
  const nodes = (type) => graph.filter((node) => node["@type"] === type);
  assert.ok(
    tags(html, "link").some(
      (link) => link.rel === "alternate" && link.type === "application/rss+xml" && link.href === feedHref,
    ),
    `${label}: links the feed`,
  );

  if (page.page === "blog") {
    const [collection] = nodes("CollectionPage");
    const [blog] = nodes("Blog");
    assert.ok(collection && blog, `${label}: CollectionPage and Blog`);
    assert.equal(collection.mainEntity?.["@id"], blog["@id"], `${label}: the page is about the Blog`);
    assert.deepEqual(
      (blog.blogPost ?? []).map((post) => post.url).toSorted(),
      articles.map((article) => absolute(article.path)).toSorted(),
      `${label}: the Blog lists every article`,
    );
    console.log(`ok static ${label}: tr only, Blog/CollectionPage, ${articles.length} articles, feed`);
    continue;
  }

  const [posting] = nodes("BlogPosting");
  assert.ok(posting, `${label}: BlogPosting`);
  assert.equal(
    posting.headline,
    plainText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)[1]),
    `${label}: the headline is the h1`,
  );
  // The company writes the articles; no invented person.
  assert.equal(posting.author?.["@type"], "Organization", `${label}: author is the organisation`);
  assert.equal(posting.publisher?.["@type"], "Organization", `${label}: publisher is the organisation`);
  assert.equal(posting.inLanguage, "tr-TR", `${label}: inLanguage`);
  assert.equal(posting.mainEntityOfPage?.["@id"], `${canonical}#webpage`, `${label}: mainEntityOfPage`);
  assert.equal(posting.image?.url, metaContent(html, "og:image"), `${label}: image is the share card`);
  assert.match(posting.datePublished, /^\d{4}-\d{2}-\d{2}$/, `${label}: datePublished`);
  assert.equal(metaContent(html, "article:published_time"), posting.datePublished, `${label}: published_time`);
  assert.equal(metaContent(html, "article:modified_time"), posting.dateModified, `${label}: modified_time`);
  assert.deepEqual(
    (nodes("BreadcrumbList")[0]?.itemListElement ?? []).map((item) => item.item),
    [absolute("/"), absolute("/blog"), canonical],
    `${label}: breadcrumb Ana sayfa / Blog / article`,
  );
  // FAQPage marks up exactly the questions the accordion shows.
  const shown = (html.match(/<details\b[^>]*\bname="article-faq"/g) ?? []).length;
  assert.equal(nodes("FAQPage")[0]?.mainEntity?.length ?? 0, shown, `${label}: FAQPage matches the page`);
  articleModified.set(canonical, posting.dateModified);
  console.log(`ok static ${label}: tr only, article card, BlogPosting, breadcrumb, ${shown} questions`);
}

// ---- Contact: the address and the form, nothing else ----------------------
// The owner's rule: no e-mail address or phone in the markup or the JSON-LD;
// the form's recipient lives only on the server.
for (const path of Object.values(clusters.contact)) {
  const html = await readFile(new URL(`${path.slice(1)}/index.html`, staticRoot), "utf8");
  assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(html), `${path}: no e-mail address`);
  assert.ok(!/href="tel:/i.test(html), `${path}: no phone link`);
  const graph = graphOf(html);
  const [contactPage] = graph.filter((node) => node["@type"] === "ContactPage");
  const [organization] = graph.filter((node) => node["@type"] === "Organization");
  assert.ok(contactPage, `${path}: ContactPage`);
  assert.equal(contactPage.mainEntity?.["@id"], organization?.["@id"], `${path}: about the organisation`);
  assert.ok(organization.address?.streetAddress, `${path}: the address`);
  for (const key of ["email", "telephone", "contactPoint", "legalName"]) {
    assert.equal(organization[key], undefined, `${path}: no ${key}`);
  }
  console.log(`ok static ${path}: ContactPage, address only, no e-mail or phone`);
}

const feed = await readFile(new URL("blog/rss.xml", staticRoot), "utf8");
assert.match(feed, /<rss version="2\.0"/, "feed: RSS 2.0");
assert.deepEqual(
  [...feed.matchAll(/<item>[\s\S]*?<link>([^<]+)<\/link>/g)].map(([, link]) => link).toSorted(),
  articles.map((article) => absolute(article.path)).toSorted(),
  "feed: one item per article",
);
console.log(`ok static /blog/rss.xml: ${articles.length} items`);

const sitemap = await readFile(new URL("sitemap.xml", staticRoot), "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => entry);
const listed = [...pages, ...blogPages];
assert.equal(entries.length, listed.length, "sitemap: exactly one entry per canonical page");
const locations = entries.map((entry) => entry.match(/<loc>([^<]+)<\/loc>/)?.[1]);
assert.deepEqual(locations.toSorted(), listed.map((page) => absolute(page.path)).toSorted());
for (const entry of entries) {
  const location = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
  const page = listed.find((candidate) => absolute(candidate.path) === location);
  assert.ok(page, `sitemap: recognized URL ${location}`);
  assertAlternates(tags(entry, "xhtml:link"), alternatesOf(page), `sitemap ${page.path}`);
  // An article's lastmod is its last update, as its page states it.
  if (page.page === "article") {
    assert.equal(
      entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
      articleModified.get(location),
      `sitemap ${page.path}: lastmod is dateModified`,
    );
  }
}
assert.ok(!/https:\/\/gbovision\.com\/tr(?:[\/"<]|$)/.test(sitemap), "sitemap: no legacy Turkish URLs");
console.log("ok static sitemap: canonical URL clusters, Turkish x-default, blog with lastmod");

const webmanifest = JSON.parse(await readFile(new URL("site.webmanifest", staticRoot), "utf8"));
assert.equal(webmanifest.lang, "tr", "webmanifest: Turkish default");
assert.equal(webmanifest.start_url, "/", "webmanifest: direct Turkish homepage");
assert.ok(webmanifest.description.includes("yapay zeka"), "webmanifest: Turkish description");
console.log("ok webmanifest: Turkish install metadata");

const config = JSON.parse(await readFile(new URL("config.json", output), "utf8"));
const routeRules = config.routes ?? [];
const locationHeader = (rule) => Object.entries(rule.headers ?? {}).find(
  ([name]) => name.toLowerCase() === "location",
)?.[1];
for (const [legacy, target] of [["/tr", "/"], ["/tr/about", "/about"]]) {
  for (const path of [legacy, `${legacy}/`]) {
    let current = path;
    const statuses = [];
    while (current !== target && statuses.length < 3) {
      const rule = routeRules.find((candidate) => candidate.src && new RegExp(candidate.src).test(current));
      assert.ok(rule, `${path}: routing rule exists for ${current}`);
      assert.ok([301, 308].includes(rule.status), `${path}: permanent hosting-layer redirect`);
      assert.ok(locationHeader(rule), `${path}: redirect destination exists`);
      assert.ok(!rule.has && !rule.missing, `${path}: no header/cookie conditions`);
      // Check that generated destinations do not replace the incoming query.
      // Actual query forwarding is Vercel behavior, not simulated by this test;
      // Astro dev redirects differ and require a separate post-deploy check.
      assert.ok(!locationHeader(rule).includes("?"), `${path}: no query replacement`);
      current = current.replace(new RegExp(rule.src), locationHeader(rule));
      statuses.push(rule.status);
    }
    assert.equal(current, target, `${path}: reaches its canonical destination`);
    assert.deepEqual(
      statuses,
      path.endsWith("/") ? [308, 301] : [301],
      `${path}: only optional slash normalization then the legacy 301`,
    );
  }
}
for (const page of [...pages, ...blogPages, { path: "/blog/rss.xml" }]) {
  assert.ok(
    !routeRules.some((rule) => rule.src && rule.dest && rule.status !== 404 &&
      new RegExp(rule.src).test(page.path)),
    `${page.path}: no runtime route in front of the static file`,
  );
}
assert.ok(!existsSync(new URL("src/middleware.ts", root)), "locale middleware is removed");
console.log("ok Vercel routing: static marketing pages and unconditional legacy 301s");

async function assertNoLocaleDetection(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory);
    if (entry.isDirectory()) {
      await assertNoLocaleDetection(file);
    } else if (/\.(?:m?js|html)$/.test(entry.name)) {
      assert.ok(
        !/gbo_locale|cf-ipcountry|x-vercel-ip-country/i.test(await readFile(file, "utf8")),
        `${file.pathname}: no bundled locale cookie/geolocation logic`,
      );
    }
  }
}
await assertNoLocaleDetection(output);
console.log("ok bundles: no locale cookie or country-header detection");

// Only invalid input and production-disabled routes: never submit a lead or
// open a voice session. Both /gbo endpoints return before side effects in PROD.
const entry = new URL("functions/_render.func/dist/server/entry.mjs", output);
const { default: handler } = await import(entry.href);
for (const test of [
  { path: "/api/waitlist", status: 422, body: { email: "invalid" }, error: "invalid_email" },
  // Invalid fields are refused before any mail provider is looked at.
  { path: "/api/contact", status: 422, body: { email: "invalid" }, error: "invalid_fields" },
  { path: "/gbo/session", status: 404, body: {} },
  { path: "/gbo/probe", status: 404, body: {} },
]) {
  const response = await handler.fetch(new Request(absolute(test.path), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(test.body),
  }));
  assert.equal(response.status, test.status, `${test.path}: exact production status`);
  assert.equal(response.headers.get("location"), null, `${test.path}: never redirects`);
  assert.equal(response.headers.get("set-cookie"), null, `${test.path}: no locale cookie`);
  if (test.error) assert.equal((await response.json()).error, test.error);
  console.log(`ok server POST ${test.path} -> ${test.status}`);
}

// The cost model at /maliyet is an unlisted one-off: served to anyone holding
// the link, but kept out of the sitemap and out of search results. It is not a
// marketing page, so none of the canonical/alternate rules above apply to it.
const maliyet = await handler.fetch(new Request(absolute("/maliyet")));
assert.equal(maliyet.status, 200, "/maliyet: served to anyone with the link");
assert.match(
  maliyet.headers.get("content-type") ?? "",
  /^text\/html/,
  "/maliyet: served as HTML, not as a download",
);
assert.match(maliyet.headers.get("x-robots-tag") ?? "", /noindex/, "/maliyet: noindex");
assert.ok((await maliyet.text()).includes("GB200"), "/maliyet: serves the cost model");
assert.ok(!/maliyet/.test(sitemap), "/maliyet: stays out of the sitemap");
console.log("ok server GET /maliyet -> 200, HTML, noindex, unlisted");

// Optional integration coverage against an already-running local dev server.
// This tests request independence, not Vercel's redirect query forwarding.
if (process.env.DEV_BASE_URL) {
  const devBase = new URL(process.env.DEV_BASE_URL);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(devBase.hostname), "DEV_BASE_URL must be local");
  const visitors = [
    { name: "US English", headers: { "cf-ipcountry": "US", "Accept-Language": "en-US,en;q=0.9" } },
    { name: "Turkey English", headers: { "cf-ipcountry": "TR", "Accept-Language": "en-US" } },
    { name: "Turkish browser", headers: { "x-vercel-ip-country": "DE", "Accept-Language": "tr-TR,tr;q=0.9" } },
    { name: "saved English", headers: { Cookie: "gbo_locale=en", "cf-ipcountry": "TR" } },
    { name: "saved Turkish", headers: { Cookie: "gbo_locale=tr", "cf-ipcountry": "US" } },
    { name: "Googlebot", headers: { "User-Agent": "Googlebot", "cf-ipcountry": "TR", "Accept-Language": "en" } },
  ];
  for (const page of [...pages, ...blogPages]) {
    await Promise.all(visitors.map(async (visitor) => {
      const response = await fetch(new URL(`${page.path}?utm_source=locale-regression`, devBase), {
        headers: visitor.headers,
        redirect: "manual",
        signal: AbortSignal.timeout(15000),
      });
      const label = `${page.path} (${visitor.name})`;
      assert.equal(response.status, 200, `${label}: direct response`);
      assert.equal(response.headers.get("location"), null, `${label}: no redirect`);
      assert.equal(response.headers.get("set-cookie"), null, `${label}: no locale cookie`);
      assertPage(await response.text(), page, label);
    }));
    console.log(`ok dev ${page.path}: all six country/browser/cookie variants`);
  }
}
