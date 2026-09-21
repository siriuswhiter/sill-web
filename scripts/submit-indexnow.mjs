#!/usr/bin/env node
// submit-indexnow.mjs — notify IndexNow (Bing / Yandex) of URL changes.
//
// Reads data/site.json for the origin and indexnow.key, then submits every URL
// in the generated sitemap.xml to the IndexNow API. IndexNow verifies ownership
// by fetching https://<host>/<key>.txt, which build-seo.mjs writes when a key is
// present.
//
// Usage:
//   node scripts/submit-indexnow.mjs             # submit all sitemap URLs
//   node scripts/submit-indexnow.mjs --dry-run   # print payload, do not POST
//
// The key can come from data/site.json (indexnow.key) or the INDEXNOW_KEY env
// var (env wins). No key -> no-op exit 0, so CI stays green before setup.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DRY_RUN = process.argv.includes("--dry-run");

const cfg = JSON.parse(readFileSync(join(ROOT, "data", "site.json"), "utf8"));
const origin = cfg.site.origin.replace(/\/$/, "");
const host = new URL(origin).host;
const key = process.env.INDEXNOW_KEY || (cfg.indexnow && cfg.indexnow.key) || "";
const endpoint = (cfg.indexnow && cfg.indexnow.endpoint) || "https://api.indexnow.org/indexnow";

if (!key) {
  console.log("INDEXNOW_KEY not set and data/site.json indexnow.key empty — skipping.");
  process.exit(0);
}

const sitemapPath = join(ROOT, "sitemap.xml");
if (!existsSync(sitemapPath)) {
  console.error("sitemap.xml not found — run scripts/build-seo.mjs first.");
  process.exit(1);
}
const sitemap = readFileSync(sitemapPath, "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urlList.length === 0) {
  console.error("no <loc> URLs found in sitemap.xml.");
  process.exit(1);
}

const payload = {
  host,
  key,
  keyLocation: `${origin}/${key}.txt`,
  urlList,
};

if (DRY_RUN) {
  console.log("DRY RUN — would POST to", endpoint);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

const res = await fetch(endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(payload),
});

// IndexNow returns 200 or 202 on success; 4xx indicates key/ownership problems.
if (res.ok) {
  console.log(`IndexNow accepted ${urlList.length} URLs (HTTP ${res.status}).`);
} else {
  const body = await res.text().catch(() => "");
  console.error(`IndexNow submission failed: HTTP ${res.status} ${body}`);
  process.exit(1);
}
