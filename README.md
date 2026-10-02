# GBO Vision

Astro homepage for GBO Vision's enterprise AI platforms.

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

## Pages and locales

Turkish is served at the root; English is an explicit `/en` choice. The language
comes only from the URL: there is no cookie, geo or `Accept-Language` detection.

| Page | Turkish | English |
| --- | --- | --- |
| Home | `/` | `/en` |
| About | `/about` | `/en/about` |
| Kollektor | `/kollektor` | `/en/kollektor` |
| Hastam | `/hastam` | `/en/hastam` |

The route table is `src/i18n/routes.ts`. See `docs/language-routing.md`.

## Waitlist

The waitlist form posts to `/api/waitlist`, which validates the request and
forwards it to a configured HTTPS webhook.

Copy `.env.example` to `.env` and set:

- `WAITLIST_WEBHOOK_URL` — destination that receives the JSON payload
- `WAITLIST_WEBHOOK_TOKEN` — optional bearer token for that destination

The form returns an honest unavailable state until the webhook is configured.
