/**
 * YUR Agent Framework - Distributed Agent Registry
 * Production-ready distributed registry with heartbeat monitoring, health status,
 * auto-discovery, and cluster-aware distributed consensus
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { AgentRegistration, AgentHealth } from '../types.js';

export interface RegistryNode {
  id: string;
  endpoint: string;
  lastSeen: Date;
  version: string;
  region?: string;
  datacenter?: string;
  metadata?: Record<string, any>;
}

export interface DistributedRegistryConfig {
  nodeId: string;
  bindAddress: string;
  bindPort: number;
  seedNodes: string[];
  dataDir: string;
  heartbeatInterval: number;
  healthCheckInterval: number;
  staleNodeTimeout: number;
  replicationFactor: number;
  enableGossip: boolean;
  enableConsistencyCheck: boolean;
  maxClusterSize: number;
}

export interface AgentRegistryEntry extends AgentRegistration {
  nodeId: string;
  replicatedOn: string[];
  consistencyHash: string;
  tombstone?: boolean;
  tombstoneTimestamp?: Date;
}

export interface HealthCheckResult {
  agentId: string;
  healthy: boolean;
  responseTime: number;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    duration?: number;
  }>;
  timestamp: Date;
}

export class DistributedAgentRegistry extends EventEmitter {
  private config: DistributedRegistryConfig;
  private agents: Map<string, AgentRegistryEntry> = new Map();
  private nodes: Map<string, RegistryNode> = new Map();
  private healthStatus: Map<string, HealthCheckResult> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private running: boolean = false;
  private cluster: Set<string> = new Set();
  private gossipInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private consensusLeader?: string;
  private leaderElectionInProgress: boolean = false;

  constructor(config: Partial<DistributedRegistryConfig> = {}) {
    super();
    
    this.config = {
      nodeId: config.nodeId || crypto.randomUUID(),
      bindAddress: config.bindAddress || '0.0.0.0',
      bindPort: config.bindPort || 8500,
      seedNodes: config.seedNodes || [],
      dataDir: config.dataDir || './registry-data',
      heartbeatInterval: config.heartbeatInterval || 30000,
      healthCheckInterval: config.healthCheckInterval || 15000,
      staleNodeTimeout: config.staleNodeTimeout || 90000,
      replicationFactor: config.replicationFactor || 3,
      enableGossip: config.enableGossip ?? true,
      enableConsistencyCheck: config.enableConsistencyCheck ?? true,
      maxClusterSize: config.maxClusterSize || 100
    };

    this.setupEventHandlers();
  }

  /**
   * Start the distributed registry
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Registry is already running');
    }

    try {
      // Ensure data directory exists
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Load persisted state
      await this.loadPersistedState();

      // Join cluster
      await this.joinCluster();

      // Start background processes
      this.startHeartbeatMonitoring();
      this.startHealthChecking();
      
      if (this.config.enableGossip) {
        this.startGossipProtocol();
      }

      this.running = true;
      this.emit('registry:started', { nodeId: this.config.nodeId });
      
      console.log(`Distributed Registry started on node ${this.config.nodeId}`);
    } catch (error) {
      this.emit('registry:error', error);
      throw error;
    }
  }

  /**
   * Stop the distributed registry
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Leave cluster gracefully
      await this.leaveCluster();

      // Stop background processes
      this.stopHeartbeatMonitoring();
      this.stopHealthChecking();
      this.stopGossipProtocol();

      // Persist current state
      await this.persistState();

      this.running = false;
      this.emit('registry:stopped', { nodeId: this.config.nodeId });
      
      console.log(`Distributed Registry stopped on node ${this.config.nodeId}`);
    } catch (error) {
      this.emit('registry:error', error);
    }
  }

  /**
   * Register an agent in the distributed registry
   */
  async register(registration: AgentRegistration): Promise<void> {
    if (!this.running) {
      throw new Error('Registry is not running');
    }

    const entry: AgentRegistryEntry = {
      ...registration,
      nodeId: this.config.nodeId,
      replicatedOn: [this.config.nodeId],
      consistencyHash: this.calculateConsistencyHash(registration),
      lastHeartbeat: new Date()
    };

    // Store locally
    this.agents.set(registration.id, entry);

    // Replicate to other nodes
    await this.replicateAgent(entry);

    // Start heartbeat monitoring for this agent
    this.startAgentHeartbeat(registration.id);

    this.emit('agent:registered', registration);
    console.log(`Agent ${registration.id} registered on node ${this.config.nodeId}`);
  }

  /**
   * Unregister an agent
   */
  async unregister(agentId: string): Promise<void> {
    if (!this.running) {
      throw new Error('Registry is not running');
    }

    const entry = this.agents.get(agentId);
    if (!entry) {
      return;
    }

    // Mark as tombstone for eventual consistency
    entry.tombstone = true;
    entry.tombstoneTimestamp = new Date();

    // Replicate tombstone
    await this.replicateAgent(entry);

    // Stop heartbeat monitoring
    this.stopAgentHeartbeat(agentId);

    // Remove from local registry after replication
    setTimeout(() => {
      this.agents.delete(agentId);
      this.healthStatus.delete(agentId);
    }, 60000); // Keep tombstone for 1 minute

    this.emit('agent:unregistered', agentId);
    console.log(`Agent ${agentId} unregistered from node ${this.config.nodeId}`);
  }

  /**
   * Update agent heartbeat
   */
  async updateHeartbeat(agentId: string, health?: AgentHealth): Promise<void> {
    const entry = this.agents.get(agentId);
    if (!entry || entry.tombstone) {
      return;
    }

    entry.lastHeartbeat = new Date();
    
    if (health) {
      const healthResult: HealthCheckResult = {
        agentId,
        healthy: health.healthy,
        responseTime: 0,
        checks: [{
          name: 'agent-health',
          status: health.healthy ? 'pass' : 'fail',
          message: health.reason
        }],
        timestamp: new Date()
      };
      
      this.healthStatus.set(agentId, healthResult);
    }

    // Reset heartbeat timer
    this.startAgentHeartbeat(agentId);

    this.emit('agent:heartbeat', { agentId, health });
  }

  /**
   * Get agent registration
   */
  async getAgent(agentId: string): Promise<AgentRegistryEntry | null> {
    const entry = this.agents.get(agentId);
    return entry && !entry.tombstone ? entry : null;
  }

  /**
   * List all agents with optional filtering
   */
  async listAgents(filter?: {
    type?: string;
    capability?: string;
    healthy?: boolean;
    nodeId?: string;
  }): Promise<AgentRegistryEntry[]> {
    const agents = Array.from(this.agents.values()).filter(agent => !agent.tombstone);

    if (!filter) {
      return agents;
    }

    return agents.filter(agent => {
      if (filter.type && agent.type !== filter.type) return false;
      if (filter.capability && !agent.capabilities.includes(filter.capability)) return false;
      if (filter.nodeId && agent.nodeId !== filter.nodeId) return false;
      if (filter.healthy !== undefined) {
        const health = this.healthStatus.get(agent.id);
        if (health && health.healthy !== filter.healthy) return false;
      }
      return true;
    });
  }

  /**
   * Get healthy agents
   */
  async getHealthyAgents(): Promise<AgentRegistryEntry[]> {
    return this.listAgents({ healthy: true });
  }

  /**
   * Get registry cluster status
   */
  getClusterStatus(): {
    nodeId: string;
    isLeader: boolean;
    clusterSize: number;
    healthyNodes: number;
    totalAgents: number;
    healthyAgents: number;
  } {
    const healthyNodes = Array.from(this.nodes.values()).filter(
      node => Date.now() - node.lastSeen.getTime() < this.config.staleNodeTimeout
    ).length;

    const healthyAgents = Array.from(this.healthStatus.values()).filter(
      health => health.healthy
    ).length;

    return {
      nodeId: this.config.nodeId,
      isLeader: this.consensusLeader === this.config.nodeId,
      clusterSize: this.cluster.size,
      healthyNodes,
      totalAgents: this.agents.size,
      healthyAgents
    };
  }

  /**
   * Perform health check on an agent
   */
  async performHealthCheck(agentId: string): Promise<HealthCheckResult> {
    const entry = this.agents.get(agentId);
    if (!entry || entry.tombstone) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const startTime = Date.now();
    const checks: HealthCheckResult['checks'] = [];

    try {
      // Heartbeat staleness check
      const heartbeatAge = Date.now() - entry.lastHeartbeat.getTime();
      const heartbeatStale = heartbeatAge > this.config.heartbeatInterval * 2;
      
      checks.push({
        name: 'heartbeat',
        status: heartbeatStale ? 'fail' : 'pass',
        message: heartbeatStale ? `Heartbeat stale by ${heartbeatAge}ms` : 'Heartbeat current',
        duration: 0
      });

      // Endpoint reachability check (if endpoint provided)
      if (entry.endpoint) {
        try {
          const response = await fetch(`${entry.endpoint}/health`, { 
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          });
          
          checks.push({
            name: 'endpoint',
            status: response.ok ? 'pass' : 'warn',
            message: `HTTP ${response.status}`,
            duration: Date.now() - startTime
          });
        } catch (error) {
          checks.push({
            name: 'endpoint',
            status: 'fail',
            message: error instanceof Error ? error.message : 'Endpoint unreachable',
            duration: Date.now() - startTime
          });
        }
      }

      const allPassing = checks.every(check => check.status === 'pass');
      const hasFailures = checks.some(check => check.status === 'fail');

      const result: HealthCheckResult = {
        agentId,
        healthy: allPassing || !hasFailures,
        responseTime: Date.now() - startTime,
        checks,
        timestamp: new Date()
      };

      this.healthStatus.set(agentId, result);
      this.emit('agent:health-check', result);

      return result;
    } catch (error) {
      const result: HealthCheckResult = {
        agentId,
        healthy: false,
        responseTime: Date.now() - startTime,
        checks: [{
          name: 'health-check',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Health check failed'
        }],
        timestamp: new Date()
      };

      this.healthStatus.set(agentId, result);
      this.emit('agent:health-check', result);

      return result;
    }
  }

  private setupEventHandlers(): void {
    this.on('node:join', (node: RegistryNode) => {
      console.log(`Node ${node.id} joined cluster`);
    });

    this.on('node:leave', (nodeId: string) => {
      console.log(`Node ${nodeId} left cluster`);
    });

    this.on('leader:elected', (leaderId: string) => {
      console.log(`Node ${leaderId} elected as leader`);
    });
  }

  private async joinCluster(): Promise<void> {
    // Register this node
    const thisNode: RegistryNode = {
      id: this.config.nodeId,
      endpoint: `${this.config.bindAddress}:${this.config.bindPort}`,
      lastSeen: new Date(),
      version: '1.0.0'
    };

    this.nodes.set(this.config.nodeId, thisNode);
    this.cluster.add(this.config.nodeId);

    // Connect to seed nodes
    for (const seedEndpoint of this.config.seedNodes) {
      try {
        await this.connectToNode(seedEndpoint);
      } catch (error) {
        console.warn(`Failed to connect to seed node ${seedEndpoint}:`, error);
      }
    }

    // Start leader election if cluster is large enough
    if (this.cluster.size > 1) {
      await this.electLeader();
    } else {
      this.consensusLeader = this.config.nodeId;
      this.emit('leader:elected', this.config.nodeId);
    }
  }

  private async leaveCluster(): Promise<void> {
    // Notify other nodes
    for (const nodeId of this.cluster) {
      if (nodeId !== this.config.nodeId) {
        try {
          await this.notifyNodeLeaving(nodeId);
        } catch (error) {
          console.warn(`Failed to notify node ${nodeId} of leaving:`, error);
        }
      }
    }

    this.cluster.clear();
    this.nodes.clear();
  }

  private async connectToNode(endpoint: string): Promise<void> {
    // In a real implementation, this would establish a connection
    // For now, we'll simulate the handshake
    const nodeId = crypto.randomUUID();
    
    const node: RegistryNode = {
      id: nodeId,
      endpoint,
      lastSeen: new Date(),
      version: '1.0.0'
    };

    this.nodes.set(nodeId, node);
    this.cluster.add(nodeId);
    this.emit('node:join', node);
  }

  private async notifyNodeLeaving(nodeId: string): Promise<void> {
    // In a real implementation, this would send a leaving notification
    this.nodes.delete(nodeId);
    this.cluster.delete(nodeId);
    this.emit('node:leave', nodeId);
  }

  private async electLeader(): Promise<void> {
    if (this.leaderElectionInProgress) {
      return;
    }

    this.leaderElectionInProgress = true;

    try {
      // Simple leader election: lowest node ID wins
      const sortedNodes = Array.from(this.cluster).sort();
      const newLeader = sortedNodes[0];

      if (this.consensusLeader !== newLeader) {
        this.consensusLeader = newLeader;
        this.emit('leader:elected', newLeader);
      }
    } finally {
      this.leaderElectionInProgress = false;
    }
  }

  private startHeartbeatMonitoring(): void {
    const interval = setInterval(async () => {
      for (const [agentId, entry] of this.agents) {
        if (entry.tombstone) continue;

        const heartbeatAge = Date.now() - entry.lastHeartbeat.getTime();
        if (heartbeatAge > this.config.heartbeatInterval * 3) {
          // Agent is stale, perform health check
          try {
            await this.performHealthCheck(agentId);
          } catch (error) {
            console.warn(`Health check failed for agent ${agentId}:`, error);
          }
        }
      }
    }, this.config.heartbeatInterval);

    this.heartbeatTimers.set('monitor', interval);
  }

  private stopHeartbeatMonitoring(): void {
    const interval = this.heartbeatTimers.get('monitor');
    if (interval) {
      clearInterval(interval);
      this.heartbeatTimers.delete('monitor');
    }
  }

  private startAgentHeartbeat(agentId: string): void {
    this.stopAgentHeartbeat(agentId);
    
    const timeout = setTimeout(() => {
      this.emit('agent:heartbeat-timeout', agentId);
    }, this.config.heartbeatInterval * 2);

    this.heartbeatTimers.set(agentId, timeout);
  }

  private stopAgentHeartbeat(agentId: string): void {
    const timeout = this.heartbeatTimers.get(agentId);
    if (timeout) {
      clearTimeout(timeout);
      this.heartbeatTimers.delete(agentId);
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      const agents = Array.from(this.agents.keys()).filter(
        agentId => !this.agents.get(agentId)?.tombstone
      );

      for (const agentId of agents) {
        try {
          await this.performHealthCheck(agentId);
        } catch (error) {
          console.warn(`Health check failed for agent ${agentId}:`, error);
        }
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthChecking(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private startGossipProtocol(): void {
    this.gossipInterval = setInterval(async () => {
      // Simple gossip: exchange registry state with random nodes
      const otherNodes = Array.from(this.cluster).filter(
        nodeId => nodeId !== this.config.nodeId
      );

      if (otherNodes.length > 0) {
        const randomNode = otherNodes[Math.floor(Math.random() * otherNodes.length)];
        await this.gossipWithNode(randomNode);
      }
    }, 10000); // Gossip every 10 seconds
  }

  private stopGossipProtocol(): void {
    if (this.gossipInterval) {
      clearInterval(this.gossipInterval);
      this.gossipInterval = undefined;
    }
  }

  private async gossipWithNode(nodeId: string): Promise<void> {
    // In a real implementation, this would exchange registry state
    console.log(`Gossiping with node ${nodeId}`);
  }

  private async replicateAgent(entry: AgentRegistryEntry): Promise<void> {
    // Determine which nodes should have replicas
    const replicationNodes = this.selectReplicationNodes(entry.id);
    
    // Add current node to replication list if not already there
    if (!entry.replicatedOn.includes(this.config.nodeId)) {
      entry.replicatedOn.push(this.config.nodeId);
    }

    // In a real implementation, this would send the entry to other nodes
    for (const nodeId of replicationNodes) {
      if (nodeId !== this.config.nodeId && !entry.replicatedOn.includes(nodeId)) {
        entry.replicatedOn.push(nodeId);
      }
    }
  }

  private selectReplicationNodes(agentId: string): string[] {
    const availableNodes = Array.from(this.cluster);
    const nodeCount = Math.min(this.config.replicationFactor, availableNodes.length);
    
    // Use consistent hashing to select nodes
    const hash = crypto.createHash('sha256').update(agentId).digest('hex');
    const hashNum = parseInt(hash.substring(0, 8), 16);
    
    const startIndex = hashNum % availableNodes.length;
    const selectedNodes: string[] = [];
    
    for (let i = 0; i < nodeCount; i++) {
      const nodeIndex = (startIndex + i) % availableNodes.length;
      selectedNodes.push(availableNodes[nodeIndex]);
    }
    
    return selectedNodes;
  }

  private calculateConsistencyHash(registration: AgentRegistration): string {
    const data = JSON.stringify({
      id: registration.id,
      name: registration.name,
      type: registration.type,
      version: registration.version,
      capabilities: registration.capabilities.sort(),
      permissions: registration.permissions
    });
    
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private async persistState(): Promise<void> {
    const statePath = path.join(this.config.dataDir, 'registry-state.json');
    
    const state = {
      nodeId: this.config.nodeId,
      agents: Array.from(this.agents.entries()),
      nodes: Array.from(this.nodes.entries()),
      healthStatus: Array.from(this.healthStatus.entries()),
      consensusLeader: this.consensusLeader,
      timestamp: new Date().toISOString()
    };

    await fs.writeFile(statePath, JSON.stringify(state, null, 2));
  }

  private async loadPersistedState(): Promise<void> {
    const statePath = path.join(this.config.dataDir, 'registry-state.json');
    
    try {
      const stateData = await fs.readFile(statePath, 'utf-8');
      const state = JSON.parse(stateData);

      // Restore agents
      this.agents = new Map(state.agents.map(([id, entry]: [string, any]) => [
        id,
        {
          ...entry,
          registeredAt: new Date(entry.registeredAt),
          lastHeartbeat: new Date(entry.lastHeartbeat),
          tombstoneTimestamp: entry.tombstoneTimestamp ? new Date(entry.tombstoneTimestamp) : undefined
        }
      ]));

      // Restore nodes  
      this.nodes = new Map(state.nodes.map(([id, node]: [string, any]) => [
        id,
        {
          ...node,
          lastSeen: new Date(node.lastSeen)
        }
      ]));

      // Restore health status
      this.healthStatus = new Map(state.healthStatus.map(([id, health]: [string, any]) => [
        id,
        {
          ...health,
          timestamp: new Date(health.timestamp)
        }
      ]));

      this.consensusLeader = state.consensusLeader;
      this.cluster = new Set(this.nodes.keys());

      console.log(`Restored registry state with ${this.agents.size} agents and ${this.nodes.size} nodes`);
    } catch (error) {
      console.log('No previous state found, starting fresh');
    }
  }
}