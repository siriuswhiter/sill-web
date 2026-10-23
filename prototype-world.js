import * as THREE from './prototype-world-assets/three.module.min.js';
import { destinations, makeLandmark } from './prototype-world-landmarks.js';
import { loadAppItems, makeAppItem, appItemStats } from './prototype-world-items.js';

// Local design prototype. All Island content is a sample; no native tool is invoked.
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const params = new URLSearchParams(location.search);
let language = params.get('lang') === 'en' ? 'en' : 'zh';
const tr = (zh, en) => language === 'zh' ? zh : en;
const paths = {
  file: 'M6 2h8l4 4v16H6z M14 2v5h5 M9 12h6 M9 16h6',
  photo: 'M3 4h18v16H3z M3 17l6-6 4 4 3-3 5 5 M15 8h.01',
  focus: 'M9 2h6 M12 2v3 M18 6l2-2 M12 9v5l3 2 M21 14a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  translate: 'M3 5h12 M9 2v3 M5 5c0 6 7 10 9 10 M13 5c0 5-6 10-10 11 M13 22l4-11 4 11 M15 18h5',
  clipboard: 'M8 4H5v18h14V4h-3 M8 2h8v5H8z M8 12h8 M8 16h6',
  note: 'M13 3H4v18h16v-9 M10 15l1-5 8-8 3 3-8 8z M11 10l3 3 M7 17h6',
  apps: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  sun: 'M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  finder: 'M5 8v2 M18 8v2 M13 4l-2 9h4v7 M5 15q7 5 14 0',
  safari: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M16 8l-3 6-5 2 3-6z',
};
const appIconTypes=new Set(['file','photo','focus','translate','clipboard','note','apps','clock','weather','shelf']);
const icon = type => appIconTypes.has(type)?`<img class="app-glyph" src="prototype-world-assets/icons/${type}.svg" alt="" aria-hidden="true">`:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[type] || paths.file}"/></svg>`;
const catalog = {
  file: {label:['文件','Files'], title:['置物岛','Shelf'], color:'#F97316', caption:['小伙伴接住文件，抛进了置物岛。','A companion collects a file and sends it to the shelf.']},
  focus: {label:['专注','Focus'], title:['番茄钟','Focus timer'], color:'#7C3AED', caption:['专注开始，时间在岛上继续走。','Focus begins. The timer lives on the Island.']},
  photo: {label:['照片','Photos'], title:['置物岛','Shelf'], color:'#DB2777', caption:['沿途的风景，也可以先收在岛里。','A little scenery, safely kept on the Island.']},
  translate: {label:['翻译','Translate'], title:['翻译','Translate'], color:'#8B5CF6', caption:['撞上翻译图标，岛里展开两种语言。','A translation pickup opens two languages on the Island.']},
  clipboard: {label:['剪贴板','Clipboard'], title:['剪贴板','Clipboard'], color:'#0EA5A8', caption:['复制过的小片段，抬眼就能找回来。','Copied snippets, ready to find at a glance.']},
  note: {label:['速记','Note'], title:['速记','Quick Note'], color:'#F2B84B', caption:['路上冒出的灵感，先记在岛里。','A little idea on the way. Keep it on the Island.']},
  apps: {label:['应用','Apps'], title:['应用启动器','App launcher'], color:'#65A30D', caption:['常用的应用，也能从岛里出发。','Everyday apps can start from the Island, too.']},
};
const label = value => value[language === 'zh' ? 0 : 1];
const sequence = ['file','focus','photo','translate','clipboard','note','apps'];
const pickable = sequence.filter(type => type !== 'photo');
let renderer, scene, camera, road, roadSides, rails, terrain;
let sceneReady=false, stateStatic=false;
let elapsed = 0, travel = 0, lastFrame = 0, raf = 0, userPaused = false, overview = false, suspended = false;
let state = 'home', stateAt = 0, flight = null, arrivalUntil = 0, lastHUD = -1, delivered = 0;
let nextPickup = 22, sequenceIndex = 0, nextID = 0, manualToken = null;
let racers = [], tokens = [], markers = [], scenery = [], gates = [], sparks = [];
const eventHistory = [], retainedFiles = [];
let activeDestination=0, backgroundRequest=0, backgroundFade=null, backgroundLayer=0;
const backgroundCache=new Map();
const visitedDestinations=new Set();
const speed = 10, roadWidth = 14, segments = 190, segmentLength = 2;
const colors = ['#747fdf','#a47ed4','#d984a7','#eaaa86','#e7cb78','#64b7b5','#648dcb'];
const atlas = {
  pobb:{columns:8,rows:6,frames:48,duration:3.8333333333333335},
  aubie:{columns:8,rows:5,frames:36,duration:1.5},
};
const v = new THREE.Vector3(), base = {x:0,y:0};
const clamp = THREE.MathUtils.clamp;
const lerp = THREE.MathUtils.lerp;
const effectiveMotion = () => !userPaused && !reducedMotion.matches && !document.hidden && !suspended && sceneReady && !!renderer;

// An unbounded analytic centerline sampled into a fixed pool of road segments.
function center(s) {
  return {x:15*Math.sin(s/62)+8*Math.sin(s/139+.5), y:2.4*Math.sin(s/83)+.75*Math.sin(s/31)};
}
function bank(s) {return .065*Math.sin(s/62);}
function point(s, lane=0, height=0) {
  const p = center(s);
  return new THREE.Vector3(p.x-base.x+lane, p.y-base.y+lane*bank(s)+height, travel-s);
}
function project(position) {
  v.copy(position).project(camera);
  return {x:(v.x*.5+.5)*innerWidth,y:(.5-v.y*.5)*innerHeight,z:v.z};
}
function material(color, extra={}) {
  return new THREE.MeshStandardMaterial({color,roughness:.75,metalness:0,...extra});
}
function mesh(geometry, mat, parent=scene) {
  const m = new THREE.Mesh(geometry,mat); parent.add(m); return m;
}
const terrainRows=191,terrainColumns=29;
function groundPoint(s,lane){
  const p=point(s,lane,-2.6);p.y-=lane*bank(s);return p;
}
function addTerrain(){
  const geometry=new THREE.BufferGeometry(),count=terrainRows*terrainColumns;
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count*3),3).setUsage(THREE.DynamicDrawUsage));
  const colors=new Float32Array(count*4),uvs=new Float32Array(count*2),color=new THREE.Color('#ffffff');
  for(let row=0;row<terrainRows;row++)for(let column=0;column<terrainColumns;column++){
    const lane=(column-(terrainColumns-1)/2)*9,distance=-42+row*2;
    const edge=1-THREE.MathUtils.smoothstep(Math.abs(lane),36,118);
    const far=1-THREE.MathUtils.smoothstep(distance,100,300);
    colors.set([color.r,color.g,color.b,edge*far],(row*terrainColumns+column)*4);
  }
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,4));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage));
  const pixels=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const n=Math.sin(x*.32+y*.16)*1.6+Math.sin(x*.12-y*.26)*1.1+Math.sin(x*12.9898+y*78.233)*1.4;
    const i=(y*128+x)*4;pixels.set([23+n,35+n,56+n,255],i);
  }
  const soil=new THREE.DataTexture(pixels,128,128);soil.colorSpace=THREE.SRGBColorSpace;soil.wrapS=soil.wrapT=THREE.RepeatWrapping;soil.magFilter=soil.minFilter=THREE.LinearFilter;soil.needsUpdate=true;
  const indices=[];
  for(let row=0;row<terrainRows-1;row++)for(let column=0;column<terrainColumns-1;column++){
    const a=row*terrainColumns+column;indices.push(a,a+terrainColumns,a+1,a+1,a+terrainColumns,a+terrainColumns+1);
  }
  geometry.setIndex(indices);
  terrain=mesh(geometry,new THREE.MeshBasicMaterial({map:soil,vertexColors:true,toneMapped:false,side:THREE.DoubleSide,transparent:true,alphaTest:.02}));terrain.frustumCulled=false;
}
function updateTerrain(){
  const positions=terrain.geometry.attributes.position.array,uvs=terrain.geometry.attributes.uv.array;
  for(let row=0;row<terrainRows;row++){
    const distance=-42+row*2,s=travel+distance,p=center(s);
    for(let column=0;column<terrainColumns;column++){
      const lane=(column-(terrainColumns-1)/2)*9,index=(row*terrainColumns+column)*3;
      positions[index]=p.x-base.x+lane;positions[index+1]=p.y-base.y-2.6;positions[index+2]=-distance;
      const uv=(row*terrainColumns+column)*2;uvs[uv]=(p.x+lane)/48;uvs[uv+1]=s/48;
    }
  }
  terrain.geometry.attributes.position.needsUpdate=true;terrain.geometry.attributes.uv.needsUpdate=true;
}
function addRoad() {
  const rows = segments+1, stripeCount = colors.length;
  const positions = new Float32Array(rows*stripeCount*2*3);
  const vertexColors = new Float32Array(positions.length), normals = new Float32Array(positions.length);
  const indices = [];
  for (let stripe=0;stripe<stripeCount;stripe++) {
    const color = new THREE.Color(colors[stripe]);
    for(let row=0;row<rows;row++) for(let side=0;side<2;side++) {
      const idx=(stripe*rows*2+row*2+side)*3;
      vertexColors.set([color.r,color.g,color.b],idx); normals[idx+1]=1;
    }
    for(let row=0;row<segments;row++) {
      const a=stripe*rows*2+row*2;
      indices.push(a,a+1,a+2,a+1,a+3,a+2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color',new THREE.BufferAttribute(vertexColors,3));
  geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.setIndex(indices);
  road=mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,toneMapped:false}));road.frustumCulled=false;
  const sideGeo=new THREE.BufferGeometry(),sideIndices=[];
  sideGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(rows*4*3),3).setUsage(THREE.DynamicDrawUsage));
  for(let edge=0;edge<2;edge++)for(let row=0;row<segments;row++) {
    const a=edge*rows*2+row*2;sideIndices.push(a,a+1,a+2,a+1,a+3,a+2);
  }
  sideGeo.setIndex(sideIndices);roadSides=mesh(sideGeo,new THREE.MeshBasicMaterial({color:'#343862',side:THREE.DoubleSide,toneMapped:false}));roadSides.frustumCulled=false;
  rails = [-1,1].map(()=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(rows*3),3).setUsage(THREE.DynamicDrawUsage));
    const line=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#d9c6ff',transparent:true,opacity:.85}));scene.add(line);line.frustumCulled=false;return line;
  });
  const markerGeo=new THREE.BoxGeometry(.16,.23,1.1),markerMat=material('#d8bce8',{emissive:'#a88cdb',emissiveIntensity:.35});
  for(let i=0;i<64;i++)markers.push(mesh(markerGeo,markerMat));
}
function updateRoad() {
  const rows=segments+1, positions=road.geometry.attributes.position.array, sides=roadSides.geometry.attributes.position.array;
  for(let row=0;row<rows;row++) {
    const d=-34+row*segmentLength, s=travel+d,p=center(s),b=bank(s);
    for(let stripe=0;stripe<7;stripe++)for(let side=0;side<2;side++) {
      const lane=-roadWidth/2+(stripe+side)*roadWidth/7,idx=(stripe*rows*2+row*2+side)*3;
      positions[idx]=p.x-base.x+lane;positions[idx+1]=p.y-base.y+lane*b;positions[idx+2]=-d;
    }
    for(let edge=0;edge<2;edge++) {
      const lane=(edge?1:-1)*roadWidth/2, idx=(edge*rows*2+row*2)*3;
      for(let h=0;h<2;h++)sides.set([p.x-base.x+lane,p.y-base.y+lane*b-h*.55,-d],idx+h*3);
      rails[edge].geometry.attributes.position.array.set([p.x-base.x+lane,p.y-base.y+lane*b+.06,-d],row*3);
    }
  }
  road.geometry.attributes.position.needsUpdate=true;roadSides.geometry.attributes.position.needsUpdate=true;
  for(const rail of rails)rail.geometry.attributes.position.needsUpdate=true;
  const start=Math.floor((travel-25)/12)*12;
  markers.forEach((m,i)=>{const s=start+Math.floor(i/2)*12;m.position.copy(point(s,(i%2?1:-1)*6.7,.17));m.rotation.z=bank(s);});
}
function makeRacer(name, texture, lane, phase) {
  const config=atlas[name];texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(1/config.columns,1/config.rows);
  // The source frames retain their transparent borders inside each atlas cell.
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.center.set(.5,0);sprite.scale.set(name==='pobb'?3.6:3.25,name==='pobb'?3.6:3.25,1);scene.add(sprite);
  const shadow=mesh(new THREE.CircleGeometry(.87,28),new THREE.MeshBasicMaterial({color:'#364b59',transparent:true,opacity:.18,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
  shadow.rotation.x=-Math.PI/2;shadow.scale.y=.65;
  return {name,sprite,shadow,texture,lane,phase,s:0,label:$('#'+name+'-label'),frame:-1,hitAt:-100};
}
function backgroundImage(index){
  const id=destinations[index].id;
  if(backgroundCache.has(id))return backgroundCache.get(id);
  const image=new Image();image.src=`prototype-world-assets/landmarks/${id}.webp`;
  const ready=image.decode().then(()=>image);
  backgroundCache.set(id,ready);
  if(backgroundCache.size>3)backgroundCache.delete(backgroundCache.keys().next().value);
  return ready;
}
function updateDestinationCopy(){
  $('#location-city').textContent=label(destinations[activeDestination].city);
  $('#location-name').textContent=label(destinations[activeDestination].name);
  $('#location-index').textContent=String(activeDestination+1).padStart(2,'0')+' / 10';
}
function requestBackground(index){
  activeDestination=index;visitedDestinations.add(destinations[index].id);updateDestinationCopy();
  const request=++backgroundRequest;
  backgroundImage(index).then(image=>{
    if(request!==backgroundRequest)return;
    const next=1-backgroundLayer,layer=$$('.sky-picture')[next];
    layer.style.backgroundImage=`url("${image.src}")`;layer.style.opacity='0';
    backgroundFade={from:backgroundLayer,to:next,start:elapsed};
    if(!effectiveMotion()) {$$('.sky-picture')[backgroundLayer].style.opacity='0';layer.style.opacity='1';backgroundLayer=next;backgroundFade=null;}
  }).catch(error=>console.warn('Landmark background unavailable:',error.message));
  backgroundImage((index+1)%destinations.length).catch(()=>{});
}
function updateTour(){
  const index=Math.floor(travel/55)%destinations.length;
  if(index!==activeDestination)requestBackground(index);
  if(backgroundFade){
    const progress=clamp((elapsed-backgroundFade.start)/1.8,0,1),ease=progress*progress*(3-2*progress);
    $$('.sky-picture')[backgroundFade.from].style.opacity=String(1-ease);$$('.sky-picture')[backgroundFade.to].style.opacity=String(ease);
    if(progress>=1){backgroundLayer=backgroundFade.to;backgroundFade=null;}
  }
}
function addScenery() {
  for(let index=0;index<destinations.length;index++) {
    const spec=destinations[index],group=makeLandmark(index);group.scale.setScalar(spec.scale);scene.add(group);
    const labelNode=document.createElement('span');labelNode.className='landmark-label';$('#landmark-labels').append(labelNode);
    scenery.push({group,index,s:index===0?75:40+index*55,lane:index===0?13:(index%2===0?1:-1)*(19+index%3*1.8),height:-2,label:labelNode});
  }
  for(let i=0;i<4;i++) {
    const group=new THREE.Group();scene.add(group);
    mesh(new THREE.TorusGeometry(8.3,.075,6,48,Math.PI),material('#666299',{emissive:'#8d68cc',emissiveIntensity:.5}),group);
    for(const x of [-8.3,8.3]){const foot=mesh(new THREE.CylinderGeometry(.16,.27,.85,8),material('#46486b'),group);foot.position.set(x,-.25,0);}
    gates.push({group,s:75+i*95});
  }
  const positions=[];
  for(let i=0;i<140;i++){const phase=i*2.399963;positions.push(Math.cos(phase)*(60+i%11*6),20+i%13*3,-65-i%17*11);}
  const stars=new THREE.BufferGeometry();stars.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  scene.add(new THREE.Points(stars,new THREE.PointsMaterial({color:'#e1d2ff',size:.1,transparent:true,opacity:.5,depthWrite:false})));
  const sparkGeo=new THREE.IcosahedronGeometry(.075,0);
  for(let i=0;i<28;i++){const m=mesh(sparkGeo,new THREE.MeshBasicMaterial({color:colors[i%7],transparent:true}));m.visible=false;sparks.push({mesh:m,life:0,velocity:new THREE.Vector3(),s:0,lane:0,height:0});}
}
function updateScenery(dt) {
  for(const item of scenery) {
    if(item.s<travel-35)item.s+=550;
    item.group.position.copy(groundPoint(item.s,item.lane));item.group.rotation.y=item.index%2===0?-.22:.18;
    const remaining=item.s-travel;item.group.visible=remaining>-15&&remaining<320;
    const p=project(item.group.position.clone().add(new THREE.Vector3(0,destinations[item.index].height*destinations[item.index].scale+1,0)));
    const safeTop=$('#island').getBoundingClientRect().bottom+25;
    const intro=$('.intro').getBoundingClientRect();
    const inIntro=p.x>intro.left-30&&p.x<intro.right+60&&p.y>intro.top-30&&p.y<intro.bottom+40;
    const show=remaining>16&&remaining<95&&p.x>50&&p.x<innerWidth-60&&p.y>safeTop&&p.y<innerHeight-190&&!inIntro;
    item.label.hidden=!show;item.label.textContent=label(destinations[item.index].name);
    item.label.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
  }
  updateTour();
  for(const gate of gates) {
    if(gate.s<travel-25)gate.s+=380;
    gate.group.position.copy(point(gate.s,0,.2));gate.group.rotation.z=bank(gate.s);
    gate.group.rotation.y=-Math.atan((center(gate.s+1).x-center(gate.s-1).x)/2);
  }
  for(const spark of sparks)if(spark.life>0){
    spark.life-=dt;spark.s-=spark.velocity.z*dt;spark.lane+=spark.velocity.x*dt;spark.height+=spark.velocity.y*dt;spark.velocity.y-=6*dt;
    spark.mesh.position.copy(point(spark.s,spark.lane,spark.height));spark.mesh.material.opacity=Math.max(0,spark.life);spark.mesh.visible=spark.life>0;
  }
}
function createToken(type,s,owner,manual=false) {
  const group=new THREE.Group();scene.add(group);
  const tile=makeAppItem(type);group.add(tile);
  const halo=mesh(new THREE.TorusGeometry(1.45,.025,5,32),new THREE.MeshBasicMaterial({color:catalog[type].color,transparent:true,opacity:.75}),group);
  halo.rotation.x=Math.PI/2;halo.position.y=-1.55;
  const token={id:nextID++,type,s,owner,lane:racers[owner]?.lane??(owner?2.4:-2.4),group,tile,halo,manual};tokens.push(token);return token;
}
function removeToken(token) {
  scene.remove(token.group);
  // Item clones share the bounded template geometry/materials. Only the per-pickup halo is disposed.
  token.halo.geometry.dispose();token.halo.material.dispose();
  tokens=tokens.filter(item=>item!==token);if(manualToken===token)manualToken=null;
}
function populateTokens() {
  while(nextPickup<travel+230) {
    createToken(sequence[sequenceIndex%sequence.length],nextPickup,sequenceIndex%2);
    sequenceIndex++;nextPickup+=57;
  }
}
function triggerPickup(type,origin,owner,source='collision') {
  if(flight)finishFlight();
  const destination=$('.island-shell').getBoundingClientRect();
  const who=owner===0?'pobb':'aubie';
  flight={type,owner:who,source,start:elapsed,from:origin,to:{x:destination.left+destination.width*.5,y:destination.top+90}};
  $('#flight').innerHTML=icon(type);$('#flight').style.setProperty('--item-color',catalog[type].color);
  $('#race-status').textContent=tr(who==='pobb'?'核核接到了':'茄博士接到了',who==='pobb'?'Pobb found ':'Aubie found ')+label(catalog[type].label);
  if(!effectiveMotion()){finishFlight();return;}
  $('#flight').style.display='flex';
  if(racers[owner]){
    const racer=racers[owner];racer.hitAt=elapsed;
    sparks.forEach((spark,i)=>{if(i>=16)return;spark.s=racer.s;spark.lane=racer.lane;spark.height=1.1;spark.life=.65+i%4*.08;spark.velocity.set(Math.cos(i*2.4)*2,2+(i%3),Math.sin(i*2.4)*2);});
  }
}
function finishFlight() {
  if(!flight)return;
  const current=flight;flight=null;$('#flight').style.display='none';delivered++;
  if(current.type==='file'||current.type==='photo'){
    retainedFiles.unshift(current.type==='file'?{name:'Weekend plans.pdf',type:'PDF'}:{name:'Rainbow road.png',type:'PNG'});retainedFiles.splice(4);
  }
  state=current.type;stateAt=elapsed;stateStatic=!effectiveMotion();arrivalUntil=elapsed+.4;
  eventHistory.push({type:state,owner:current.owner,source:current.source,at:Number(elapsed.toFixed(2)),distance:Math.round(travel)});if(eventHistory.length>30)eventHistory.shift();
  renderIsland();updateHUD();
  $('#announcement').textContent=label(catalog[state].caption);
}
function updateFlight() {
  if(!flight)return;
  const t=clamp((elapsed-flight.start)/.95,0,1),ease=1-Math.pow(1-t,2),p=flight;
  const x=lerp(p.from.x,p.to.x,ease)+Math.sin(t*Math.PI)*65;
  const y=lerp(p.from.y,p.to.y,ease)-Math.sin(t*Math.PI)*80;
  $('#flight').style.transform=`translate(${x-23}px,${y-26}px) rotate(${Math.sin(t*Math.PI)*-20}deg) scale(${1-t*.6})`;
  $('#flight').style.opacity=String(t>.85?(1-t)/.15:1);
  if(t>=1)finishFlight();
}
function updateRacers(dt) {
  racers.forEach((r,i)=>{r.s=travel+Math.sin(elapsed*.53+r.phase)*2.3+(i===0?.4:0);});
  racers.forEach((r,i)=>{
    r.lane=(i===0?-2.5:2.5)+Math.sin(elapsed*.31+r.phase)*.2;
    const p=point(r.s,r.lane,.12+Math.abs(Math.sin(elapsed*10+r.phase))*.08);
    const hop=Math.max(0,1-(elapsed-r.hitAt)/.45);p.y+=Math.sin(hop*Math.PI)*.6;
    r.sprite.position.copy(p);r.shadow.position.copy(point(r.s,r.lane,.035));r.shadow.rotation.z=-bank(r.s);
    const config=atlas[r.name],frame=Math.floor(elapsed/(config.duration*.73)*config.frames)%config.frames;
    if(frame!==r.frame){r.texture.offset.set((frame%config.columns)/config.columns,1-(Math.floor(frame/config.columns)+1)/config.rows);r.frame=frame;}
    r.sprite.center.y=config.footAnchors?.[frame]??.15;
    const screen=project(p.clone().add(new THREE.Vector3(0,3.15,0)));
    r.label.style.transform=`translate(${clamp(screen.x,36,innerWidth-36)}px,${screen.y}px) translate(-50%,-100%)`;
    r.label.querySelector('span').textContent=r.s>=racers[1-i].s?'01':'02';
  });
}
function updateTokens() {
  let nearest=null;
  for(const token of [...tokens]) {
    const racer=racers[token.owner];
    token.group.position.copy(point(token.s,token.lane,1.75+Math.sin(elapsed*2+token.id)*.16));
    token.halo.rotation.z=elapsed*.5;token.tile.rotation.set(Math.sin(elapsed*.9+token.id)*.1,-.22+Math.sin(elapsed*1.4+token.id)*.58,Math.sin(elapsed*.8+token.id)*.05);
    if(token.s<=racer.s && Math.abs(token.lane-racer.lane)<1.1) {
      const position=project(token.group.position);
      triggerPickup(token.type,position,token.owner,token.manual?'manual-collision':'collision');removeToken(token);continue;
    }
    if(token.s<travel-10){removeToken(token);continue;}
    if(!nearest||token.s<nearest.s)nearest=token;
  }
  if(nearest&&nearest.s-travel<80){
    const p=project(nearest.group.position.clone().add(new THREE.Vector3(0,1.9,0)));
    $('#pickup-label').style.display=innerWidth<760&&p.y<$('.intro').getBoundingClientRect().bottom+20?'none':'block';$('#pickup-label').style.transform=`translate(${clamp(p.x,60,innerWidth-60)}px,${p.y}px) translate(-50%,-100%)`;
    $('#pickup-label').textContent=label(catalog[nearest.type].label)+' ↗ Island';
  }else $('#pickup-label').style.display='none';
}
function homeMarkup() {
  return `<div class="component-home"><div class="clock-component"><strong>10:09</strong><div class="component-small">${tr('星期六，10 月 17 日','Saturday, October 17')}</div></div><div class="weather-component">${icon('sun')}<strong>23°</strong><div class="component-small">${tr('晴，适合出发','A little sunshine')}</div></div><div class="home-pets"><div><img src="prototype-world-assets/pobb.png" alt=""><img src="prototype-world-assets/aubie.png" alt=""></div><p>${tr('小伙伴在路上','Friends on the way')}</p></div></div>`;
}
function renderIsland() {
  $('#island').dataset.state=state;
  $('#island-title').textContent=state==='home'?tr('我的岛','My Island'):label(catalog[state].title);
  $('#island-caption').textContent=state==='home'?tr('组件、文件和工具，都在同一座岛里。','Components, files, and tools. One Island.'):label(catalog[state].caption);
  let html='';
  if(state==='home')html=homeMarkup();
  if(state==='file'||state==='photo'){
    const photo=state==='photo';
    html=`<div class="tool-layout"><div class="tool-header"><span>${icon('file')}${tr('随手放在这里','Keep it close')}</span><small>${tr('最近收下','Recently collected')} · ${retainedFiles.length}</small></div><div class="file-preview"><div class="file-paper">${photo?icon('photo'):'PDF'}</div><div class="file-info"><strong>${photo?'Rainbow road.png':'Weekend plans.pdf'}</strong><p>${tr('来自彩虹赛道','From the rainbow road')} · ${photo?'2.4 MB':'128 KB'}</p></div><span class="received-badge">${tr('已收好','Saved')}</span></div><div class="file-strip">${retainedFiles.map(file=>`<span>${file.name}</span>`).join('')}</div></div>`;
  }
  if(state==='focus')html=`<div class="focus-component"><div class="focus-ring">${icon('focus')}</div><div><div class="focus-time" id="focus-time">25:00</div><div class="focus-label"><i></i>${tr('专注中 · 留一点时间给自己','Focusing · A little time for yourself')}</div></div></div>`;
  if(state==='translate')html=`<div class="tool-layout"><div class="tool-header"><span>${icon('translate')}${tr('翻译','Translate')}</span><small>English ⇄ ${tr('简体中文','Chinese')}</small></div><div class="translate-body"><div><small>ENGLISH</small><p>A little more room <br>for everyday things.</p></div><div><small>简体中文</small><p>给日常的小事，<br>多一点空间。</p></div></div><div class="tool-footer"><span>${tr('本地演示文本','Sample text')}</span><span>${tr('译文已就绪','Translation ready')} ✓</span></div></div>`;
  if(state==='clipboard')html=`<div class="tool-layout"><div class="tool-header"><span>${icon('clipboard')}${tr('剪贴板','Clipboard')}</span><small>${tr('搜索记录','Search history')} ⌕</small></div><div class="clipboard-list"><div>${icon('translate')}<span>${tr('给日常的小事，多一点空间。','A little more room for everyday things.')}</span><small>${tr('刚刚','now')}</small></div><div>${icon('file')}<span>Weekend plans.pdf</span><small>1m</small></div><div>${icon('photo')}<span>Rainbow road.png</span><small>2m</small></div></div><div class="tool-footer"><span>${tr('3 条示例记录','3 sample entries')}</span><span>${tr('随时取用','Ready when you are')}</span></div></div>`;
  if(state==='apps')html=`<div class="tool-layout"><div class="tool-header"><span>${icon('apps')}${tr('应用','Applications')}</span><small>${tr('搜索应用','Search apps')} ⌕</small></div><div class="apps-grid">${[['finder','Finder'],['safari','Safari'],['notes',tr('备忘录','Notes')],['sill','Sill']].map(([id,name])=>`<div class="app-item"><span class="app-icon ${id}">${icon(id==='notes'?'file':id==='sill'?'apps':id)}</span>${name}</div>`).join('')}</div><div class="tool-footer"><span>${tr('最近使用','Recently used')}</span><span>${tr('从岛里出发','Start from the Island')} ↗</span></div></div>`;
  if(state==='note')html=`<div class="tool-layout"><div class="tool-header"><span>${icon('note')}${tr('随手记','Quick Note')}</span><small>${tr('当前空间 · 日常','Current space · Everyday')}</small></div><div class="note-body"><small>${tr('一个小念头','A LITTLE THOUGHT')}</small><p id="note-draft"></p></div><div class="tool-footer"><span>${tr('草稿示例','Sample draft')}</span><span>${tr('留住这一刻','Keep this little moment')} ↵</span></div></div>`;
  $('#island-content').innerHTML=html;
  $$('[data-pickup]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.pickup===state)));
  updateDynamicContent();
}
function updateIsland() {
  if(state!=='home'&&!flight&&elapsed-stateAt>4.3){state='home';renderIsland();}
  $('#island').classList.toggle('arrival',elapsed<arrivalUntil);
  updateDynamicContent();
}
function updateDynamicContent() {
  if(state==='focus') {
    const seconds=Math.max(0,1500-Math.floor(elapsed-stateAt));
    $('#focus-time').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
  }
  if(state==='note'){const draft=tr('周末去海边，记得带相机。','A trip to the coast. Remember the camera.');const count=stateStatic||reducedMotion.matches||!renderer?draft.length:Math.floor((elapsed-stateAt)*25);$('#note-draft').textContent=draft.slice(0,Math.max(0,count));}
}
function updateHUD() {
  $('#distance').textContent=String(Math.floor(travel)).padStart(4,'0')+' m';
  if(!flight)$('#race-status').textContent=delivered?tr(`已送达 ${delivered} 份日常`,`Delivered ${delivered} little things`):tr('小伙伴正在出发','A little race is underway');
}
function updateCopy() {
  document.documentElement.lang=language==='zh'?'zh-CN':'en';document.title=tr('Sill · 日常，跑进岛里','Sill · Everyday things, on a roll');
  $('#headline').innerHTML=tr('把日常，<br>跑进岛里。','Everyday things.<br>On a roll.');
  $('#eyebrow').textContent=tr('带着日常，环游世界','LITTLE COMPANIONS. A WHOLE WORLD.');
  $('#intro-copy').innerHTML=tr('跟着小伙伴，收起沿途的文件，<br>遇见随手就能用的工具。','Follow your little companions.<br>Bring your files and favorite tools along.');
  $('#download-copy').textContent=tr('让你的 Mac 也热闹起来','Bring a little life to your Mac');
  $('#hud-title').textContent=tr('下一站，岛里见','Next stop: your Island');$('#hud-hint').textContent=tr('点一个，把它放上赛道','Pick one. Put it on the road.');
  $('#event-caption').textContent=tr('碰到文件，收进岛里 · 碰到图标，打开工具','Collect a file, keep it close. Meet an icon, open a tool.');
  $('#design-link').textContent=tr('设计记录 ↗','Design notes ↗');$('#lang').textContent=tr('EN','中文');$('#lang').setAttribute('aria-label',tr('Switch to English','切换到中文'));
  $('#camera').textContent=overview?tr('跟随','Follow'):tr('远景','Wide view');$('#camera').title=tr('切换视角','Switch camera view');
  $('#pause').textContent=reducedMotion.matches?tr('减少动态','Reduced motion'):userPaused?tr('继续','Play'):tr('暂停','Pause');
  $('#pause').disabled=reducedMotion.matches||!sceneReady;$('#pause').setAttribute('aria-pressed',String(userPaused||reducedMotion.matches));
  $('#camera').disabled=!sceneReady;$('#camera').setAttribute('aria-pressed',String(overview));
  $('#pobb-label b').textContent=tr('核核','Pobb');$('#aubie-label b').textContent=tr('茄博士','Aubie');
  $('.brand').setAttribute('aria-label',tr('返回 Sill 首页','Return to Sill home'));
  $('#island').setAttribute('aria-label',tr('Sill Island 内容演示','Sill Island content preview'));
  $('#world').setAttribute('aria-label',tr('无限彩虹赛道。核核和茄博士自动竞速，收集的内容进入顶部 Island。','An endless rainbow road. Pobb and Aubie race and send their pickups to the Island.'));
  $('#pickups').setAttribute('aria-label',tr('选择赛道上出现的内容','Choose a pickup for the road'));
  $('#fallback').textContent=tr('当前浏览器无法显示 3D 赛道。仍可通过下方入口查看 Island 内容。','This browser cannot display the 3D race. Explore the Island using the pickup buttons.');
  for(const button of $$('[data-pickup]')){const type=button.dataset.pickup;button.innerHTML=icon(type)+`<span>${label(catalog[type].label)}</span>`;button.setAttribute('aria-label',tr('将'+label(catalog[type].label)+'放上赛道','Put '+label(catalog[type].label)+' on the road'));}
  renderIsland();updateHUD();updateDestinationCopy();
}
function requestPickup(type) {
  if(!effectiveMotion()) {triggerPickup(type,{x:innerWidth/2,y:innerHeight*.65},sequence.indexOf(type)%2,'manual');return;}
  // Manual choices coalesce; the nearest natural item is moved back to avoid a competing arrival.
  if(manualToken)removeToken(manualToken);
  for(const token of tokens)if(token.s-travel<48)token.s+=65;
  manualToken=createToken(type,travel+13,sequence.indexOf(type)%2,true);
  $('#event-caption').textContent=tr('已放上赛道，等小伙伴跑过来。','On the road. Your companions are on their way.');
}
for(const type of pickable) {
  const button=document.createElement('button');button.type='button';button.dataset.pickup=type;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>requestPickup(type));$('#pickups').append(button);
}
function updateCamera() {
  const mobile=innerWidth<760;
  camera.fov=mobile?58:47;camera.aspect=innerWidth/innerHeight;
  camera.position.set(mobile?0:3.8,overview?14:8.8,overview?28:19);
  camera.lookAt(mobile?0:-3.7,overview?-1:-.2,mobile?-15:-24);
  camera.updateProjectionMatrix();
}
function renderScene() {if(renderer){renderer.render(scene,camera);}}
function frame(now) {
  raf=0;if(!effectiveMotion())return;
  const dt=lastFrame?Math.min((now-lastFrame)/1000,.06):0;lastFrame=now;elapsed+=dt;travel+=dt*speed;base.x=center(travel).x;base.y=center(travel).y;
  updateTerrain();updateRoad();updateRacers(dt);populateTokens();updateTokens();updateScenery(dt);updateFlight();updateIsland();
  if(Math.floor(elapsed*5)!==lastHUD){lastHUD=Math.floor(elapsed*5);updateHUD();}
  renderScene();raf=requestAnimationFrame(frame);
}
function schedule() {
  if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;
  document.body.dataset.paused=String(!effectiveMotion());
  if(effectiveMotion())raf=requestAnimationFrame(frame);else renderScene();
}
$('#pause').addEventListener('click',()=>{userPaused=!userPaused;updateCopy();schedule();});
$('#camera').addEventListener('click',()=>{overview=!overview;updateCamera();updateCopy();if(renderer){updateRacers(0);updateTokens();renderScene();}});
$('#lang').addEventListener('click',()=>{language=language==='zh'?'en':'zh';const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);updateCopy();});
window.addEventListener('popstate',()=>{language=new URLSearchParams(location.search).get('lang')==='en'?'en':'zh';updateCopy();});
document.addEventListener('visibilitychange',schedule);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches&&flight)finishFlight();updateCopy();schedule();});
window.addEventListener('pagehide',()=>{suspended=true;schedule();});window.addEventListener('pageshow',()=>{suspended=false;schedule();});
window.addEventListener('resize',()=>{
  if(!sceneReady)return;renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);updateCamera();updateRacers(0);updateTokens();
  if(flight){const rect=$('.island-shell').getBoundingClientRect();flight.to={x:rect.left+rect.width*.5,y:rect.top+90};updateFlight();}renderScene();
});
$('#world').addEventListener('webglcontextlost',event=>{event.preventDefault();suspended=true;schedule();$('#fallback').hidden=false;});
$('#world').addEventListener('webglcontextrestored',()=>{suspended=false;$('#fallback').hidden=true;schedule();});

try {
  renderer=new THREE.WebGLRenderer({canvas:$('#world'),antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  scene=new THREE.Scene();scene.fog=new THREE.Fog('#121b34',90,290);
  camera=new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,500);updateCamera();
  scene.add(new THREE.HemisphereLight('#bac5ff','#2a244a',1.7));
  const sunlight=new THREE.DirectionalLight('#ffcf95',3.0);sunlight.position.set(-25,50,30);scene.add(sunlight);
  const rimLight=new THREE.DirectionalLight('#9e8bf0',1.8);rimLight.position.set(25,10,-20);scene.add(rimLight);
  base.x=center(0).x;base.y=center(0).y;
  addTerrain();addRoad();addScenery();
  const loader=new THREE.TextureLoader();
  const frameMetadata=await fetch('prototype-world-assets/racers.json').then(response=>{if(!response.ok)throw new Error('Pet metadata unavailable');return response.json();});
  Object.assign(atlas,frameMetadata);
  const [textures]=await Promise.all([Promise.all(['pobb','aubie'].map(name=>loader.loadAsync(`prototype-world-assets/${name}-walk.webp`))),loadAppItems(sequence)]);
  racers=[makeRacer('pobb',textures[0],-2.5,0),makeRacer('aubie',textures[1],2.5,Math.PI)];
  updateTerrain();updateRoad();populateTokens();updateRacers(0);updateTokens();updateScenery(0);sceneReady=true;renderScene();
}catch(error){
  console.warn('Sill race preview unavailable:',error.message);if(renderer)renderer.dispose();renderer=null;$('#fallback').hidden=false;document.body.classList.add('no-webgl');
}
updateCopy();requestBackground(0);schedule();
// Read-only evidence endpoint for this noindex prototype; no way to drive the simulation here.
Object.defineProperty(window,'sillRace',{value:Object.freeze({snapshot:()=>({
  ready:sceneReady,elapsed:Number(elapsed.toFixed(3)),distance:Number(travel.toFixed(2)),state,delivered,paused:!effectiveMotion(),reducedMotion:reducedMotion.matches,
  flight:flight?{type:flight.type,progress:Number(((elapsed-flight.start)/.95).toFixed(2))}:null,
  racers:racers.map(r=>({name:r.name,frame:r.frame,distance:Number(r.s.toFixed(2)),lane:Number(r.lane.toFixed(2))})),
  tokens:tokens.map(t=>({type:t.type,remaining:Number((t.s-travel).toFixed(2)),owner:t.owner,rotation:t.tile.rotation.toArray().slice(0,3).map(n=>Number(n.toFixed(3)))})),events:[...eventHistory],
  worldTour:{grounding:'continuous-terrain',destination:destinations[activeDestination].id,visited:[...visitedDestinations],landmarks:scenery.map(item=>({id:destinations[item.index].id,remaining:Math.round(item.s-travel)})),backgroundCache:backgroundCache.size,backgroundLayers:$$('.sky-picture').map(layer=>({opacity:Number(layer.style.opacity||0),image:layer.style.backgroundImage})),items:appItemStats()},
  resources:renderer?{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,calls:renderer.info.render.calls}:null,
})})});
