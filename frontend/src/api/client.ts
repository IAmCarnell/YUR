import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export interface SimulationConfig {
  mode: 'desktop' | 'supercomputing'
  n_dimensions: number
  simulation_type: 'DESI' | 'Bell' | 'AI' | 'Tree'
  parameters: Record<string, any>
}

export interface SimulationResult {
  eigenvalues: number[]
  eigenvectors: number[][]
  node_links: Array<{
    source: number
    target: number
    strength: number
  }>
  metadata: Record<string, any>
}

export interface OperatorVisualization {
  image: string
  eigenvalues: number[]
  matrix_shape: [number, number]
}

export const apiService = {
  // Health check
  async health() {
    const response = await api.get('/api/health')
    return response.data
  },

  // Run simulation
  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    const response = await api.post('/api/simulate', config)
    return response.data
  },

  // Get operator visualization
  async getOperatorVisualization(
    operatorType: string = 'harmonic',
    nDims: number = 100
  ): Promise<OperatorVisualization> {
    const response = await api.get('/api/operator/visualization', {
      params: {
        operator_type: operatorType,
        n_dims: nDims,
      },
    })
    return response.data
  },
}