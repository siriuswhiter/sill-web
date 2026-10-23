import * as THREE from './assets/race/three.module.min.js';

// The original App SVG shapes become bevelled geometry, not a flat decal.
const templates=new Map();
const palette=new Map();
const size=2.35;
function material(color){
  if(!palette.has(color))palette.set(color,new THREE.MeshStandardMaterial({color,roughness:.3,metalness:.16,emissive:color,emissiveIntensity:.12}));
  return palette.get(color);
}
function roundedRect(x,y,w,h,r){
  const s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
function shapeFor(node){
  const n=name=>Number(node.getAttribute(name)||0),unit=v=>v/1024*size;
  if(node.tagName==='rect')return roundedRect(unit(n('x'))-size/2,size/2-unit(n('y')+n('height')),unit(n('width')),unit(n('height')),unit(n('rx')));
  if(node.tagName==='circle'){
    const s=new THREE.Shape();s.absarc(unit(n('cx'))-size/2,size/2-unit(n('cy')),unit(n('r')),0,Math.PI*2,false);return s;
  }
  if(node.tagName==='path'){
    const length=node.getTotalLength(),s=new THREE.Shape(),steps=Math.max(32,Math.min(180,Math.ceil(length/10)));
    for(let i=0;i<=steps;i++){const p=node.getPointAtLength(length*i/steps),x=unit(p.x)-size/2,y=size/2-unit(p.y);if(i===0)s.moveTo(x,y);else s.lineTo(x,y);}s.closePath();return s;
  }
  return null;
}
export async function loadAppItems(types,signal){
  await Promise.all(types.map(async type=>{
    const response=await fetch(`/assets/race/icons/${type}.svg`,{signal});if(!response.ok)throw new Error('App icon unavailable: '+type);
    const text=await response.text(),doc=new DOMParser().parseFromString(text,'image/svg+xml');
    const image=new Image();image.src=`/assets/race/icons/${type}.svg`;await image.decode();
    if(signal?.aborted)return;
    if(doc.querySelector('parsererror'))throw new Error('Invalid App SVG: '+type);
    const svg=document.importNode(doc.documentElement,true);svg.style.cssText='position:absolute;width:1px;height:1px;left:-10000px;visibility:hidden';svg.setAttribute('aria-hidden','true');document.body.append(svg);
    const group=new THREE.Group();
    try{
      const nodes=[...svg.querySelectorAll('path,circle,rect')];
      nodes.forEach((node,index)=>{
        const shape=shapeFor(node);if(!shape)return;
        const background=node.id==='bg';
        const geometry=new THREE.ExtrudeGeometry(shape,{steps:1,depth:background?.37:.10,bevelEnabled:true,bevelSegments:3,bevelSize:background?.09:.018,bevelThickness:background?.09:.018,curveSegments:14});
        const m=new THREE.Mesh(geometry,material(node.getAttribute('fill')||'#ffffff'));
        m.position.z=background?-.22:.22+index*.025;group.add(m);
      });
      templates.set(type,group);
    }finally{svg.remove();}
  }));
}
export function makeAppItem(type){
  const template=templates.get(type);if(!template)throw new Error('App item not ready: '+type);
  return template.clone(true);
}
export function appItemStats(){return {templates:templates.size,materials:palette.size,geometryKind:'bevelled-extruded-app-svg'};}

export function disposeAppItems(){const geometries=new Set();for(const group of templates.values())group.traverse(node=>{if(node.geometry)geometries.add(node.geometry);});geometries.forEach(g=>g.dispose());palette.forEach(m=>m.dispose());templates.clear();palette.clear();}
