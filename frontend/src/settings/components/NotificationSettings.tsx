import React from 'react'
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  Divider,
} from '@mui/material'
import { useSettings } from '../providers/SettingsProvider'

export const NotificationSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { notifications } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Notification Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Control when and how you receive notifications from the YUR Framework.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                General Notifications
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'enabled', e.target.checked)}
                  />
                }
                label="Enable notifications"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.soundEnabled}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'soundEnabled', e.target.checked)}
                  />
                }
                label="Sound alerts"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.desktopNotifications}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'desktopNotifications', e.target.checked)}
                  />
                }
                label="Desktop notifications"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.emailNotifications}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'emailNotifications', e.target.checked)}
                  />
                }
                label="Email notifications"
                sx={{ mb: 2, display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Event Notifications
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.simulationComplete}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'simulationComplete', e.target.checked)}
                  />
                }
                label="Simulation completion"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.errorAlerts}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'errorAlerts', e.target.checked)}
                  />
                }
                label="Error alerts"
                sx={{ mb: 2, display: 'block' }}
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.systemUpdates}
                    disabled={!notifications.enabled}
                    onChange={(e) => updateSetting('notifications', 'systemUpdates', e.target.checked)}
                  />
                }
                label="System updates"
                sx={{ mb: 2, display: 'block' }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notification Information
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Desktop notifications require browser permission. You may be prompted to allow notifications when enabling this feature.
              </Alert>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Simulation Complete:</strong> Notifies when long-running simulations finish
                </Typography>
                <Typography variant="body2">
                  <strong>Error Alerts:</strong> Important error messages and warnings
                </Typography>
                <Typography variant="body2">
                  <strong>System Updates:</strong> Information about framework updates and new features
                </Typography>
                <Typography variant="body2">
                  <strong>Email Notifications:</strong> Requires email configuration in advanced settings
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}