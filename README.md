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

## Publish

Deploy the repository root as a static site on an HTTPS origin. For Cloudflare Pages, use no framework preset or build command and set the output directory to `.`.

Use stable public URLs for:

- marketing: `/index.html`
- support: `/support.html`
- privacy: `/privacy.html`

Verify the three pages in a private browser window and make sure `support@sill.app` can receive mail before entering the URLs in App Store Connect.
