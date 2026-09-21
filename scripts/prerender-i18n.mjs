#!/usr/bin/env node
// prerender-i18n.mjs — emit static single-language variants of every bilingual
// page so crawlers and AI answer engines get a real /en/ and /zh/ URL instead
// of a JavaScript-toggled one page.
//
// Source pages ship both languages inline (elements tagged .lang-en / .lang-zh)
// and lang.js hides one at runtime. That is invisible to bots that do not run
// JS and produces only one indexable URL per page. This script reads each
// bilingual page from data/site.json and writes:
//
//   /en/<file>   only the English DOM, <html lang="en">,   canonical -> /en/...
//   /zh/<file>   only the Chinese DOM, <html lang="zh-Hans">, canonical -> /zh/...
//
// The language-neutral source page (e.g. /pobb.html) stays as the x-default and
// keeps the JS toggle for humans who land there directly.
//
// Design constraints (see sill-web/README.md): no npm, no build framework. This
// is a plain Node string transform over the committed HTML, and its output is
// committed too (the host serves static files, there is no server-side build).
//
// Usage:
//   node scripts/prerender-i18n.mjs           # (re)generate /en and /zh
//   node scripts/prerender-i18n.mjs --check    # fail if on-disk output drifts
//   node scripts/prerender-i18n.mjs --quiet     # suppress info logs

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const QUIET = args.has("--quiet");

const log = (...m) => { if (!QUIET) console.log(...m); };

const cfg = JSON.parse(readFileSync(join(ROOT, "data", "site.json"), "utf8"));
const origin = cfg.site.origin.replace(/\/$/, "");

const LANGS = {
  en: { code: "en", pressed: "en" },
  zh: { code: "zh-Hans", pressed: "zh" },
};

const htmlEscapeAttr = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------
// Remove every element whose class carries `token` (e.g. "lang-zh"), including
// its full subtree. Carriers are span/p/li/div and are never nested inside one
// another (verified against the source), so a depth-aware scan per matched tag
// is sufficient. Ranges are spliced from the end so earlier offsets stay valid.
// ---------------------------------------------------------------------------
const VOID_TAGS = new Set(["br", "img", "input", "meta", "link", "source", "hr", "area", "col", "embed", "track", "wbr"]);

function removeLangElements(html, token) {
  const openRe = new RegExp(
    `<([a-zA-Z][\\w-]*)\\b[^>]*\\bclass="[^"]*\\b${token}\\b[^"]*"[^>]*>`,
    "g"
  );
  const ranges = [];
  let m;
  while ((m = openRe.exec(html)) !== null) {
    const tag = m[1].toLowerCase();
    const openStart = m.index;
    if (VOID_TAGS.has(tag) || /\/>\s*$/.test(m[0])) {
      ranges.push([openStart, openRe.lastIndex]);
      continue;
    }
    // Walk forward, tracking nesting of this tag name, to find the close.
    const tagRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
    tagRe.lastIndex = openRe.lastIndex;
    let depth = 1;
    let t;
    let end = -1;
    while ((t = tagRe.exec(html)) !== null) {
      if (t[1] === "/") {
        depth -= 1;
        if (depth === 0) { end = tagRe.lastIndex; break; }
      } else if (!/\/>\s*$/.test(t[0])) {
        depth += 1;
      }
    }
    if (end === -1) end = openRe.lastIndex; // malformed; drop just the open tag
    ranges.push([openStart, end]);
    openRe.lastIndex = end;
  }
  ranges.sort((a, b) => b[0] - a[0]);
  let out = html;
  for (const [s, e] of ranges) {
    // Also swallow a single trailing newline + indentation left behind so the
    // output stays tidy rather than accumulating blank lines.
    let e2 = e;
    const tail = out.slice(e, e + 40);
    const nl = /^[ \t]*\r?\n/.exec(tail);
    if (nl) e2 = e + nl[0].length;
    out = out.slice(0, s) + out.slice(e2);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Make asset / css / js references root-absolute so they resolve from /en/ and
// /zh/ subdirectories. Nav links (*.html) and #anchors stay relative so they
// keep the visitor inside the current language subtree; already-absolute and
// external URLs are left alone.
// ---------------------------------------------------------------------------
function rewriteAssetsAbsolute(html) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (full, attr, value) => {
    if (/^(https?:|mailto:|tel:|data:|#|\/)/i.test(value)) return full; // absolute/external/anchor
    if (/\.html(\?|#|$)/i.test(value)) return full;                     // nav — keep relative
    return `${attr}="/${value}"`;                                       // asset — root-absolute
  });
}

function variantUrl(page, lang) {
  if (page.path === "/") return `${origin}/${lang}/`;
  return `${origin}/${lang}${page.path}`;
}

function variantPath(page, lang) {
  if (page.path === "/") return `/${lang}/`;
  return `/${lang}${page.path}`;
}

function replaceMetaContent(html, matchAttr, value) {
  const re = new RegExp(`(<meta[^>]*\\b${matchAttr}[^>]*\\bcontent=")([^"]*)(")`, "i");
  return html.replace(re, (_, a, _old, c) => a + htmlEscapeAttr(value) + c);
}

function buildVariant(rawHtml, page, lang) {
  const L = LANGS[lang];
  const title = lang === "zh" ? page.titleZh : page.titleEn;
  const description = lang === "zh" ? page.descriptionZh : page.descriptionEn;
  const selfUrl = variantUrl(page, lang);
  const dropToken = lang === "en" ? "lang-zh" : "lang-en";

  let html = removeLangElements(rawHtml, dropToken);
  html = rewriteAssetsAbsolute(html);

  // <html ...> — pin language and lock it so lang.js will not re-toggle a DOM
  // that only contains one language.
  html = html.replace(
    /(<html\b[^>]*?)\blang="en"\s+data-lang="en"/i,
    `$1lang="${L.code}" data-lang="${lang}" data-lang-lock="${lang}"`
  );

  // <title> and description / social metadata -> single language.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  html = replaceMetaContent(html, 'name="description"', description);
  html = replaceMetaContent(html, 'property="og:title"', title);
  html = replaceMetaContent(html, 'property="og:description"', description);
  html = replaceMetaContent(html, 'property="og:url"', selfUrl);

  // Canonical -> self (variant). hreflang cluster already points en->/en, zh->
  // /zh, x-default->neutral source, which is correct on every member of the set.
  html = html.replace(
    /(<link[^>]*\brel="canonical"[^>]*\bhref=")([^"]*)(")/i,
    (_, a, _old, c) => a + htmlEscapeAttr(selfUrl) + c
  );

  // Language switch: bounce to the sibling prerendered URL and reflect state.
  const zhHref = variantPath(page, "zh");
  const enHref = variantPath(page, "en");
  html = html.replace(
    /<button type="button" data-set-lang="zh" aria-pressed="(?:true|false)">中文<\/button>/,
    `<button type="button" data-set-lang="zh" aria-pressed="${lang === "zh" ? "true" : "false"}" data-lang-zh-href="${zhHref}">中文</button>`
  );
  html = html.replace(
    /<button type="button" data-set-lang="en" aria-pressed="(?:true|false)">EN<\/button>/,
    `<button type="button" data-set-lang="en" aria-pressed="${lang === "en" ? "true" : "false"}" data-lang-en-href="${enHref}">EN</button>`
  );

  return html;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
const targets = cfg.pages.filter((p) => p.bilingual);
const drift = [];
let written = 0;

for (const page of targets) {
  const src = join(ROOT, page.file);
  if (!existsSync(src)) {
    console.error(`FATAL: source page missing: ${page.file}`);
    process.exit(1);
  }
  const raw = readFileSync(src, "utf8");
  for (const lang of ["en", "zh"]) {
    const out = buildVariant(raw, page, lang);
    const outDir = join(ROOT, lang);
    const outFile = join(outDir, page.file);
    if (CHECK_ONLY) {
      if (!existsSync(outFile) || readFileSync(outFile, "utf8") !== out) {
        drift.push(`${lang}/${page.file}`);
      }
    } else {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(outFile, out);
      written += 1;
      log(`wrote ${lang}/${page.file}`);
    }
  }
}

if (CHECK_ONLY) {
  if (drift.length) {
    console.error("\nPrerendered i18n output is stale. Run: node scripts/prerender-i18n.mjs");
    for (const d of drift) console.error(`  - ${d}`);
    process.exit(1);
  }
  log("i18n prerender check passed.");
} else {
  log(`i18n prerender complete (${written} files).`);
}
