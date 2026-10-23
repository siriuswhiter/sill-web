// Let the static page paint before downloading and building the race.
const stage=document.querySelector('.race-stage');
let loading=false,stopped=false;
async function start(){
  if(loading||stopped||document.hidden||stage.dataset.visible!=='true')return;
  loading=true;
  try{await import('./home-race.js?v=20261017-pets3d');}
  catch(error){console.warn('Sill race could not load:',error.message);stage.querySelector('#fallback').hidden=false;}
}
const visibility=new IntersectionObserver(entries=>{
  stage.dataset.visible=String(entries[0].isIntersecting);
  stage.dispatchEvent(new Event('racevisibility'));
  if(entries[0].isIntersecting)requestAnimationFrame(()=>requestAnimationFrame(start));
},{threshold:0,rootMargin:'-100px 0px 0px 0px'});
visibility.observe(stage);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)start();});
window.addEventListener('pagehide',event=>{if(!event.persisted){stopped=true;visibility.disconnect();}});
