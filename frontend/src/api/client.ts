import axios from 'axios'
import { validateString, validateNumber, type ValidationResult } from '../utils/validation'

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

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

/**
 * Validates simulation configuration before sending to API
 */
function validateSimulationConfig(config: unknown): ValidationResult<SimulationConfig> {
  if (!config || typeof config !== 'object') {
    return { success: false, error: 'Configuration must be an object' }
  }

  const c = config as Record<string, unknown>

  // Validate mode
  if (!c.mode || !['desktop', 'supercomputing'].includes(c.mode as string)) {
    return { success: false, error: 'Mode must be "desktop" or "supercomputing"' }
  }

  // Validate dimensions
  const dimensionsResult = validateNumber(c.n_dimensions, { min: 1, max: 10000, integer: true })
  if (!dimensionsResult.success) {
    return { success: false, error: `Invalid dimensions: ${dimensionsResult.error}` }
  }

  // Validate simulation type
  if (!c.simulation_type || !['DESI', 'Bell', 'AI', 'Tree'].includes(c.simulation_type as string)) {
    return { success: false, error: 'Simulation type must be one of: DESI, Bell, AI, Tree' }
  }

  return {
    success: true,
    data: {
      mode: c.mode as 'desktop' | 'supercomputing',
      n_dimensions: dimensionsResult.data,
      simulation_type: c.simulation_type as 'DESI' | 'Bell' | 'AI' | 'Tree',
      parameters: (c.parameters as SimulationParameters) || {}
    }
  }
}

export const apiService = {
  // Health check
  async health(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get<{ status: string; timestamp: string }>('/api/health')
    return response.data
  },

  // Run simulation with validation
  async runSimulation(config: unknown): Promise<ValidationResult<SimulationResult>> {
    // Validate configuration
    const configValidation = validateSimulationConfig(config)
    if (!configValidation.success) {
      return configValidation
    }

    try {
      const response = await api.post<SimulationResult>('/api/simulate', configValidation.data)
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Simulation failed'
      }
    }
  },

  // Get operator visualization with validation
  async getOperatorVisualization(
    operatorType: unknown = 'harmonic',
    nDims: unknown = 100
  ): Promise<ValidationResult<OperatorVisualization>> {
    // Validate operator type
    const typeValidation = validateString(operatorType, {
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/
    })
    if (!typeValidation.success) {
      return { success: false, error: `Invalid operator type: ${typeValidation.error}` }
    }

    // Validate dimensions
    const dimsValidation = validateNumber(nDims, { min: 1, max: 1000, integer: true })
    if (!dimsValidation.success) {
      return { success: false, error: `Invalid dimensions: ${dimsValidation.error}` }
    }

    try {
      const response = await api.get<OperatorVisualization>('/api/operator/visualization', {
        params: {
          operator_type: typeValidation.data,
          n_dims: dimsValidation.data,
        },
      })
      return { success: true, data: response.data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Visualization request failed'
      }
    }
  },
}