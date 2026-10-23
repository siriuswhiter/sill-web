#!/usr/bin/env node
import {existsSync,readFileSync,statSync,readdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const failures=[];
const size=p=>{if(!existsSync(join(root,p))){failures.push(`missing ${p}`);return 0;}return statSync(join(root,p)).size;};
const images=['assets/race/landmarks/paris-twilight.webp','assets/race/pobb.png','assets/race/aubie.png','assets/race/companion.webp','assets/app-icon-180.png'];
for(const f of readdirSync(join(root,'assets/race/icons')))if(f.endsWith('.svg'))images.push('assets/race/icons/'+f);
const initialImages=images.reduce((n,p)=>n+size(p),0);
if(initialImages>260*1024)failures.push('initial images exceed 260 KiB');
let allBackgrounds=0;
for(const f of readdirSync(join(root,'assets/race/landmarks'))){const bytes=size('assets/race/landmarks/'+f);allBackgrounds+=bytes;if(bytes>140*1024)failures.push(`${f} exceeds 140 KiB`);}
if(allBackgrounds>1024*1024)failures.push('world background set exceeds 1 MiB');
const scripts=['site-nav.js','home-race-loader.js','home-race.js','home-race-items.js','home-race-landmarks.js','home-race-pets.js','assets/race/three.module.min.js'];
const cfg=JSON.parse(readFileSync(join(root,'data/site.json'),'utf8'));
if(cfg.demoVideo){scripts.push('demo-video.js');if(size(cfg.demoVideo.thumbnail)>200*1024)failures.push('demo preview exceeds 200 KiB');}
const runtime=readFileSync(join(root,'home-race.js'),'utf8');
if(/walk\.webp|SpriteMaterial|racers\.json/.test(runtime))failures.push('homepage still loads 2D racing pets');
const gzipBytes=scripts.reduce((n,p)=>n+gzipSync(readFileSync(join(root,p))).length,0);
if(gzipBytes>230*1024)failures.push('race scripts exceed 230 KiB gzip');
for(const p of ['index.html','en/index.html','zh/index.html']){
 const html=readFileSync(join(root,p),'utf8');
 if(/(?:src|href)="(?:\/?home-run\.|[^\"]*prototype-world)/.test(html))failures.push(`${p} loads old or prototype runtime`);
 if(!html.includes('home-race-loader.js'))failures.push(`${p} missing progressive loader`);
 for(const id of ['features','scenes','pricing','faq'])if(!html.includes(`id="${id}"`))failures.push(`${p} missing #${id}`);
}
if(failures.length){failures.forEach(f=>console.error('FAIL '+f));process.exit(1);}
console.log(JSON.stringify({pass:true,initialImagesKiB:Math.round(initialImages/1024),allBackgroundsKiB:Math.round(allBackgrounds/1024),raceScriptsGzipKiB:Math.round(gzipBytes/1024)},null,2));
