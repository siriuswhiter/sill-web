import asyncio,json,urllib.request,base64,time
from pathlib import Path
import websockets
OUT=Path('/private/tmp/sill-home-live/review');OUT.mkdir(exist_ok=True)
BASE='http://127.0.0.1:8000'
class Page:
 async def open(self,width=1440,height=1000):
  target=json.load(urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:9233/json/new?about:blank',method='PUT')))
  self.id=target['id'];self.ws=await websockets.connect(target['webSocketDebuggerUrl'],max_size=32*1024*1024);self.seq=0;self.events=[]
  await self.call('Page.enable');await self.call('Runtime.enable');await self.call('Network.enable');await self.call('Performance.enable')
  await self.call('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':2,'mobile':False})
  return self
 async def call(self,method,params=None):
  self.seq+=1;await self.ws.send(json.dumps({'id':self.seq,'method':method,'params':params or {}}))
  while True:
   response=json.loads(await self.ws.recv())
   if response.get('id')==self.seq:
    if 'error' in response:raise RuntimeError(response['error'])
    return response.get('result',{})
   self.events.append(response)
 async def ev(self,js):
  r=await self.call('Runtime.evaluate',{'expression':js,'returnByValue':True,'awaitPromise':True})
  if 'exceptionDetails' in r:raise RuntimeError(r['exceptionDetails'])
  return r.get('result',{}).get('value')
 async def until(self,js,timeout=30):
  start=time.monotonic()
  while time.monotonic()-start<timeout:
   r=await self.ev(js)
   if r:return r
   await asyncio.sleep(.2)
  raise RuntimeError('Timeout: '+js)
 async def screenshot(self,name):
  r=await self.call('Page.captureScreenshot',{'format':'png'});(OUT/(name+'.png')).write_bytes(base64.b64decode(r['data']))
 async def close(self):
  await self.ws.close();urllib.request.urlopen('http://127.0.0.1:9233/json/close/'+self.id).read()
 async def errors(self):
  await self.ev('0')
  return [e for e in self.events if e.get('method')=='Runtime.exceptionThrown' or (e.get('method')=='Network.responseReceived' and e['params']['response']['status']>=400)]
async def main():
 results={};p=await Page().open()
 await p.call('Page.navigate',{'url':BASE+'/?lang=zh'})
 await p.until('window.sillRace?.snapshot().ready')
 await p.until('sillRace.snapshot().elapsed>2')
 await p.screenshot('desktop-zh')
 results['initial']=await p.ev('sillRace.snapshot()');results['initialErrors']=await p.errors();print('READY',results['initialErrors'],flush=True)
 assert not results['initialErrors']
 assert results['initial']['canvasPixels']<=1602000
 # Continuous scene/receipt cycle; take stable measurements after all models enter the frustum.
 samples=[];start=time.monotonic()
 while time.monotonic()-start<210:
  s=await p.ev('sillRace.snapshot()')
  if s['elapsed']>=60 and not samples:
   await p.call('HeapProfiler.collectGarbage');samples.append({'snapshot':s,'heap':await p.call('Runtime.getHeapUsage'),'dom':await p.call('Memory.getDOMCounters')});print('FIRST CYCLE',s['elapsed'],s['resources'],flush=True)
  if s['elapsed']>=116:
   await p.call('HeapProfiler.collectGarbage');samples.append({'snapshot':s,'heap':await p.call('Runtime.getHeapUsage'),'dom':await p.call('Memory.getDOMCounters')});break
  await asyncio.sleep(.5)
 assert len(samples)==2
 a,b=samples;assert len(b['snapshot']['worldTour']['visited'])==10
 assert b['snapshot']['resources']['textures']<=3 and b['snapshot']['resources']['geometries']<=a['snapshot']['resources']['geometries']+3
 assert b['heap']['usedSize']<a['heap']['usedSize']+3*1024*1024
 assert b['dom']['documents']<=a['dom']['documents']+1 and b['dom']['nodes']<a['dom']['nodes']+150
 results['cycles']=samples;(OUT/'partial-results.json').write_text(json.dumps(results,indent=2));print('CYCLES PASS',flush=True)
 await p.ev('document.querySelector("#pause").click()');a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['elapsed']==b['elapsed'] and a['renderedFrames']==b['renderedFrames'];results['pause']=True
 await p.ev('document.querySelector("#pause").click();document.querySelector("#features").scrollIntoView({behavior:"instant"})')
 await p.until('sillRace.snapshot().visible===false');a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.5);b=await p.ev('sillRace.snapshot()');assert a['renderedFrames']==b['renderedFrames'];results['offscreen']=True
 await p.screenshot('features')
 await p.ev('window.scrollTo({top:0,behavior:"instant"})');await p.until('sillRace.snapshot().visible===true')
 await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.until('sillRace.snapshot().paused')
 a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.5);b=await p.ev('sillRace.snapshot()');assert a['renderedFrames']==b['renderedFrames']
 for kind in ['file','focus','translate','clipboard','note','apps']:
  await p.ev('document.querySelector(\'[data-pickup="'+kind+'"]\').click()');assert (await p.ev('sillRace.snapshot()'))['state']==kind
 results['reducedMotion']=True
 await p.ev('document.querySelector(\'[data-set-lang="en"]\').click()');await p.until('document.documentElement.dataset.lang==="en"');assert await p.ev('document.querySelector("#island-title").textContent==="App launcher"')
 await p.screenshot('desktop-en');results['language']=True
 # Real context loss/restoration through the extension.
 await p.ev('window.testGL=document.querySelector("#world").getContext("webgl2").getExtension("WEBGL_lose_context");testGL.loseContext()')
 await p.until('document.querySelector("#fallback").hidden===false');await p.ev('testGL.restoreContext()');await p.until('document.querySelector("#fallback").hidden===true');results['contextRecovery']=True
 results['errors']=await p.errors();assert not results['errors']
 await p.close()
 # Localized paths and narrow viewport; no prototype-relative URLs.
 for lang,width,height in [('zh',390,844),('en',320,640)]:
  p=await Page().open(width,height);await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.call('Page.navigate',{'url':BASE+'/'+lang+'/'})
  await p.until('window.sillRace?.snapshot().ready');await p.ev('document.querySelector(\'[data-pickup="translate"]\').click()')
  assert await p.ev('document.documentElement.scrollWidth===innerWidth');assert not await p.errors()
  await p.screenshot('mobile-'+lang)
  await p.ev('document.querySelector(".mobile-menu").open=true');await p.screenshot('menu-'+lang)
  await p.ev('document.querySelector(".mobile-menu a[href=\\"#faq\\"]").click()');assert await p.ev('!document.querySelector(".mobile-menu").open')
  before=await p.ev('document.querySelector(".faq-item").open');await p.ev('document.querySelector(".faq-question").click()');assert (await p.ev('document.querySelector(".faq-item").open'))!=before
  results['mobile-'+lang]=True;(OUT/'partial-results.json').write_text(json.dumps(results,indent=2));await p.close()
 # A slow, cold connection: content is readable before Three.js has arrived.
 p=await Page().open();await p.call('Network.setCacheDisabled',{'cacheDisabled':True});await p.call('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':90000})
 await p.call('Page.addScriptToEvaluateOnNewDocument',{'source':"window.longTasks=[];new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});"})
 await p.call('Page.navigate',{'url':BASE+'/en/'})
 await p.until('document.querySelector("#headline")?.textContent.includes("Everyday")');await p.screenshot('slow-first-content')
 results['slowFirstContent']=await p.ev('({time:performance.now(),ready:!!window.sillRace?.snapshot().ready,paints:performance.getEntriesByType("paint").map(p=>({name:p.name,time:p.startTime}))})')
 await p.until('window.sillRace?.snapshot().ready',45)
 results['slowReady']=await p.ev('({time:performance.now(),longTasks,resources:performance.getEntriesByType("resource").map(r=>({name:r.name,bytes:r.encodedBodySize,duration:r.duration}))})')
 assert not await p.errors();await p.close();print('SLOW PASS',results['slowFirstContent']['time'],results['slowReady']['time'],flush=True)
 # Disabling JS leaves real HTML content, navigation and native details.
 p=await Page().open();await p.call('Emulation.setScriptExecutionDisabled',{'value':True});await p.call('Page.navigate',{'url':BASE+'/en/'})
 await asyncio.sleep(1);await p.screenshot('no-javascript');await p.call('Emulation.setScriptExecutionDisabled',{'value':False})
 assert await p.ev('document.querySelector("#headline").textContent.includes("Everyday") && !!document.querySelector(".site-nav a[href=\\"#features\\"]")')
 results['noJS']=True;await p.close()
 results['pass']=True;(OUT/'results.json').write_text(json.dumps(results,indent=2,ensure_ascii=False)+'\n');print('ALL PASS',flush=True)
if __name__=='__main__':asyncio.run(main())
