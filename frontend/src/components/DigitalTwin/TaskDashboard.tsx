import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Terminal,
  History,
  ExpandMore,
  Code,
  CheckCircle,
  Error,
  Warning,
} from '@mui/icons-material';
import { digitalTwinApi } from '../../api/digital-twin';

interface CommandExecutionDialogProps {
  open: boolean;
  onClose: () => void;
  onCommandExecuted: () => void;
}

const CommandExecutionDialog: React.FC<CommandExecutionDialogProps> = ({ 
  open, 
  onClose, 
  onCommandExecuted 
}) => {
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [timeout, setTimeout] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const allowedCommands = ['ps', 'top', 'df', 'free', 'uptime', 'netstat', 'lscpu', 'lsmem'];

  const handleExecute = async () => {
    if (!command.trim()) {
      setError('Command is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const argsArray = args.trim() ? args.split(' ').filter(arg => arg) : [];
      const response = await digitalTwinApi.executeCommand(command, argsArray, timeout);
      
      setResult(response);
      onCommandExecuted();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to execute command');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCommand('');
    setArgs('');
    setTimeout(30);
    setResult(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Execute System Command</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Only safe system monitoring commands are allowed. Destructive commands are prohibited.
        </Alert>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <TextField
          select
          fullWidth
          label="Command"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          margin="normal"
          SelectProps={{ native: true }}
        >
          <option value="">Select command...</option>
          {allowedCommands.map((cmd) => (
            <option key={cmd} value={cmd}>
              {cmd}
            </option>
          ))}
        </TextField>
        
        <TextField
          fullWidth
          label="Arguments (space-separated)"
          value={args}
          onChange={(e) => setArgs(e.target.value)}
          margin="normal"
          placeholder="e.g., -aux or -h"
        />
        
        <TextField
          type="number"
          fullWidth
          label="Timeout (seconds)"
          value={timeout}
          onChange={(e) => setTimeout(Number(e.target.value))}
          margin="normal"
          inputProps={{ min: 1, max: 60 }}
        />
        
        {result && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Command Result
            </Typography>
            
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box display="flex" alignItems="center" gap={1}>
                  {result.success ? (
                    <CheckCircle color="success" />
                  ) : (
                    <Error color="error" />
                  )}
                  <Typography>
                    {result.command} {result.args.join(' ')} 
                    (Exit: {result.return_code}, Time: {result.execution_time.toFixed(2)}s)
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {result.stdout && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Standard Output:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.100', fontFamily: 'monospace', fontSize: '0.875rem', overflow: 'auto', maxHeight: 300 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.stdout}</pre>
                    </Paper>
                  </Box>
                )}
                
                {result.stderr && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Standard Error:
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText', fontFamily: 'monospace', fontSize: '0.875rem', overflow: 'auto', maxHeight: 200 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{result.stderr}</pre>
                    </Paper>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
        <Button 
          onClick={handleExecute} 
          disabled={loading || !command} 
          variant="contained"
          startIcon={loading ? <LinearProgress /> : <PlayArrow />}
        >
          {loading ? 'Executing...' : 'Execute'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const TaskDashboard: React.FC = () => {
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);

  const fetchCommandHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await digitalTwinApi.getCommandHistory(20);
      setCommandHistory(response.history);
    } catch (err) {
      console.error('Failed to fetch command history:', err);
      setError('Failed to load command history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommandHistory();
    
    // Auto-refresh every 15 seconds
    const interval = setInterval(fetchCommandHistory, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const getStatusIcon = (success: boolean, returnCode: number) => {
    if (success && returnCode === 0) {
      return <CheckCircle color="success" fontSize="small" />;
    } else if (returnCode !== 0) {
      return <Error color="error" fontSize="small" />;
    } else {
      return <Warning color="warning" fontSize="small" />;
    }
  };

  const getStatusColor = (success: boolean, returnCode: number) => {
    if (success && returnCode === 0) return 'success';
    if (returnCode !== 0) return 'error';
    return 'warning';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" gutterBottom>
          Task Dashboard
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<Terminal />}
            onClick={() => setCommandDialogOpen(true)}
            sx={{ mr: 2 }}
          >
            Execute Command
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchCommandHistory} disabled={loading}>
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

      <Grid container spacing={3}>
        {/* Quick Stats */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Command Execution Stats
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Total Commands:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {commandHistory.length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Successful:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {commandHistory.filter(cmd => cmd.success).length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Failed:</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {commandHistory.filter(cmd => !cmd.success).length}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Avg. Execution Time:</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {commandHistory.length > 0 
                      ? (commandHistory.reduce((sum, cmd) => sum + cmd.execution_time, 0) / commandHistory.length).toFixed(2)
                      : '0.00'
                    }s
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Commands */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <History sx={{ mr: 1 }} />
                <Typography variant="h6">Command History</Typography>
              </Box>
              
              {loading && commandHistory.length === 0 ? (
                <LinearProgress />
              ) : commandHistory.length === 0 ? (
                <Box textAlign="center" py={4}>
                  <Terminal sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No commands executed yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Execute your first system command to see the history
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Status</TableCell>
                        <TableCell>Command</TableCell>
                        <TableCell>Execution Time</TableCell>
                        <TableCell>Timestamp</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {commandHistory.map((cmd, index) => (
                        <TableRow key={index} hover>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              {getStatusIcon(cmd.success, cmd.return_code)}
                              <Chip
                                label={cmd.return_code === 0 ? 'Success' : `Exit ${cmd.return_code}`}
                                size="small"
                                color={getStatusColor(cmd.success, cmd.return_code) as any}
                                variant="outlined"
                              />
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ fontFamily: 'monospace' }}>
                              <Typography variant="body2" component="span" fontWeight="bold">
                                {cmd.command}
                              </Typography>
                              {cmd.args && cmd.args.length > 0 && (
                                <Typography variant="body2" component="span" sx={{ ml: 1 }}>
                                  {cmd.args.join(' ')}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {cmd.execution_time.toFixed(3)}s
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatTimestamp(cmd.timestamp)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <CommandExecutionDialog
        open={commandDialogOpen}
        onClose={() => setCommandDialogOpen(false)}
        onCommandExecuted={fetchCommandHistory}
      />
    </Box>
  );
};