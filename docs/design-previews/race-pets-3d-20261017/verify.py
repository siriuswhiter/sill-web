import asyncio,json,time
from cdp import Page,OUT,BASE
async def main():
 result={};p=await Page().open();await p.call('Page.navigate',{'url':BASE+'/?lang=zh'})
 await p.until('window.sillRace?.snapshot().ready');await p.until('sillRace.snapshot().elapsed>.5')
 await p.screenshot('race-desktop');s=await p.ev('sillRace.snapshot()');result['initial']=s
 assert s['pets']['characters']==2 and s['pets']['textures']==0 and all(r['model']=='3d' for r in s['racers'])
 assert s['pets']['triangles']<40000 and s['canvasPixels']<=1602000
 samples=[];cycles=[];captures=[8,23,44];start=time.monotonic()
 while time.monotonic()-start<240:
  s=await p.ev('sillRace.snapshot()');samples.append(s)
  if captures and s['elapsed']>=captures[0]:await p.screenshot('race-turn-'+str(captures.pop(0)))
  if (s['elapsed']>=60 and not cycles) or (s['elapsed']>=116 and len(cycles)==1):
   await p.call('HeapProfiler.collectGarbage');cycles.append({'snapshot':s,'heap':await p.call('Runtime.getHeapUsage'),'dom':await p.call('Memory.getDOMCounters')});print('CYCLE',s['elapsed'],s['resources'],s['delivered'],flush=True)
  if len(cycles)==2:break
  await asyncio.sleep(.35)
 assert len(cycles)==2
 a,b=cycles
 assert b['snapshot']['delivered']>=18 and len(b['snapshot']['worldTour']['visited'])==10
 assert b['snapshot']['resources']['textures']==1
 assert b['snapshot']['resources']['geometries']<=a['snapshot']['resources']['geometries']+3
 assert b['heap']['usedSize']<a['heap']['usedSize']+2*1024*1024
 assert b['dom']['nodes']<a['dom']['nodes']+100 and b['dom']['jsEventListeners']<=a['dom']['jsEventListeners']
 result['movement']=[]
 for i in range(2):
  ranges={key:[min(s['racers'][i][key] for s in samples),max(s['racers'][i][key] for s in samples)] for key in ['lane','heading']}
  assert ranges['lane'][1]-ranges['lane'][0]>1 and ranges['heading'][1]-ranges['heading'][0]>.2
  for key in ['gazeYaw','gazePitch']:
   values=[s['racers'][i]['pose'][key] for s in samples];ranges[key]=[min(values),max(values)];assert max(values)-min(values)>.03
  assert len({tuple(s['racers'][i]['pose']['feet']) for s in samples})>10
  result['movement'].append(ranges)
 result['cycles']=cycles;(OUT/'partial-results.json').write_text(json.dumps(result,indent=2));(OUT/'samples.json').write_text(json.dumps(samples,indent=2))
 # A real manual placement must be reached by the moving 3D racer.
 before=await p.ev('sillRace.snapshot().delivered');await p.ev('document.querySelector(\'[data-pickup="translate"]\').click()')
 await p.until('sillRace.snapshot().events.some(e=>e.source==="manual-collision" && e.type==="translate")',20)
 assert await p.ev(f'sillRace.snapshot().delivered>{before}');result['manualCollision']=True;await p.screenshot('manual-delivery')
 # All pet poses and the single render clock stop together.
 await p.ev('document.querySelector("#pause").click()');a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['racers']==b['racers'] and a['renderedFrames']==b['renderedFrames'];result['pause']=True
 await p.ev('document.querySelector("#pause").click();document.querySelector("#features").scrollIntoView({behavior:"instant"})');await p.until('!sillRace.snapshot().visible')
 a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['racers']==b['racers'] and a['renderedFrames']==b['renderedFrames'];result['offscreen']=True
 await p.ev('scrollTo({top:0,behavior:"instant"})');await p.until('sillRace.snapshot().visible')
 sibling=await Page().open();await sibling.call('Page.bringToFront');await p.until('document.hidden');a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['racers']==b['racers'] and a['renderedFrames']==b['renderedFrames'];result['backgroundTab']=True
 await p.call('Page.bringToFront');await p.until('!document.hidden');await sibling.close()
 await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.until('sillRace.snapshot().paused')
 a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['racers']==b['racers'] and a['renderedFrames']==b['renderedFrames']
 for kind in ['file','focus','translate','clipboard','note','apps']:
  await p.ev('document.querySelector(\'[data-pickup="'+kind+'"]\').click()');assert (await p.ev('sillRace.snapshot()'))['state']==kind
 result['reducedMotion']=True;(OUT/'partial-results.json').write_text(json.dumps(result,indent=2))
 await p.ev('document.querySelector(\'[data-set-lang="en"]\').click()');await p.until('document.documentElement.dataset.lang==="en" && window.sillRace?.snapshot().ready');assert await p.ev('document.querySelector("#island-title").textContent==="App launcher"');result['language']=True
 await p.ev('window.testGL=document.querySelector("#world").getContext("webgl2").getExtension("WEBGL_lose_context");testGL.loseContext()');await p.until('document.querySelector("#fallback").hidden===false')
 await p.ev('testGL.restoreContext()');await p.until('document.querySelector("#fallback").hidden===true');result['contextRecovery']=True
 requests=await p.ev('performance.getEntriesByType("resource").map(r=>r.name)');assert not any('walk.webp' in r or 'racers.json' in r for r in requests);result['noRacingAtlases']=True
 result['errors']=await p.errors();assert not result['errors']
 await p.ev('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');s=await p.ev('sillRace.snapshot()');assert s['disposed'] and s['resources'] is None and s['pets']['characters']==0 and s['pets']['geometries']==0;result['exitCleanup']=s
 await p.close();(OUT/'partial-results.json').write_text(json.dumps(result,indent=2));print('DESKTOP PASS',flush=True)
 for lang,width,height in [('zh',390,844),('en',320,640)]:
  p=await Page().open(width,height);await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.call('Page.navigate',{'url':BASE+'/'+lang+'/'})
  await p.until('window.sillRace?.snapshot().ready');await p.screenshot('mobile-'+lang)
  assert await p.ev('document.documentElement.scrollWidth===innerWidth');assert not await p.errors()
  assert await p.ev('sillRace.snapshot().targetFPS===30');await p.ev('document.querySelector(\'[data-pickup="translate"]\').click()');await p.screenshot('mobile-island-'+lang)
  await p.ev('document.querySelector("#camera").click()');await p.screenshot('mobile-overview-'+lang)
  result['mobile-'+lang]=True;await p.close()
 p=await Page().open(390,844)
 await p.call('Page.addScriptToEvaluateOnNewDocument',{'source':"const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)};"})
 await p.call('Page.navigate',{'url':BASE+'/en/'});await p.until('window.sillRace && !document.querySelector("#fallback").hidden')
 await p.ev('document.querySelector(\'[data-pickup="note"]\').click()');assert await p.ev('sillRace.snapshot().state==="note"');assert not await p.errors();await p.screenshot('no-webgl');result['noWebGL']=True;await p.close()
 result['pass']=True;(OUT/'results.json').write_text(json.dumps(result,indent=2)+'\n');print('ALL PASS',flush=True)
asyncio.run(main())
