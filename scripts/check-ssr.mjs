// A build that compiles can still 500 on every request: a browser-only module
// that touches AudioWorkletNode or window at import time throws when Node
// evaluates the island. Only running the built server finds that. Run after
// `astro build`.
const entry = new URL(
  "../.vercel/output/functions/_render.func/dist/server/entry.mjs",
  import.meta.url,
);

const { default: handler } = await import(entry.href);

// The two routes that render the orb. /en/* only redirects, so it renders nothing.
for (const path of ["/", "/tr"]) {
  const res = await handler.fetch(new Request(`https://gbovision.com${path}`));
  if (res.status >= 500) {
    console.error(`FAIL ${path} -> ${res.status}`);
    process.exit(1);
  }
  console.log(`ok ${path} -> ${res.status}`);
}
