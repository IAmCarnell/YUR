/**
 * Base Agent Implementation for YUR Framework
 * Provides core functionality for all agents including health monitoring,
 * security, task management, and event handling
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Core interfaces
export interface AgentHealthStatus {
  healthy: boolean;
  reason?: string;
  timestamp: Date;
  metrics?: Record<string, any>;
}

export interface AgentTask {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  timeout?: number;
  retries?: number;
  maxRetries?: number;
}

export interface AgentPermissions {
  tasks: string[];
  secrets: string[];
  events: string[];
  resources: string[];
}

export interface AgentConfig {
  id?: string;
  name: string;
  type: string;
  permissions: AgentPermissions;
  maxConcurrentTasks: number;
  healthCheckInterval: number;
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksErrors: number;
  avgExecutionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  uptime: number;
}

// Abstract base agent class
export abstract class BaseAgent extends EventEmitter {
  protected readonly id: string;
  protected readonly config: AgentConfig;
  protected status: 'idle' | 'running' | 'busy' | 'error' | 'stopped' = 'idle';
  protected activeTasks: Map<string, AgentTask> = new Map();
  protected taskQueue: AgentTask[] = [];
  protected healthStatus: AgentHealthStatus;
  protected metrics: AgentMetrics;
  protected lastHealthCheck: Date;
  protected healthCheckTimer?: NodeJS.Timeout;
  protected secretsCache: Map<string, any> = new Map();

  constructor(config: AgentConfig) {
    super();
    this.id = config.id || uuidv4();
    this.config = config;
    this.healthStatus = {
      healthy: true,
      timestamp: new Date(),
    };
    this.metrics = {
      tasksCompleted: 0,
      tasksErrors: 0,
      avgExecutionTime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      uptime: 0,
    };
    this.lastHealthCheck = new Date();
    
    this.setupHealthChecking();
    this.emit('agent:created', { id: this.id, config: this.config });
  }

  // Public API methods
  public getId(): string {
    return this.id;
  }

  public getStatus(): string {
    return this.status;
  }

  public getHealth(): AgentHealthStatus {
    return { ...this.healthStatus };
  }

  public getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  public getConfig(): AgentConfig {
    return { ...this.config };
  }

  public async start(): Promise<void> {
    if (this.status !== 'idle' && this.status !== 'stopped') {
      throw new Error(`Cannot start agent in ${this.status} state`);
    }

    try {
      await this.onStart();
      this.status = 'running';
      this.startHealthChecking();
      this.processTaskQueue();
      this.emit('agent:started', { id: this.id });
    } catch (error) {
      this.status = 'error';
      this.updateHealthStatus(false, `Start failed: ${error.message}`);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (this.status === 'stopped') return;

    try {
      // Wait for active tasks to complete or timeout
      await this.drainActiveTasks();
      
      await this.onStop();
      this.status = 'stopped';
      this.stopHealthChecking();
      this.emit('agent:stopped', { id: this.id });
    } catch (error) {
      this.status = 'error';
      this.updateHealthStatus(false, `Stop failed: ${error.message}`);
      throw error;
    }
  }

  public async executeTask(task: AgentTask): Promise<any> {
    // Validate task permissions
    if (!this.hasTaskPermission(task.type)) {
      throw new Error(`Agent does not have permission to execute task type: ${task.type}`);
    }

    // Check if agent can accept more tasks
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.taskQueue.push(task);
      this.emit('task:queued', { agentId: this.id, taskId: task.id });
      return { queued: true, position: this.taskQueue.length };
    }

    return this.processTask(task);
  }

  public async cancelTask(taskId: string): Promise<boolean> {
    // Remove from queue if present
    const queueIndex = this.taskQueue.findIndex(t => t.id === taskId);
    if (queueIndex >= 0) {
      this.taskQueue.splice(queueIndex, 1);
      this.emit('task:cancelled', { agentId: this.id, taskId });
      return true;
    }

    // Cancel active task if present
    const activeTask = this.activeTasks.get(taskId);
    if (activeTask) {
      try {
        await this.onCancelTask(taskId);
        this.activeTasks.delete(taskId);
        this.emit('task:cancelled', { agentId: this.id, taskId });
        return true;
      } catch (error) {
        this.emit('task:cancel_failed', { agentId: this.id, taskId, error: error.message });
        return false;
      }
    }

    return false;
  }

  public hasPermission(type: 'task' | 'secret' | 'event' | 'resource', identifier: string): boolean {
    switch (type) {
      case 'task':
        return this.config.permissions.tasks.includes(identifier) || 
               this.config.permissions.tasks.includes('*');
      case 'secret':
        return this.config.permissions.secrets.includes(identifier) ||
               this.config.permissions.secrets.includes('*');
      case 'event':
        return this.config.permissions.events.includes(identifier) ||
               this.config.permissions.events.includes('*');
      case 'resource':
        return this.config.permissions.resources.includes(identifier) ||
               this.config.permissions.resources.includes('*');
      default:
        return false;
    }
  }

  // Abstract methods that subclasses must implement
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract onExecuteTask(task: AgentTask): Promise<any>;
  protected abstract onCancelTask(taskId: string): Promise<void>;
  protected abstract onHealthCheck(): Promise<AgentHealthStatus>;

  // Protected utility methods
  protected async getSecret(secretName: string): Promise<any> {
    if (!this.hasPermission('secret', secretName)) {
      throw new Error(`Agent does not have permission to access secret: ${secretName}`);
    }

    // Check cache first
    if (this.secretsCache.has(secretName)) {
      return this.secretsCache.get(secretName);
    }

    // Retrieve from secure storage (implement based on your secret management system)
    const secret = await this.retrieveSecret(secretName);
    this.secretsCache.set(secretName, secret);
    
    this.emit('secret:accessed', { agentId: this.id, secretName, timestamp: new Date() });
    return secret;
  }

  protected async emitSecureEvent(eventType: string, payload: any): Promise<void> {
    if (!this.hasPermission('event', eventType)) {
      throw new Error(`Agent does not have permission to emit event: ${eventType}`);
    }

    // Sign the event with agent's private key for authenticity
    const signature = this.signEventPayload(payload);
    
    this.emit(eventType, {
      agentId: this.id,
      payload,
      signature,
      timestamp: new Date(),
    });
  }

  protected updateMetrics(taskResult: { success: boolean; executionTime: number }): void {
    if (taskResult.success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksErrors++;
    }

    // Update average execution time
    const totalTasks = this.metrics.tasksCompleted + this.metrics.tasksErrors;
    this.metrics.avgExecutionTime = 
      (this.metrics.avgExecutionTime * (totalTasks - 1) + taskResult.executionTime) / totalTasks;

    // Update system metrics
    this.updateSystemMetrics();
  }

  // Private methods
  private async processTask(task: AgentTask): Promise<any> {
    const startTime = Date.now();
    this.activeTasks.set(task.id, task);
    
    try {
      this.emit('task:started', { agentId: this.id, taskId: task.id });
      
      const result = await Promise.race([
        this.onExecuteTask(task),
        this.createTaskTimeout(task)
      ]);

      const executionTime = Date.now() - startTime;
      this.updateMetrics({ success: true, executionTime });
      
      this.activeTasks.delete(task.id);
      this.emit('task:completed', { agentId: this.id, taskId: task.id, result, executionTime });
      
      // Process next task in queue
      this.processTaskQueue();
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics({ success: false, executionTime });
      
      this.activeTasks.delete(task.id);
      
      // Handle retries
      if (task.retries && task.retries < (task.maxRetries || this.config.retryPolicy.maxRetries)) {
        task.retries++;
        
        // Exponential backoff
        const delay = this.config.retryPolicy.retryDelay * 
                     Math.pow(this.config.retryPolicy.backoffMultiplier, task.retries - 1);
        
        setTimeout(() => {
          this.taskQueue.unshift(task); // Add to front of queue
          this.processTaskQueue();
        }, delay);
        
        this.emit('task:retry', { agentId: this.id, taskId: task.id, attempt: task.retries });
        return { retry: true, attempt: task.retries };
      }
      
      this.emit('task:failed', { agentId: this.id, taskId: task.id, error: error.message });
      throw error;
    }
  }

  private async createTaskTimeout(task: AgentTask): Promise<never> {
    const timeout = task.timeout || this.config.timeout;
    
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Task ${task.id} timed out after ${timeout}ms`));
      }, timeout);
    });
  }

  private processTaskQueue(): void {
    if (this.status !== 'running' || this.taskQueue.length === 0) return;
    
    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const task = this.taskQueue.shift()!;
      this.processTask(task).catch(error => {
        this.emit('task:failed', { agentId: this.id, taskId: task.id, error: error.message });
      });
    }
  }

  private async drainActiveTasks(): Promise<void> {
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.activeTasks.size > 0 && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.activeTasks.size > 0) {
      console.warn(`Agent ${this.id} stopped with ${this.activeTasks.size} active tasks`);
    }
  }

  private hasTaskPermission(taskType: string): boolean {
    return this.hasPermission('task', taskType);
  }

  private setupHealthChecking(): void {
    this.on('task:completed', () => this.updateHealthStatus(true));
    this.on('task:failed', (event) => this.updateHealthStatus(false, `Task failed: ${event.error}`));
  }

  private startHealthChecking(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const health = await this.onHealthCheck();
        this.healthStatus = health;
        this.lastHealthCheck = new Date();
        this.emit('health:updated', { agentId: this.id, health });
      } catch (error) {
        this.updateHealthStatus(false, `Health check failed: ${error.message}`);
      }
    }, this.config.healthCheckInterval);
  }

  private stopHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private updateHealthStatus(healthy: boolean, reason?: string): void {
    this.healthStatus = {
      healthy,
      reason,
      timestamp: new Date(),
      metrics: this.metrics,
    };
    
    this.emit('health:changed', { agentId: this.id, health: this.healthStatus });
  }

  private updateSystemMetrics(): void {
    // Update system metrics (memory, CPU, etc.)
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed;
    this.metrics.uptime = Date.now() - (this.lastHealthCheck?.getTime() || Date.now());
  }

  private async retrieveSecret(secretName: string): Promise<any> {
    // Implement secure secret retrieval based on your secret management system
    // This is a placeholder implementation
    return process.env[secretName] || null;
  }

  private signEventPayload(payload: any): string {
    // Create cryptographic signature for event authenticity
    const payloadString = JSON.stringify(payload);
    const hash = crypto.createHash('sha256').update(payloadString).digest('hex');
    return hash; // In production, use proper RSA signing
  }
}

// Utility functions
export function createTaskId(): string {
  return `task_${uuidv4()}`;
}

export function createAgentTask(
  type: string,
  payload: any,
  options: Partial<Pick<AgentTask, 'priority' | 'timeout' | 'maxRetries'>> = {}
): AgentTask {
  return {
    id: createTaskId(),
    type,
    payload,
    priority: options.priority || 'medium',
    createdAt: new Date(),
    timeout: options.timeout,
    retries: 0,
    maxRetries: options.maxRetries,
  };
}

export default BaseAgent;