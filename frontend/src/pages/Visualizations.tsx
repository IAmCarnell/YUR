import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
} from '@mui/material'
import { Refresh, Download } from '@mui/icons-material'
import { apiService } from '../api/client'
import type { OperatorVisualization } from '../api/client'

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`visualization-tabpanel-${index}`}
      aria-labelledby={`visualization-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export const Visualizations: React.FC = () => {
  const [operatorType, setOperatorType] = useState('harmonic')
  const [dimensions, setDimensions] = useState(100)
  const [visualization, setVisualization] = useState<OperatorVisualization | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)

  const operatorTypes = [
    { value: 'harmonic', label: 'Harmonic Oscillator' },
    { value: 'momentum', label: 'Momentum Operator' },
    { value: 'position', label: 'Position Operator' },
    { value: 'random', label: 'Random Hermitian' },
  ]

  const loadVisualization = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiService.getOperatorVisualization(operatorType, dimensions)
      setVisualization(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load visualization')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVisualization()
  }, [operatorType, dimensions])

  const downloadVisualization = () => {
    if (!visualization) return
    
    // Create download link for the image
    const link = document.createElement('a')
    link.href = visualization.image
    link.download = `operator-${operatorType}-${dimensions}d-${Date.now()}.png`
    link.click()
  }

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        Advanced Visualizations
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Explore the infinite-dimensional operator through interactive visualizations
      </Typography>

      <Grid container spacing={3}>
        {/* Controls */}
        <Grid item xs={12} lg={3}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Visualization Controls
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Operator Type</InputLabel>
                <Select
                  value={operatorType}
                  label="Operator Type"
                  onChange={(e) => setOperatorType(e.target.value)}
                >
                  {operatorTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Typography gutterBottom>
                Dimensions: {dimensions}
              </Typography>
              <Slider
                value={dimensions}
                onChange={(_, value) => setDimensions(value as number)}
                min={10}
                max={500}
                step={10}
                marks={[
                  { value: 10, label: '10' },
                  { value: 100, label: '100' },
                  { value: 500, label: '500' },
                ]}
                sx={{ mb: 3 }}
              />

              <Button
                variant="contained"
                fullWidth
                onClick={loadVisualization}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Refresh />}
                sx={{ mb: 2 }}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>

              {visualization && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={downloadVisualization}
                  startIcon={<Download />}
                >
                  Download
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualizations */}
        <Grid item xs={12} lg={9}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
                <Tab label="Operator Matrix" />
                <Tab label="Eigenvalue Analysis" />
                <Tab label="3D Visualization" />
                <Tab label="Statistical Properties" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              {visualization && (
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    {operatorTypes.find(t => t.value === operatorType)?.label} Matrix
                  </Typography>
                  <img
                    src={visualization.image}
                    alt="Operator Visualization"
                    style={{ maxWidth: '100%', height: 'auto', borderRadius: 8 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Matrix Shape: {visualization.matrix_shape[0]} × {visualization.matrix_shape[1]}
                  </Typography>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {visualization && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Eigenvalue Analysis
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            First 10 Eigenvalues
                          </Typography>
                          <Box component="pre" sx={{ fontSize: '0.875rem', overflow: 'auto' }}>
                            {visualization.eigenvalues.slice(0, 10).map((val, i) => (
                              <div key={i}>
                                λ_{i}: {val.toFixed(6)}
                              </div>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            Statistics
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Typography variant="body2">
                              Total Eigenvalues: {visualization.eigenvalues.length}
                            </Typography>
                            <Typography variant="body2">
                              Min: {Math.min(...visualization.eigenvalues).toFixed(4)}
                            </Typography>
                            <Typography variant="body2">
                              Max: {Math.max(...visualization.eigenvalues).toFixed(4)}
                            </Typography>
                            <Typography variant="body2">
                              Mean: {(visualization.eigenvalues.reduce((a, b) => a + b, 0) / visualization.eigenvalues.length).toFixed(4)}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  3D Visualization
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Interactive 3D visualization of eigenvectors and operator structure
                  <br />
                  (Coming soon - Three.js integration)
                </Typography>
              </Box>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Statistical Properties
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Advanced statistical analysis of operator properties
                  <br />
                  (Coming soon - Spectral analysis, correlation functions)
                </Typography>
              </Box>
            </TabPanel>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}