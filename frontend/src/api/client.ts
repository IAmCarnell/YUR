import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Define safe parameter types instead of using 'any'
export interface SimulationParameters {
  temperature?: number
  iterations?: number
  seed?: number
  algorithm?: string
  [key: string]: string | number | boolean | undefined
}

export interface SimulationConfig {
  mode: 'desktop' | 'supercomputing'
  n_dimensions: number
  simulation_type: 'DESI' | 'Bell' | 'AI' | 'Tree'
  parameters: SimulationParameters
}

// Define safe metadata types instead of using 'any'
export interface SimulationMetadata {
  computation_time?: number
  convergence?: boolean
  error_rate?: number
  algorithm_version?: string
  [key: string]: string | number | boolean | undefined
}

export interface SimulationResult {
  eigenvalues: number[]
  eigenvectors: number[][]
  node_links: Array<{
    source: number
    target: number
    strength: number
  }>
  metadata: SimulationMetadata
}

export interface OperatorVisualization {
  image: string
  eigenvalues: number[]
  matrix_shape: [number, number]
}

export const apiService = {
  // Health check
  async health(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get<{ status: string; timestamp: string }>('/api/health')
    return response.data
  },

  // Run simulation
  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    const response = await api.post<SimulationResult>('/api/simulate', config)
    return response.data
  },

  // Get operator visualization
  async getOperatorVisualization(
    operatorType: string = 'harmonic',
    nDims: number = 100
  ): Promise<OperatorVisualization> {
    const response = await api.get<OperatorVisualization>('/api/operator/visualization', {
      params: {
        operator_type: operatorType,
        n_dims: nDims,
      },
    })
    return response.data
  },
}