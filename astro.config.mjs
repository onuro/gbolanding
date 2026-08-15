// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sentry from "@sentry/astro";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// `npm run dev:phone` sets this. Testing on a real handset needs the dev server
// on the LAN and reachable under the tunnel's hostname, and getUserMedia needs
// a secure context, which is why the tunnel is there at all.
const phone = process.env.PHONE === "1";

export default defineConfig({
  // Canonical, hreflang and OG URLs are built from this rather than from the
  // request origin, so a preview deploy can't hand Google a *.vercel.app URL
  // that canonicalises to itself. The apex redirects here, so www it is.
  site: "https://www.gbovision.com",
  output: "server",
  adapter: vercel(),
  integrations: [
    react(),
    // ponytail: source maps only upload when SENTRY_AUTH_TOKEN is set (CI/Vercel).
    sentry({
      project: "gbo-landing",
      org: "gbo-vision",
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  ...(phone ? { server: { host: true } } : {}),
  vite: {
    plugins: [tailwindcss()],
    ...(phone
      ? {
          server: {
            // The tunnel hands the page a *.trycloudflare.com host, which Vite
            // refuses by default.
            allowedHosts: true,
            // Off unless asked for: a hot reload mid-call looks exactly like
            // the bug being chased. The tunnel terminates on 443, so the HMR
            // socket has to be told where to knock when it is on.
            hmr:
              process.env.PHONE_HMR === "1"
                ? { protocol: "wss", clientPort: 443 }
                : false,
          },
        }
      : {}),
  },
});
