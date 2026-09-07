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
- download: `/download` (302 to the latest `Sill.dmg` in this repository's Releases)
- Sparkle feed: `/appcast.xml`

Release assets live in this repository's GitHub Releases. Every release must
use a version tag such as `v1.0.0` and attach the notarized installer with the
stable filename `Sill.dmg`; `_redirects` keeps the website download URL stable.
The app reads the raw `main/appcast.xml` URL, while each appcast enclosure uses
an immutable tag-specific Release URL. Generate the feed from the app repository:

```bash
../sill-app/scripts/prepare-sparkle-release.sh \
  v1.0.0 /path/to/Sill.dmg /path/to/release-notes.md
```

Commit and push `appcast.xml` only after the corresponding GitHub Release asset
is publicly downloadable. Never commit Sparkle's private Ed25519 key.

Verify the three pages in a private browser window and make sure `support@sill.app` can receive mail before entering the URLs in App Store Connect.
