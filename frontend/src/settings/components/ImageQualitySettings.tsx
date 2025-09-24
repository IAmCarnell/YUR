import React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material'
import { useSettings } from '../providers/SettingsProvider'

export const ImageQualitySettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { imageQuality } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Image Quality Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure how images are processed and displayed in visualizations and simulations.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resolution & Format
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Resolution Quality</InputLabel>
                <Select
                  value={imageQuality.resolution}
                  label="Resolution Quality"
                  onChange={(e) => updateSetting('imageQuality', 'resolution', e.target.value as any)}
                >
                  <MenuItem value="low">Low (Fast)</MenuItem>
                  <MenuItem value="medium">Medium (Balanced)</MenuItem>
                  <MenuItem value="high">High (Quality)</MenuItem>
                  <MenuItem value="ultra">Ultra (Best)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Image Format</InputLabel>
                <Select
                  value={imageQuality.format}
                  label="Image Format"
                  onChange={(e) => updateSetting('imageQuality', 'format', e.target.value as any)}
                >
                  <MenuItem value="png">PNG (Best Quality)</MenuItem>
                  <MenuItem value="jpg">JPEG (Smaller Size)</MenuItem>
                  <MenuItem value="webp">WebP (Modern)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={imageQuality.antiAliasing}
                    onChange={(e) => updateSetting('imageQuality', 'antiAliasing', e.target.checked)}
                  />
                }
                label="Anti-Aliasing"
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compression
              </Typography>

              <Typography gutterBottom>
                Compression Level: {imageQuality.compression}%
              </Typography>
              <Slider
                value={imageQuality.compression}
                onChange={(_, value) => updateSetting('imageQuality', 'compression', value as number)}
                min={10}
                max={100}
                step={5}
                valueLabelDisplay="auto"
                marks={[
                  { value: 10, label: '10%' },
                  { value: 50, label: '50%' },
                  { value: 85, label: '85%' },
                  { value: 100, label: '100%' },
                ]}
                sx={{ mb: 3 }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                Higher quality settings may impact performance for large visualizations.
                For real-time simulations, consider using medium or low quality.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quality Recommendations
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Ultra Quality:</strong> Best for final presentations and publications
                </Typography>
                <Typography variant="body2">
                  <strong>High Quality:</strong> Good balance for detailed analysis
                </Typography>
                <Typography variant="body2">
                  <strong>Medium Quality:</strong> Recommended for interactive exploration
                </Typography>
                <Typography variant="body2">
                  <strong>Low Quality:</strong> Fastest performance for real-time simulations
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}