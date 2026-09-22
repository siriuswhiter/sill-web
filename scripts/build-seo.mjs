#!/usr/bin/env node
// build-seo.mjs — zero-dependency SEO/GEO asset generator for the Sill website.
//
// Reads data/site.json (single source of truth) and produces / validates:
//   - sitemap.xml            (all indexable pages)
//   - robots.txt             (allow all + sitemap pointer)
//   - llms.txt               (compact GEO fact source for AI answer engines)
//   - llms-full.txt          (full GEO fact source incl. FAQ)
//   - <indexnow-key>.txt     (IndexNow ownership proof, only when key present)
//   - SEO coverage check     (canonical / hreflang / JSON-LD on existing pages)
//
// Design constraints (see sill-web/README.md): no npm, no build framework, no
// analytics. This is a plain Node script that emits static text files in place.
//
// Usage:
//   node scripts/build-seo.mjs            # generate + validate (fails CI on gaps)
//   node scripts/build-seo.mjs --check    # validate only, generate nothing
//   node scripts/build-seo.mjs --quiet    # suppress info logs

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const args = new Set(process.argv.slice(2));
const CHECK_ONLY = args.has("--check");
const QUIET = args.has("--quiet");

const log = (...m) => { if (!QUIET) console.log(...m); };
const errors = [];
const fail = (m) => errors.push(m);

// ---------------------------------------------------------------------------
// Load config
// ---------------------------------------------------------------------------
const configPath = join(ROOT, "data", "site.json");
if (!existsSync(configPath)) {
  console.error(`FATAL: missing ${configPath}`);
  process.exit(1);
}
const cfg = JSON.parse(readFileSync(configPath, "utf8"));
const origin = cfg.site.origin.replace(/\/$/, "");
const abs = (p) => (p === "/" ? `${origin}/` : `${origin}${p}`);

const xmlEscape = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

// ---------------------------------------------------------------------------
// 1. sitemap.xml
// ---------------------------------------------------------------------------
function buildSitemap() {
  // For a bilingual page we publish three indexable URLs that all point at each
  // other via hreflang: the neutral source (x-default) and the two prerendered
  // /en and /zh variants (see scripts/prerender-i18n.mjs).
  const variantPath = (page, lang) =>
    page.path === "/" ? `/${lang}/` : `/${lang}${page.path}`;

  const altBlock = (page) =>
    [
      `    <xhtml:link rel="alternate" hreflang="en" href="${xmlEscape(abs(variantPath(page, "en")))}"/>`,
      `    <xhtml:link rel="alternate" hreflang="zh-Hans" href="${xmlEscape(abs(variantPath(page, "zh")))}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(abs(page.path))}"/>`,
    ].join("\n");

  const urls = [];
  for (const page of cfg.pages) {
    const alts = page.bilingual ? altBlock(page) : "";
    // neutral / x-default entry
    urls.push(
      [
        "  <url>",
        `    <loc>${xmlEscape(abs(page.path))}</loc>`,
        `    <changefreq>${page.changefreq}</changefreq>`,
        `    <priority>${page.priority}</priority>`,
        alts,
        "  </url>",
      ].filter(Boolean).join("\n")
    );
    // prerendered per-language entries, sharing the same alternate cluster
    if (page.bilingual) {
      for (const lang of ["en", "zh"]) {
        urls.push(
          [
            "  <url>",
            `    <loc>${xmlEscape(abs(variantPath(page, lang)))}</loc>`,
            `    <changefreq>${page.changefreq}</changefreq>`,
            `    <priority>${page.priority}</priority>`,
            alts,
            "  </url>",
          ].join("\n")
        );
      }
    }
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '        xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 2. robots.txt
// ---------------------------------------------------------------------------
function buildRobots() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// 3. llms.txt (compact) + llms-full.txt (full, with FAQ)
// ---------------------------------------------------------------------------
function buildLlms(full) {
  const s = cfg.site;
  const lines = [
    `# ${s.name} (${s.nameZh})`,
    "",
    `> ${s.elevatorPitch}`,
    "",
    `${s.tagline} A native ${s.operatingSystem} drag-and-drop shelf for files, images, text, and links.`,
    "",
    "## Facts",
    ...cfg.facts.map((f) => `- ${f}`),
    "",
    "## Key links",
    `- Home: ${abs("/")}`,
    `- Availability: ${s.availability}`,
    `- Support: ${abs("/support.html")} (${s.supportEmail})`,
    `- Privacy: ${abs("/privacy.html")}`,
  ];
  if (full) {
    lines.push("", "## FAQ");
    for (const item of cfg.faq) {
      lines.push(`### ${item.qEn}`, item.aEn, "", `### ${item.qZh}`, item.aZh, "");
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

// ---------------------------------------------------------------------------
// 4. IndexNow key file
// ---------------------------------------------------------------------------
function buildIndexNowKey() {
  const key = (cfg.indexnow && cfg.indexnow.key) || "";
  if (!key) return null;
  if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
    fail(`indexnow.key must be 8-128 chars of [a-zA-Z0-9-]; got "${key}"`);
    return null;
  }
  return { file: `${key}.txt`, body: key + "\n" };
}

// ---------------------------------------------------------------------------
// 5. SEO coverage validation on existing HTML pages (CI gate)
// ---------------------------------------------------------------------------
function validatePages() {
  for (const page of cfg.pages) {
    const filePath = join(ROOT, page.file);
    if (!existsSync(filePath)) {
      fail(`page file missing: ${page.file}`);
      continue;
    }
    const html = readFileSync(filePath, "utf8");
    const head = html.slice(0, html.indexOf("</head>") + 7 || html.length);

    // canonical must exist and point to the declared absolute path
    const canonical = /<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i.exec(head);
    if (!canonical) {
      fail(`${page.file}: missing <link rel="canonical">`);
    } else if (canonical[1].replace(/\/$/, "") !== abs(page.path).replace(/\/$/, "")) {
      fail(`${page.file}: canonical "${canonical[1]}" != expected "${abs(page.path)}"`);
    }

    // bilingual pages must carry hreflang alternates that point at the real
    // prerendered /en and /zh URLs (not the legacy ?lang= query form).
    if (page.bilingual) {
      const variantPath = (lang) =>
        page.path === "/" ? `/${lang}/` : `/${lang}${page.path}`;
      const wantEn = `hreflang="en" href="${abs(variantPath("en"))}"`;
      const wantZh = `hreflang="zh-Hans" href="${abs(variantPath("zh"))}"`;
      const hasDefault = /hreflang="x-default"/i.test(head);
      if (!head.includes(wantEn)) fail(`${page.file}: hreflang en must be ${abs(variantPath("en"))}`);
      if (!head.includes(wantZh)) fail(`${page.file}: hreflang zh-Hans must be ${abs(variantPath("zh"))}`);
      if (!hasDefault) fail(`${page.file}: missing hreflang="x-default"`);
      if (/\?lang=/.test(head)) fail(`${page.file}: legacy ?lang= hreflang still present`);
    }

    // pages flagged requireJsonLd must embed at least one JSON-LD block
    if (page.requireJsonLd && !/application\/ld\+json/i.test(head)) {
      fail(`${page.file}: requireJsonLd is true but no <script type="application/ld+json"> found`);
    }

    // meta description presence
    if (!/<meta[^>]+name="description"/i.test(head)) {
      fail(`${page.file}: missing <meta name="description">`);
    }

    // bilingual pages must have their prerendered /en and /zh variants on disk
    // (generated by scripts/prerender-i18n.mjs). Content freshness is enforced
    // by that script's own --check; here we only assert the files exist so a
    // deploy never ships hreflang targets that 404.
    if (page.bilingual) {
      for (const lang of ["en", "zh"]) {
        const rel = join(lang, page.file);
        if (!existsSync(join(ROOT, rel))) {
          fail(`missing prerendered variant: ${lang}/${page.file} (run scripts/prerender-i18n.mjs)`);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------
validatePages();

if (!CHECK_ONLY && errors.length === 0) {
  writeFileSync(join(ROOT, "sitemap.xml"), buildSitemap());
  log("wrote sitemap.xml");
  writeFileSync(join(ROOT, "robots.txt"), buildRobots());
  log("wrote robots.txt");
  writeFileSync(join(ROOT, "llms.txt"), buildLlms(false));
  log("wrote llms.txt");
  writeFileSync(join(ROOT, "llms-full.txt"), buildLlms(true));
  log("wrote llms-full.txt");
  const key = buildIndexNowKey();
  if (key) {
    writeFileSync(join(ROOT, key.file), key.body);
    log(`wrote ${key.file}`);
  } else {
    log("indexnow.key empty — skipping IndexNow key file");
  }
}

if (errors.length) {
  console.error("\nSEO validation failed:");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
log(CHECK_ONLY ? "SEO check passed." : "SEO assets generated and validated.");
