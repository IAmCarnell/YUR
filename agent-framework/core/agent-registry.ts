/**
 * Agent Registry and Discovery System
 * Manages agent registration, discovery, load balancing, and health monitoring
 */

import { EventEmitter } from 'events';
import { BaseAgent, AgentHealthStatus, AgentConfig, AgentMetrics } from './agent-base';

// Registry interfaces
export interface AgentRegistration {
  id: string;
  instance: BaseAgent;
  config: AgentConfig;
  registeredAt: Date;
  lastSeen: Date;
  health: AgentHealthStatus;
  metrics: AgentMetrics;
  tags: string[];
  capabilities: string[];
}

export interface AgentDiscoveryQuery {
  type?: string;
  tags?: string[];
  capabilities?: string[];
  healthyOnly?: boolean;
  maxResults?: number;
  loadBalancing?: 'round-robin' | 'least-loaded' | 'random' | 'health-based';
}

export interface AgentLoadBalancingState {
  lastSelectedIndex: number;
  requestCounts: Map<string, number>;
}

// Agent Registry implementation
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentRegistration> = new Map();
  private typeIndex: Map<string, Set<string>> = new Map();
  private tagIndex: Map<string, Set<string>> = new Map();
  private capabilityIndex: Map<string, Set<string>> = new Map();
  private loadBalancingState: AgentLoadBalancingState = {
    lastSelectedIndex: -1,
    requestCounts: new Map(),
  };
  private healthCheckInterval: number = 30000; // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    super();
    this.startHealthMonitoring();
  }

  /**
   * Register an agent with the registry
   */
  public async register(agent: BaseAgent, options: {
    tags?: string[];
    capabilities?: string[];
  } = {}): Promise<void> {
    const id = agent.getId();
    const config = agent.getConfig();
    
    if (this.agents.has(id)) {
      throw new Error(`Agent with ID ${id} is already registered`);
    }

    const registration: AgentRegistration = {
      id,
      instance: agent,
      config,
      registeredAt: new Date(),
      lastSeen: new Date(),
      health: agent.getHealth(),
      metrics: agent.getMetrics(),
      tags: options.tags || [],
      capabilities: options.capabilities || [],
    };

    this.agents.set(id, registration);
    this.updateIndexes(id, registration);
    this.setupAgentEventListeners(agent);

    this.emit('agent:registered', { agentId: id, registration });
    console.log(`Agent ${id} (${config.type}) registered successfully`);
  }

  /**
   * Unregister an agent from the registry
   */
  public async unregister(agentId: string): Promise<boolean> {
    const registration = this.agents.get(agentId);
    if (!registration) {
      return false;
    }

    // Stop the agent if it's still running
    try {
      if (registration.instance.getStatus() !== 'stopped') {
        await registration.instance.stop();
      }
    } catch (error) {
      console.warn(`Error stopping agent ${agentId} during unregister:`, error.message);
    }

    this.agents.delete(agentId);
    this.removeFromIndexes(agentId, registration);
    this.loadBalancingState.requestCounts.delete(agentId);

    this.emit('agent:unregistered', { agentId });
    console.log(`Agent ${agentId} unregistered successfully`);
    
    return true;
  }

  /**
   * Discover agents based on query criteria
   */
  public discover(query: AgentDiscoveryQuery = {}): AgentRegistration[] {
    let candidates = Array.from(this.agents.values());

    // Filter by type
    if (query.type) {
      const typeAgents = this.typeIndex.get(query.type);
      if (typeAgents) {
        candidates = candidates.filter(agent => typeAgents.has(agent.id));
      } else {
        return [];
      }
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      candidates = candidates.filter(agent =>
        query.tags!.every(tag => agent.tags.includes(tag))
      );
    }

    // Filter by capabilities
    if (query.capabilities && query.capabilities.length > 0) {
      candidates = candidates.filter(agent =>
        query.capabilities!.every(capability => agent.capabilities.includes(capability))
      );
    }

    // Filter by health
    if (query.healthyOnly !== false) {
      candidates = candidates.filter(agent => agent.health.healthy);
    }

    // Apply load balancing
    if (candidates.length > 1 && query.loadBalancing) {
      candidates = this.applyLoadBalancing(candidates, query.loadBalancing);
    }

    // Limit results
    if (query.maxResults && query.maxResults > 0) {
      candidates = candidates.slice(0, query.maxResults);
    }

    return candidates;
  }

  /**
   * Get a specific agent by ID
   */
  public getAgent(agentId: string): AgentRegistration | undefined {
    return this.agents.get(agentId);
  }

  /**
   * List all registered agents
   */
  public listAgents(): AgentRegistration[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    agentsByType: Record<string, number>;
    agentsByStatus: Record<string, number>;
  } {
    const agents = Array.from(this.agents.values());
    const stats = {
      totalAgents: agents.length,
      healthyAgents: agents.filter(a => a.health.healthy).length,
      unhealthyAgents: agents.filter(a => !a.health.healthy).length,
      agentsByType: {} as Record<string, number>,
      agentsByStatus: {} as Record<string, number>,
    };

    agents.forEach(agent => {
      // Count by type
      const type = agent.config.type;
      stats.agentsByType[type] = (stats.agentsByType[type] || 0) + 1;

      // Count by status
      const status = agent.instance.getStatus();
      stats.agentsByStatus[status] = (stats.agentsByStatus[status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Find the best agent for a specific task
   */
  public selectAgentForTask(
    taskType: string,
    requirements: {
      capabilities?: string[];
      tags?: string[];
      loadBalancing?: AgentDiscoveryQuery['loadBalancing'];
    } = {}
  ): AgentRegistration | null {
    const query: AgentDiscoveryQuery = {
      healthyOnly: true,
      maxResults: 1,
      capabilities: requirements.capabilities,
      tags: requirements.tags,
      loadBalancing: requirements.loadBalancing || 'least-loaded',
    };

    // Filter agents that can handle this task type
    const candidates = this.discover(query).filter(agent =>
      agent.instance.hasPermission('task', taskType)
    );

    if (candidates.length === 0) {
      return null;
    }

    const selected = candidates[0];
    this.incrementRequestCount(selected.id);
    
    this.emit('agent:selected', { 
      agentId: selected.id, 
      taskType,
      loadBalancing: query.loadBalancing 
    });

    return selected;
  }

  /**
   * Distribute a task to the best available agent
   */
  public async distributeTask(
    taskType: string,
    taskPayload: any,
    requirements: Parameters<typeof this.selectAgentForTask>[1] = {}
  ): Promise<{ agentId: string; result: any }> {
    const agent = this.selectAgentForTask(taskType, requirements);
    
    if (!agent) {
      throw new Error(`No suitable agent found for task type: ${taskType}`);
    }

    const task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: taskType,
      payload: taskPayload,
      priority: 'medium' as const,
      createdAt: new Date(),
    };

    try {
      const result = await agent.instance.executeTask(task);
      return { agentId: agent.id, result };
    } catch (error) {
      this.emit('task:distribution_failed', {
        agentId: agent.id,
        taskId: task.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Shutdown the registry and all agents
   */
  public async shutdown(): Promise<void> {
    this.stopHealthMonitoring();

    const shutdownPromises = Array.from(this.agents.values()).map(async (registration) => {
      try {
        if (registration.instance.getStatus() !== 'stopped') {
          await registration.instance.stop();
        }
      } catch (error) {
        console.warn(`Error stopping agent ${registration.id}:`, error.message);
      }
    });

    await Promise.all(shutdownPromises);
    this.agents.clear();
    this.clearIndexes();
    
    this.emit('registry:shutdown');
    console.log('Agent registry shutdown completed');
  }

  // Private methods
  private updateIndexes(agentId: string, registration: AgentRegistration): void {
    // Update type index
    const type = registration.config.type;
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(agentId);

    // Update tag index
    registration.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(agentId);
    });

    // Update capability index
    registration.capabilities.forEach(capability => {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)!.add(agentId);
    });
  }

  private removeFromIndexes(agentId: string, registration: AgentRegistration): void {
    // Remove from type index
    const typeSet = this.typeIndex.get(registration.config.type);
    if (typeSet) {
      typeSet.delete(agentId);
      if (typeSet.size === 0) {
        this.typeIndex.delete(registration.config.type);
      }
    }

    // Remove from tag index
    registration.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(agentId);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });

    // Remove from capability index
    registration.capabilities.forEach(capability => {
      const capabilitySet = this.capabilityIndex.get(capability);
      if (capabilitySet) {
        capabilitySet.delete(agentId);
        if (capabilitySet.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    });
  }

  private clearIndexes(): void {
    this.typeIndex.clear();
    this.tagIndex.clear();
    this.capabilityIndex.clear();
  }

  private setupAgentEventListeners(agent: BaseAgent): void {
    const agentId = agent.getId();

    agent.on('health:changed', (event) => {
      const registration = this.agents.get(agentId);
      if (registration) {
        registration.health = event.health;
        registration.lastSeen = new Date();
        this.emit('agent:health_changed', { agentId, health: event.health });
      }
    });

    agent.on('task:completed', (event) => {
      const registration = this.agents.get(agentId);
      if (registration) {
        registration.metrics = agent.getMetrics();
        registration.lastSeen = new Date();
      }
      this.emit('agent:task_completed', event);
    });

    agent.on('task:failed', (event) => {
      const registration = this.agents.get(agentId);
      if (registration) {
        registration.metrics = agent.getMetrics();
        registration.lastSeen = new Date();
      }
      this.emit('agent:task_failed', event);
    });
  }

  private applyLoadBalancing(
    candidates: AgentRegistration[],
    strategy: NonNullable<AgentDiscoveryQuery['loadBalancing']>
  ): AgentRegistration[] {
    switch (strategy) {
      case 'round-robin':
        this.loadBalancingState.lastSelectedIndex = 
          (this.loadBalancingState.lastSelectedIndex + 1) % candidates.length;
        return [candidates[this.loadBalancingState.lastSelectedIndex]];

      case 'least-loaded':
        candidates.sort((a, b) => {
          const aLoad = this.loadBalancingState.requestCounts.get(a.id) || 0;
          const bLoad = this.loadBalancingState.requestCounts.get(b.id) || 0;
          return aLoad - bLoad;
        });
        return [candidates[0]];

      case 'random':
        const randomIndex = Math.floor(Math.random() * candidates.length);
        return [candidates[randomIndex]];

      case 'health-based':
        candidates.sort((a, b) => {
          // Sort by health score (higher is better)
          const aScore = this.calculateHealthScore(a);
          const bScore = this.calculateHealthScore(b);
          return bScore - aScore;
        });
        return [candidates[0]];

      default:
        return candidates;
    }
  }

  private calculateHealthScore(agent: AgentRegistration): number {
    let score = 100;

    // Reduce score based on error rate
    const totalTasks = agent.metrics.tasksCompleted + agent.metrics.tasksErrors;
    if (totalTasks > 0) {
      const errorRate = agent.metrics.tasksErrors / totalTasks;
      score -= errorRate * 50; // Max 50 point reduction for errors
    }

    // Reduce score based on response time
    if (agent.metrics.avgExecutionTime > 5000) { // 5 seconds
      score -= Math.min(30, (agent.metrics.avgExecutionTime - 5000) / 1000); // Max 30 point reduction
    }

    // Reduce score if not recently seen
    const timeSinceLastSeen = Date.now() - agent.lastSeen.getTime();
    if (timeSinceLastSeen > 60000) { // 1 minute
      score -= Math.min(20, timeSinceLastSeen / 60000); // Max 20 point reduction
    }

    return Math.max(0, score);
  }

  private incrementRequestCount(agentId: string): void {
    const currentCount = this.loadBalancingState.requestCounts.get(agentId) || 0;
    this.loadBalancingState.requestCounts.set(agentId, currentCount + 1);
  }

  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private performHealthCheck(): void {
    const now = new Date();
    const unhealthyAgents: string[] = [];

    this.agents.forEach((registration, agentId) => {
      // Update health and metrics from agent
      registration.health = registration.instance.getHealth();
      registration.metrics = registration.instance.getMetrics();

      // Check if agent is responsive
      const timeSinceLastSeen = now.getTime() - registration.lastSeen.getTime();
      if (timeSinceLastSeen > this.healthCheckInterval * 2) {
        registration.health = {
          healthy: false,
          reason: 'Agent unresponsive',
          timestamp: now,
        };
        unhealthyAgents.push(agentId);
      }
    });

    if (unhealthyAgents.length > 0) {
      this.emit('agents:unhealthy', { agentIds: unhealthyAgents, timestamp: now });
    }

    this.emit('health:check_completed', {
      totalAgents: this.agents.size,
      unhealthyCount: unhealthyAgents.length,
      timestamp: now,
    });
  }
}

// Singleton registry instance
let globalRegistry: AgentRegistry | null = null;

export function getGlobalRegistry(): AgentRegistry {
  if (!globalRegistry) {
    globalRegistry = new AgentRegistry();
  }
  return globalRegistry;
}

export function setGlobalRegistry(registry: AgentRegistry): void {
  if (globalRegistry) {
    globalRegistry.removeAllListeners();
  }
  globalRegistry = registry;
}

export default AgentRegistry;