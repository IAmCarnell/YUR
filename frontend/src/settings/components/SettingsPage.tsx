import React, { useState } from 'react'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
} from '@mui/material'
import {
  ImageOutlined,
  ChatOutlined, 
  NotificationsOutlined,
  DisplaySettingsOutlined,
  SpeedOutlined,
  SettingsOutlined,
  ImportExportOutlined,
  RestartAltOutlined,
} from '@mui/icons-material'
import { useSettings } from '../providers/SettingsProvider'
import { ImageQualitySettings } from './ImageQualitySettings'
import { ConversationSettings } from './ConversationSettings'
import { NotificationSettings } from './NotificationSettings'
import { DisplaySettings } from './DisplaySettings'
import { PerformanceSettings } from './PerformanceSettings'
import { AdvancedSettings } from './AdvancedSettings'

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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

const tabConfigs = [
  { label: 'Image Quality', icon: ImageOutlined },
  { label: 'Conversation', icon: ChatOutlined },
  { label: 'Notifications', icon: NotificationsOutlined },
  { label: 'Display', icon: DisplaySettingsOutlined },
  { label: 'Performance', icon: SpeedOutlined },
  { label: 'Advanced', icon: SettingsOutlined },
]

export const SettingsPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [importText, setImportText] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as 'info' | 'success' | 'error' | 'warning' })
  
  const { exportSettings, importSettings, resetSettings } = useSettings()

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleExport = () => {
    const settingsJson = exportSettings()
    navigator.clipboard.writeText(settingsJson).then(() => {
      setSnackbar({
        open: true,
        message: 'Settings exported to clipboard',
        severity: 'success',
      })
    }).catch(() => {
      // Fallback: create a downloadable file
      const blob = new Blob([settingsJson], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'yur-settings.json'
      a.click()
      URL.revokeObjectURL(url)
      setSnackbar({
        open: true,
        message: 'Settings exported as file',
        severity: 'success',
      })
    })
  }

  const handleImport = () => {
    if (importSettings(importText)) {
      setShowImportDialog(false)
      setImportText('')
      setSnackbar({
        open: true,
        message: 'Settings imported successfully',
        severity: 'success',
      })
    } else {
      setSnackbar({
        open: true,
        message: 'Failed to import settings. Please check the format.',
        severity: 'error',
      })
    }
  }

  const handleReset = () => {
    resetSettings()
    setShowResetDialog(false)
    setSnackbar({
      open: true,
      message: 'Settings reset to defaults',
      severity: 'info',
    })
  }

  return (
    <Box sx={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your YUR Framework experience
        </Typography>

        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ImportExportOutlined />}
            onClick={handleExport}
          >
            Export Settings
          </Button>
          <Button
            variant="outlined"
            startIcon={<ImportExportOutlined />}
            onClick={() => setShowImportDialog(true)}
          >
            Import Settings
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<RestartAltOutlined />}
            onClick={() => setShowResetDialog(true)}
          >
            Reset to Defaults
          </Button>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex' }}>
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderRight: 1, borderColor: 'divider', width: 240 }}
        >
          {tabConfigs.map((config, index) => (
            <Tab
              key={config.label}
              icon={<config.icon />}
              label={config.label}
              sx={{ minHeight: 64, alignItems: 'flex-start', textAlign: 'left' }}
            />
          ))}
        </Tabs>

        <Box sx={{ flexGrow: 1, maxHeight: '100%', overflow: 'auto' }}>
          <TabPanel value={tabValue} index={0}>
            <ImageQualitySettings />
          </TabPanel>
          <TabPanel value={tabValue} index={1}>
            <ConversationSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={2}>
            <NotificationSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={3}>
            <DisplaySettings />
          </TabPanel>
          <TabPanel value={tabValue} index={4}>
            <PerformanceSettings />
          </TabPanel>
          <TabPanel value={tabValue} index={5}>
            <AdvancedSettings />
          </TabPanel>
        </Box>
      </Box>

      {/* Import Dialog */}
      <Dialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Settings</DialogTitle>
        <DialogContent>
          <TextField
            multiline
            rows={8}
            fullWidth
            placeholder="Paste your settings JSON here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowImportDialog(false)}>Cancel</Button>
          <Button onClick={handleImport} variant="contained">
            Import
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog
        open={showResetDialog}
        onClose={() => setShowResetDialog(false)}
      >
        <DialogTitle>Reset Settings</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will reset all settings to their default values. This action cannot be undone.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResetDialog(false)}>Cancel</Button>
          <Button onClick={handleReset} color="warning" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  )
}