#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENES = ["forest", "ocean", "space"];
const WIDTHS = [1280, 1920, 2560, 3200];
const limits = {
  avif: 320 * 1024,
  foreground: 180 * 1024,
  placeholder: 20 * 1024,
  initialImages: 700 * 1024,
};
const failures = [];

function size(relativePath) {
  const path = join(ROOT, relativePath);
  if (!existsSync(path)) {
    failures.push(`missing ${relativePath}`);
    return 0;
  }
  return statSync(path).size;
}

for (const scene of SCENES) {
  for (const width of WIDTHS) {
    const relativePath = `assets/scenes/page-${scene}-${width}.avif`;
    const bytes = size(relativePath);
    if (bytes > limits.avif) failures.push(`${relativePath} exceeds 320 KiB`);
  }
  const foreground = `assets/scenes/page-${scene}-fg.webp`;
  if (size(foreground) > limits.foreground) failures.push(`${foreground} exceeds 180 KiB`);
}

const placeholder = "assets/scenes/page-forest-placeholder.jpg";
const initialImages = size("assets/scenes/page-forest-3200.avif")
  + size("assets/scenes/page-forest-fg.webp")
  + size("assets/pet-hd/walk-web.webp")
  + size(placeholder);

if (size(placeholder) > limits.placeholder) failures.push(`${placeholder} exceeds 20 KiB`);
if (initialImages > limits.initialImages) failures.push("initial homepage image payload exceeds 700 KiB");

const html = readFileSync(join(ROOT, "index.html"), "utf8");
const runtime = readFileSync(join(ROOT, "home-run.js"), "utf8");
for (const width of WIDTHS) {
  if (!html.includes(`page-forest-${width}.avif`)) failures.push(`homepage is missing ${width}w AVIF source`);
}
if (!html.includes('rel="preload" as="image" href="assets/scenes/page-forest-placeholder.jpg')) {
  failures.push("homepage is missing the forest placeholder preload");
}
if (!runtime.includes("whenBufferReady(front")) failures.push("next-scene loading is not gated on the initial scene");

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  process.exit(1);
}

console.log(`home image budget passed (${Math.round(initialImages / 1024)} KiB worst-case initial images)`);
