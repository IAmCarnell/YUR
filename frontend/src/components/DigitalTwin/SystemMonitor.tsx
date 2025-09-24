import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Alert,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  Refresh,
  Computer,
  Memory,
  Storage,
  NetworkCheck,
  Speed,
  Timeline,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { digitalTwinApi, SystemStatus, SystemMetrics } from '../../api/digital-twin';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = 2;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number): string => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

interface ProgressBarProps {
  value: number;
  label: string;
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  showValue?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, color = 'primary', showValue = true }) => {
  const getColor = () => {
    if (value >= 90) return 'error';
    if (value >= 75) return 'warning';
    return color;
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        {showValue && (
          <Typography variant="body2" fontWeight="bold">
            {value.toFixed(1)}%
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(value, 100)}
        color={getColor()}
        sx={{ height: 8, borderRadius: 4 }}
      />
    </Box>
  );
};

export const SystemMonitor: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusData, metricsData] = await Promise.all([
        digitalTwinApi.getSystemStatus(),
        digitalTwinApi.getSystemMetrics(),
      ]);
      
      setStatus(statusData);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to fetch system data:', err);
      setError('Failed to load system monitoring data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemData();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'critical':
        return <Error color="error" />;
      default:
        return <Error color="error" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'error';
      default:
        return 'error';
    }
  };

  if (loading && !status) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          System Monitor
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={fetchSystemData}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Digital Twin System Monitor
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSystemData} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Status Overview */}
      {status && (
        <Alert
          severity={getStatusColor(status.status) as any}
          icon={getStatusIcon(status.status)}
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="subtitle1">
              System Status: {status.status.toUpperCase()} (Health Score: {status.health_score}/100)
            </Typography>
            {status.warnings.length > 0 && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Warnings: {status.warnings.join(', ')}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mt: 1 }}>
              Uptime: {formatUptime(status.uptime_seconds)} | Active Agents: {status.active_agents}
            </Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* CPU and Load */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Speed color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">CPU & Performance</Typography>
              </Box>
              
              {metrics && (
                <Box>
                  <ProgressBar
                    value={metrics.cpu_percent}
                    label="CPU Usage"
                    color="primary"
                  />
                  
                  <Box display="flex" justifyContent="space-between" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      CPU Cores: {metrics.cpu_count}
                    </Typography>
                    {metrics.cpu_freq && (
                      <Typography variant="body2" color="text.secondary">
                        Frequency: {metrics.cpu_freq.current.toFixed(0)} MHz
                      </Typography>
                    )}
                  </Box>
                  
                  <Box display="flex" gap={1} mb={2}>
                    <Chip 
                      label={`Load: ${metrics.load_avg[0]?.toFixed(2)}`} 
                      size="small" 
                      color={metrics.load_avg[0] > metrics.cpu_count ? 'warning' : 'default'}
                    />
                    <Chip 
                      label={`1min: ${metrics.load_avg[0]?.toFixed(2)}`} 
                      size="small" 
                    />
                    <Chip 
                      label={`5min: ${metrics.load_avg[1]?.toFixed(2)}`} 
                      size="small" 
                    />
                    <Chip 
                      label={`15min: ${metrics.load_avg[2]?.toFixed(2)}`} 
                      size="small" 
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Memory Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Memory color="secondary" sx={{ mr: 1 }} />
                <Typography variant="h6">Memory Usage</Typography>
              </Box>
              
              {metrics && (
                <Box>
                  <ProgressBar
                    value={metrics.memory_percent}
                    label="RAM Usage"
                    color="secondary"
                  />
                  
                  <Box display="flex" justify-content="space-between" mb={2}>
                    <Typography variant="body2" color="text.secondary">
                      Used: {formatBytes(metrics.memory_used)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total: {formatBytes(metrics.memory_total)}
                    </Typography>
                  </Box>
                  
                  {metrics.swap_total > 0 && (
                    <ProgressBar
                      value={metrics.swap_percent}
                      label="Swap Usage"
                      color="info"
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Disk Usage */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Storage color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Storage</Typography>
              </Box>
              
              {metrics && Object.entries(metrics.disk_usage).map(([mount, usage]) => (
                <Box key={mount} sx={{ mb: 2 }}>
                  <ProgressBar
                    value={usage.percent}
                    label={`${mount} (${formatBytes(usage.free)} free)`}
                    color="info"
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Network */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <NetworkCheck color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Network I/O</Typography>
              </Box>
              
              {metrics && (
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Bytes Sent"
                      secondary={formatBytes(metrics.network_io.bytes_sent || 0)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Bytes Received"
                      secondary={formatBytes(metrics.network_io.bytes_recv || 0)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Packets Sent"
                      secondary={(metrics.network_io.packets_sent || 0).toLocaleString()}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Packets Received"
                      secondary={(metrics.network_io.packets_recv || 0).toLocaleString()}
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};