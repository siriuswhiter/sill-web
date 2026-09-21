# Sill website

Static marketing site for **Sill** (置物岛). No build step, no npm.

The site is intentionally self-contained. Do not load Google Fonts or analytics.

## Preview

From the repository root:

```bash
python3 server.py
```

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Port 8765 is often occupied on this machine.
The helper serves the repository with no-cache headers so HTML, CSS, and animation changes are visible immediately.

The language toggle (中文 / English) follows `navigator.language` on first visit and is stored in `localStorage`. The homepage feature preview plays once when it enters the viewport, can be replayed explicitly, and shows its final state when Reduce Motion is enabled.

Pobb animations use the checked-in `assets/pet-hd/*.webp` 8×6 atlases. Each
atlas contains 46 transparent 768×768 frames and is positioned by
`pobb-motion.js`; the older `assets/pet/*.png` strips remain the 96×96 source
assets and should not be referenced directly by page CSS.

The five action showcases on `pobb.html` progressively enhance those atlases
with transparent video from `assets/pet-video/`: HEVC with Alpha for Safari
and VP9 with Alpha for Chromium/Firefox. A matching high-resolution poster
holds the pose until a video emits `playing`; the atlas remains the fallback
for unsupported formats, load failures, actions without a video, and Reduce
Motion.

Each video action also has a matching transparent first-frame image in
`assets/pet-poster/`, so normal source changes never expose the lower-resolution
atlas while the next video is loading.
Each showcase owns one action (`idle`, `look`, `groom`, `sleep`, or `poke`). The
generated videos are complete actions rather than seamless loops: a showcase
plays once when it first enters the viewport and holds its final pose. Clicking
that Pobb replays only its assigned action; leaving and re-entering the viewport
does not restart it. This avoids mixing several actions in one location.

All five video actions are keyed from approved 960×960 Pobb source footage
with one fixed crop per clip, then encoded on a 768×768 transparent canvas.

## Publish

Deploy the repository root as a static site on an HTTPS origin. For Cloudflare Pages, use no framework preset or build command and set the output directory to `.`.

Use stable public URLs for:

- marketing: `/index.html`
- support: `/support.html`
- privacy: `/privacy.html`
- download: `/download` (302 to the current published `Sill.dmg` in this repository's Releases)
- Sparkle feed: `/appcast.xml`

Release assets live in this repository's GitHub Releases. Every release must
use a version tag such as `v1.0.0` and attach the notarized installer with the
stable filename `Sill.dmg`; update `_redirects` to that verified tag so the website download URL stays stable.
The app reads the raw `main/appcast.xml` URL, while each appcast enclosure uses
an immutable tag-specific Release URL. Generate the feed from the app repository:

```bash
../sill-app/scripts/prepare-sparkle-release.sh \
  v1.0.0 /path/to/Sill.dmg /path/to/release-notes.md
```

Commit and push `appcast.xml` only after the corresponding GitHub Release asset
is publicly downloadable. Never commit Sparkle's private Ed25519 key.

Verify the three pages in a private browser window and make sure `support@sill-app.com` can receive mail before entering the URLs in App Store Connect.

## SEO / GEO automation

`data/site.json` is the single source of truth for indexable pages, bilingual
titles/descriptions, product facts, and FAQ. It has **no runtime effect on the
site**; it drives generation and validation only.

```bash
node scripts/prerender-i18n.mjs         # emit /en and /zh static pages
node scripts/prerender-i18n.mjs --check # fail if /en//zh output is stale
node scripts/build-seo.mjs              # generate assets + validate coverage (CI gate)
node scripts/build-seo.mjs --check      # validate only, write nothing
node scripts/submit-indexnow.mjs        # ping IndexNow (Bing/Yandex); no-op without a key
```

`build-seo.mjs` (zero dependencies, keeps the "no npm" rule) generates
`sitemap.xml`, `robots.txt`, `llms.txt`, and `llms-full.txt`, and fails if any
page in `data/site.json` is missing a `canonical` link, hreflang alternates
(bilingual pages), a meta description, or required JSON-LD. `.github/workflows/seo.yml`
runs `--check` on every PR and pings IndexNow after pushes to `main`.

### Prerendered bilingual pages

Source pages ship both languages inline (`.lang-en` / `.lang-zh`) and `lang.js`
hides one at runtime — invisible to bots and only one indexable URL per page.
`scripts/prerender-i18n.mjs` reads each bilingual page from `data/site.json` and
writes single-language static variants:

- `/en/<page>` — English DOM only, `<html lang="en">`, canonical `→ /en/…`
- `/zh/<page>` — Chinese DOM only, `<html lang="zh-Hans">`, canonical `→ /zh/…`

The neutral source page (e.g. `/pobb.html`) stays the `x-default` and keeps the
JS toggle for humans who land there. Assets/CSS/JS in the variants are rewritten
to root-absolute (`/assets/…`) so they resolve from the subdirectory; nav `.html`
links stay relative to keep the visitor inside the current language subtree; the
language switch bounces to the sibling prerendered URL. **Regenerate and commit
`/en` and `/zh` whenever a bilingual page changes** — CI (`--check`) fails on drift.

To enable IndexNow: pick a random key, set `indexnow.key` in `data/site.json`
(re-run `build-seo.mjs` to emit `/<key>.txt`), and add `INDEXNOW_KEY` as a repo
secret. Commit the regenerated `sitemap.xml` / `robots.txt` / `llms*.txt`.
