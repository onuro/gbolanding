# GBO Landing

Astro landing page for GBO Vision enterprise AI platforms.

## Getting Started

```bash
bun install
bun run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Scripts

- `bun run dev` — start the Astro dev server
- `bun run build` — production build (Vercel SSR adapter)
- `bun run preview` — not supported with the Vercel adapter; use `bun run dev` locally

## Locales

- `/` — English (default)
- `/tr` — Turkish

Locale is auto-detected via cookie, Vercel geo (`x-vercel-ip-country`), or `Accept-Language`, then persisted in the `gbo_locale` cookie.
