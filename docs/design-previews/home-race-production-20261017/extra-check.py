import asyncio,json,time,urllib.request
from check import Page,OUT,BASE
async def main():
 results={};p=await Page().open(390,844)
 # No GPU support must leave the Island buttons and document usable.
 await p.call('Page.addScriptToEvaluateOnNewDocument',{'source':"const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)};"})
 await p.call('Page.navigate',{'url':BASE+'/en/'})
 await p.until('window.sillRace && !document.querySelector("#fallback").hidden')
 await p.ev('document.querySelector(\'[data-pickup="note"]\').click()');assert await p.ev('sillRace.snapshot().state==="note" && document.querySelector("#note-draft").textContent.length>10')
 await p.screenshot('no-webgl');assert not await p.errors();results['noWebGL']=True;await p.close()
 # A failed background is fetched once during a destination, not every animation frame.
 p=await Page().open();await p.call('Network.setBlockedURLs',{'urls':['*fuji-dawn.webp*']});await p.call('Page.navigate',{'url':BASE+'/en/'})
 await p.until('window.sillRace?.snapshot().elapsed>9')
 requests=[e for e in p.events if e.get('method')=='Network.requestWillBeSent' and 'fuji-dawn.webp' in e['params']['request']['url']]
 assert len(requests)==1,len(requests);results['failedBackgroundRequests']=len(requests)
 # Real tab visibility, using an empty sibling tab in this isolated browser.
 sibling=await Page().open();await sibling.call('Page.bringToFront');await p.until('document.hidden')
 a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.6);b=await p.ev('sillRace.snapshot()');assert a['renderedFrames']==b['renderedFrames'];results['backgroundTab']=True
 await p.call('Page.bringToFront');await p.until('!document.hidden');await asyncio.sleep(.2);assert (await p.ev('sillRace.snapshot()'))['elapsed']-b['elapsed']<1;await sibling.close()
 # Exercise the browser lifecycle event that owns bfcache suspension and final cleanup.
 await p.ev('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:true}))');a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.3);assert (await p.ev('sillRace.snapshot()'))['renderedFrames']==a['renderedFrames']
 await p.ev('window.dispatchEvent(new PageTransitionEvent("pageshow",{persisted:true}))');await asyncio.sleep(.2);assert (await p.ev('sillRace.snapshot()'))['elapsed']>a['elapsed'];results['bfcacheEventContract']=True
 await p.ev('window.dispatchEvent(new PageTransitionEvent("pagehide",{persisted:false}))');s=await p.ev('sillRace.snapshot()');assert s['disposed'] and s['resources'] is None and s['worldTour']['backgroundCache']==0 and s['worldTour']['items']['templates']==0;results['exitCleanup']=s
 await p.close();results['pass']=True;(OUT/'extra-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('EXTRA PASS',flush=True)
if __name__=='__main__':asyncio.run(main())
