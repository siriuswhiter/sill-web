import asyncio,json
from cdp import Page,BASE,OUT
async def main():
 p=await Page().open(390,844);await p.call('Emulation.setEmulatedMedia',{'features':[{'name':'prefers-reduced-motion','value':'no-preference'}]});await p.call('Page.navigate',{'url':BASE+'/zh/'});await p.until('window.sillRace?.snapshot().ready');a=await p.ev('sillRace.snapshot()')
 await p.until('sillRace.snapshot().elapsed>3');b=await p.ev('sillRace.snapshot()');assert not b['paused'] and a['racers']!=b['racers'] and b['targetFPS']==30
 await p.screenshot('mobile-moving');assert not await p.errors();(OUT/'mobile-motion.json').write_text(json.dumps({'pass':True,'before':a,'after':b},indent=2));await p.close();print('MOBILE MOTION PASS')
asyncio.run(main())
