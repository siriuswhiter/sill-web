import asyncio,json
from check import Page,OUT
async def main():
 p=await Page().open();await p.call('Network.setCacheDisabled',{'cacheDisabled':True});await p.call('Network.emulateNetworkConditions',{'offline':False,'latency':150,'downloadThroughput':200000,'uploadThroughput':90000})
 await p.call('Page.addScriptToEvaluateOnNewDocument',{'source':"window.longTasks=[];new PerformanceObserver(l=>longTasks.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});"})
 await p.call('Page.navigate',{'url':'http://127.0.0.1:8001/en/'})
 await p.until('window.sillRace?.snapshot().ready',45)
 result=await p.ev('({time:performance.now(),longTasks,paints:performance.getEntriesByType("paint").map(p=>({name:p.name,time:p.startTime})),resources:performance.getEntriesByType("resource").map(r=>({name:r.name,bytes:r.encodedBodySize,decoded:r.decodedBodySize}))})')
 assert not await p.errors();result['compressionVerified']=any(r['bytes']<r['decoded']/2 for r in result['resources'] if 'three.module' in r['name']);assert result['compressionVerified'];await p.close()
 p=await Page().open(320,640);await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.call('Page.navigate',{'url':'http://127.0.0.1:8000/en/'})
 await p.until('window.sillRace?.snapshot().ready');await p.ev('document.querySelector(\'[data-pickup="translate"]\').click()');await p.screenshot('mobile-en-final');assert await p.ev('document.documentElement.scrollWidth===innerWidth');await p.close()
 (OUT/'compressed-performance.json').write_text(json.dumps(result,indent=2)+'\n');print('GZIP PASS',result['time'],result['paints'],sum(r['bytes'] for r in result['resources']),flush=True)
asyncio.run(main())
