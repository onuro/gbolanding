// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sentry from "@sentry/astro";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
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
  vite: {
    plugins: [tailwindcss()],
  },
});
