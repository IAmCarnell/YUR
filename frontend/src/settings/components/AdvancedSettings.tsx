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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { useState } from 'react'
import { useSettings } from '../providers/SettingsProvider'

export const AdvancedSettings: React.FC = () => {
  const [showDangerZone, setShowDangerZone] = useState(false)
  const { settings, updateSetting } = useSettings()
  const { advanced } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Advanced Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Advanced configuration options for power users and developers.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Development Features
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={advanced.enableExperimentalFeatures}
                    onChange={(e) => updateSetting('advanced', 'enableExperimentalFeatures', e.target.checked)}
                  />
                }
                label="Enable experimental features"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={advanced.debugMode}
                    onChange={(e) => updateSetting('advanced', 'debugMode', e.target.checked)}
                  />
                }
                label="Debug mode"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Log Level</InputLabel>
                <Select
                  value={advanced.logLevel}
                  label="Log Level"
                  onChange={(e) => updateSetting('advanced', 'logLevel', e.target.value as any)}
                >
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="warn">Warning</MenuItem>
                  <MenuItem value="info">Info</MenuItem>
                  <MenuItem value="debug">Debug</MenuItem>
                </Select>
              </FormControl>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Configuration
              </Typography>

              <TextField
                fullWidth
                label="API Endpoint"
                value={advanced.apiEndpoint}
                onChange={(e) => updateSetting('advanced', 'apiEndpoint', e.target.value)}
                sx={{ mb: 3 }}
                helperText="Backend API server URL"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={advanced.autoUpdate}
                    onChange={(e) => updateSetting('advanced', 'autoUpdate', e.target.checked)}
                  />
                }
                label="Auto-update framework"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={advanced.telemetryEnabled}
                    onChange={(e) => updateSetting('advanced', 'telemetryEnabled', e.target.checked)}
                  />
                }
                label="Enable telemetry"
                sx={{ mb: 2, display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Advanced Information
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
                <Typography variant="body2">
                  <strong>Experimental Features:</strong> Enables beta functionality and unstable features
                </Typography>
                <Typography variant="body2">
                  <strong>Debug Mode:</strong> Shows detailed logging and diagnostic information
                </Typography>
                <Typography variant="body2">
                  <strong>Auto-update:</strong> Automatically downloads and installs framework updates
                </Typography>
                <Typography variant="body2">
                  <strong>Telemetry:</strong> Sends anonymous usage data to help improve the framework
                </Typography>
              </Box>

              <Alert severity="warning" sx={{ mb: 2 }}>
                Experimental features may be unstable and could cause unexpected behavior.
              </Alert>

              <Button
                variant="outlined"
                color="error"
                onClick={() => setShowDangerZone(true)}
              >
                Show Developer Options
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Developer Options Dialog */}
      <Dialog
        open={showDangerZone}
        onClose={() => setShowDangerZone(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Developer Options</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 3 }}>
            These options are intended for developers and advanced users only. 
            Changing these settings may break functionality.
          </Alert>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Current Configuration:</Typography>
            <Box component="pre" sx={{ 
              backgroundColor: 'grey.900', 
              color: 'grey.100', 
              p: 2, 
              borderRadius: 1,
              overflow: 'auto',
              fontSize: '0.8rem'
            }}>
              {JSON.stringify(advanced, null, 2)}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDangerZone(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}