import asyncio,json,urllib.request,base64,time
from pathlib import Path
import websockets
OUT=Path(__file__).resolve().parent;OUT.mkdir(exist_ok=True)
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
