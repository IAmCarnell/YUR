/**
 * YUR Agent Framework - Base Agent Implementation
 * Production-ready base class for all agents
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { 
  IAgent, 
  AgentHealth, 
  AgentPermissions, 
  AgentTask, 
  AgentEvent,
  AgentRegistration
} from './types.js';

export abstract class BaseAgent extends EventEmitter implements IAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly type: string;
  public readonly permissions: AgentPermissions;
  
  private _privateKey: string;
  private _publicKey: string;
  private _initialized: boolean = false;
  private _running: boolean = false;
  private _healthCheckInterval?: NodeJS.Timeout;
  private _lastError?: Error;
  private _taskCount: number = 0;
  private _startTime: Date = new Date();

  constructor(
    id: string, 
    name: string, 
    type: string, 
    permissions: AgentPermissions,
    privateKey?: string
  ) {
    super();
    this.id = id;
    this.name = name;
    this.type = type;
    this.permissions = permissions;

    // Generate or set cryptographic keys
    if (privateKey) {
      this._privateKey = privateKey;
      this._publicKey = this.derivePublicKey(privateKey);
    } else {
      const keyPair = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      this._privateKey = keyPair.privateKey;
      this._publicKey = keyPair.publicKey;
    }

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.on('error', (error: Error) => {
      this._lastError = error;
      console.error(`Agent ${this.id} error:`, error);
    });

    this.on('task:start', (taskId: string) => {
      this._taskCount++;
    });

    this.on('task:complete', (taskId: string, result: any) => {
      // Task completed successfully
    });

    this.on('task:error', (taskId: string, error: Error) => {
      this._lastError = error;
    });
  }

  /**
   * Get agent health status
   */
  async health(): Promise<AgentHealth> {
    try {
      const now = new Date();
      const uptime = now.getTime() - this._startTime.getTime();
      
      // Perform health checks
      const healthChecks = await this.performHealthChecks();
      
      // Get system metrics
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const health: AgentHealth = {
        healthy: this._running && !this._lastError && healthChecks.every(check => check.healthy),
        reason: this._lastError?.message || healthChecks.find(c => !c.healthy)?.reason,
        lastCheck: now,
        metrics: {
          uptime: Math.floor(uptime / 1000),
          cpu: cpuUsage.user + cpuUsage.system,
          memory: memUsage.heapUsed,
          errors: this._lastError ? 1 : 0
        }
      };

      return health;
    } catch (error) {
      return {
        healthy: false,
        reason: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date()
      };
    }
  }

  /**
   * Initialize the agent
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      throw new Error(`Agent ${this.id} already initialized`);
    }

    try {
      // Perform agent-specific initialization
      await this.onInitialize();
      
      this._initialized = true;
      this._running = true;
      
      // Start health check monitoring
      this.startHealthMonitoring();
      
      this.emit('initialized');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the agent
   */
  async shutdown(): Promise<void> {
    if (!this._initialized) {
      return;
    }

    try {
      this._running = false;
      
      // Stop health monitoring
      if (this._healthCheckInterval) {
        clearInterval(this._healthCheckInterval);
      }
      
      // Perform agent-specific cleanup
      await this.onShutdown();
      
      this._initialized = false;
      this.emit('shutdown');
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Execute a task
   */
  async executeTask(task: AgentTask): Promise<any> {
    if (!this._running) {
      throw new Error(`Agent ${this.id} is not running`);
    }

    // Check permissions
    if (task.requiredPermissions) {
      for (const permission of task.requiredPermissions) {
        if (!this.permissions.allowedTasks.includes(permission)) {
          throw new Error(`Agent ${this.id} lacks permission: ${permission}`);
        }
      }
    }

    const startTime = new Date();
    this.emit('task:start', task.id);

    try {
      // Set timeout if specified
      const timeoutPromise = task.timeout ? 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Task timeout')), task.timeout)
        ) : null;

      // Execute the task
      const taskPromise = this.onExecuteTask(task);
      
      const result = timeoutPromise ? 
        await Promise.race([taskPromise, timeoutPromise]) : 
        await taskPromise;

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.emit('task:complete', task.id, result);
      this.emit('task:metrics', {
        taskId: task.id,
        duration,
        success: true
      });

      return result;
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.emit('task:error', task.id, error);
      this.emit('task:metrics', {
        taskId: task.id,
        duration,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Sign an event with the agent's private key
   */
  async signEvent(event: Omit<AgentEvent, 'signature'>): Promise<AgentEvent> {
    const eventData = JSON.stringify({
      id: event.id,
      type: event.type,
      source: event.source,
      topic: event.topic,
      data: event.data,
      timestamp: event.timestamp
    });

    const signature = crypto.sign('sha256', Buffer.from(eventData), this._privateKey);
    
    return {
      ...event,
      signature: signature.toString('base64')
    };
  }

  /**
   * Verify an event signature
   */
  async verifySignature(event: AgentEvent): Promise<boolean> {
    try {
      const eventData = JSON.stringify({
        id: event.id,
        type: event.type,
        source: event.source,
        topic: event.topic,
        data: event.data,
        timestamp: event.timestamp
      });

      const signature = Buffer.from(event.signature, 'base64');
      return crypto.verify('sha256', Buffer.from(eventData), this._publicKey, signature);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the agent's public key
   */
  getPublicKey(): string {
    return this._publicKey;
  }

  /**
   * Get registration information
   */
  getRegistration(): AgentRegistration {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      version: '1.0.0',
      description: this.getDescription(),
      capabilities: this.getCapabilities(),
      permissions: this.permissions,
      publicKey: this._publicKey,
      registeredAt: this._startTime,
      lastHeartbeat: new Date()
    };
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onShutdown(): Promise<void>;
  protected abstract onExecuteTask(task: AgentTask): Promise<any>;
  protected abstract performHealthChecks(): Promise<Array<{ healthy: boolean; reason?: string }>>;
  protected abstract getDescription(): string;
  protected abstract getCapabilities(): string[];

  private derivePublicKey(privateKey: string): string {
    const keyObject = crypto.createPrivateKey(privateKey);
    return keyObject.export({ type: 'spki', format: 'pem' }) as string;
  }

  private startHealthMonitoring(): void {
    this._healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.health();
        this.emit('health:check', health);
        
        if (!health.healthy) {
          this.emit('health:warning', health);
        }
      } catch (error) {
        this.emit('error', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check if agent has specific permission
   */
  hasPermission(permission: string, resource?: string): boolean {
    if (resource && resource.includes('secret')) {
      return this.permissions.allowedSecrets.includes(permission);
    }
    
    if (resource && resource.includes('event')) {
      return this.permissions.allowedEventTopics.includes(permission);
    }
    
    return this.permissions.allowedTasks.includes(permission);
  }

  /**
   * Get runtime statistics
   */
  getStats(): Record<string, any> {
    const uptime = new Date().getTime() - this._startTime.getTime();
    
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      uptime: Math.floor(uptime / 1000),
      taskCount: this._taskCount,
      initialized: this._initialized,
      running: this._running,
      lastError: this._lastError?.message,
      memoryUsage: process.memoryUsage()
    };
  }
}