import http.server
import socketserver
import webbrowser
import os
import subprocess

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

try:
    # Check if the Node.js script exists and run it
    if os.path.exists('generate-index.js'):
        subprocess.run(['node', 'generate-index.js'], check=True)
    else:
        print("Warning: generate-index.js not found, skipping generation step")
    
    # Check if index.html exists
    if not os.path.exists(os.path.join(DIRECTORY, 'index.html')):
        print(f"Warning: index.html not found in {DIRECTORY}")
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        webbrowser.open(f"http://localhost:{PORT}/index.html")
        httpd.serve_forever()
except Exception as e:
    print(f"Error: {e}")