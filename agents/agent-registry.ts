/**
 * YUR Agent Framework - Agent Registry
 * Central registry for agent self-registration with in-memory and persistent storage
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { IAgentRegistry, AgentRegistration } from './types.js';

export class AgentRegistry extends EventEmitter implements IAgentRegistry {
  private agents: Map<string, AgentRegistration> = new Map();
  private registryFilePath: string;
  private cleanupInterval?: NodeJS.Timeout;
  private saveInterval?: NodeJS.Timeout;
  private heartbeatTimeout: number = 60000; // 1 minute

  constructor(
    registryFilePath: string = './agent-registry.json',
    options: {
      heartbeatTimeout?: number;
      cleanupInterval?: number;
      saveInterval?: number;
    } = {}
  ) {
    super();
    this.registryFilePath = path.resolve(registryFilePath);
    this.heartbeatTimeout = options.heartbeatTimeout || 60000;

    // Start cleanup and save intervals
    this.startCleanupInterval(options.cleanupInterval || 30000);
    this.startSaveInterval(options.saveInterval || 10000);

    // Load existing registry on startup
    this.loadFromFile().catch(error => {
      console.warn('Failed to load agent registry from file:', error.message);
    });
  }

  /**
   * Register a new agent
   */
  async register(registration: AgentRegistration): Promise<void> {
    try {
      // Validate registration
      this.validateRegistration(registration);

      // Check for duplicate IDs
      if (this.agents.has(registration.id)) {
        throw new Error(`Agent with ID ${registration.id} already registered`);
      }

      // Add to in-memory registry
      const fullRegistration: AgentRegistration = {
        ...registration,
        registeredAt: new Date(),
        lastHeartbeat: new Date()
      };

      this.agents.set(registration.id, fullRegistration);

      // Persist to file
      await this.saveToFile();

      this.emit('agent:registered', fullRegistration);
      console.log(`Agent registered: ${registration.id} (${registration.name})`);
    } catch (error) {
      this.emit('agent:registration:error', registration.id, error);
      throw error;
    }
  }

  /**
   * Unregister an agent
   */
  async unregister(agentId: string): Promise<void> {
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      this.agents.delete(agentId);
      await this.saveToFile();

      this.emit('agent:unregistered', agent);
      console.log(`Agent unregistered: ${agentId}`);
    } catch (error) {
      this.emit('agent:unregistration:error', agentId, error);
      throw error;
    }
  }

  /**
   * Get agent registration info
   */
  async getAgent(agentId: string): Promise<AgentRegistration | null> {
    return this.agents.get(agentId) || null;
  }

  /**
   * List all agents, optionally filtered by type
   */
  async listAgents(type?: string): Promise<AgentRegistration[]> {
    const allAgents = Array.from(this.agents.values());
    
    if (type) {
      return allAgents.filter(agent => agent.type === type);
    }
    
    return allAgents;
  }

  /**
   * Update agent heartbeat
   */
  async updateHeartbeat(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.lastHeartbeat = new Date();
    this.emit('agent:heartbeat', agentId);
  }

  /**
   * Check if agent has specific permission
   */
  async checkPermission(agentId: string, permission: string, resource?: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return false;
    }

    const permissions = agent.permissions;

    // Check based on resource type
    if (resource?.startsWith('secret:')) {
      return permissions.allowedSecrets.includes(permission) || 
             permissions.allowedSecrets.includes('*') ||
             permissions.allowedSecrets.some(p => this.wildcardMatch(p, permission));
    }

    if (resource?.startsWith('event:')) {
      return permissions.allowedEventTopics.includes(permission) || 
             permissions.allowedEventTopics.includes('*') ||
             permissions.allowedEventTopics.some(p => this.wildcardMatch(p, permission));
    }

    // Default to task permissions
    return permissions.allowedTasks.includes(permission) || 
           permissions.allowedTasks.includes('*') ||
           permissions.allowedTasks.some(p => this.wildcardMatch(p, permission));
  }

  private wildcardMatch(pattern: string, text: string): boolean {
    if (pattern === '*') return true;
    if (pattern === text) return true;
    
    // Convert wildcard pattern to regex
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(text);
  }

  /**
   * Get agents by capability
   */
  async getAgentsByCapability(capability: string): Promise<AgentRegistration[]> {
    return Array.from(this.agents.values()).filter(agent =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Get healthy agents (recent heartbeat)
   */
  async getHealthyAgents(): Promise<AgentRegistration[]> {
    const now = new Date();
    return Array.from(this.agents.values()).filter(agent => {
      const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      return timeSinceHeartbeat < this.heartbeatTimeout;
    });
  }

  /**
   * Get unhealthy agents (stale heartbeat)
   */
  async getUnhealthyAgents(): Promise<AgentRegistration[]> {
    const now = new Date();
    return Array.from(this.agents.values()).filter(agent => {
      const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      return timeSinceHeartbeat >= this.heartbeatTimeout;
    });
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    healthyAgents: number;
    unhealthyAgents: number;
    agentsByType: Record<string, number>;
    agentsByCapability: Record<string, number>;
  } {
    const agents = Array.from(this.agents.values());
    const now = new Date();
    
    const healthyCount = agents.filter(agent => {
      const timeSinceHeartbeat = now.getTime() - agent.lastHeartbeat.getTime();
      return timeSinceHeartbeat < this.heartbeatTimeout;
    }).length;

    const agentsByType: Record<string, number> = {};
    const agentsByCapability: Record<string, number> = {};

    for (const agent of agents) {
      agentsByType[agent.type] = (agentsByType[agent.type] || 0) + 1;
      
      for (const capability of agent.capabilities) {
        agentsByCapability[capability] = (agentsByCapability[capability] || 0) + 1;
      }
    }

    return {
      totalAgents: agents.length,
      healthyAgents: healthyCount,
      unhealthyAgents: agents.length - healthyCount,
      agentsByType,
      agentsByCapability
    };
  }

  /**
   * Shutdown the registry
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    
    await this.saveToFile();
    this.emit('shutdown');
  }

  private validateRegistration(registration: AgentRegistration): void {
    if (!registration.id || !registration.name || !registration.type) {
      throw new Error('Agent registration missing required fields: id, name, type');
    }

    if (!registration.permissions) {
      throw new Error('Agent registration missing permissions');
    }

    if (!Array.isArray(registration.capabilities)) {
      throw new Error('Agent capabilities must be an array');
    }

    if (!registration.publicKey) {
      throw new Error('Agent registration missing public key');
    }
  }

  private async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.registryFilePath, 'utf-8');
      const registrations: AgentRegistration[] = JSON.parse(data);
      
      for (const registration of registrations) {
        // Convert date strings back to Date objects
        registration.registeredAt = new Date(registration.registeredAt);
        registration.lastHeartbeat = new Date(registration.lastHeartbeat);
        
        this.agents.set(registration.id, registration);
      }
      
      console.log(`Loaded ${registrations.length} agents from registry file`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, start with empty registry
    }
  }

  private async saveToFile(): Promise<void> {
    try {
      const registrations = Array.from(this.agents.values());
      const data = JSON.stringify(registrations, null, 2);
      
      // Ensure directory exists
      const dir = path.dirname(this.registryFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.registryFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save agent registry:', error);
      this.emit('save:error', error);
    }
  }

  private startCleanupInterval(interval: number): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const unhealthyAgents = await this.getUnhealthyAgents();
        
        for (const agent of unhealthyAgents) {
          console.warn(`Agent ${agent.id} has stale heartbeat, considering removal`);
          this.emit('agent:stale', agent);
          
          // Auto-remove agents that haven't checked in for 5 minutes
          const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
          if (agent.lastHeartbeat < fiveMinutesAgo) {
            console.log(`Auto-removing stale agent: ${agent.id}`);
            await this.unregister(agent.id);
          }
        }
      } catch (error) {
        console.error('Error during registry cleanup:', error);
      }
    }, interval);
  }

  private startSaveInterval(interval: number): void {
    this.saveInterval = setInterval(async () => {
      await this.saveToFile();
    }, interval);
  }
}