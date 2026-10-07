import { existsSync } from "node:fs";
import { join } from "node:path";

// Per-page share images. src/data/og-images.json maps a page key to its
// 1200×630 PNG under public/og/:
//
//   "home-tr", "home-en", "about-tr", "kollektor-en", ... : `${page}-${locale}`
//   "blog-tr"                                         : the blog index
//   "blog-<slug>"                                     : one article
//
// An article names its own image in its frontmatter (ogImage), which is the
// same /og/blog-<slug>.png. A key that is missing, or a file that is not on
// disk yet, falls back to the site-wide /og.png, so a page never advertises an
// image that answers 404.
//
// Every page that reads this is prerendered, so the file check runs once, at
// build time (and per request in dev), never in a serverless function.

type ManifestValue =
  | string
  | { src?: string; path?: string; url?: string; alt?: string };

// A glob rather than an import: the manifest is produced separately, and the
// site has to build before it exists.
const manifestModules = import.meta.glob<Record<string, ManifestValue>>(
  "/src/data/og-images.json",
  { eager: true, import: "default" },
);
const manifest: Record<string, ManifestValue> =
  Object.values(manifestModules)[0] ?? {};

export interface OgImage {
  /** Site-relative path; the layout makes it absolute. */
  path: string;
  width: number;
  height: number;
  alt: string;
}

export const fallbackOgImage = { path: "/og.png", width: 1733, height: 907 } as const;

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const onDisk = (path: string) =>
  path.startsWith("/") && !path.includes("..") && existsSync(join(process.cwd(), "public", path));

function fromManifest(key: string): { path: string; alt?: string } | undefined {
  const value = manifest[key];
  if (!value) return undefined;
  if (typeof value === "string") return { path: value };
  const path = value.src ?? value.path ?? value.url;
  return path ? { path, alt: value.alt } : undefined;
}

/**
 * The share image for a manifest key. `alt` describes this page's card;
 * `fallbackAlt` describes the generic /og.png, which shows no page title.
 */
export function ogImageFor(key: string, alt: string, fallbackAlt: string): OgImage {
  const entry = fromManifest(key);
  if (entry && onDisk(entry.path)) {
    return { path: entry.path, width: OG_WIDTH, height: OG_HEIGHT, alt: entry.alt ?? alt };
  }
  return { ...fallbackOgImage, alt: fallbackAlt };
}

/** An article's image: its frontmatter path, if the file is there. */
export function articleOgImage(
  frontmatterPath: string,
  alt: string,
  fallbackAlt: string,
): OgImage {
  if (onDisk(frontmatterPath)) {
    return { path: frontmatterPath, width: OG_WIDTH, height: OG_HEIGHT, alt };
  }
  return { ...fallbackOgImage, alt: fallbackAlt };
}

/** The home page's card when it exists, else /og.png. For the Organization node. */
export function homeOgImagePath(): string {
  const entry = fromManifest("home-tr");
  return entry && onDisk(entry.path) ? entry.path : fallbackOgImage.path;
}

export const genericOgAlt = {
  tr: "GBO Vision — İş büyümesi için kurumsal yapay zeka ve özel yazılım.",
  en: "GBO Vision — Enterprise AI and custom software for business growth.",
} as const;
