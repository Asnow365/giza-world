#!/usr/bin/env python3
"""
Giza World Server - static files + Anthropic API proxy
Usage: python server.py [port]
"""
import http.server
import json
import os
import ssl
import sys
import base64
import urllib.request
import urllib.error
from urllib.parse import unquote, parse_qs, urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
API_URL = "https://cloud.hongqiye.com/v1/messages"
ARCHIVE_ROOT = r"E:\2026\01-gazaproject\01\archive"

class GizaHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/api/test":
            self.send_json(200, {"ok": True, "api": API_URL})
        elif self.path == "/api/archive-list":
            self.serve_archive_list()
        elif self.path.startswith("/api/photo"):
            self.serve_photo_base64()
        elif self.path.startswith("/archive/"):
            self.serve_archive()
        else:
            super().do_GET()

    def serve_archive_list(self):
        """Return JSON array of all archive file paths."""
        files = []
        for root, dirs, filenames in os.walk(ARCHIVE_ROOT):
            for fn in filenames:
                full = os.path.join(root, fn)
                rel = os.path.relpath(full, ARCHIVE_ROOT).replace("\\", "/")
                ext = os.path.splitext(fn)[1].lower()
                if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
                    files.append({"path": rel, "name": fn, "ext": ext})
        self.send_json(200, {"files": files, "count": len(files)})

    def serve_photo_base64(self):
        """Return a single photo as base64 JSON: /api/photo?path=G%207070%20Files/....jpg"""
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        rel = params.get("path", [None])[0]
        if not rel:
            self.send_json(400, {"error": "Missing ?path= parameter"})
            return
        rel = unquote(rel)
        fpath = os.path.normpath(os.path.join(ARCHIVE_ROOT, rel))
        if not fpath.startswith(os.path.normpath(ARCHIVE_ROOT)):
            self.send_json(403, {"error": "Forbidden"})
            return
        if not os.path.isfile(fpath):
            self.send_json(404, {"error": "File not found"})
            return
        ext = os.path.splitext(fpath)[1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "gif": "image/gif", "webp": "image/webp"}
        try:
            with open(fpath, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("ascii")
            self.send_json(200, {
                "path": rel,
                "media_type": mime.get(ext, "image/jpeg"),
                "base64": b64
            })
        except Exception as e:
            self.send_json(500, {"error": str(e)})

    def serve_archive(self):
        rel = unquote(self.path[len("/archive/"):])
        fpath = os.path.normpath(os.path.join(ARCHIVE_ROOT, rel))
        # Security: ensure it's within ARCHIVE_ROOT
        if not fpath.startswith(os.path.normpath(ARCHIVE_ROOT)):
            self.send_error(403)
            return
        if not os.path.isfile(fpath):
            self.send_error(404)
            return
        ext = os.path.splitext(fpath)[1].lower()
        mime = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "pdf": "application/pdf"}
        self.send_response(200)
        self.send_header("Content-Type", mime.get(ext, "application/octet-stream"))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        with open(fpath, "rb") as f:
            self.wfile.write(f.read())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, anthropic-version")
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/chat":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)

            api_key = self.headers.get("x-api-key", "")
            if not api_key:
                self.send_json(400, {"error": "Missing x-api-key header"})
                return

            sys.stderr.write(f"[API] -> Anthropic ({len(body)} bytes)\n")
            sys.stderr.flush()

            req = urllib.request.Request(API_URL, data=body, method="POST")
            req.add_header("Content-Type", "application/json")
            req.add_header("x-api-key", api_key)
            req.add_header("anthropic-version", "2023-06-01")

            ctx = ssl.create_default_context()
            try:
                resp = urllib.request.urlopen(req, timeout=120, context=ctx)
                data = resp.read()
                sys.stderr.write(f"[API] <- {resp.status} ({len(data)} bytes)\n")
                sys.stderr.flush()
                self.send_response(resp.status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
            except urllib.error.HTTPError as e:
                err = e.read().decode()[:500]
                sys.stderr.write(f"[API] Error {e.code}: {err}\n")
                self.send_json(e.code, {"error": f"API error ({e.code}): {err}"})
            except Exception as e:
                sys.stderr.write(f"[API] Exception: {e}\n")
                self.send_json(500, {"error": str(e)})
        elif self.path == "/api/test":
            self.send_json(200, {"ok": True})
        else:
            self.send_json(404, {"error": "Not found"})

    def send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))

    def log_message(self, format, *args):
        pass  # suppress static file logs

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(("0.0.0.0", PORT), GizaHandler)
    print(f"Giza Server: http://localhost:{PORT}  |  API proxy: /api/chat")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
