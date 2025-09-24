import { api } from './client';

export interface SystemMetrics {
  timestamp: string;
  cpu_percent: number;
  cpu_count: number;
  cpu_freq?: {
    current: number;
    min: number;
    max: number;
  };
  memory_total: number;
  memory_available: number;
  memory_percent: number;
  memory_used: number;
  swap_total: number;
  swap_used: number;
  swap_percent: number;
  disk_usage: Record<string, {
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  network_io: Record<string, number>;
  boot_time: string;
  load_avg: number[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  status: string;
  cpu_percent: number;
  memory_percent: number;
  memory_info: Record<string, number>;
  create_time: string;
  cmdline: string[];
  username: string;
}

export interface HardwareInfo {
  platform: string;
  platform_release: string;
  platform_version: string;
  architecture: string;
  machine: string;
  processor: string;
  cpu_count: number;
  cpu_freq?: {
    current: number;
    min: number;
    max: number;
  };
  memory_total: number;
  disk_partitions: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    opts: string;
  }>;
  network_interfaces: Record<string, Array<{
    family: string;
    address: string;
    netmask?: string;
    broadcast?: string;
  }>>;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  last_active: string;
  current_task?: string;
  resource_usage: Record<string, number>;
  capabilities: string[];
}

export interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical' | 'error';
  health_score: number;
  warnings: string[];
  metrics_summary: {
    cpu_percent: number;
    memory_percent: number;
    disk_usage_max: number;
    load_avg_1min: number;
  };
  uptime_seconds: number;
  active_agents: number;
  last_updated: string;
}

export interface CommandResult {
  command: string;
  args: string[];
  return_code: number;
  stdout: string;
  stderr: string;
  execution_time: number;
  success: boolean;
}

export const digitalTwinApi = {
  // System monitoring
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await api.get('/api/digital-twin/system/status');
    return response.data;
  },

  async getSystemMetrics(): Promise<SystemMetrics> {
    const response = await api.get('/api/digital-twin/system/metrics');
    return response.data;
  },

  async getSystemProcesses(limit: number = 50): Promise<{ processes: ProcessInfo[]; count: number }> {
    const response = await api.get('/api/digital-twin/system/processes', {
      params: { limit }
    });
    return response.data;
  },

  async getHardwareInfo(): Promise<HardwareInfo> {
    const response = await api.get('/api/digital-twin/system/hardware');
    return response.data;
  },

  // Command execution
  async executeCommand(command: string, args?: string[], timeout?: number): Promise<CommandResult> {
    const response = await api.post('/api/digital-twin/commands/execute', {
      command,
      args,
      timeout
    });
    return response.data;
  },

  async getCommandHistory(limit: number = 50): Promise<{ history: any[] }> {
    const response = await api.get('/api/digital-twin/commands/history', {
      params: { limit }
    });
    return response.data;
  },

  // Agent management
  async getAgents(): Promise<{ agents: Agent[]; count: number }> {
    const response = await api.get('/api/digital-twin/agents');
    return response.data;
  },

  async createAgent(name: string, type: string, capabilities?: string[]): Promise<{ agent: Agent; message: string }> {
    const response = await api.post('/api/digital-twin/agents/create', {
      name,
      agent_type: type,
      capabilities
    });
    return response.data;
  },

  async getAgentStatus(agentId: string): Promise<{ agent: Agent }> {
    const response = await api.get(`/api/digital-twin/agents/${agentId}/status`);
    return response.data;
  },

  async assignAgentTask(agentId: string, task: string, parameters?: Record<string, any>): Promise<{ result: any; message: string }> {
    const response = await api.post(`/api/digital-twin/agents/${agentId}/task`, {
      task,
      parameters
    });
    return response.data;
  }
};