"""Optional NERYX backend: forward requests to a LOCAL llama.cpp llama-server.

This is NOT a managed cloud server. Run on your own computer/server.
Security: listen on loopback by default, restrict CORS to the configured website,
never expose an unauthenticated inference API directly to the public Internet.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

HOST = os.environ.get('NERYX_HOST', '127.0.0.1')
PORT = int(os.environ.get('NERYX_PORT', '8787'))
UPSTREAM = os.environ.get('NERYX_LLAMA_URL', 'http://127.0.0.1:8080').rstrip('/')
ALLOWED_ORIGIN = os.environ.get('NERYX_ALLOWED_ORIGIN', 'http://localhost:8000')
MAX_BODY = 50000

class Handler(BaseHTTPRequestHandler):
    def _response(self, status, content):
        body = json.dumps(content, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        origin = self.headers.get('Origin', '')
        if origin == ALLOWED_ORIGIN:
            self.send_header('Access-Control-Allow-Origin', origin)
            self.send_header('Vary', 'Origin')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def _origin_ok(self):
        return self.headers.get('Origin', '') in ('', ALLOWED_ORIGIN)

    def do_OPTIONS(self):
        if not self._origin_ok():
            return self._response(403, {'error': 'Origin nicht erlaubt'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', ALLOWED_ORIGIN)
        self.send_header('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        if not self._origin_ok(): return self._response(403, {'error': 'Origin nicht erlaubt'})
        if self.path != '/health': return self._response(404, {'error': 'Nicht gefunden'})
        return self._response(200, {'ok': True, 'name': 'NERYX Server', 'type':'llama.cpp proxy'})

    def do_POST(self):
        if not self._origin_ok(): return self._response(403, {'error': 'Origin nicht erlaubt'})
        if self.path != '/v1/chat/completions': return self._response(404, {'error': 'Nicht gefunden'})
        try:
            n = int(self.headers.get('Content-Length', '0'))
            if n <= 0 or n > MAX_BODY: return self._response(413, {'error': 'Anfrage zu groß'})
            payload = json.loads(self.rfile.read(n))
            messages = payload.get('messages')
            if not isinstance(messages, list) or not 1 <= len(messages) <= 30:
                return self._response(400, {'error': 'Ungültiger Chatverlauf'})
            for msg in messages:
                if (not isinstance(msg, dict) or msg.get('role') not in ('system','user','assistant')
                        or not isinstance(msg.get('content'), str) or len(msg['content']) > 8000):
                    return self._response(400, {'error': 'Ungültige Nachricht'})
            outgoing = {'messages': messages, 'stream': False,
                        'temperature': max(0,min(1.5,float(payload.get('temperature', 0.65)))),
                        'max_tokens': max(1,min(512,int(payload.get('max_tokens', 380))))}
            req = Request(UPSTREAM + '/v1/chat/completions',
                          data=json.dumps(outgoing).encode('utf-8'),
                          headers={'Content-Type':'application/json'}, method='POST')
            with urlopen(req, timeout=120) as res:
                result = json.loads(res.read(2000000))
            return self._response(200, result)
        except (ValueError, TypeError, json.JSONDecodeError):
            return self._response(400, {'error': 'Ungültige Anfrage'})
        except (URLError, TimeoutError, HTTPError) as e:
            return self._response(502, {'error': 'llama.cpp nicht erreichbar', 'detail': str(e)[:160]})

if __name__ == '__main__':
    print(f'NERYX Server: http://{HOST}:{PORT} | erlaubter Browser-Origin: {ALLOWED_ORIGIN}')
    ThreadingHTTPServer((HOST,PORT), Handler).serve_forever()
