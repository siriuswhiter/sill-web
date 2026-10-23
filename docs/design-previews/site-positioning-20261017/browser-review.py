import asyncio,json
from cdp import Page,BASE,OUT
async def main():
 result={};p=await Page().open();await p.call('Page.navigate',{'url':BASE+'/zh/'})
 await p.until('window.sillRace?.snapshot().ready');await p.until('sillRace.snapshot().elapsed>2')
 assert await p.ev('sillRace.snapshot().pets.characters===2 && !sillRace.snapshot().paused')
 result['race']=await p.ev('sillRace.snapshot()');await p.screenshot('home-race')
 nav=await p.ev('({height:document.querySelector(".site-nav").getBoundingClientRect().height,links:[...document.querySelectorAll(".site-nav a")].map(a=>a.getAttribute("href"))})');assert nav['height']==30 and not any('pobb' in x for x in nav['links']);result['nav']=nav
 for section in ['features','scenes','pricing','faq']:
  await p.ev(f'document.getElementById("{section}").scrollIntoView({{behavior:"instant"}})');await p.until('!sillRace.snapshot().visible');await p.screenshot('home-'+section)
 a=await p.ev('sillRace.snapshot()');await asyncio.sleep(.4);b=await p.ev('sillRace.snapshot()');assert a['renderedFrames']==b['renderedFrames'];result['offscreen']=True
 await p.ev('document.querySelector(".faq-question").click()');assert await p.ev('document.querySelector(".faq-item").open');assert not await p.errors();await p.close()
 result['pages']=[]
 for lang,width,height in [('zh',1440,1000),('en',1440,1000),('zh',390,844),('en',320,700)]:
  for name in ['components','support','privacy','terms']:
   p=await Page().open(width,height);await p.call('Page.navigate',{'url':BASE+'/'+lang+'/'+name+'.html'});await p.until('document.readyState==="complete"')
   assert await p.ev('document.documentElement.scrollWidth===innerWidth'),(lang,width,name)
   assert await p.ev('document.querySelector(".site-nav").getBoundingClientRect().height==='+str(30 if width>760 else 48))
   resources=await p.ev('performance.getEntriesByType("resource").map(r=>r.name)');assert not any('home-race' in r or 'three.module' in r or 'pobb-motion' in r or 'pet-hd' in r for r in resources)
   assert not await p.errors(),await p.errors()
   if name=='components':
    assert await p.ev('document.querySelectorAll(".capability-row").length===10')
    await p.screenshot(f'{name}-{lang}-{width}')
    await p.ev('document.querySelector(".catalog-jump a[href=\\"#companions\\"]").click()');await p.ev('document.getElementById("companions").scrollIntoView({behavior:"instant"})');await p.ev('Promise.all([...document.querySelectorAll("#companions img")].map(img=>img.decode()))');await p.ev('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');await p.screenshot(f'companions-{lang}-{width}')
   elif width==390 or lang=='en' and width==1440:await p.screenshot(f'{name}-{lang}-{width}')
   if name=='support' and width<760:
    await p.ev('document.querySelector(".mobile-menu").open=true');await p.screenshot(f'menu-{lang}-{width}');await p.call('Input.dispatchKeyEvent',{'type':'keyDown','key':'Escape','code':'Escape'});assert await p.ev('!document.querySelector(".mobile-menu").open && document.activeElement===document.querySelector(".mobile-menu summary")')
   result['pages'].append({'name':name,'lang':lang,'width':width,'resources':len(resources),'pass':True});await p.close();print('PAGE PASS',lang,width,name,flush=True)
 # Original-language files are indexable static pages and switch to the correct sibling.
 p=await Page().open();await p.call('Page.navigate',{'url':BASE+'/zh/components.html'});await p.until('document.readyState==="complete"')
 await p.ev('document.querySelector("[data-set-lang=en]").click()');await p.until('location.pathname==="/en/components.html" && document.readyState==="complete"');assert await p.ev('document.documentElement.lang==="en"');result['languageRoute']=True;await p.close()
 # Static HTML fallback for six retired links, even without host redirect rules.
 for lang in ['', 'en/', 'zh/']:
  for old in ['pobb.html','pobb-sheet.html']:
   p=await Page().open();await p.call('Page.navigate',{'url':BASE+'/'+lang+old});await p.until('location.pathname.endsWith("components.html") && location.hash==="#companions" && document.readyState==="complete"');assert not await p.errors();await p.close()
 result['retiredFallbacks']=6
 # Non-race pages remain readable with JavaScript disabled.
 p=await Page().open(390,844);await p.call('Emulation.setScriptExecutionDisabled',{'value':True});await p.call('Page.navigate',{'url':BASE+'/zh/components.html'});await asyncio.sleep(.5);await p.screenshot('catalog-no-js');await p.call('Emulation.setScriptExecutionDisabled',{'value':False});assert await p.ev('document.querySelectorAll(".capability-row").length===10 && document.documentElement.scrollWidth===innerWidth');result['noJS']=True;await p.close()
 # Lower homepage still fits at narrow widths, with a working shared mobile menu.
 for lang,width in [('zh',390),('en',320)]:
  p=await Page().open(width,844);await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'reduce'}]});await p.call('Page.navigate',{'url':BASE+'/'+lang+'/'});await p.until('window.sillRace?.snapshot().ready')
  for section in ['features','scenes','pricing','faq']:
   await p.ev(f'document.getElementById("{section}").scrollIntoView({{behavior:"instant"}})');assert await p.ev('document.documentElement.scrollWidth===innerWidth');await p.screenshot(f'home-{section}-{lang}-{width}')
  assert not await p.errors();await p.close()
 result['pass']=True;(OUT/'results.json').write_text(json.dumps(result,indent=2)+'\n');print('SITE REVIEW PASS',len(result['pages']),'viewports / pages',flush=True)
asyncio.run(main())
