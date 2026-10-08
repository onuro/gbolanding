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
| Intelval | `/intelval` | `/en/intelval` |
| Hastam | `/hastam` | `/en/hastam` |
| Fountible | `/fountible` | `/en/fountible` |

The route table is `src/i18n/routes.ts`. See `docs/language-routing.md`.

## Waitlist

The demo request form requires an e-mail address and phone number and posts to
`/api/waitlist`. With `RESEND_API_KEY` set, it
emails the request through Resend using the same `CONTACT_TO` and `CONTACT_FROM`
settings as the contact form. The phone number and selected product are included in the email,
and replying to it goes to the visitor's address. Resend takes precedence when
both delivery methods are configured. Otherwise `WAITLIST_WEBHOOK_URL` receives
the JSON payload, with optional `WAITLIST_WEBHOOK_TOKEN` authorization. With
neither configured, the form reports that it cannot send the request (`503`).

## Contact form

`/contact` and `/en/contact` post to `/api/contact`, which checks the message
(name 2–120 characters, e-mail, required phone, optional company up to 160, optional topic,
message 10–4,000), drops anything that fills the hidden `website` field, and
allows five messages per address per ten minutes.

Both forms use the same phone validation in the browser and endpoint: 7–15
digits, with an optional leading `+`, spaces, parentheses, dots or hyphens.
The phone number is included in both e-mail and webhook deliveries. Delivery uses:

- `RESEND_API_KEY` set: an e-mail through Resend, to `CONTACT_TO` (comma-separated;
  the default lives only in `src/pages/api/contact.ts`) from `CONTACT_FROM`
  (default `GBO Vision Web <web@gbovision.com>`, a domain verified in Resend),
  with the visitor's address as `reply_to`.
- Otherwise `WAITLIST_WEBHOOK_URL` set: the message as JSON with
  `source: "contact-page"`, with `WAITLIST_WEBHOOK_TOKEN` as the bearer token.
- Neither: `503`, and the page says messages cannot be sent right now.

These settings are read per request with `process.env` (`src/lib/server-env.ts`)
and remain server-only. After changing them in Vercel, create a new deployment
for the changes to take effect; existing deployments keep their previous values.
The recipient never appears in a response, the page, its JSON-LD or the browser
bundle.
