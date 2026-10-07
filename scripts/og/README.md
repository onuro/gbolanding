# Share cards (Open Graph images)

Every page has its own 1200 × 630 share card: the picture LinkedIn, WhatsApp, X,
Slack and iMessage show when someone pastes a gbovision.com link. The cards are
rendered from one HTML template with headless Chrome and committed as PNGs.

| File | What it is |
| --- | --- |
| `pages.json` | One entry per card: language, eyebrow, title, line, picture |
| `template.html` | The card's HTML and CSS; reads an entry from `?c=<JSON>` |
| `render.mjs` | Renders entries to `public/og/<key>.png` and writes `src/data/og-images.json` |
| `png.mjs` | Re-packs Chrome's PNG to stay under the 400 KB budget (Node's zlib only) |
| `face-still.mjs` | Renders `assets/hero-face.png`, the home card's particle face |
| `assets/` | Pictures that exist only for the cards (the face still) |

`src/data/og-images.json` maps each key to its file, `"home-tr": "/og/home-tr.png"`.
`src/lib/og-images.ts` reads it; a key without a PNG falls back to `/og.png`.

No packages: Node's standard library and the installed Chrome (set `CHROME_PATH`
if it is not at `/Applications/Google Chrome.app`). Nothing here runs Astro or
Vite or writes to `.vite` or `dist`, so it is safe while `astro dev` is running.

## Commands

```sh
node scripts/og/render.mjs                    # every card
node scripts/og/render.mjs kollektor-tr       # one card
node scripts/og/render.mjs 'blog-*'           # every key with that prefix (quote the *)
node scripts/og/render.mjs --url home-tr      # print the template URL to open and tune in Chrome
node scripts/og/face-still.mjs                # re-render the face still (only when the face changes)
```

`render.mjs` prints each file with its size and exits non-zero if a card is
missing, the wrong size, or over 400 KB. Look at every PNG you render before
committing it.

## Keys

`<page>-<locale>` for the site's pages (`home-tr`, `about-en`, `hastam-tr`, …),
`blog-tr` for the blog index and `blog-<slug>` for an article. Lowercase ASCII
kebab case. The blog is Turkish only (`blog-en` exists for an English share of
the index but no page uses it yet).

## An entry

```json
"intelval-tr": {
  "lang": "tr",
  "eyebrow": "Intelval",
  "title": "Rapor taslağını Intelval hazırlar, imzayı uzmanınız atar.",
  "line": "Lisanslı değerleme firmaları için",
  "visual": { "kind": "photo", "src": "src/assets/editorial/intelval-valuer-site-visit.png", "position": "30% 50%" }
}
```

- `lang`: `tr` or `en`. Sets the page language, so Turkish casing and line breaks are right.
- `eyebrow`: a few words, sentence case: the product's name, or the section.
- `title`: the page's own hero headline (or its meta title), at most 80 characters.
  It is fitted from 64 px down to stay within three lines, or four for a long
  article title. Sentence headings keep their period, noun phrases do not.
- `line`: optional, one short sentence or phrase under the title: who it is for,
  or what the product does. Under ~60 characters reads on one or two lines.
- `inherit`: optional, another key whose fields this entry starts from
  (`visual` merges one level deep).

Turkish copy follows `docs/turkish-copy-guide.md`: "yapay zeka", never "AI" in
running text; the reader is "siz"; product statements in the simple present.

### `visual`

Paths are relative to the repo root. Every kind fills the right-hand cell
(474 × 532 px).

| kind | fields | use |
| --- | --- | --- |
| `photo` | `src`, `position` (CSS object-position), optional `scale` | An editorial photo, cropped to the cell |
| `face` | `src`, `position` | The hero's particle face (screen-blended on the dark well with its dot grid) |
| `window` | `src` (the screenshot), `backdrop` (a noise gradient), `x`, `y`, `width` (px in the cell) | A product window on a noise gradient, cut by the cell edge |
| `atmos` | `src` (a noise gradient), optional `mark: true` | A noise gradient with fine grain, with the GBO Vision mark |

Pick `position` so the subject's face or the product sits in the cell, then
render and look.

## Adding a blog article's card

The article's frontmatter already names its card: `ogImage: /og/blog-<slug>.png`.

1. Add an entry to `pages.json` that inherits the blog card:

   ```json
   "blog-kvkk-ve-sesli-tahsilat": {
     "inherit": "blog-tr",
     "eyebrow": "Blog · Sektör",
     "title": "Sesli tahsilat aramalarında KVKK ne istiyor?",
     "line": ""
   }
   ```

   The key is `blog-` plus the article's `slug`. `title` is the article's
   `title` (the H1, up to 75 characters; a 75-character title still fits, on
   four lines). `eyebrow` is `Blog · <category>`, with the category exactly as
   in the frontmatter (`Yapay zeka`, `Strateji`, `Sektör` or `Teknoloji`, see
   `src/content.config.ts`). Leave `line` empty (`""`, otherwise the blog
   card's line is inherited) or give one short phrase; do not repeat the
   description.
   An article whose `relatedProduct` is set may swap the picture for that
   product's by adding its `visual` from the table below.
2. `node scripts/og/render.mjs blog-<slug>`
3. Look at `public/og/blog-<slug>.png`, then commit it with `pages.json` and
   `src/data/og-images.json`.

| `relatedProduct` | `visual` |
| --- | --- |
| `kollektor` | `{ "kind": "photo", "src": "src/assets/editorial/kollektor-human-conversation-particles-original-2x.png", "position": "36% 50%" }` |
| `intelval` | `{ "kind": "photo", "src": "src/assets/editorial/intelval-valuer-site-visit.png", "position": "30% 50%" }` |
| `hastam` | `{ "kind": "photo", "src": "src/assets/editorial/hastam-doctor-consultation.png", "position": "70% 50%" }` |
| `fountible` | `{ "kind": "window", "src": "src/assets/editorial/fountible-hero.png", "backdrop": "src/assets/editorial/atmosphere-dusk.webp", "x": 56, "y": 72, "width": 800 }` |

`visual` merges one level deep, so a `photo` visual over the blog's `atmos`
one keeps a stray `mark: true`; that is harmless (only `atmos` reads it).

Rendering one key rewrites the whole manifest from `pages.json`, keeping every
entry whose PNG is on disk.

## The design

- 1200 × 630 on the dark page colour (`#09090b`), in TT Firs Neue from `public/fonts`.
- The site's drawn sheet: two rails and two rules 48 px in from the edges, a
  wall between the cells, and a crosshair at each crossing.
- Left cell: the GBO Vision logo, then, hung from the bottom, the eyebrow with
  the green dot, the title (weight 500, tight tracking, never lighter than 400)
  and the line in muted grey.
- Right cell: the page's picture, fill only, no outline.
- Everything that carries meaning sits at least 88 px from the edges, so the
  1.91:1 and 2:1 crops of the share previews keep it.
- Token values are copied from the dark theme in `src/styles/global.css` at the
  top of `template.html`; update them there when the palette changes.

## File size

Chrome writes quick, large PNGs. `png.mjs` re-packs every card losslessly; if a
card is still over 400 KB (photos and grain do that), it drops the lowest bit of
each channel (an invisible change), and if that is not enough, the lowest two.
`render.mjs` prints the bits it kept when it had to.

## The face still

The home cards show the hero's particle face. A share card cannot run WebGL, so
`face-still.mjs` renders a still from the site's own engine
(`src/components/hero-face/engine-cine`), the production mesh and the production
look (`woman-cine-glow`), at twice the cell size, to `assets/hero-face.png`.
It bundles the engine with the esbuild that Astro installs into a temporary
folder and screenshots it in headless Chrome on SwiftShader (about 30 s). Run it
again only when the face's mesh or look changes, then re-render `home-*`.
