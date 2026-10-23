#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(new URL("..", import.meta.url).pathname);
const publicRoot = join(root, "scene-packs", "v1");
const origin = "https://sill-app.com/scene-packs/v1";
const maximumPagesAssetBytes = 25 * 1_024 * 1_024;

function fail(message) {
  process.stderr.write(`scene-pack: ${message}\n`);
  process.exit(1);
}

async function filesUnder(directory) {
  const result = [];
  async function visit(current) {
    for (const name of (await readdir(current)).sort()) {
      const path = join(current, name);
      const info = await stat(path);
      if (info.isSymbolicLink()) fail(`symlink is not allowed: ${path}`);
      if (info.isDirectory()) await visit(path);
      else if (info.isFile()) result.push(path);
      else fail(`unsupported entry: ${path}`);
    }
  }
  await visit(directory);
  return result;
}

async function digest(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function unreachableBaseAssets(sourceRoot) {
  const omitted = new Set();
  for (const path of await filesUnder(join(sourceRoot, "scenes"))) {
    if (basename(path) !== "scene.json") continue;
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (manifest.schemaVersion !== 1 || !manifest.timeVariants) continue;
    const packageRoot = dirname(path);
    for (const asset of Object.keys(manifest.timeVariants)) {
      omitted.add(join(packageRoot, "assets", `${asset}.png`));
    }
  }
  return omitted;
}

async function build({ source, slug, metadata }) {
  const sourceRoot = resolve(source);
  await mkdir(publicRoot, { recursive: true });
  const omitted = await unreachableBaseAssets(sourceRoot);
  const filePaths = (await filesUnder(join(sourceRoot, "scenes")))
    .filter((path) => !omitted.has(path));
  const byScene = new Map();
  for (const path of filePaths) {
    const scene = relative(sourceRoot, path).split(sep)[1];
    if (!scene) fail(`${path}: missing scene directory`);
    byScene.set(scene, [...(byScene.get(scene) ?? []), path]);
  }
  const groups = [...byScene.entries()].sort(([left], [right]) => left.localeCompare(right));
  const previousArchives = (await readdir(publicRoot)).filter((name) =>
    name === `${slug}.sillpack`
      || (name.startsWith(`${slug}-`) && /^\d{2}\.sillpack$/.test(name.slice(slug.length + 1)))
  );
  for (const name of previousArchives) await rm(join(publicRoot, name));

  const files = [];
  const archives = [];
  for (const [index, [, paths]] of groups.entries()) {
    const archiveName = `${slug}-${String(index + 1).padStart(2, "0")}.sillpack`;
    const archivePath = join(publicRoot, archiveName);
    const archiveEntries = paths.map((path) => relative(sourceRoot, path));
    const tar = spawnSync(
      "tar",
      ["--format=ustar", "-cf", archivePath, "-C", sourceRoot, ...archiveEntries],
      { stdio: "inherit" },
    );
    if (tar.status !== 0) fail(`tar failed for ${archiveName}`);
    const archiveInfo = await stat(archivePath);
    if (archiveInfo.size > maximumPagesAssetBytes) {
      fail(`${archivePath}: ${archiveInfo.size} bytes exceeds Cloudflare Pages' 25 MiB limit`);
    }
    const archiveURL = `${origin}/${archiveName}`;
    archives.push({
      url: archiveURL,
      byteSize: archiveInfo.size,
      sha256: await digest(archivePath),
      format: "ustar",
    });
    for (const path of paths) {
      const info = await stat(path);
      files.push({
        path: relative(sourceRoot, path).split(sep).join("/"),
        url: archiveURL,
        byteSize: info.size,
        sha256: await digest(path),
      });
    }
    process.stdout.write(`${relative(root, archivePath)} ${archiveInfo.size} bytes\n`);
  }
  const descriptor = {
    ...metadata,
    totalBytes: files.reduce((total, file) => total + file.byteSize, 0),
    files,
    previews: metadata.previews ?? [],
    delivery: "downloaded",
    accessRequirement: metadata.accessRequirement ?? "packEntitlement",
    archives,
  };
  const descriptorPath = join(publicRoot, `${slug}.json`);
  await writeFile(descriptorPath, `${JSON.stringify(descriptor, null, 2)}\n`);
  process.stdout.write(`${relative(root, descriptorPath)}\n`);
}

async function verify(descriptorPath) {
  const descriptor = JSON.parse(await readFile(resolve(descriptorPath), "utf8"));
  const archives = descriptor.archives ?? [descriptor.archive].filter(Boolean);
  if (archives.length === 0) fail(`${descriptorPath}: missing archives`);
  const archiveURLs = new Set(archives.map((archive) => archive.url));
  if (archiveURLs.size !== archives.length) fail(`${descriptorPath}: duplicate archive URL`);
  if (descriptor.files.some((file) => !archiveURLs.has(file.url))) {
    fail(`${descriptorPath}: file references an unknown archive`);
  }
  for (const archive of archives) {
    const archivePath = join(dirname(resolve(descriptorPath)), basename(new URL(archive.url).pathname));
    const info = await stat(archivePath);
    if (info.size > maximumPagesAssetBytes) {
      fail(`${archivePath}: ${info.size} bytes exceeds Cloudflare Pages' 25 MiB limit`);
    }
    if (info.size !== archive.byteSize) fail(`${archivePath}: byte size mismatch`);
    if (await digest(archivePath) !== archive.sha256) fail(`${archivePath}: digest mismatch`);
    if (!descriptor.files.some((file) => file.url === archive.url)) {
      fail(`${descriptorPath}: archive has no declared files`);
    }
  }
  if (descriptor.totalBytes !== descriptor.files.reduce((total, file) => total + file.byteSize, 0)) {
    fail(`${descriptorPath}: totalBytes mismatch`);
  }
  process.stdout.write(`${relative(root, descriptorPath)} verified\n`);
}

const [command, ...args] = process.argv.slice(2);
if (command === "verify" && args.length > 0) {
  for (const path of args) await verify(path);
} else if (command === "build" && args.length === 3) {
  const [source, slug, metadataPath] = args;
  await build({ source, slug, metadata: JSON.parse(await readFile(resolve(metadataPath), "utf8")) });
} else {
  fail("usage: build-scene-packs.mjs build <source-root> <slug> <metadata.json> | verify <descriptor.json>...");
}
