import type { APIRoute } from "astro";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export const prerender = false;

/**
 * Sink for CrashProbe breadcrumbs, so a page that dies on a handset leaves its
 * log on the dev machine instead of on a screen someone has to transcribe.
 *
 * Dev only — the probe posts here just the same in production, where this 404s
 * and the overlay stays the only readout.
 */
const LOG = ".astro/probe.log";

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) {
    return new Response(null, { status: 404 });
  }

  const body = await request.text();
  await mkdir(dirname(LOG), { recursive: true });
  await appendFile(LOG, `${body}\n`);

  // 204 so sendBeacon never retries and the page is never told to do anything.
  return new Response(null, { status: 204 });
};
