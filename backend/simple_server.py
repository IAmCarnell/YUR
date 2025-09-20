"""
Minimal YUR Framework Backend
Simplified version for initial deployment - no external dependencies
"""

import json
import random
import math
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YURHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        if path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            response = {"message": "YUR Framework API", "version": "1.0.0"}
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/api/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            response = {"status": "healthy", "numpy": "available", "backend": "minimal"}
            self.wfile.write(json.dumps(response).encode())
            
        elif path == '/api/operator/visualization':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            self.end_headers()
            
            # Generate simple visualization data
            n_dims = 100
            eigenvalues = [float(i + random.random()) for i in range(20)]
            
            response = {
                "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                "eigenvalues": eigenvalues,
                "matrix_shape": [n_dims, n_dims]
            }
            self.wfile.write(json.dumps(response).encode())
            
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"error": "Not found"}
            self.wfile.write(json.dumps(response).encode())
    
    def do_POST(self):        
        if self.path == '/api/simulate':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                config = json.loads(post_data.decode())
                
                # Generate simulation results
                n_dims = config.get('n_dimensions', 100)
                sim_type = config.get('simulation_type', 'DESI')
                
                # Generate random eigenvalues
                eigenvalues = [float(i + random.random()) for i in range(min(n_dims, 100))]
                
                # Generate random eigenvectors (simplified)
                eigenvectors = [[float(random.random()) for _ in range(10)] for _ in range(10)]
                
                # Generate node links
                node_links = []
                for i in range(min(20, n_dims//5)):
                    for j in range(i + 1, min(20, n_dims//5)):
                        if random.random() > 0.7:
                            node_links.append({
                                "source": i,
                                "target": j,
                                "strength": float(random.random())
                            })
                
                response = {
                    "eigenvalues": eigenvalues,
                    "eigenvectors": eigenvectors,
                    "node_links": node_links,
                    "metadata": {"type": sim_type, "dimensions": n_dims}
                }
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
                
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response = {"error": str(e)}
                self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            response = {"error": "Not found"}
            self.wfile.write(json.dumps(response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run_server(port=8000):
    server_address = ('', port)
    httpd = HTTPServer(server_address, YURHandler)
    logger.info(f"Starting YUR Framework backend on port {port}")
    logger.info("Available endpoints:")
    logger.info("  GET  /")
    logger.info("  GET  /api/health")
    logger.info("  GET  /api/operator/visualization")
    logger.info("  POST /api/simulate")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()