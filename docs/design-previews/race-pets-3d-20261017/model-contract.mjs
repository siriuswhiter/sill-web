import assert from 'node:assert/strict';
import * as THREE from '../../../assets/race/three.module.min.js';
import {makeRacePet,animateRacePet,racePetStats,disposeRacePets} from '../../../home-race-pets.js';
const rigs=['pobb','aubie'].map(makeRacePet),forward=new THREE.Vector3(0,0,-1),q=new THREE.Quaternion();
let minDot=1,footMin=Infinity,footMax=-Infinity;
for(const rig of rigs)for(const heading of [-.5,0,.5])for(const turn of [-5,0,5]){
 rig.root.rotation.y=heading;rig.root.updateMatrixWorld(true);
 const target=rig.root.localToWorld(new THREE.Vector3(turn,.45,-18));
 animateRacePet(rig,{time:1,distance:10,phase:0,lookTarget:target,lateralSpeed:.4,jumping:0});rig.root.updateMatrixWorld(true);
 for(const eye of rig.eyes){
  const position=eye.pupil.getWorldPosition(new THREE.Vector3());eye.pupil.getWorldQuaternion(q);
  const actual=forward.clone().applyQuaternion(q);const desired=target.clone().sub(position).normalize();const dot=actual.dot(desired);minDot=Math.min(minDot,dot);assert(dot>.997,`gaze failed ${rig.name} ${dot}`);
 }
}
for(const rig of rigs){
 rig.root.rotation.set(0,0,0);
 for(let i=0;i<120;i++){
  animateRacePet(rig,{time:i/60,distance:i/120*Math.PI*2/1.2,phase:0,lookTarget:new THREE.Vector3(0,.45,-18),lateralSpeed:0,jumping:0});rig.root.updateMatrixWorld(true);
  let lowest=Infinity;
  for(const leg of rig.legs){let min=Infinity;leg.traverse(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position;for(let j=0;j<p.count;j++){const v=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(mesh.matrixWorld);min=Math.min(min,v.y);}});lowest=Math.min(lowest,min);}
  footMin=Math.min(footMin,lowest);footMax=Math.max(footMax,lowest);assert(lowest>=-.015&&lowest<.045,`foot contact failed ${rig.name} ${lowest}`);
 }
}
const stats=racePetStats();disposeRacePets();assert.equal(racePetStats().characters,0);assert.equal(racePetStats().geometries,0);
console.log(JSON.stringify({pass:true,stats,maxGazeErrorDegrees:Math.acos(minDot)*180/Math.PI,stanceFootMinY:footMin,stanceFootMaxY:footMax,disposal:true},null,2));
