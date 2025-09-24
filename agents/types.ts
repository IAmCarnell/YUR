/**
 * YUR Agent Framework - Core Types and Interfaces
 * Production-ready type definitions for agent system
 */

import { EventEmitter } from 'events';

// Agent Health Status
export interface AgentHealth {
  healthy: boolean;
  reason?: string;
  lastCheck?: Date;
  metrics?: {
    uptime: number;
    cpu: number;
    memory: number;
    errors: number;
  };
}

// Agent Permissions
export interface AgentPermissions {
  allowedTasks: string[];
  allowedSecrets: string[];
  allowedEventTopics: string[];
  maxConcurrentTasks?: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
}

// Agent Registration Info
export interface AgentRegistration {
  id: string;
  name: string;
  type: string;
  version: string;
  description?: string;
  capabilities: string[];
  permissions: AgentPermissions;
  publicKey: string; // For cryptographic authentication
  registeredAt: Date;
  lastHeartbeat: Date;
  endpoint?: string;
  metadata?: Record<string, any>;
}

// Flow Step Definition
export interface FlowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'loop' | 'parallel' | 'wait';
  agent?: string;
  action?: string;
  parameters?: Record<string, any>;
  condition?: {
    expression: string;
    onTrue?: string; // next step id
    onFalse?: string; // next step id
  };
  retry?: {
    maxAttempts: number;
    backoff: 'linear' | 'exponential';
    delay: number;
  };
  timeout?: number;
  dependencies?: string[]; // step ids this depends on
}

// Flow Definition
export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  steps: FlowStep[];
  variables?: Record<string, any>;
  onError?: string; // step id for error handling
  permissions?: AgentPermissions;
}

// Flow Execution Context
export interface FlowContext {
  flowId: string;
  executionId: string;
  steps: Record<string, {
    result?: any;
    error?: Error;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    startTime?: Date;
    endTime?: Date;
    retryCount?: number;
  }>;
  variables: Record<string, any>;
  user?: string;
  permissions: AgentPermissions;
}

// Event Types
export interface AgentEvent {
  id: string;
  type: string;
  source: string; // agent id
  topic: string;
  data: any;
  timestamp: Date;
  signature: string; // cryptographic signature
}

// Task Definition
export interface AgentTask {
  id: string;
  type: string;
  parameters: Record<string, any>;
  requiredPermissions?: string[];
  timeout?: number;
  priority?: number;
  retries?: number;
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

// Secret Access Record
export interface SecretAccess {
  secretId: string;
  agentId: string;
  operation: 'read' | 'write' | 'delete';
  timestamp: Date;
  success: boolean;
  reason?: string;
  ipAddress?: string;
}

// Base Agent Interface
export interface IAgent extends EventEmitter {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly permissions: AgentPermissions;

  // Core methods
  health(): Promise<AgentHealth>;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  executeTask(task: AgentTask): Promise<any>;
  getRegistration(): AgentRegistration;
  
  // Authentication
  signEvent(event: Omit<AgentEvent, 'signature'>): Promise<AgentEvent>;
  verifySignature(event: AgentEvent): Promise<boolean>;
}

// Registry Interface
export interface IAgentRegistry extends EventEmitter {
  register(registration: AgentRegistration): Promise<void>;
  unregister(agentId: string): Promise<void>;
  getAgent(agentId: string): Promise<AgentRegistration | null>;
  listAgents(type?: string): Promise<AgentRegistration[]>;
  updateHeartbeat(agentId: string): Promise<void>;
  checkPermission(agentId: string, permission: string, resource?: string): Promise<boolean>;
  getStats(): any;
  shutdown(): Promise<void>;
}

// Secrets Manager Interface
export interface ISecretsManager {
  getSecret(secretId: string, agentId: string): Promise<string | null>;
  setSecret(secretId: string, value: string, agentId: string): Promise<void>;
  deleteSecret(secretId: string, agentId: string): Promise<boolean>;
  listSecrets(agentId: string): Promise<string[]>;
  getAccessLog(secretId?: string, agentId?: string): Promise<SecretAccess[]>;
  grantAccess(secretId: string, agentId: string, permissions: string[]): Promise<void>;
  revokeAccess(secretId: string, agentId: string): Promise<void>;
}

// Flow Runner Interface
export interface IFlowRunner extends EventEmitter {
  executeFlow(definition: FlowDefinition, context?: Partial<FlowContext>): Promise<FlowContext>;
  pauseFlow(executionId: string): Promise<void>;
  resumeFlow(executionId: string): Promise<void>;
  cancelFlow(executionId: string): Promise<void>;
  getFlowStatus(executionId: string): Promise<FlowContext>;
  getStats(): any;
}

// Event Bus Interface
export interface IEventBus extends EventEmitter {
  publish(event: AgentEvent): Promise<void>;
  subscribe(topic: string, agentId: string, callback: (event: AgentEvent) => void): Promise<void>;
  unsubscribe(topic: string, agentId: string): Promise<void>;
  getEventHistory(topic?: string, since?: Date): Promise<AgentEvent[]>;
  getStats(): any;
  shutdown(): Promise<void>;
}

// Compliance Scanner Interface
export interface IComplianceScanner {
  scanForSecrets(content: string, source: string): Promise<{
    found: boolean;
    secrets: Array<{
      type: string;
      value: string;
      confidence: number;
      location: {
        line: number;
        column: number;
      };
    }>;
    summary: {
      totalSecrets: number;
      criticalSecrets: number;
      highSecrets: number;
      mediumSecrets: number;
      lowSecrets: number;
    };
  }>;
  scanRepository(path: string): Promise<any>;
  scanPullRequest(prId: string): Promise<any>;
}

// Configuration
export interface AgentConfig {
  registry: {
    persistent: boolean;
    filePath?: string;
    cleanupInterval?: number;
  };
  security: {
    enableAuthentication: boolean;
    keySize: number;
    signatureAlgorithm: string;
    maxTokenAge?: number;
  };
  health: {
    checkInterval: number;
    timeout: number;
    retries: number;
  };
  flows: {
    maxConcurrentExecutions: number;
    defaultTimeout: number;
    enableLogging: boolean;
  };
  events: {
    maxHistorySize: number;
    enablePersistence: boolean;
    compressionThreshold: number;
  };
}

// Runtime statistics
export interface AgentRuntimeStats {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskTime: number;
  totalEvents: number;
  totalFlowExecutions: number;
  secretsAccessed: number;
  securityViolations: number;
  uptime: number;
}