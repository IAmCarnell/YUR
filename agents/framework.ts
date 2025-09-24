/**
 * YUR Agent Framework - Main Framework Class
 * Integrates all components into a cohesive production-ready agent system
 */

import { EventEmitter } from 'events';
import { AgentRegistry } from './agent-registry.js';
import { FlowRunner } from './flow-runner.js';
import { EventBus } from './event-bus.js';
import { SecretsAgent } from './secrets-agent.js';
import { ComplianceAgent } from './compliance-agent.js';
import { OrchestratorAgent } from './orchestrator-agent.js';
import { 
  AgentConfig, 
  AgentRuntimeStats, 
  IAgent,
  IAgentRegistry,
  IEventBus,
  IFlowRunner,
  ISecretsManager,
  IComplianceScanner
} from './types.js';

export class YURAgentFramework extends EventEmitter {
  private registry!: IAgentRegistry;
  private flowRunner!: IFlowRunner;
  private eventBus!: IEventBus;
  private secretsAgent!: SecretsAgent;
  private complianceAgent!: ComplianceAgent;
  private orchestratorAgent!: OrchestratorAgent;
  private agents: Map<string, IAgent> = new Map();
  private config: AgentConfig;
  private startTime: Date = new Date();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config?: Partial<AgentConfig>) {
    super();
    
    this.config = {
      registry: {
        persistent: true,
        filePath: './agent-registry.json',
        cleanupInterval: 30000,
        ...config?.registry
      },
      security: {
        enableAuthentication: true,
        keySize: 2048,
        signatureAlgorithm: 'RS256',
        maxTokenAge: 3600000,
        ...config?.security
      },
      health: {
        checkInterval: 30000,
        timeout: 5000,
        retries: 3,
        ...config?.health
      },
      flows: {
        maxConcurrentExecutions: 10,
        defaultTimeout: 300000,
        enableLogging: true,
        ...config?.flows
      },
      events: {
        maxHistorySize: 10000,
        enablePersistence: true,
        compressionThreshold: 1000,
        ...config?.events
      }
    };

    this.initializeComponents();
  }

  /**
   * Initialize all framework components
   */
  private initializeComponents(): void {
    // Initialize registry
    this.registry = new AgentRegistry(
      this.config.registry.filePath,
      {
        heartbeatTimeout: 60000,
        cleanupInterval: this.config.registry.cleanupInterval,
        saveInterval: 10000
      }
    );

    // Initialize event bus
    this.eventBus = new EventBus(
      this.registry,
      {
        maxHistorySize: this.config.events.maxHistorySize,
        persistenceEnabled: this.config.events.enablePersistence,
        historyFilePath: './event-history.json'
      }
    );

    // Initialize flow runner
    this.flowRunner = new FlowRunner(
      this.registry,
      {
        maxConcurrentExecutions: this.config.flows.maxConcurrentExecutions
      }
    );

    // Initialize core agents
    this.secretsAgent = new SecretsAgent(this.registry, {
      secretsFilePath: './secrets.enc',
      auditLogPath: './secrets-audit.json'
    });

    this.complianceAgent = new ComplianceAgent(
      this.registry,
      this.secretsAgent,
      this.eventBus
    );

    this.orchestratorAgent = new OrchestratorAgent(
      this.registry,
      this.eventBus,
      this.flowRunner
    );

    // Register core agents
    this.agents.set(this.secretsAgent.id, this.secretsAgent);
    this.agents.set(this.complianceAgent.id, this.complianceAgent);
    this.agents.set(this.orchestratorAgent.id, this.orchestratorAgent);

    this.setupEventHandlers();
  }

  /**
   * Start the framework
   */
  async start(): Promise<void> {
    try {
      console.log('Starting YUR Agent Framework...');

      // Register core agents first to ensure they have permissions
      for (const [id, agent] of this.agents) {
        await this.registry.register(agent.getRegistration());
        console.log(`Pre-registered agent: ${id}`);
      }

      // Initialize core agents
      for (const [id, agent] of this.agents) {
        await agent.initialize();
        console.log(`Initialized agent: ${id}`);
      }

      // Start health monitoring
      this.startHealthMonitoring();

      // Start framework-level health checks
      this.startFrameworkHealthChecks();

      this.emit('framework:started');
      console.log('YUR Agent Framework started successfully');
    } catch (error) {
      this.emit('framework:error', error);
      throw error;
    }
  }

  /**
   * Stop the framework
   */
  async stop(): Promise<void> {
    try {
      console.log('Stopping YUR Agent Framework...');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Shutdown all agents
      for (const [id, agent] of this.agents) {
        try {
          await agent.shutdown();
          await this.registry.unregister(id);
          console.log(`Shutdown agent: ${id}`);
        } catch (error) {
          console.error(`Error shutting down agent ${id}:`, error);
        }
      }

      // Shutdown framework components
      await this.registry.shutdown();
      await this.eventBus.shutdown();

      this.emit('framework:stopped');
      console.log('YUR Agent Framework stopped');
    } catch (error) {
      this.emit('framework:error', error);
      throw error;
    }
  }

  /**
   * Register a new agent with the framework
   */
  async registerAgent(agent: IAgent): Promise<void> {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent ${agent.id} already registered`);
    }

    try {
      await agent.initialize();
      await this.registry.register(agent.getRegistration());
      this.agents.set(agent.id, agent);

      this.emit('agent:registered', agent.id);
      console.log(`Registered new agent: ${agent.id}`);
    } catch (error) {
      this.emit('agent:registration:error', agent.id, error);
      throw error;
    }
  }

  /**
   * Unregister an agent from the framework
   */
  async unregisterAgent(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      await agent.shutdown();
      await this.registry.unregister(agentId);
      this.agents.delete(agentId);

      this.emit('agent:unregistered', agentId);
      console.log(`Unregistered agent: ${agentId}`);
    } catch (error) {
      this.emit('agent:unregistration:error', agentId, error);
      throw error;
    }
  }

  /**
   * Get framework statistics
   */
  getStats(): AgentRuntimeStats {
    const uptime = new Date().getTime() - this.startTime.getTime();
    const registryStats = this.registry.getStats();
    const eventStats = this.eventBus.getStats();
    const flowStats = this.flowRunner.getStats();
    const secretsStats = this.secretsAgent.getSecretsStats();
    const complianceStats = this.complianceAgent.getComplianceStats();
    const orchestrationStats = this.orchestratorAgent.getOrchestrationStats();

    return {
      totalAgents: registryStats.totalAgents,
      activeAgents: registryStats.healthyAgents,
      totalTasks: 0, // Would need to track across all agents
      completedTasks: 0,
      failedTasks: 0,
      averageTaskTime: 0,
      totalEvents: eventStats.totalEvents,
      totalFlowExecutions: orchestrationStats.totalTriggers,
      secretsAccessed: secretsStats.totalAccesses,
      securityViolations: complianceStats.criticalFindings,
      uptime: Math.floor(uptime / 1000)
    };
  }

  /**
   * Get all framework components
   */
  getComponents(): {
    registry: IAgentRegistry;
    eventBus: IEventBus;
    flowRunner: IFlowRunner;
    secretsManager: ISecretsManager;
    complianceScanner: IComplianceScanner;
  } {
    return {
      registry: this.registry,
      eventBus: this.eventBus,
      flowRunner: this.flowRunner,
      secretsManager: this.secretsAgent,
      complianceScanner: this.complianceAgent
    };
  }

  /**
   * Get all registered agents
   */
  getAgents(): Map<string, IAgent> {
    return new Map(this.agents);
  }

  /**
   * Get framework configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Perform framework health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    components: Record<string, { healthy: boolean; reason?: string }>;
    agents: Record<string, { healthy: boolean; reason?: string }>;
  }> {
    const componentHealth: Record<string, { healthy: boolean; reason?: string }> = {};
    const agentHealth: Record<string, { healthy: boolean; reason?: string }> = {};

    // Check registry health
    try {
      await this.registry.listAgents();
      componentHealth.registry = { healthy: true };
    } catch (error) {
      componentHealth.registry = { 
        healthy: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Check event bus health
    try {
      this.eventBus.getStats();
      componentHealth.eventBus = { healthy: true };
    } catch (error) {
      componentHealth.eventBus = { 
        healthy: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Check flow runner health
    try {
      this.flowRunner.getStats();
      componentHealth.flowRunner = { healthy: true };
    } catch (error) {
      componentHealth.flowRunner = { 
        healthy: false, 
        reason: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    // Check agent health
    for (const [id, agent] of this.agents) {
      try {
        const health = await agent.health();
        agentHealth[id] = {
          healthy: health.healthy,
          reason: health.reason
        };
      } catch (error) {
        agentHealth[id] = {
          healthy: false,
          reason: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    const allHealthy = Object.values(componentHealth).every(h => h.healthy) &&
                      Object.values(agentHealth).every(h => h.healthy);

    return {
      healthy: allHealthy,
      components: componentHealth,
      agents: agentHealth
    };
  }

  private setupEventHandlers(): void {
    // Framework event handling
    this.registry.on('agent:registered', (registration) => {
      this.emit('agent:registered', registration.id);
    });

    this.registry.on('agent:unregistered', (registration) => {
      this.emit('agent:unregistered', registration.id);
    });

    this.eventBus.on('event:published', (event) => {
      this.emit('event:published', event);
    });

    this.flowRunner.on('flow:completed', (context) => {
      this.emit('flow:completed', context);
    });

    // Error handling
    this.registry.on('error', (error) => {
      this.emit('framework:error', error);
    });

    this.eventBus.on('error', (error) => {
      this.emit('framework:error', error);
    });
  }

  private startHealthMonitoring(): void {
    for (const agent of this.agents.values()) {
      agent.on('health:check', (health) => {
        this.emit('agent:health', agent.id, health);
      });

      agent.on('health:warning', (health) => {
        this.emit('agent:health:warning', agent.id, health);
      });

      agent.on('error', (error) => {
        this.emit('agent:error', agent.id, error);
      });
    }
  }

  private startFrameworkHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.healthCheck();
        this.emit('framework:health', health);

        if (!health.healthy) {
          this.emit('framework:health:warning', health);
        }
      } catch (error) {
        this.emit('framework:error', error);
      }
    }, this.config.health.checkInterval);
  }
}