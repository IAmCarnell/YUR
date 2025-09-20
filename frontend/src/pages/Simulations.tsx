import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Divider,
} from '@mui/material'
import { ExpandMore, PlayArrow, Stop, Download } from '@mui/icons-material'
import { apiService, SimulationConfig, SimulationResult } from '../api/client'
import { NodeLinkVisualization } from '../components/NodeLinkVisualization'
import { EigenvalueChart } from '../components/EigenvalueChart'

export const Simulations: React.FC = () => {
  const [config, setConfig] = useState<SimulationConfig>({
    mode: 'desktop',
    n_dimensions: 100,
    simulation_type: 'DESI',
    parameters: {},
  })
  
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realTimeMode, setRealTimeMode] = useState(false)

  const runSimulation = async () => {
    try {
      setIsRunning(true)
      setError(null)
      const simulationResult = await apiService.runSimulation(config)
      setResult(simulationResult)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Simulation failed')
    } finally {
      setIsRunning(false)
    }
  }

  const exportResults = () => {
    if (!result) return
    
    const data = {
      config,
      result,
      timestamp: new Date().toISOString(),
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yur-simulation-${config.simulation_type}-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Real-time simulation updates
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (realTimeMode && !isRunning) {
      interval = setInterval(() => {
        runSimulation()
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [realTimeMode, isRunning, config])

  const simulationTypes = [
    { value: 'DESI', label: 'DESI (Dark Energy Survey)', color: '#2196f3' },
    { value: 'Bell', label: 'Bell Test Simulation', color: '#4caf50' },
    { value: 'AI', label: 'AI Neural Network', color: '#ff9800' },
    { value: 'Tree', label: 'Tree Structure', color: '#9c27b0' },
  ]

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        Interactive Simulations
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Configure and run simulations of the infinite-dimensional operator
      </Typography>

      <Grid container spacing={3}>
        {/* Control Panel */}
        <Grid item xs={12} lg={4}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Controls
              </Typography>
              
              {/* Simulation Type */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Simulation Type</InputLabel>
                <Select
                  value={config.simulation_type}
                  label="Simulation Type"
                  onChange={(e) => setConfig({ ...config, simulation_type: e.target.value as any })}
                >
                  {simulationTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: type.color,
                          }}
                        />
                        {type.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Compute Mode */}
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Compute Mode</InputLabel>
                <Select
                  value={config.mode}
                  label="Compute Mode"
                  onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                >
                  <MenuItem value="desktop">Desktop Mode</MenuItem>
                  <MenuItem value="supercomputing">Supercomputing Mode</MenuItem>
                </Select>
              </FormControl>

              {/* Dimensions */}
              <Typography gutterBottom>
                Dimensions: {config.n_dimensions}
              </Typography>
              <Slider
                value={config.n_dimensions}
                onChange={(_, value) => setConfig({ ...config, n_dimensions: value as number })}
                min={10}
                max={config.mode === 'desktop' ? 500 : 10000}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: config.mode === 'desktop' ? 500 : 10000, label: config.mode === 'desktop' ? '500' : '10K' },
                ]}
                sx={{ mb: 3 }}
              />

              {/* Real-time Mode */}
              <FormControlLabel
                control={
                  <Switch
                    checked={realTimeMode}
                    onChange={(e) => setRealTimeMode(e.target.checked)}
                  />
                }
                label="Real-time Updates"
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              {/* Advanced Parameters */}
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography>Advanced Parameters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary">
                    Additional parameters based on simulation type will appear here.
                    {config.simulation_type === 'AI' && ' Configure neural network architecture.'}
                    {config.simulation_type === 'Bell' && ' Set correlation angles and measurement bases.'}
                    {config.simulation_type === 'DESI' && ' Adjust dark energy parameters.'}
                    {config.simulation_type === 'Tree' && ' Configure graph topology.'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </CardContent>
            
            <CardActions sx={{ p: 2 }}>
              <Button
                variant="contained"
                fullWidth
                onClick={runSimulation}
                disabled={isRunning}
                startIcon={isRunning ? <CircularProgress size={20} /> : <PlayArrow />}
              >
                {isRunning ? 'Running...' : 'Run Simulation'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} lg={8}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <>
              {/* Metadata */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Simulation Results</Typography>
                    <Button
                      startIcon={<Download />}
                      onClick={exportResults}
                      variant="outlined"
                      size="small"
                    >
                      Export
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip label={`Type: ${result.metadata.type}`} color="primary" size="small" />
                    <Chip label={`Dimensions: ${config.n_dimensions}`} color="secondary" size="small" />
                    <Chip label={`Eigenvalues: ${result.eigenvalues.length}`} size="small" />
                    <Chip label={`Nodes: ${result.node_links.length}`} size="small" />
                    {result.metadata.network_params && (
                      <Chip label={`Params: ${result.metadata.network_params}`} color="info" size="small" />
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Visualizations */}
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Eigenvalue Spectrum
                      </Typography>
                      <EigenvalueChart data={result.eigenvalues} />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Node Network
                      </Typography>
                      <NodeLinkVisualization 
                        nodes={result.eigenvalues.map((val, i) => ({ id: i, value: val }))}
                        links={result.node_links}
                      />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          {!result && !isRunning && (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Ready to Simulate
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Configure your parameters and click "Run Simulation" to begin
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>
    </Box>
  )
}