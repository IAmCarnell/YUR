import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Avatar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Alert,
  Fab,
} from '@mui/material';
import {
  SmartToy,
  Psychology,
  DataUsage,
  CloudSync,
  Add,
  PlayArrow,
  Pause,
  Stop,
  Settings,
  Refresh,
  Timeline,
} from '@mui/icons-material';
import { digitalTwinApi, Agent } from '../../api/digital-twin';

const getAgentIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'data_processor':
      return <DataUsage />;
    case 'ai_agent':
      return <Psychology />;
    case 'cloud_agent':
      return <CloudSync />;
    case 'monitor':
      return <Timeline />;
    default:
      return <SmartToy />;
  }
};

const getAgentColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return '#4caf50';
    case 'busy':
      return '#ff9800';
    case 'idle':
      return '#2196f3';
    case 'error':
      return '#f44336';
    default:
      return '#9e9e9e';
  }
};

const getStatusChipColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'active':
      return 'success';
    case 'busy':
      return 'warning';
    case 'idle':
      return 'info';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

interface CreateAgentDialogProps {
  open: boolean;
  onClose: () => void;
  onAgentCreated: () => void;
}

const CreateAgentDialog: React.FC<CreateAgentDialogProps> = ({ open, onClose, onAgentCreated }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('data_processor');
  const [capabilities, setCapabilities] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agentTypes = [
    { value: 'data_processor', label: 'Data Processor' },
    { value: 'ai_agent', label: 'AI Agent' },
    { value: 'cloud_agent', label: 'Cloud Agent' },
    { value: 'monitor', label: 'System Monitor' },
    { value: 'custom', label: 'Custom Agent' },
  ];

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const capabilitiesList = capabilities.split(',').map(c => c.trim()).filter(c => c);
      await digitalTwinApi.createAgent(name, type, capabilitiesList);
      
      setName('');
      setType('data_processor');
      setCapabilities('');
      onAgentCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Agent</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          fullWidth
          label="Agent Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          margin="normal"
          required
        />
        
        <TextField
          select
          fullWidth
          label="Agent Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          margin="normal"
        >
          {agentTypes.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
        
        <TextField
          fullWidth
          label="Capabilities (comma-separated)"
          value={capabilities}
          onChange={(e) => setCapabilities(e.target.value)}
          margin="normal"
          placeholder="data_analysis, machine_learning, visualization"
          helperText="Optional: specify agent capabilities separated by commas"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={loading} variant="contained">
          {loading ? 'Creating...' : 'Create Agent'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface AssignTaskDialogProps {
  open: boolean;
  agent: Agent | null;
  onClose: () => void;
  onTaskAssigned: () => void;
}

const AssignTaskDialog: React.FC<AssignTaskDialogProps> = ({ open, agent, onClose, onTaskAssigned }) => {
  const [task, setTask] = useState('');
  const [parameters, setParameters] = useState('{}');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commonTasks = [
    'data_analysis',
    'system_monitoring',
    'performance_optimization',
    'data_processing',
    'machine_learning',
    'visualization',
    'custom_task'
  ];

  const handleAssign = async () => {
    if (!task.trim() || !agent) {
      setError('Task name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      let taskParams = {};
      if (parameters.trim()) {
        try {
          taskParams = JSON.parse(parameters);
        } catch {
          setError('Invalid JSON in parameters');
          setLoading(false);
          return;
        }
      }
      
      await digitalTwinApi.assignAgentTask(agent.id, task, taskParams);
      
      setTask('');
      setParameters('{}');
      onTaskAssigned();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Task to {agent?.name}</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          select
          fullWidth
          label="Task Type"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          margin="normal"
        >
          {commonTasks.map((taskType) => (
            <MenuItem key={taskType} value={taskType}>
              {taskType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </MenuItem>
          ))}
        </TextField>
        
        <TextField
          fullWidth
          label="Task Parameters (JSON)"
          value={parameters}
          onChange={(e) => setParameters(e.target.value)}
          margin="normal"
          multiline
          rows={4}
          placeholder='{"dataset": "example.csv", "mode": "analysis"}'
          helperText="Optional: JSON object with task parameters"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleAssign} disabled={loading} variant="contained">
          {loading ? 'Assigning...' : 'Assign Task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const AgentCards: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await digitalTwinApi.getAgents();
      setAgents(response.agents);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignTask = (agent: Agent) => {
    setSelectedAgent(agent);
    setTaskDialogOpen(true);
  };

  const formatRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loading && agents.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Digital Twin Agents
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, position: 'relative' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Digital Twin Agents
        </Typography>
        <Box>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAgents} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {agents.length === 0 && !loading ? (
        <Box textAlign="center" py={6}>
          <SmartToy sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No agents created yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first digital twin agent to start monitoring and automation
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Agent
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {agents.map((agent) => (
            <Grid item xs={12} sm={6} md={4} key={agent.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                      sx={{
                        bgcolor: getAgentColor(agent.status),
                        mr: 2,
                        width: 48,
                        height: 48,
                      }}
                    >
                      {getAgentIcon(agent.type)}
                    </Avatar>
                    <Box flexGrow={1}>
                      <Typography variant="h6" noWrap>
                        {agent.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {agent.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </Box>
                  </Box>

                  <Box mb={2}>
                    <Chip
                      label={agent.status.toUpperCase()}
                      color={getStatusChipColor(agent.status) as any}
                      size="small"
                      sx={{ mr: 1 }}
                    />
                    {agent.current_task && (
                      <Chip
                        label={agent.current_task}
                        variant="outlined"
                        size="small"
                      />
                    )}
                  </Box>

                  {agent.current_task && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Current Task
                      </Typography>
                      <LinearProgress variant="indeterminate" sx={{ mb: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        Processing: {agent.current_task}
                      </Typography>
                    </Box>
                  )}

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Resource Usage
                    </Typography>
                    <Box display="flex" gap={1}>
                      <Chip
                        label={`CPU: ${(agent.resource_usage.cpu || 0).toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`RAM: ${(agent.resource_usage.memory || 0).toFixed(1)}%`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  {agent.capabilities.length > 0 && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Capabilities
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {agent.capabilities.slice(0, 3).map((capability) => (
                          <Chip
                            key={capability}
                            label={capability}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                        {agent.capabilities.length > 3 && (
                          <Chip
                            label={`+${agent.capabilities.length - 3} more`}
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  <Typography variant="caption" color="text.secondary">
                    Created: {formatRelativeTime(agent.created_at)} | 
                    Last Active: {formatRelativeTime(agent.last_active)}
                  </Typography>
                </CardContent>

                <CardActions>
                  <Button
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleAssignTask(agent)}
                    disabled={agent.status === 'busy'}
                  >
                    Assign Task
                  </Button>
                  <Button size="small" startIcon={<Settings />}>
                    Configure
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add agent"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setCreateDialogOpen(true)}
      >
        <Add />
      </Fab>

      {/* Dialogs */}
      <CreateAgentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onAgentCreated={fetchAgents}
      />

      <AssignTaskDialog
        open={taskDialogOpen}
        agent={selectedAgent}
        onClose={() => setTaskDialogOpen(false)}
        onTaskAssigned={fetchAgents}
      />
    </Box>
  );
};