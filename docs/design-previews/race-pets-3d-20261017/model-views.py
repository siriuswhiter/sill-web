import asyncio,json
from cdp import Page,BASE,OUT
JS='''(async()=>{
const THREE=await import('/assets/race/three.module.min.js');
const {makeRacePet,animateRacePet,racePetStats}=await import('/home-race-pets.js');
document.body.innerHTML='';document.body.style.cssText='margin:0;background:#121b34';
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,900);renderer.setPixelRatio(1);renderer.setClearColor('#18223b');renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#bac5ff','#2a244a',1.7));
const light=new THREE.DirectionalLight('#ffcf95',3);light.position.set(-5,8,-6);scene.add(light);const rim=new THREE.DirectionalLight('#9e8bf0',1.8);rim.position.set(5,5,5);scene.add(rim);
const camera=new THREE.PerspectiveCamera(38,1440/900,.1,100);
const a=makeRacePet('pobb'),b=makeRacePet('aubie');a.root.position.x=1.65;b.root.position.x=-1.65;scene.add(a.root,b.root);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#27354f',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-.03;scene.add(ground);
window.modelView=(x,y,z,d=0)=>{for(const r of [a,b])animateRacePet(r,{time:d,distance:d*10,phase:r===a?0:Math.PI,lookTarget:new THREE.Vector3(r.root.position.x+.8,.4,-18),lateralSpeed:.2,jumping:0});camera.position.set(x,y,z);camera.lookAt(0,1.45,0);renderer.render(scene,camera);return racePetStats()};
return modelView(0,3.9,-10);
})()'''
async def main():
 p=await Page().open(1440,900);await p.call('Page.navigate',{'url':BASE+'/robots.txt'});await p.until('document.readyState==="complete"')
 print(await p.ev(JS));await p.screenshot('models-front')
 for name,xyz in [('side',(8,3.8,-6)),('back',(0,3.9,10))]:
  await p.ev(f'modelView({xyz[0]},{xyz[1]},{xyz[2]})');await p.screenshot('models-'+name)
 for i in range(4):
  await p.ev(f'modelView(5,3.9,-9,{i*.12})');await p.screenshot('gait-'+str(i))
 print('ERRORS',await p.errors());await p.close()
asyncio.run(main())
