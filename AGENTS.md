<!-- BEGIN:astro-agent-rules -->
# Astro project

This is an Astro site with React islands (`@astrojs/react`), Tailwind CSS v4 via `@tailwindcss/vite`, and `@astrojs/vercel` SSR.

- Pages live in `src/pages/`
- Shared layout: `src/layouts/BaseLayout.astro`
- Interactive UI (countdown, signup, language switcher) are React islands with `client:load`
- Turkish is served at `/` and `/about`; English is an explicit `/en` or `/en/about` choice. No automatic locale middleware or locale cookies.
- Marketing pages and the sitemap are prerendered; API routes stay server-rendered. Legacy `/tr` URLs redirect in `astro.config.mjs`.
<!-- END:astro-agent-rules -->
