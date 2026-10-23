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

The language toggle (中文 / English) defaults to English on first visit, accepts ?lang=zh, and is stored in `localStorage`. The homepage race runs while visible, with explicit pause controls. Reduce Motion shows a static scene; pickup buttons still demonstrate the Island states.

The site describes Sill as files, components, and everyday tools around the Island.
`components.html` is the public capability reference, with Free/Pro scope and
requirements. Pobb and Professor Aubie appear together in its companion section.
Old `pobb.html` and `pobb-sheet.html` routes (including EN/ZH variants) redirect
to this section. Their historical animation assets remain unlinked.

`site-shell.css` and `site-nav.js` share the original compact navigation across
all current pages. `site-content.css` styles the homepage content, capability
reference, support, and legal pages. Supporting pages do not load Three.js,
pet atlases, or race scripts.

The 2.0.0 preview copy distinguishes build 8 in TestFlight testing from the
currently published Mac App Store release. The `/2.0/` hub keeps the release
overview, setup guides, recent design notes, and validation records in one
place. Free
includes Apps, Files, Clock, and Weather. Shelf and Note are Pro tools.
World Landmarks is included with Pro and an active trial; other extension packs
follow their own terms.

New demo publication is bound only after public playback, processed status,
embedding, and English captions are verified. Write those verified fields to a
publication manifest and run `node scripts/set-demo-video.mjs --manifest <file>`,
then regenerate both language variants and SEO files. `demo-video.js` creates a
privacy-enhanced YouTube iframe only on an explicit play click. The preview image
is local, lazy loaded, and capped at 200 KiB. With JavaScript disabled, the direct
YouTube link remains available. Until a real publication is verified, the demo
slot stays absent and no placeholder ID or old video is substituted.

## Publish

Deploy the repository root as a static site on an HTTPS origin. For Cloudflare Pages, use no framework preset or build command and set the output directory to `.`.

Use stable public URLs for:

- marketing: `/index.html`
- support: `/support.html`
- privacy: `/privacy.html`
- availability: homepage CTAs and `/download` open the Mac App Store product page
- Sparkle feed: `/appcast.xml`

The website no longer distributes new direct-download builds. Keep
`appcast.xml` and its immutable release enclosure available only for existing
direct-download installations that still need Sparkle updates. Generate that
legacy feed from the app repository when required:

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
node scripts/check-home-assets.mjs      # validate race assets and payload budgets
node scripts/check-site-content.mjs     # validate public routes and current product copy
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

The neutral source page (e.g. `/components.html`) stays the `x-default` and keeps the
JS toggle for humans who land there. Assets/CSS/JS in the variants are rewritten
to root-absolute (`/assets/…`) so they resolve from the subdirectory; nav `.html`
links stay relative to keep the visitor inside the current language subtree; the
language switch bounces to the sibling prerendered URL. **Regenerate and commit
`/en` and `/zh` whenever a bilingual page changes** — CI (`--check`) fails on drift.

To enable IndexNow: pick a random key, set `indexnow.key` in `data/site.json`
(re-run `build-seo.mjs` to emit `/<key>.txt`), and add `INDEXNOW_KEY` as a repo
secret. Commit the regenerated `sitemap.xml` / `robots.txt` / `llms*.txt`.

## Homepage design

The homepage opens on a continuously generated rainbow race with Pobb, Aubie,
and grounded world landmarks. Files and tools travel into the same Island.
`home.css` owns the existing document layout; `home-race.css` scopes the game
styles to `.race-stage` and preserves the production navigation rules. The old
`home-run.js`, preview CSS, and prototype runtime are not loaded by the homepage.

`home-race-loader.js` lets the HTML paint before importing the Three.js scene,
and waits if the race is outside the viewport. `home-race.js` owns a single
animation clock for the road, racers, pickups, scenery, and Island states.
`home-race-items.js` builds shared bevelled geometry from the app's SVG icons;
`home-race-landmarks.js` builds the fixed pool of ten landmarks.
`home-race-pets.js` builds the two articulated 3D pets with shared geometry and
materials, alternating steps, lane changes, and road-directed head/eye movement. All runtime
assets and the vendored Three.js MIT license live in `assets/race/`.

The scene caps canvas pixels and update frequency, reuses geometry and materials
without pet textures or racing atlases, bounds the decoded-background promise cache to three entries, and
prefetches only the next destination as the race approaches it. Pausing,
scrolling away, hiding the page, and Reduce Motion stop animation. A normal
page exit disposes GPU resources and observers; a bfcache exit suspends them
for restoration. The initial image budget is 260 KiB, with a separate
230 KiB gzip script budget enforced in CI. The local preview server deliberately
disables HTTP caching; deployed race assets have cache rules in `_headers`.

The headline, download links, features, navigation, and native HTML details
remain available without WebGL or JavaScript. FAQ, pricing, the capability reference, and both
language variants keep their existing destinations. Regenerate the language
variants and SEO files after content edits. No external fonts or analytics load.

Design and verification: `docs/regression/home-race-production-20261017.md`.
3D pet design and review: `docs/race-pets-3d-20261017.md` and
`docs/regression/race-pets-3d-20261017.md`.
The accepted standalone `prototype-world.html` remains as a design reference.

Site refresh design and review: `docs/regression/site-positioning-20261017.md`.
