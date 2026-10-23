import * as THREE from './assets/race/three.module.min.js';

export const destinations=[
  {id:'paris-twilight',city:['巴黎','Paris'],name:['埃菲尔铁塔','Eiffel Tower'],height:20,scale:1.0},
  {id:'fuji-dawn',city:['富士山','Mount Fuji'],name:['富士山','Mount Fuji'],height:13,scale:1.2},
  {id:'giza-afterglow',city:['吉萨','Giza'],name:['吉萨金字塔','Pyramids of Giza'],height:10,scale:1.1},
  {id:'sydney-sails',city:['悉尼','Sydney'],name:['悉尼歌剧院','Sydney Opera House'],height:8,scale:1.25},
  {id:'tower-bridge-rain',city:['伦敦','London'],name:['伦敦塔桥','Tower Bridge'],height:12,scale:1.1},
  {id:'taj-moon-garden',city:['阿格拉','Agra'],name:['泰姬陵','Taj Mahal'],height:12,scale:1.2},
  {id:'great-wall-clouds',city:['北京','Beijing'],name:['万里长城','The Great Wall'],height:8,scale:1.2},
  {id:'liberty-harbor',city:['纽约','New York'],name:['自由女神像','Statue of Liberty'],height:14,scale:1.05},
  {id:'santorini-breeze',city:['圣托里尼','Santorini'],name:['蓝顶教堂','Santorini domes'],height:9,scale:1.2},
  {id:'rio-golden-bay',city:['里约热内卢','Rio de Janeiro'],name:['基督像','Christ the Redeemer'],height:14,scale:1.2},
];
const mats=new Map(),geos=new Map();
function material(color,glow=false){
  const key=color+glow;if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness:glow?.38:.68,metalness:glow?.28:.08,emissive:color,emissiveIntensity:glow?.55:.025}));return mats.get(key);
}
function geo(key,create){if(!geos.has(key))geos.set(key,create());return geos.get(key);}
function add(parent,geometry,color,x=0,y=0,z=0,glow=false){const m=new THREE.Mesh(geometry,material(color,glow));m.position.set(x,y,z);parent.add(m);return m;}
function box(g,w,h,d,c,x=0,y=0,z=0,glow=false){const m=add(g,geo('box',()=>new THREE.BoxGeometry(1,1,1)),c,x,y,z,glow);m.scale.set(w,h,d);return m;}
function cylinder(g,r1,r2,h,c,x=0,y=0,z=0,n=12){return add(g,new THREE.CylinderGeometry(r1,r2,h,n),c,x,y,z);}
function sphere(g,r,c,x=0,y=0,z=0){const m=add(g,geo('sphere',()=>new THREE.SphereGeometry(1,16,10)),c,x,y,z);m.scale.setScalar(r);return m;}
function beam(g,a,b,width,c,glow=false){
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),m=add(g,geo('beam',()=>new THREE.CylinderGeometry(1,1,1,6)),c,...p.clone().add(q).multiplyScalar(.5).toArray(),glow);
  m.scale.set(width,delta.length(),width);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
}
const earthColor='#172338';
function base(g,c=earthColor,r=6){
  // A broad, irregular apron blends into continuous terrain; there is no suspended underside or rim.
  const positions=[],colors=[],segments=40,rings=5;
  const earth=new THREE.Color(earthColor),center=new THREE.Color(c).lerp(earth,.45);
  const vertex=(ring,index)=>{
    const t=ring/rings,angle=index/segments*Math.PI*2;
    const radius=r*2.5*t*(1+.09*Math.sin(angle*3)+.05*Math.cos(angle*5));
    const color=center.clone().lerp(earth,Math.min(1,t*1.4));
    return {p:[Math.cos(angle)*radius,-.015-t*t*.18,Math.sin(angle)*radius*.83],c:[color.r,color.g,color.b]};
  };
  for(let ring=0;ring<rings;ring++)for(let i=0;i<segments;i++){
    const quad=[vertex(ring,i),vertex(ring,i+1),vertex(ring+1,i),vertex(ring+1,i+1)];
    for(const index of [0,2,1,1,2,3]){positions.push(...quad[index].p);colors.push(...quad[index].c);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  g.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false,side:THREE.DoubleSide})));
}
function windows(g,x,y,z,cols=3,rows=2,spacing=.55){for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)box(g,.17,.29,.025,'#f2c785',x+(i-(cols-1)/2)*spacing,y+j*.7,z,true);}
function eiffel(g){
  base(g,'#334361',5.5);
  for(const x of [-3.65,3.65])for(const z of [-3.65,3.65])box(g,.8,.25,.8,'#77716c',x,.03,z);
  const gold='#c38a51',light='#ffcf8c';
  const levels=[[0,3.65],[4.9,1.9],[8.2,1.12],[14.7,.30],[17.5,.11]];
  for(let tier=0;tier<levels.length-1;tier++){
    const [y0,r0]=levels[tier],[y1,r1]=levels[tier+1];
    for(const x of [-1,1])for(const z of [-1,1])beam(g,[x*r0,y0,z*r0],[x*r1,y1,z*r1],tier===0?.18:.11,gold);
    const count=tier===0?4:5;
    for(let row=0;row<count;row++){
      const a=row/count,b=(row+1)/count,ya=y0+(y1-y0)*a,yb=y0+(y1-y0)*b,ra=r0+(r1-r0)*a,rb=r0+(r1-r0)*b;
      for(const z of [-1,1]){
        beam(g,[-ra,ya,z*ra],[rb,yb,z*rb],.038,gold);beam(g,[ra,ya,z*ra],[-rb,yb,z*rb],.038,gold);
      }
      for(const x of [-1,1]){beam(g,[x*ra,ya,-ra],[x*rb,yb,rb],.038,gold);beam(g,[x*ra,ya,ra],[x*rb,yb,-rb],.038,gold);}
    }
  }
  for(const [y,r] of [[4.9,2.2],[8.2,1.45],[14.7,.63]]){box(g,r*2,.22,r*2,gold,0,y);for(const z of [-1,1])box(g,r*2,.05,.055,light,0,y+.17,z*r,true);}
  cylinder(g,.04,.1,1.65,light,0,18.25,0,8);sphere(g,.13,light,0,19.05);
  const arch=add(g,new THREE.TorusGeometry(2.25,.11,6,26,Math.PI),gold,0,.4,3);arch.rotation.z=0;
}
function fuji(g){
  base(g,'#263456',8.7);
  const positions=[],colors=[],c1=new THREE.Color('#516286'),snow=new THREE.Color('#e9e3e7'),segments=32;
  const rings=[[0,8.4],[3.1,6.4],[6.4,3.4],[9.6,.65],[9.85,.4]];
  for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<segments;i++){
    const p=[];for(const [r,k] of [[ring,i],[ring,i+1],[ring+1,i],[ring+1,i+1]]){const a=k/segments*Math.PI*2,[h,rad]=rings[r],rough=1+Math.sin(k*5.1)*.065;p.push([Math.cos(a)*rad*rough,h+(r>0&&r<3?Math.sin(k*3)*.23:0),Math.sin(a)*rad*rough]);}
    for(const idx of [0,2,1,1,2,3]){positions.push(...p[idx]);const color=ring>=2?snow:c1.clone().multiplyScalar(.8+(i%4)*.06);colors.push(color.r,color.g,color.b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();g.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide})));
  // Vermilion torii at the lakeside makes the silhouette read as Japan.
  for(const x of [-4,-2.2])cylinder(g,.11,.14,2.3,'#ba614e',x,1.15,5.5,8);
  box(g,2.6,.22,.3,'#d16e52',-3.1,2.4,5.5);box(g,2.1,.12,.18,'#8f493f',-3.1,1.9,5.5);
}
function giza(g){
  base(g,'#8d674f',8);
  for(const [x,z,r,h,c] of [[-2.7,-1,4.5,7.5,'#d2a16c'],[3.5,.4,3.2,5.2,'#ba855b'],[-3.8,4.2,1.7,2.6,'#e0b780']]){
    const m=cylinder(g,0,r,h,c,x,h/2,z,4);m.rotation.y=Math.PI/4;
  }
  box(g,2.2,.6,.8,'#c99a69',2.4,.35,4.7);sphere(g,.5,'#d2a16c',1.6,.8,4.7);
}
function sail(g,x,z,w,h,angle){
  const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(w*.15,h*.65,w*.25,h*.96,w*.7,h);s.bezierCurveTo(w*.65,h*.42,w*.92,h*.2,w,0);s.closePath();
  const m=add(g,new THREE.ExtrudeGeometry(s,{depth:.95,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:2,curveSegments:16}),'#eee0bf',x,.85,z);m.rotation.y=angle;
  beam(g,[x,.95,z],[x+w*.7,h+.85,z],.025,'#d0ab80');
}
function sydney(g){
  base(g,'#203b65',8);box(g,12,.75,6.3,'#a7815c',0,.4);
  for(const [x,z,w,h,a] of [[-5,-1.5,3.7,5.3,-.05],[-2.3,-1.4,3.5,6.7,0],[.6,-1.4,3.3,5.6,.06],[-3.3,1.2,3,3.8,-.05],[-.6,1.2,3,4.8,0],[2.3,1.2,2.6,3.6,.1]])sail(g,x,z,w,h,a);
  for(let i=0;i<9;i++)box(g,.28,.62,.05,'#efc78c',-5+i*1.25,.64,3.17,true);
}
function bridgeTower(g,x){
  box(g,2.5,7,2.5,'#b7b0a4',x,3.5);box(g,3,.35,3,'#d2c5b1',x,5.3);box(g,2.7,.3,2.7,'#d2c5b1',x,7);
  for(const dx of [-1,1])for(const z of [-1,1]){cylinder(g,.26,.3,1.5,'#c8b9a2',x+dx,7.7,z,8);cylinder(g,0,.46,1.5,'#43677b',x+dx,9.1,z,4).rotation.y=Math.PI/4;}
  cylinder(g,0,1.45,2.7,'#48697a',x,8.65,0,4).rotation.y=Math.PI/4;windows(g,x,2.2,1.27,3,4,.55);
}
function london(g){
  base(g,'#283d5c',9);bridgeTower(g,-4.4);bridgeTower(g,4.4);
  box(g,16,.48,2.2,'#55788b',0,1.1);box(g,8.7,.48,1.8,'#c8c4b7',0,6.3);
  for(const z of [-1.15,1.15]){
    for(const dir of [-1,1]){let prev=[dir*4.4,6,z];for(let i=1;i<=8;i++){const t=i/8,next=[dir*(4.4+t*3.6),6-4.5*Math.sqrt(t),z];beam(g,prev,next,.06,'#77bed5');beam(g,[next[0],1.4,z],next,.025,'#9bc6d1');prev=next;}}
  }
}
function dome(g,r,x,y,z,c='#e7decd'){
  const m=add(g,new THREE.SphereGeometry(r,20,12,0,Math.PI*2,0,Math.PI*.58),c,x,y,z);m.scale.y=1.16;
  cylinder(g,.035,.1,.65,'#dbb66d',x,y+r*1.18+.2,z,8);return m;
}
function taj(g){
  base(g,'#344354',8);box(g,12,.65,9,'#bdbaa9',0,.35);box(g,6.5,4.2,4.8,'#e1d8c4',0,2.75);
  dome(g,2.3,0,5,0);box(g,1.6,2.7,.045,'#52647c',0,2.5,2.43);
  const arch=add(g,new THREE.TorusGeometry(.8,.18,6,18,Math.PI),'#f0dfb6',0,3.75,2.5);
  for(const x of [-4.8,4.8])for(const z of [-3.4,3.4]){
    cylinder(g,.32,.48,6.3,'#d9d2be',x,3.6,z);for(const y of [2.2,4.3,6.3])cylinder(g,.55,.55,.14,'#e8d8b5',x,y,z);dome(g,.57,x,6.8,z);
  }
  for(const x of [-2.3,2.3]){dome(g,.78,x,5,1.3);windows(g,x,1.7,2.43,2,3,.58);}
}
function wallTower(g,x,y,z){
  box(g,2,2.3,2.1,'#b0977a',x,y+1.15,z);box(g,2.3,.25,2.4,'#c9b18e',x,y+2.35,z);windows(g,x,y+1,z+1.06,2,1,.7);
  for(const dx of [-.9,-.3,.3,.9])for(const side of [-1,1])box(g,.35,.45,.35,'#c0a888',x+dx,y+2.65,z+side*.99);
}
function wall(g){
  base(g,'#3a465a',9);
  const points=[[-7,0,3],[-3,1.4,1],[.1,3.2,-1],[3.5,1.6,1],[7,2.2,-2]];
  const ridge=new THREE.PlaneGeometry(23,15,28,18);ridge.rotateX(-Math.PI/2);
  const vertices=ridge.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i),z=vertices.getZ(i);
    const height=Math.max(...points.map(([px,py,pz])=>(py+.25)*Math.exp(-((x-px)**2+(z-pz)**2)/12)));
    vertices.setY(i,height-.04);
  }
  ridge.computeVertexNormals();add(g,ridge,'#475269');
  for(let i=0;i<points.length;i++){
    const [x,y,z]=points[i];wallTower(g,x,y,z);
    if(i===0)continue;
    const a=new THREE.Vector3(...points[i-1]),b=new THREE.Vector3(...points[i]),delta=b.clone().sub(a),length=delta.length();
    const segment=new THREE.Group();segment.position.copy(a.clone().add(b).multiplyScalar(.5));segment.rotation.y=Math.atan2(delta.x,delta.z);g.add(segment);
    box(segment,1.5,2.2,length,'#958b79',0,-.15);for(const side of [-1,1]){box(segment,.18,.45,length,'#c2ad8d',side*.7,1.08);for(let j=0;j<8;j++)box(segment,.25,.35,.3,'#c2ad8d',side*.7,1.4,(j-3.5)/8*length);}
  }
}
function liberty(g){
  base(g,'#344858',5.5);box(g,4.6,1.2,4.6,'#a8937a',0,.6);box(g,3.4,3.1,3.4,'#bcab91',0,2.65);box(g,3.9,.4,3.9,'#d1b995',0,4.25);
  const copper='#6fa9a6';cylinder(g,.65,1.5,5.3,copper,0,7.1,0,9);sphere(g,.66,copper,0,10.35);cylinder(g,.58,.65,.35,copper,0,10.9,0,9);
  for(let i=0;i<7;i++){const a=(i/6)*Math.PI;beam(g,[Math.cos(a)*.48,10.8+Math.sin(a)*.1,.02],[Math.cos(a)*1.13,10.8+Math.sin(a)*.95,.02],.055,copper);}
  beam(g,[.58,9.25,0],[1.2,10.4,.08],.27,copper);beam(g,[1.2,10.4,.08],[1.5,12.05,.1],.20,copper);
  cylinder(g,.18,.25,.7,'#c5a975',1.5,12.3,.1,8);const flame=sphere(g,.36,'#ffcb76',1.5,12.85,.1);flame.scale.y=.6;
  beam(g,[-.65,9.25,0],[-1.25,8.1,.6],.26,copper);const book=box(g,.75,1.35,.25,'#548d91',-.9,8.2,.8);book.rotation.z=-.25;
}
function santorini(g){
  base(g,'#514b64',7.5);
  for(const [x,y,z,w,h] of [[-3,0,0,3,2.7],[.1,0,2,3.1,3], [2.7,1,-1.5,3.1,4.2],[-2.5,2.4,-2,2.8,3],[.3,4,-2.5,2.9,2.5]]){
    if(y>0)box(g,w,y,2.8,'#898393',x,y/2,z);
    box(g,w,h,2.8,'#e4ded1',x,y+h/2,z);box(g,.65,1.4,.03,'#316bb5',x,y+.7,z+1.42);windows(g,x,y+1.8,z+1.42,2,1,.95);
  }
  dome(g,1.6,2.7,5.2,-1.5,'#346fce');dome(g,1.2,-2.5,5.4,-2,'#467ccd');
  for(let i=0;i<12;i++)box(g,1.5,(i+1)*.22,.45,'#c7c5be',-5.3,(i+1)*.11,3-i*.4);
}
function rio(g){
  base(g,'#35445d',6);const rock=add(g,new THREE.IcosahedronGeometry(4,1),'#46516b',0,2,0);rock.scale.set(.85,1.35,.8);
  box(g,2.9,.8,2.5,'#bcb8af',0,6);cylinder(g,.58,1.05,4.1,'#dad2c1',0,8.4,0,8);sphere(g,.59,'#e4d8c4',0,11.03);
  beam(g,[-.55,9.7,0],[-3.5,9.9,0],.28,'#d7d1c4');beam(g,[.55,9.7,0],[3.5,9.9,0],.28,'#d7d1c4');
  for(const x of [-3.5,3.5])sphere(g,.27,'#e4d8c4',x,9.9,0);
}
// Bake each static model to one mesh per material. Geometry stays bounded as it recycles.
function batch(group){
  group.updateMatrixWorld(true);const sets=new Map(),temporary=new Set();
  group.traverse(node=>{if(!node.isMesh)return;const geometry=node.geometry.index?node.geometry.toNonIndexed():node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);if(!geometry.attributes.normal)geometry.computeVertexNormals();const key=node.material.uuid;const list=sets.get(key)||{material:node.material,geometries:[]};list.geometries.push(geometry);sets.set(key,list);temporary.add(node.geometry);});
  const result=new THREE.Group();
  for(const {material,geometries} of sets.values()){
    const count=geometries.reduce((sum,g)=>sum+g.attributes.position.count,0),positions=new Float32Array(count*3),normals=new Float32Array(count*3),colors=material.vertexColors?new Float32Array(count*3):null;let offset=0;
    for(const g of geometries){positions.set(g.attributes.position.array,offset);normals.set(g.attributes.normal.array,offset);if(colors)colors.set(g.attributes.color.array,offset);offset+=g.attributes.position.array.length;g.dispose();}
    const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.BufferAttribute(positions,3));merged.setAttribute('normal',new THREE.BufferAttribute(normals,3));if(colors)merged.setAttribute('color',new THREE.BufferAttribute(colors,3));merged.computeBoundingSphere();result.add(new THREE.Mesh(merged,material));
  }
  for(const geometry of temporary)if(![...geos.values()].includes(geometry))geometry.dispose();return result;
}
const builders=[eiffel,fuji,giza,sydney,london,taj,wall,liberty,santorini,rio];
export function makeLandmark(index){const group=new THREE.Group();builders[index](group);return batch(group);}

export function disposeLandmarkResources(){geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());geos.clear();mats.clear();}
