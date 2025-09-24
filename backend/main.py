from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import numpy as np
import scipy as sp
import matplotlib.pyplot as plt
import tensorflow as tf
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import io
import base64
from digital_twin import digital_twin, SystemMetrics, ProcessInfo, HardwareInfo, Agent

app = FastAPI(
    title="YUR Framework API",
    description="API for the Infinite-Dimensional Thing Framework",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulation models
class SimulationConfig(BaseModel):
    mode: str = "desktop"  # desktop or supercomputing
    n_dimensions: int = 100
    simulation_type: str = "DESI"  # DESI, Bell, AI, Tree
    parameters: Dict[str, Any] = {}

class SimulationResult(BaseModel):
    eigenvalues: List[float]
    eigenvectors: List[List[float]]
    node_links: List[Dict[str, Any]]
    metadata: Dict[str, Any]

# Core infinite-dimensional operator
class InfiniteDimensionalOperator:
    def __init__(self, n_dimensions: int = 100):
        self.n = n_dimensions
        self.operator_matrix = None
        self.eigenvalues = None
        self.eigenvectors = None
        
    def generate_operator(self, operator_type: str = "harmonic"):
        """Generate the infinite-dimensional operator matrix"""
        if operator_type == "harmonic":
            # Harmonic oscillator operator
            self.operator_matrix = np.diag(np.arange(1, self.n + 1))
        elif operator_type == "momentum":
            # Momentum operator (finite difference approximation)
            self.operator_matrix = np.zeros((self.n, self.n))
            for i in range(self.n - 1):
                self.operator_matrix[i, i + 1] = 1
                self.operator_matrix[i + 1, i] = -1
        elif operator_type == "position":
            # Position operator
            self.operator_matrix = np.diag(np.linspace(-10, 10, self.n))
        else:
            # Random Hermitian operator
            A = np.random.randn(self.n, self.n)
            self.operator_matrix = (A + A.T) / 2
            
        return self.operator_matrix
    
    def compute_eigenvalues(self):
        """Compute eigenvalues and eigenvectors"""
        if self.operator_matrix is None:
            self.generate_operator()
            
        self.eigenvalues, self.eigenvectors = np.linalg.eigh(self.operator_matrix)
        return self.eigenvalues, self.eigenvectors

# Simulation engines
class DESISimulation:
    """Dark Energy Spectroscopic Instrument simulation"""
    def __init__(self, config: SimulationConfig):
        self.config = config
        self.operator = InfiniteDimensionalOperator(config.n_dimensions)
        
    def run(self) -> SimulationResult:
        self.operator.generate_operator("position")
        eigenvals, eigenvecs = self.operator.compute_eigenvalues()
        
        # Generate node links for visualization
        node_links = []
        for i in range(min(20, len(eigenvals))):
            for j in range(i + 1, min(20, len(eigenvals))):
                strength = abs(np.dot(eigenvecs[:, i], eigenvecs[:, j]))
                if strength > 0.1:
                    node_links.append({
                        "source": i,
                        "target": j,
                        "strength": float(strength)
                    })
        
        return SimulationResult(
            eigenvalues=eigenvals.tolist(),
            eigenvectors=eigenvecs.tolist(),
            node_links=node_links,
            metadata={"type": "DESI", "dimensions": self.config.n_dimensions}
        )

class BellSimulation:
    """Bell test simulation for quantum entanglement"""
    def __init__(self, config: SimulationConfig):
        self.config = config
        
    def run(self) -> SimulationResult:
        # Simulate Bell state correlations
        n = self.config.n_dimensions
        angles = np.linspace(0, 2 * np.pi, n)
        
        # Bell correlation function
        correlations = -np.cos(2 * np.outer(angles, angles))
        eigenvals, eigenvecs = np.linalg.eigh(correlations)
        
        node_links = []
        for i in range(min(15, n)):
            for j in range(i + 1, min(15, n)):
                if abs(correlations[i, j]) > 0.5:
                    node_links.append({
                        "source": i,
                        "target": j,
                        "strength": float(abs(correlations[i, j]))
                    })
        
        return SimulationResult(
            eigenvalues=eigenvals.tolist(),
            eigenvectors=eigenvecs.tolist(),
            node_links=node_links,
            metadata={"type": "Bell", "violations": float(np.max(np.abs(correlations)))}
        )

# API endpoints
@app.get("/")
async def root():
    return {"message": "YUR Framework API", "version": "1.0.0"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "tensorflow": tf.__version__, "numpy": np.__version__}

@app.post("/api/simulate", response_model=SimulationResult)
async def run_simulation(config: SimulationConfig):
    """Run a simulation based on the configuration"""
    try:
        if config.simulation_type == "DESI":
            sim = DESISimulation(config)
        elif config.simulation_type == "Bell":
            sim = BellSimulation(config)
        elif config.simulation_type == "AI":
            # AI simulation using TensorFlow
            return await run_ai_simulation(config)
        elif config.simulation_type == "Tree":
            # Tree structure simulation
            return await run_tree_simulation(config)
        else:
            raise HTTPException(status_code=400, detail="Unknown simulation type")
            
        result = sim.run()
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def run_ai_simulation(config: SimulationConfig) -> SimulationResult:
    """AI-based simulation using TensorFlow"""
    n = config.n_dimensions
    
    # Create a simple neural network to simulate AI behavior
    model = tf.keras.Sequential([
        tf.keras.layers.Dense(n, activation='relu', input_shape=(n,)),
        tf.keras.layers.Dense(n, activation='linear')
    ])
    
    # Random input data
    X = np.random.randn(100, n)
    
    # Train briefly to get meaningful weights
    model.compile(optimizer='adam', loss='mse')
    model.fit(X, X, epochs=10, verbose=0)
    
    # Extract weights as operator
    weights = model.layers[0].get_weights()[0]  # n x n matrix
    eigenvals, eigenvecs = np.linalg.eigh(weights @ weights.T)
    
    node_links = []
    for i in range(min(10, n)):
        for j in range(i + 1, min(10, n)):
            if abs(weights[i, j]) > 0.5:
                node_links.append({
                    "source": i,
                    "target": j,
                    "strength": float(abs(weights[i, j]))
                })
    
    return SimulationResult(
        eigenvalues=eigenvals.tolist(),
        eigenvectors=eigenvecs.tolist(),
        node_links=node_links,
        metadata={"type": "AI", "network_params": model.count_params()}
    )

async def run_tree_simulation(config: SimulationConfig) -> SimulationResult:
    """Tree structure simulation using graph theory"""
    import networkx as nx
    
    n = config.n_dimensions
    
    # Create a random tree
    G = nx.random_tree(min(n, 50))
    adjacency = nx.adjacency_matrix(G).toarray()
    
    # Compute graph Laplacian eigenvalues
    laplacian = nx.laplacian_matrix(G).toarray()
    eigenvals, eigenvecs = np.linalg.eigh(laplacian.astype(float))
    
    # Convert graph to node links
    node_links = []
    for edge in G.edges():
        node_links.append({
            "source": int(edge[0]),
            "target": int(edge[1]),
            "strength": 1.0
        })
    
    # Pad with zeros if needed
    if len(eigenvals) < n:
        eigenvals = np.concatenate([eigenvals, np.zeros(n - len(eigenvals))])
        eigenvecs_padded = np.zeros((n, n))
        eigenvecs_padded[:len(eigenvecs), :len(eigenvecs)] = eigenvecs
        eigenvecs = eigenvecs_padded
    
    return SimulationResult(
        eigenvalues=eigenvals.tolist(),
        eigenvectors=eigenvecs.tolist(),
        node_links=node_links,
        metadata={"type": "Tree", "nodes": G.number_of_nodes(), "edges": G.number_of_edges()}
    )

@app.get("/api/operator/visualization")
async def get_operator_visualization(operator_type: str = "harmonic", n_dims: int = 100):
    """Generate visualization data for the infinite-dimensional operator"""
    operator = InfiniteDimensionalOperator(n_dims)
    matrix = operator.generate_operator(operator_type)
    eigenvals, eigenvecs = operator.compute_eigenvalues()
    
    # Create matplotlib plot and convert to base64
    plt.figure(figsize=(10, 8))
    plt.subplot(2, 2, 1)
    plt.imshow(matrix, cmap='viridis', aspect='auto')
    plt.title('Operator Matrix')
    plt.colorbar()
    
    plt.subplot(2, 2, 2)
    plt.plot(eigenvals, 'o-', markersize=3)
    plt.title('Eigenvalues')
    plt.xlabel('Index')
    plt.ylabel('Value')
    
    plt.subplot(2, 2, 3)
    plt.plot(eigenvecs[:, 0], label='1st eigenvector')
    plt.plot(eigenvecs[:, 1], label='2nd eigenvector')
    plt.title('First Two Eigenvectors')
    plt.legend()
    
    plt.subplot(2, 2, 4)
    plt.hist(eigenvals, bins=20, alpha=0.7)
    plt.title('Eigenvalue Distribution')
    plt.xlabel('Eigenvalue')
    plt.ylabel('Count')
    
    plt.tight_layout()
    
    # Convert to base64
    img_buffer = io.BytesIO()
    plt.savefig(img_buffer, format='png', dpi=150, bbox_inches='tight')
    img_buffer.seek(0)
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
    plt.close()
    
    return {
        "image": f"data:image/png;base64,{img_base64}",
        "eigenvalues": eigenvals.tolist()[:20],  # First 20 for display
        "matrix_shape": matrix.shape
    }

# Digital Twin API Endpoints

@app.get("/api/digital-twin/system/status")
async def get_system_status():
    """Get overall system health and status"""
    return await digital_twin.get_system_status()

@app.get("/api/digital-twin/system/metrics", response_model=SystemMetrics)
async def get_system_metrics():
    """Get real-time system metrics"""
    return await digital_twin.get_system_metrics()

@app.get("/api/digital-twin/system/processes")
async def get_system_processes(limit: int = 50):
    """Get running processes information"""
    processes = await digital_twin.get_processes(limit)
    return {"processes": processes, "count": len(processes)}

@app.get("/api/digital-twin/system/hardware", response_model=HardwareInfo)
async def get_hardware_info():
    """Get hardware information"""
    return await digital_twin.get_hardware_info()

@app.post("/api/digital-twin/commands/execute")
async def execute_command(request: dict):
    """Execute system command with security controls"""
    command = request.get("command")
    args = request.get("args", [])
    timeout = request.get("timeout", 30)
    
    if not command:
        raise HTTPException(status_code=400, detail="Command is required")
    
    return await digital_twin.execute_command(command, args, timeout)

@app.get("/api/digital-twin/commands/history")
async def get_command_history(limit: int = 50):
    """Get command execution history"""
    return {"history": digital_twin.get_command_history(limit)}

@app.get("/api/digital-twin/agents")
async def get_agents():
    """Get all digital twin agents"""
    agents = await digital_twin.get_agents()
    return {"agents": agents, "count": len(agents)}

@app.post("/api/digital-twin/agents/create")
async def create_agent(request: dict):
    """Create a new digital twin agent"""
    name = request.get("name")
    agent_type = request.get("agent_type")
    capabilities = request.get("capabilities", [])
    
    if not name or not agent_type:
        raise HTTPException(status_code=400, detail="Name and agent_type are required")
    
    agent = await digital_twin.create_agent(name, agent_type, capabilities)
    return {"agent": agent, "message": f"Agent '{name}' created successfully"}

@app.get("/api/digital-twin/agents/{agent_id}/status")
async def get_agent_status(agent_id: str):
    """Get specific agent status"""
    agent = await digital_twin.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    return {"agent": agent}

@app.post("/api/digital-twin/agents/{agent_id}/task")
async def assign_agent_task(agent_id: str, request: dict):
    """Assign task to an agent"""
    task = request.get("task")
    parameters = request.get("parameters", {})
    
    if not task:
        raise HTTPException(status_code=400, detail="Task is required")
    
    result = await digital_twin.assign_agent_task(agent_id, task, parameters)
    return {"result": result, "message": f"Task '{task}' assigned to agent {agent_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)