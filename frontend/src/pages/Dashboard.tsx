import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material'
import {
  Timeline,
  Science,
  Visibility,
  Speed,
  SmartToy,
  Sensors,
  MonitorHeart,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../api/client'
import { SystemMonitor, AgentCards, TaskDashboard } from '../components/DigitalTwin'

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
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  )
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [isHealthy, setIsHealthy] = useState<boolean>(false)
  const [healthData, setHealthData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tabValue, setTabValue] = useState(0)

  useEffect(() => {
    checkHealth()
  }, [])

  const checkHealth = async () => {
    try {
      setLoading(true)
      const data = await apiService.health()
      setHealthData(data)
      setIsHealthy(data.status === 'healthy')
    } catch (error) {
      console.error('Health check failed:', error)
      setIsHealthy(false)
    } finally {
      setLoading(false)
    }
  }

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const features = [
    {
      title: 'Interactive Simulations',
      description: 'Run DESI, Bell, AI, and Tree simulations with real-time visualization',
      icon: <Science sx={{ fontSize: 40 }} />,
      action: () => navigate('/simulations'),
      color: '#00bcd4',
    },
    {
      title: 'Advanced Visualizations',
      description: 'Explore eigenvalues, eigenvectors, and node networks in 3D space',
      icon: <Visibility sx={{ fontSize: 40 }} />,
      action: () => navigate('/visualizations'),
      color: '#ff5722',
    },
    {
      title: 'Performance Analytics',
      description: 'Monitor computational performance and scalability metrics',
      icon: <Speed sx={{ fontSize: 40 }} />,
      action: () => navigate('/tools'),
      color: '#4caf50',
    },
    {
      title: 'Digital Twin System',
      description: 'Real-time system monitoring, agents, and command interface',
      icon: <MonitorHeart sx={{ fontSize: 40 }} />,
      action: () => setTabValue(1),
      color: '#9c27b0',
    },
    {
      title: 'Documentation Hub',
      description: 'Access theoretical foundations and mathematical formalism',
      icon: <Timeline sx={{ fontSize: 40 }} />,
      action: () => navigate('/documentation'),
      color: '#ff9800',
    },
  ]

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        YUR Framework Dashboard
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Infinite-Dimensional Thing Framework - Interactive Exploration Platform
      </Typography>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
          <Tab label="Overview" />
          <Tab label="Digital Twin" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={tabValue} index={0}>
      <Typography variant="h2" gutterBottom>
        YUR Framework Dashboard
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom>
        Infinite-Dimensional Thing Framework - Interactive Exploration Platform
      </Typography>

      {/* System Status */}
      <Box sx={{ mb: 4 }}>
        {loading ? (
          <LinearProgress />
        ) : (
          <Alert
            severity={isHealthy ? 'success' : 'error'}
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={checkHealth}>
                Refresh
              </Button>
            }
          >
            {isHealthy ? 'System Operational' : 'System Offline'} 
            {healthData && (
              <>
                {' | TensorFlow: '}{healthData.tensorflow}
                {' | NumPy: '}{healthData.numpy}
              </>
            )}
          </Alert>
        )}
      </Box>

      {/* Feature Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Box sx={{ color: feature.color, mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom>
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
              <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={feature.action}
                  disabled={!isHealthy}
                >
                  Explore
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Stats */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Framework Capabilities
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="Infinite Dimensions" color="primary" size="small" />
                <Chip label="Real-time Simulation" color="secondary" size="small" />
                <Chip label="Quantum Computing" color="primary" variant="outlined" size="small" />
                <Chip label="AI Integration" color="secondary" variant="outlined" size="small" />
                <Chip label="BCI Ready" color="primary" size="small" />
                <Chip label="Nanotech Stubs" color="secondary" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Simulation Types
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="DESI" color="info" size="small" />
                <Chip label="Bell Tests" color="success" size="small" />
                <Chip label="AI Networks" color="warning" size="small" />
                <Chip label="Tree Structures" color="error" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Compute Modes
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip label="Desktop Mode" color="primary" size="small" />
                <Chip label="Supercomputing" color="secondary" size="small" />
                <Chip label="GPU Accelerated" color="primary" variant="outlined" size="small" />
                <Chip label="Distributed" color="secondary" variant="outlined" size="small" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </TabPanel>

      {/* Digital Twin Tab */}
      <TabPanel value={tabValue} index={1}>
        <DigitalTwinTabs />
      </TabPanel>
    </Box>
  )
}

const DigitalTwinTabs: React.FC = () => {
  const [dtTabValue, setDtTabValue] = useState(0)

  const handleDtTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setDtTabValue(newValue)
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Digital Twin System
      </Typography>
      <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Real-time system monitoring, intelligent agents, and task management
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={dtTabValue} onChange={handleDtTabChange} aria-label="digital-twin-tabs">
          <Tab label="System Monitor" icon={<Sensors />} />
          <Tab label="Agent Management" icon={<SmartToy />} />
          <Tab label="Task Dashboard" icon={<Timeline />} />
        </Tabs>
      </Box>
      
      <TabPanel value={dtTabValue} index={0}>
        <SystemMonitor />
      </TabPanel>
      
      <TabPanel value={dtTabValue} index={1}>
        <AgentCards />
      </TabPanel>
      
      <TabPanel value={dtTabValue} index={2}>
        <TaskDashboard />
      </TabPanel>
    </Box>
  )
}