// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

// `npm run dev:phone` sets this. Testing on a real handset needs the dev server
// on the LAN and reachable under the tunnel's hostname, and getUserMedia needs
// a secure context, which is why the tunnel is there at all.
const phone = process.env.PHONE === "1";

export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [react()],
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
