from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import gzip,io
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory='/Users/bytedance/fun/sill-web',**kwargs)
 def send_head(self):
  path=Path(self.translate_path(self.path))
  if path.is_dir():path=path/'index.html'
  if path.exists() and path.suffix in ['.html','.js','.css','.json','.svg'] and 'gzip' in self.headers.get('Accept-Encoding',''):
   data=gzip.compress(path.read_bytes());self.send_response(200);self.send_header('Content-Type',self.guess_type(str(path)));self.send_header('Content-Encoding','gzip');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.send_header('Vary','Accept-Encoding');self.end_headers();return io.BytesIO(data)
  return super().send_head()
 def log_message(self,*args):pass
ThreadingHTTPServer(('127.0.0.1',8001),Handler).serve_forever()
