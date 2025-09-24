import React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  InputAdornment,
  Slider,
} from '@mui/material'
import { useSettings } from '../providers/SettingsProvider'

export const PerformanceSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { performance } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Performance Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure computational resources and performance optimization settings.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compute Configuration
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Compute Mode</InputLabel>
                <Select
                  value={performance.computeMode}
                  label="Compute Mode"
                  onChange={(e) => updateSetting('performance', 'computeMode', e.target.value as any)}
                >
                  <MenuItem value="desktop">Desktop (CPU)</MenuItem>
                  <MenuItem value="gpu">GPU Accelerated</MenuItem>
                  <MenuItem value="distributed">Distributed Computing</MenuItem>
                  <MenuItem value="quantum">Quantum Backend</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Backend</InputLabel>
                <Select
                  value={performance.backend}
                  label="Backend"
                  onChange={(e) => updateSetting('performance', 'backend', e.target.value as any)}
                >
                  <MenuItem value="numpy">NumPy/SciPy</MenuItem>
                  <MenuItem value="tensorflow">TensorFlow</MenuItem>
                  <MenuItem value="pytorch">PyTorch</MenuItem>
                  <MenuItem value="jax">JAX</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={performance.enableParallelProcessing}
                    onChange={(e) => updateSetting('performance', 'enableParallelProcessing', e.target.checked)}
                  />
                }
                label="Enable parallel processing"
                sx={{ mb: 2, display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resource Limits
              </Typography>

              <TextField
                fullWidth
                label="Maximum Dimensions"
                type="number"
                value={performance.maxDimensions}
                onChange={(e) => updateSetting('performance', 'maxDimensions', parseInt(e.target.value) || 1000)}
                inputProps={{ min: 10, max: 50000 }}
                sx={{ mb: 3 }}
                helperText="Maximum number of dimensions for simulations"
              />

              <TextField
                fullWidth
                label="Memory Limit"
                type="number"
                value={performance.memoryLimit}
                onChange={(e) => updateSetting('performance', 'memoryLimit', parseInt(e.target.value) || 2048)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">MB</InputAdornment>,
                }}
                inputProps={{ min: 256, max: 16384 }}
                sx={{ mb: 3 }}
                helperText="Maximum memory usage per simulation"
              />

              <Typography gutterBottom>
                Timeout Duration: {performance.timeoutDuration}s
              </Typography>
              <Slider
                value={performance.timeoutDuration}
                onChange={(_, value) => updateSetting('performance', 'timeoutDuration', value as number)}
                min={30}
                max={3600}
                step={30}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}s`}
                marks={[
                  { value: 30, label: '30s' },
                  { value: 300, label: '5m' },
                  { value: 1800, label: '30m' },
                  { value: 3600, label: '1h' },
                ]}
                sx={{ mb: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Recommendations
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Higher performance settings may require additional hardware resources and setup.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Desktop Mode:</strong> Best for general use and smaller simulations
                </Typography>
                <Typography variant="body2">
                  <strong>GPU Accelerated:</strong> Significant speedup for matrix operations (requires CUDA/OpenCL)
                </Typography>
                <Typography variant="body2">
                  <strong>Distributed:</strong> For large-scale simulations across multiple machines
                </Typography>
                <Typography variant="body2">
                  <strong>Quantum Backend:</strong> Experimental quantum computing integration
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                For dimensions &gt; 10,000, consider using GPU or distributed computing modes.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}