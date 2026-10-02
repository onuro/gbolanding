<!-- BEGIN:astro-agent-rules -->
# Astro project

This is an Astro site with React islands (`@astrojs/react`), Tailwind CSS v4 via `@tailwindcss/vite`, and `@astrojs/vercel` SSR.

- Pages live in `src/pages/`
- Shared layout: `src/layouts/BaseLayout.astro`
- Interactive UI (countdown, signup, language switcher) are React islands with `client:load`
- Turkish is served at `/`, `/about`, `/kollektor` and `/hastam`; English is the same path under `/en`. The route table is `src/i18n/routes.ts`. No automatic locale middleware or locale cookies.
- Product pages (`/kollektor`, `/hastam`) are built from `src/components/product/`; their copy lives in `src/i18n/messages/<product>-page.<locale>.ts`. See `docs/language-routing.md` for how to add a page.
- Marketing pages and the sitemap are prerendered; API routes stay server-rendered. Legacy `/tr` URLs redirect in `astro.config.mjs`.
<!-- END:astro-agent-rules -->
