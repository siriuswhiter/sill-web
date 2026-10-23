#!/usr/bin/env node
// Bind a verified publication to static EN/ZH content without a placeholder ID.
import {existsSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = key => { const index = args.indexOf(key); if (index < 0 || !args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${key} requires a value`); return args[index + 1]; };
if (!args.includes('--manifest')) throw new Error('Use --manifest /path/to/verified-publication.json');
const manifest = JSON.parse(readFileSync(resolve(get('--manifest')), 'utf8'));
const {videoId, thumbnail, verifiedAt, titleEn, titleZh, durationSeconds} = manifest;
if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '')) throw new Error('A real 11-character YouTube ID is required');
if (!verifiedAt || !Number.isFinite(Date.parse(verifiedAt))) throw new Error('Publication verification timestamp is required');
if (manifest.privacy !== 'public' || manifest.uploadStatus !== 'processed' || manifest.embeddable !== true || manifest.captionsEn !== true) throw new Error('Require public, processed, embeddable video with verified English captions');
if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error('Verified non-zero duration required');
if (typeof thumbnail !== 'string' || !/^assets\/demo\/[A-Za-z0-9._-]+\.(?:webp|jpg|png)$/.test(thumbnail)) throw new Error('Use a local assets/demo thumbnail');
const thumbnailPath = join(root, thumbnail);
if (!existsSync(thumbnailPath) || statSync(thumbnailPath).size > 200 * 1024) throw new Error('Thumbnail must exist and be at most 200 KiB');
const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
if (!titleEn || !titleZh) throw new Error('Both localized titles are required');
const block = `<!-- SILL_DEMO_VIDEO_START -->
<section class="section demo-video-section" id="watch-demo" aria-labelledby="demo-video-title">
<div class="section-heading">
<h2 id="demo-video-title"><span class="lang-zh">看看 Sill 2.0 如何使用。</span><span class="lang-en">See Sill 2.0 in use.</span></h2>
<p><span class="lang-zh">全新 2.0.0 实机演示，英文配音与英文字幕。Build 8 已进入 TestFlight 测试。</span><span class="lang-en">New 2.0.0 footage with English narration and captions. Build 8 is in TestFlight testing.</span></p>
</div>
<div class="demo-video-player" data-youtube-id="${videoId}" data-zh-label="${escape(titleZh)}" data-en-label="${escape(titleEn)}">
<img src="/${thumbnail}" width="1280" height="720" loading="lazy" decoding="async" alt="" />
<button class="demo-video-play" type="button" data-video-play hidden><span aria-hidden="true">▶</span><span class="lang-zh">播放演示</span><span class="lang-en">Play demo</span></button>
</div>
<p class="demo-video-note"><span class="lang-zh">点击播放后才会连接 YouTube。</span><span class="lang-en">YouTube connects after you choose to play.</span> <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener"><span class="lang-zh">在 YouTube 观看</span><span class="lang-en">Watch on YouTube</span></a></p>
</section>
<!-- SILL_DEMO_VIDEO_END -->`;
const homePath = join(root, 'index.html');
let html = readFileSync(homePath, 'utf8');
const marker = /<!-- SILL_DEMO_VIDEO_START -->[\s\S]*?<!-- SILL_DEMO_VIDEO_END -->/;
if (!marker.test(html)) throw new Error('Homepage demo markers are missing');
html = html.replace(marker, block);
if (!html.includes('src="demo-video.js')) html = html.replace('</head>', '  <script src="demo-video.js?v=20261020" defer></script>\n</head>');
const configPath = join(root, 'data/site.json');
const cfg = JSON.parse(readFileSync(configPath, 'utf8'));
cfg.demoVideo = {videoId, url: `https://www.youtube.com/watch?v=${videoId}`, thumbnail, verifiedAt, titleEn, titleZh, durationSeconds, language: 'en', captions: ['en']};
if (args.includes('--check')) {
  if (readFileSync(homePath, 'utf8') !== html || JSON.stringify(JSON.parse(readFileSync(configPath, 'utf8'))) !== JSON.stringify(cfg)) throw new Error('Published demo configuration is stale');
} else {
  writeFileSync(homePath, html);
  writeFileSync(configPath, JSON.stringify(cfg, null, 2) + '\n');
}
console.log(JSON.stringify({pass: true, videoId, updated: !args.includes('--check')}));
