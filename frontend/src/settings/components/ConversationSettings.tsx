import React from 'react'
import {
  Box,
  Typography,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Grid,
  Card,
  CardContent,
  Alert,
  InputAdornment,
} from '@mui/material'
import { useSettings } from '../providers/SettingsProvider'

export const ConversationSettings: React.FC = () => {
  const { settings, updateSetting } = useSettings()
  const { conversation } = settings

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Conversation Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Configure conversation limits, timeouts, and data management preferences.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Limits
              </Typography>

              <TextField
                fullWidth
                label="Maximum Messages"
                type="number"
                value={conversation.maxMessages}
                onChange={(e) => updateSetting('conversation', 'maxMessages', parseInt(e.target.value) || 100)}
                inputProps={{ min: 10, max: 1000 }}
                sx={{ mb: 3 }}
                helperText="Maximum number of messages to keep in conversation history"
              />

              <Typography gutterBottom>
                Response Timeout: {conversation.responseTimeout / 1000}s
              </Typography>
              <Slider
                value={conversation.responseTimeout}
                onChange={(_, value) => updateSetting('conversation', 'responseTimeout', value as number)}
                min={5000}
                max={120000}
                step={5000}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value / 1000}s`}
                marks={[
                  { value: 5000, label: '5s' },
                  { value: 30000, label: '30s' },
                  { value: 60000, label: '60s' },
                  { value: 120000, label: '120s' },
                ]}
                sx={{ mb: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Management
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={conversation.autoSave}
                    onChange={(e) => updateSetting('conversation', 'autoSave', e.target.checked)}
                  />
                }
                label="Auto-save conversations"
                sx={{ mb: 3, display: 'block' }}
              />

              <TextField
                fullWidth
                label="History Retention"
                type="number"
                value={conversation.historyRetention}
                onChange={(e) => updateSetting('conversation', 'historyRetention', parseInt(e.target.value) || 30)}
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
                inputProps={{ min: 1, max: 365 }}
                helperText="How long to keep conversation history"
                sx={{ mb: 2 }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Usage Guidelines
              </Typography>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Higher message limits and longer retention periods may impact performance and storage usage.
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Typography variant="body2">
                  <strong>Message Limits:</strong> Controls how many messages are kept in active memory
                </Typography>
                <Typography variant="body2">
                  <strong>Response Timeout:</strong> Maximum time to wait for API responses
                </Typography>
                <Typography variant="body2">
                  <strong>Auto-save:</strong> Automatically saves conversations to local storage
                </Typography>
                <Typography variant="body2">
                  <strong>History Retention:</strong> How long saved conversations are kept
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}