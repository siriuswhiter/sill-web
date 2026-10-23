#!/usr/bin/env node
// Guard public navigation, retired character routes, and product-copy consistency.
import {readFileSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const cfg=JSON.parse(readFileSync(join(root,'data/site.json'),'utf8'));
const failures=[],read=p=>readFileSync(join(root,p),'utf8');
const fail=s=>failures.push(s);
const files=cfg.pages.flatMap(p=>[p.file,...(p.bilingual?['en/'+p.file,'zh/'+p.file]:[])]);
let links=0;
for(const file of files){
 const text=read(file),ids=[...text.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 if(new Set(ids).size!==ids.length)fail(`${file}: duplicate element id`);
 if(/href="[^"\s]*pobb(?:-sheet)?\.html/.test(text))fail(`${file}: retired Pobb navigation`);
 if(/最多\s*5\s*个活动项目|up to 5 active items|Free's 5-item|泡泡的置物岛|POBB'S LITTLE SILL|桌宠泡泡/i.test(text))fail(`${file}: outdated product copy`);
 if(!file.endsWith('index.html') && /(?:src|href)="[^"\s]*(?:home-race|three\.module|pobb-motion|pet-hd)/.test(text))fail(`${file}: heavy presentation loaded on content page`);
 for(const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  const href=match[1].replaceAll('&amp;','&');
  if(/^(?:https?:|mailto:|tel:|data:)/.test(href))continue;
  const url=new URL(href,'https://local.test/'+file),pathname=decodeURIComponent(url.pathname);
  let target=pathname.endsWith('/')?pathname+'index.html':pathname;
  const path=resolve(root,'.'+target);if(!path.startsWith(resolve(root)+'/')){fail(`${file}: path escapes site`);continue;}
  if(!existsSync(path)){fail(`${file}: missing ${href}`);continue;}
  if(url.hash&&path.endsWith('.html')){
   const id=decodeURIComponent(url.hash.slice(1));
   if(!readFileSync(path,'utf8').includes(`id="${id}"`))fail(`${file}: missing anchor ${href}`);
  }
  links++;
 }
}
const home=read('index.html');const faq=[...home.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1])).find(v=>v['@type']==='FAQPage');
// Keep pricing and public facts aligned with the actual 2.0 product boundary.
const tiers={shelf:'Pro',files:'Free',clock:'Free',note:'Pro',weather:'Free',focus:'Pro',photo:'Pro',apps:'Free',clipboard:'Pro',translate:'Pro'};
for(const file of ['components.html','en/components.html','zh/components.html']){
 const html=read(file);
 for(const [id,tier] of Object.entries(tiers)){
  const row=new RegExp(`<article class="capability-row" id="${id}">[\\s\\S]*?<span class="tier">${tier}</span>`);
  if(!row.test(html))fail(`${file}: ${id} must be ${tier}`);
 }
}
for(const file of files){
 if(/Free includes a complete Shelf|The Free Shelf|Clock and Quick Note are included with Free|Start free with Clock, Quick Note|Free 已是一套完整的置物|时钟和速记包含在 Free/.test(read(file)))fail(`${file}: outdated Free scope`);
}
if(!home.includes('Sill 2.0.0 build 8 is in TestFlight testing'))fail('Missing accurate 2.0.0 TestFlight availability');
if(cfg.demoVideo){
 const id=cfg.demoVideo.videoId;
 if(!/^[A-Za-z0-9_-]{11}$/.test(id||''))fail('Invalid published demo video ID');
 for(const file of ['index.html','en/index.html','zh/index.html']){
  const html=read(file);
  if(!html.includes(`data-youtube-id="${id}"`)||!html.includes('demo-video.js'))fail(`${file}: demo configuration drift`);
  if(/<iframe/.test(html))fail(`${file}: YouTube iframe connects before a click`);
  if(/(?:src|href)="https:\/\/(?:i\.ytimg\.com|www\.youtube(?:-nocookie)?\.com)\/(?!watch)/.test(html))fail(`${file}: eager YouTube resource`);
 }
 if(!read('demo-video.js').includes('https://www.youtube-nocookie.com/embed/'))fail('Demo must use YouTube privacy-enhanced embedding');
}
if(!faq || JSON.stringify(faq.mainEntity.map(e=>({q:e.name,a:e.acceptedAnswer.text})))!==JSON.stringify(cfg.faq.map(e=>({q:e.qEn,a:e.aEn}))))fail('Homepage FAQ schema differs from current product facts');
const sitemap=read('sitemap.xml');if(/pobb(?:-sheet)?\.html/.test(sitemap))fail('Retired Pobb pages still in sitemap');
if(!sitemap.includes('/components.html'))fail('Component reference absent from sitemap');
if(!sitemap.includes('/2.0/'))fail('Sill 2.0 release and documentation hub absent from sitemap');
if(!sitemap.includes('/docs/translate.html'))fail('Translate setup guide absent from sitemap');
const releaseHub=read('2.0/index.html');
for(const path of ['docs/index.html','docs/translate.html','docs/weather.html','docs/world-tour-design-20261017.md','docs/regression/free-pro-copy-20261021/report.md']){
 if(!releaseHub.includes(path))fail(`2.0/index.html: missing release document ${path}`);
}
const translateGuide=read('docs/translate.html');
for(const anchor of ['mymemory','deepl','microsoft','google-cloud','openai','deepseek','gemini','qwen','siliconflow','volcengine','openai-compatible']){
 if(!translateGuide.includes(`id="${anchor}"`))fail(`docs/translate.html: missing provider anchor #${anchor}`);
}
for(const label of ['API Keys','Billing','Pricing','Region','Keychain']){
 if(!translateGuide.includes(label))fail(`docs/translate.html: missing setup boundary ${label}`);
}
const redirects=read('_redirects');
for(const lang of ['', 'en/', 'zh/'])for(const old of ['pobb.html','pobb-sheet.html']){
 const file=lang+old,html=read(file),target='/'+lang+'components.html#companions';
 if(!html.includes('content="noindex,follow"')||!html.includes(`content="0;url=${target}"`)||!html.includes(`href="${target}"`))fail(`${file}: incomplete retirement fallback`);
 if(!redirects.split('\n').some(line=>line.trim().split(/\s+/).join(' ')===`/${file} ${target} 301`))fail(`${file}: missing permanent redirect`);
 if(/<script|stylesheet|<img/.test(html))fail(`${file}: redirect loads unnecessary resources`);
}
if(failures.length){failures.forEach(f=>console.error('FAIL '+f));process.exit(1);}
console.log(JSON.stringify({pass:true,pages:files.length,localLinksAndAssets:links,retiredRoutes:6},null,2));
