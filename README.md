# Sill website

Static marketing site for **Sill** (置物岛). No build step, no npm.

The site is intentionally self-contained. Do not load Google Fonts or analytics.

## Preview

From the repository root:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open [http://127.0.0.1:8000/](http://127.0.0.1:8000/). Port 8765 is often occupied on this machine.

The language toggle (中文 / English) follows `navigator.language` on first visit and is stored in `localStorage`. Scene tabs on the homepage are keyboard-operable (arrows / Home / End).

Pobb animations use the checked-in `assets/pet-hd/*.webp` 8×6 atlases. Each
atlas contains 46 transparent 768×768 frames and is positioned by
`pobb-motion.js`; the older `assets/pet/*.png` strips remain the 96×96 source
assets and should not be referenced directly by page CSS.

The two large companions on `pobb.html` progressively enhance those atlases
with transparent video from `assets/pet-video/`: HEVC with Alpha for Safari
and VP9 with Alpha for Chromium/Firefox. A matching high-resolution poster
holds the pose until a video emits `playing`; the atlas remains the fallback
for unsupported formats, load failures, actions without a video, and Reduce
Motion.

Each video action also has a matching transparent first-frame image in
`assets/pet-poster/`, so normal source changes never expose the lower-resolution
atlas while the next video is loading.

All five video actions are keyed from approved 960×960 Pobb source footage
with one fixed crop per clip, then encoded on a 768×768 transparent canvas.

## Publish

Deploy the repository root as a static site on an HTTPS origin. For Cloudflare Pages, use no framework preset or build command and set the output directory to `.`.

Use stable public URLs for:

- marketing: `/index.html`
- support: `/support.html`
- privacy: `/privacy.html`

Verify the three pages in a private browser window and make sure `support@sill.app` can receive mail before entering the URLs in App Store Connect.
