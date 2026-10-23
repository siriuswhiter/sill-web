import asyncio,json,urllib.request,base64,time
from pathlib import Path
import websockets
OUT=Path('/private/tmp/sill-grounded-landmarks/review');OUT.mkdir(exist_ok=True)
async def main():
 target=json.load(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:9232/json/new?about:blank',method='PUT')))
 async with websockets.connect(target['webSocketDebuggerUrl'],max_size=32*1024*1024) as ws:
  n=0;events=[]
  async def call(m,p={}):
   nonlocal n
   n+=1;await ws.send(json.dumps({'id':n,'method':m,'params':p}))
   while True:
    r=json.loads(await ws.recv())
    if r.get('id')==n:return r.get('result',{})
    events.append(r)
  async def ev(js):
   r=await call('Runtime.evaluate',{'expression':js,'returnByValue':True});return r.get('result',{}).get('value')
  async def shot(name):
   d=await call('Page.captureScreenshot',{'format':'png'});(OUT/(name+'.png')).write_bytes(base64.b64decode(d['data']))
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Emulation.setDeviceMetricsOverride',{'width':1440,'height':1000,'deviceScaleFactor':1,'mobile':False})
  await call('Page.navigate',{'url':'http://127.0.0.1:8000/prototype-world.html'})
  seen=set();start=time.monotonic()
  while time.monotonic()-start<95:
   s=await ev('window.sillRace?.snapshot()')
   if not s:await asyncio.sleep(.2);continue
   city=s['worldTour']['destination']
   if city not in seen and s['elapsed']%5.5>1.8:
    await shot('grounded-'+city);seen.add(city);print(city,s['distance'],flush=True)
   if s['elapsed']>=49:break
   await asyncio.sleep(.3)
  assert len(seen)>=9
  assert s['delivered']>=7 and s['worldTour']['grounding']=='continuous-terrain'
  await ev('document.querySelector("#pause").click()');a=await ev('sillRace.snapshot()');await asyncio.sleep(.4);b=await ev('sillRace.snapshot()');assert a['distance']==b['distance']
  await call('Emulation.setDeviceMetricsOverride',{'width':390,'height':844,'deviceScaleFactor':1,'mobile':False});await shot('grounded-mobile')
  assert await ev('document.documentElement.scrollWidth===innerWidth')
  errors=[e for e in events if e.get('method')=='Runtime.exceptionThrown'];missing=[e['params']['response']['url'] for e in events if e.get('method')=='Network.responseReceived' and e['params']['response']['status']>=400]
  assert not errors and not missing,(errors,missing)
  (OUT/'grounding-results.json').write_text(json.dumps({'pass':True,'scenes':sorted(seen),'snapshot':s,'pauseStable':True,'mobileOverflow':False,'errors':errors,'missing':missing},ensure_ascii=False,indent=2)+'\n')
  print('PASS',s['elapsed'],s['delivered'],flush=True)
asyncio.run(main())
