// Run after `astro build`. Marketing pages are static: asking the SSR handler
// for them can return 404, which the old status < 500 smoke check falsely passed.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const output = new URL(".vercel/output/", root);
const staticRoot = new URL("static/", output);
const origin = "https://gbovision.com";
const clusters = {
  home: { tr: "/", en: "/en" },
  about: { tr: "/about", en: "/en/about" },
};
const pages = [
  { path: "/", locale: "tr", page: "home", title: "Kurumsal Yapay Zeka" },
  { path: "/en", locale: "en", page: "home", title: "Enterprise AI Agency" },
  { path: "/about", locale: "tr", page: "about", title: "GBO Vision Hakkında" },
  { path: "/en/about", locale: "en", page: "about", title: "About GBO Vision" },
];
const absolute = (path) => new URL(path, origin).href;

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
  assert.equal(alternates.length, 3, `${label}: exactly three alternates`);
  for (const [language, path] of Object.entries({ ...cluster, "x-default": cluster.tr })) {
    assert.equal(
      alternates.find((link) => link.hreflang === language)?.href,
      absolute(path),
      `${label}: ${language} alternate`,
    );
  }
}

function assertPage(html, page, label = page.path) {
  assert.equal(tags(html, "html")[0]?.lang, page.locale, `${label}: HTML language`);
  assert.ok(
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1].includes(page.title),
    `${label}: localized page title`,
  );
  assert.ok(/<h1\b/i.test(html), `${label}: rendered content, not a redirect shell`);
  const links = tags(html, "link");
  assert.deepEqual(
    links.filter((link) => link.rel === "canonical").map((link) => link.href),
    [absolute(page.path)],
    `${label}: self canonical`,
  );
  assertAlternates(
    links.filter((link) => link.rel === "alternate"),
    clusters[page.page],
    label,
  );
  for (const region of ["header", "footer"]) {
    const markup = html.match(new RegExp(`<${region}\\b[\\s\\S]*?<\\/${region}>`, "i"))?.[0];
    assert.ok(markup, `${label}: ${region} exists`);
    const switches = tags(markup, "a").filter((link) => link.hreflang);
    for (const [locale, href] of Object.entries(clusters[page.page])) {
      const localized = switches.filter((link) => link.hreflang === locale);
      assert.ok(localized.length > 0, `${label}: ${region} ${locale} switch exists`);
      assert.ok(
        localized.every((link) => link.href === href),
        `${label}: ${region} ${locale} switch retains the current page`,
      );
    }
  }
  assert.ok(!/gbo_locale|cf-ipcountry|x-vercel-ip-country/i.test(html), `${label}: no locale detection`);
}

for (const page of pages) {
  const relative = page.path === "/" ? "index.html" : `${page.path.slice(1)}/index.html`;
  assertPage(await readFile(new URL(relative, staticRoot), "utf8"), page);
  console.log(`ok static ${page.path}: ${page.locale}, canonical, alternates, language switches`);
}

const sitemap = await readFile(new URL("sitemap.xml", staticRoot), "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => entry);
assert.equal(entries.length, pages.length, "sitemap: exactly four canonical pages");
const locations = entries.map((entry) => entry.match(/<loc>([^<]+)<\/loc>/)?.[1]);
assert.deepEqual(locations.toSorted(), pages.map((page) => absolute(page.path)).toSorted());
for (const entry of entries) {
  const location = entry.match(/<loc>([^<]+)<\/loc>/)?.[1];
  const page = pages.find((candidate) => absolute(candidate.path) === location);
  assert.ok(page, `sitemap: recognized URL ${location}`);
  assertAlternates(tags(entry, "xhtml:link"), clusters[page.page], `sitemap ${page.path}`);
}
assert.ok(!/https:\/\/gbovision\.com\/tr(?:[\/"<]|$)/.test(sitemap), "sitemap: no legacy Turkish URLs");
console.log("ok static sitemap: canonical URL clusters and Turkish x-default");

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
for (const page of pages) {
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
  for (const page of pages) {
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
