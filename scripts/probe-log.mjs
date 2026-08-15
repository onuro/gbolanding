/**
 * Prints what the handset sent to /gbo/probe, newest session last.
 *
 *   node scripts/probe-log.mjs          every session
 *   node scripts/probe-log.mjs --last   only the most recent one
 */
import { readFile } from "node:fs/promises";

const LOG = ".astro/probe.log";

const raw = await readFile(LOG, "utf8").catch(() => null);
if (!raw) {
  console.log(`No ${LOG} yet — load the page with ?probe=1 on the phone first.`);
  process.exit(0);
}

/** @type {Map<string, {ua: string, entries: any[], replayed: any[]}>} */
const sessions = new Map();
for (const line of raw.split("\n")) {
  if (!line.trim()) continue;
  let batch;
  try {
    batch = JSON.parse(line);
  } catch {
    continue;
  }
  if (batch.kind === "selftest") continue;
  const session = sessions.get(batch.session) ?? {
    ua: batch.ua ?? "",
    entries: [],
    replayed: [],
  };
  // A "previous-page-life" batch is the *dead* page, replayed by its successor.
  if (batch.kind === "previous-page-life") session.replayed.push(...batch.entries);
  else session.entries.push(...batch.entries);
  sessions.set(batch.session, session);
}

const ids = [...sessions.keys()];
const show = process.argv.includes("--last") ? ids.slice(-1) : ids;

const render = (entries, prefix = "") => {
  for (const entry of entries) {
    const flag = /^[A-Z-]+$/.test(entry.tag) ? " ←" : "";
    console.log(
      `${prefix}${String(entry.t).padStart(7)}ms  ${entry.tag}${entry.info ? "  " + entry.info : ""}${flag}`,
    );
  }
};

for (const id of show) {
  const session = sessions.get(id);
  console.log(`\n${"═".repeat(78)}\nsession ${id}`);
  console.log(session.ua.replace(/^Mozilla\/5\.0 /, "") || "(no ua)");
  if (session.replayed.length) {
    console.log(`\n── the page that died (replayed by the load after it) ──`);
    render(session.replayed, "  ");
  }
  console.log(`\n── live beacons ──`);
  render(session.entries, "  ");
}
