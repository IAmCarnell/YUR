import React from 'react'
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
} from '@mui/material'
import { useSettings } from '../providers/SettingsProvider'

export const DisplaySettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { display } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Display Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Customize the appearance and accessibility of the YUR Framework interface.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appearance
              </Typography>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={display.theme}
                  label="Theme"
                  onChange={(e) => updateSetting('display', 'theme', e.target.value as any)}
                >
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Font Size</InputLabel>
                <Select
                  value={display.fontSize}
                  label="Font Size"
                  onChange={(e) => updateSetting('display', 'fontSize', e.target.value as any)}
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={display.compactMode}
                    onChange={(e) => updateSetting('display', 'compactMode', e.target.checked)}
                  />
                }
                label="Compact mode"
                sx={{ mb: 2, display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Accessibility
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={display.reducedMotion}
                    onChange={(e) => updateSetting('display', 'reducedMotion', e.target.checked)}
                  />
                }
                label="Reduce motion"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={display.highContrast}
                    onChange={(e) => updateSetting('display', 'highContrast', e.target.checked)}
                  />
                }
                label="High contrast"
                sx={{ mb: 2, display: 'block' }}
              />

              <Alert severity="info" sx={{ mt: 2 }}>
                Accessibility settings help improve usability for users with visual or motion sensitivities.
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Display Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Auto Theme:</strong> Follows your system's dark/light mode preference
                </Typography>
                <Typography variant="body2">
                  <strong>Compact Mode:</strong> Reduces spacing and padding throughout the interface
                </Typography>
                <Typography variant="body2">
                  <strong>Reduced Motion:</strong> Minimizes animations and transitions
                </Typography>
                <Typography variant="body2">
                  <strong>High Contrast:</strong> Increases contrast between text and backgrounds
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ mt: 2 }}>
                Some display changes may require a page refresh to take full effect.
              </Alert>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}