#!/usr/bin/env node
// Renders the share cards (Open Graph images) with headless Chrome.
//
//   node scripts/og/render.mjs                  every entry of scripts/og/pages.json
//   node scripts/og/render.mjs home-tr blog-*   only these keys (a trailing * matches a prefix)
//   node scripts/og/render.mjs --url home-tr    print the template URL, to open and tune by hand
//
// Each entry becomes public/og/<key>.png (1200 x 630), and src/data/og-images.json
// is rewritten to map every entry whose PNG exists to "/og/<key>.png".
// No packages: Node's standard library and the Chrome that is already installed
// (override the path with CHROME_PATH). Nothing here touches .vite, dist or the
// dev server, so it is safe to run while `astro dev` is up. See README.md.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { slimPng } from "./png.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const TEMPLATE = join(HERE, "template.html");
const PAGES = join(HERE, "pages.json");
const OUT_DIR = join(REPO, "public/og");
const MANIFEST = join(REPO, "src/data/og-images.json");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const WIDTH = 1200;
const HEIGHT = 630;
const BUDGET_BYTES = 400 * 1024;
const PARALLEL = 3;
const TIMEOUT_MS = 60_000;
const KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = new Set(["photo", "face", "window", "atmos"]);

const pages = JSON.parse(readFileSync(PAGES, "utf8"));

// An entry may name another as its base ("inherit": "blog-tr") and override
// fields; "visual" merges one level deep. Articles use this to share the
// blog card's picture.
function resolveEntry(key, seen = []) {
  const entry = pages[key];
  if (!entry) throw new Error(`${key}: no such entry in pages.json`);
  if (!entry.inherit) return entry;
  if (seen.includes(key)) throw new Error(`${key}: inherit loop (${[...seen, key].join(" -> ")})`);
  const base = resolveEntry(entry.inherit, [...seen, key]);
  const { inherit, ...own } = entry;
  return { ...base, ...own, visual: { ...base.visual, ...own.visual } };
}

function validate(key, entry) {
  const problems = [];
  if (!KEY.test(key)) problems.push("key must be lowercase ASCII kebab case");
  if (!entry.title?.trim()) problems.push("title is missing");
  if (entry.title && entry.title.length > 80) problems.push(`title is ${entry.title.length} characters (80 at most)`);
  if (!["tr", "en"].includes(entry.lang)) problems.push('lang must be "tr" or "en"');
  const v = entry.visual;
  if (!v || !KINDS.has(v.kind)) problems.push(`visual.kind must be one of ${[...KINDS].join(", ")}`);
  for (const field of ["src", "backdrop"]) {
    if (v?.[field] && !existsSync(join(REPO, v[field]))) problems.push(`visual.${field} not found: ${v[field]}`);
  }
  if (v && !v.src) problems.push("visual.src is missing");
  return problems;
}

function templateUrl(entry) {
  const url = pathToFileURL(TEMPLATE);
  url.searchParams.set("c", JSON.stringify(entry));
  return url.href;
}

function pngSize(file) {
  const b = readFileSync(file);
  if (b.length < 24 || b.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function shoot(key, entry) {
  const file = join(OUT_DIR, `${key}.png`);
  const profile = mkdtempSync(join(tmpdir(), "og-chrome-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--user-data-dir=${profile}`,
    // the template loads its fonts and pictures from disk
    "--allow-file-access-from-files",
    // let the fonts load and the title fit before the shot is taken
    "--virtual-time-budget=6000",
    "--no-first-run",
    "--no-default-browser-check",
    `--screenshot=${file}`,
    templateUrl(entry),
  ];
  return new Promise((done) => {
    const started = Date.now();
    const chrome = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    chrome.stderr.on("data", (d) => (stderr += d));
    const timer = setTimeout(() => chrome.kill("SIGKILL"), TIMEOUT_MS);
    chrome.on("close", () => {
      clearTimeout(timer);
      rmSync(profile, { recursive: true, force: true });
      const ms = Date.now() - started;
      if (!existsSync(file) || statSync(file).mtimeMs < started - 1000) {
        done({ key, ok: false, message: `no screenshot (${stderr.trim().split("\n").pop() || "Chrome exited"})` });
        return;
      }
      const size = pngSize(file);
      // Chrome writes a quick PNG; re-pack it, and trim bits only if it is over budget.
      const { bytes, bits } = slimPng(file, BUDGET_BYTES);
      const notes = bits < 8 ? [`${bits} bits per channel`] : [];
      if (!size || size.width !== WIDTH || size.height !== HEIGHT) notes.push(`size ${size?.width}x${size?.height}, expected ${WIDTH}x${HEIGHT}`);
      if (bytes > BUDGET_BYTES) notes.push(`${Math.round(bytes / 1024)} KB is over the ${BUDGET_BYTES / 1024} KB budget`);
      done({ key, ok: bytes <= BUDGET_BYTES && size?.width === WIDTH && size?.height === HEIGHT, bytes, ms, message: notes.join("; ") });
    });
  });
}

function writeManifest() {
  const manifest = {};
  for (const key of Object.keys(pages).sort()) {
    if (existsSync(join(OUT_DIR, `${key}.png`))) manifest[key] = `/og/${key}.png`;
  }
  mkdirSync(dirname(MANIFEST), { recursive: true });
  writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
  return Object.keys(manifest).length;
}

// ---- main -------------------------------------------------------------------

const argv = process.argv.slice(2);

if (argv[0] === "--url") {
  const key = argv[1];
  if (!key) throw new Error("usage: render.mjs --url <key>");
  console.log(templateUrl(resolveEntry(key)));
  process.exit(0);
}

const wanted = argv.filter((a) => !a.startsWith("--"));
const keys = wanted.length
  ? Object.keys(pages).filter((k) => wanted.some((w) => (w.endsWith("*") ? k.startsWith(w.slice(0, -1)) : k === w)))
  : Object.keys(pages);
const unknown = wanted.filter((w) => !w.endsWith("*") && !pages[w]);
if (unknown.length) {
  console.error(`Not in pages.json: ${unknown.join(", ")}`);
  process.exit(1);
}
if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME}; set CHROME_PATH.`);
  process.exit(1);
}

const jobs = [];
let invalid = 0;
for (const key of keys) {
  const entry = resolveEntry(key);
  const problems = validate(key, entry);
  if (problems.length) {
    invalid++;
    console.error(`✗ ${key}: ${problems.join("; ")}`);
  } else {
    jobs.push([key, entry]);
  }
}

mkdirSync(OUT_DIR, { recursive: true });
const results = [];
let next = 0;
await Promise.all(
  Array.from({ length: Math.min(PARALLEL, jobs.length) }, async () => {
    while (next < jobs.length) {
      const [key, entry] = jobs[next++];
      const r = await shoot(key, entry);
      results.push(r);
      const kb = r.bytes ? `${Math.round(r.bytes / 1024)} KB` : "";
      console.log(`${r.ok ? "✓" : "✗"} public/og/${key}.png ${kb}${r.message ? `  ${r.message}` : ""}`);
    }
  }),
);

const count = writeManifest();
console.log(`src/data/og-images.json: ${count} entries`);
const failed = results.filter((r) => !r.ok).length + invalid;
process.exit(failed ? 1 : 0);
