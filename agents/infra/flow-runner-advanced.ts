/**
 * YUR Agent Framework - Advanced Flow Runner
 * Production-ready workflow engine with conditional execution, dynamic flows,
 * output piping, retries, loops, parallel execution, and comprehensive monitoring
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface FlowVariable {
  name: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  source: 'input' | 'step' | 'system' | 'environment';
  scope: 'global' | 'local' | 'step';
}

export interface FlowCondition {
  expression: string;
  variables?: string[];
  functions?: string[];
}

export interface FlowStep {
  id: string;
  name: string;
  type: 'action' | 'condition' | 'loop' | 'parallel' | 'subprocess' | 'wait' | 'transform';
  description?: string;
  enabled: boolean;
  
  // Action step
  agentId?: string;
  action?: string;
  inputs?: Record<string, any>;
  
  // Conditional step
  condition?: FlowCondition;
  onTrue?: string | FlowStep[];
  onFalse?: string | FlowStep[];
  
  // Loop step
  loop?: {
    type: 'for' | 'while' | 'foreach';
    iterable?: string; // Variable name or expression
    condition?: FlowCondition;
    maxIterations?: number;
    body: FlowStep[];
  };
  
  // Parallel step
  parallel?: {
    branches: FlowStep[][];
    waitForAll: boolean;
    failFast: boolean;
    maxConcurrency?: number;
  };
  
  // Subprocess step
  subprocess?: {
    flowId: string;
    inputs?: Record<string, any>;
    timeout?: number;
  };
  
  // Wait step
  wait?: {
    duration?: number;
    until?: FlowCondition;
    timeout?: number;
  };
  
  // Transform step
  transform?: {
    input: string; // Variable or expression
    transformations: Array<{
      type: 'map' | 'filter' | 'reduce' | 'sort' | 'group' | 'join' | 'extract';
      expression: string;
      parameters?: Record<string, any>;
    }>;
    output: string; // Variable name
  };
  
  // Error handling
  errorHandling?: {
    retry?: {
      maxAttempts: number;
      delay: number;
      backoffMultiplier?: number;
      maxDelay?: number;
      retryOn?: string[]; // Error types to retry on
    };
    onError?: 'continue' | 'stop' | 'goto' | 'retry';
    gotoStep?: string;
    fallback?: FlowStep;
  };
  
  // Output mapping
  outputs?: Record<string, string>; // Map step outputs to variables
  
  // Execution constraints
  timeout?: number;
  priority?: number;
  resources?: {
    cpu?: number;
    memory?: number;
    network?: boolean;
  };
  
  // Metadata
  tags?: Record<string, string>;
  annotations?: Record<string, any>;
}

export interface FlowDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  
  // Flow metadata
  metadata: {
    createdAt: Date;
    createdBy: string;
    updatedAt: Date;
    updatedBy: string;
    tags: Record<string, string>;
  };
  
  // Flow structure
  inputs: FlowVariable[];
  outputs: FlowVariable[];
  steps: FlowStep[];
  
  // Flow configuration
  config: {
    timeout?: number;
    maxConcurrency?: number;
    retryPolicy?: {
      maxAttempts: number;
      delay: number;
    };
    errorHandling: 'stop' | 'continue' | 'collect';
    enableLogging: boolean;
    enableMetrics: boolean;
    enableTracing: boolean;
  };
  
  // Flow scheduling
  schedule?: {
    type: 'cron' | 'interval' | 'event';
    expression?: string; // Cron expression
    interval?: number; // Milliseconds
    eventTrigger?: string;
  };
  
  // Flow validation
  validation?: {
    schema?: any; // JSON Schema for inputs
    rules?: FlowCondition[];
  };
}

export interface FlowExecution {
  id: string;
  flowId: string;
  flowVersion: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout';
  
  // Execution context
  variables: Map<string, FlowVariable>;
  stepStates: Map<string, StepExecutionState>;
  
  // Execution timeline
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Results
  outputs?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    step?: string;
    type: string;
  };
  
  // Execution metadata
  triggeredBy: string;
  parentExecutionId?: string;
  childExecutions: string[];
  
  // Performance metrics
  metrics: {
    stepsExecuted: number;
    stepsSkipped: number;
    stepsFailed: number;
    retryCount: number;
    memoryUsage: number;
    cpuTime: number;
  };
  
  // Execution trace
  trace: ExecutionTraceEntry[];
}

export interface StepExecutionState {
  stepId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
  attempts: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  error?: string;
  retryHistory: Array<{
    attempt: number;
    error: string;
    timestamp: Date;
  }>;
}

export interface ExecutionTraceEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  stepId?: string;
  event: string;
  message: string;
  data?: any;
}

export interface FlowRunnerConfig {
  dataDir: string;
  maxConcurrentExecutions: number;
  defaultTimeout: number;
  enablePersistence: boolean;
  enableMetrics: boolean;
  enableTracing: boolean;
  enableScheduling: boolean;
  maxRetryAttempts: number;
  maxExecutionHistory: number;
  memoryLimit: number;
  cpuLimit: number;
}

interface ScheduledFlow {
  id: string;
  flowId: string;
  schedule: FlowDefinition['schedule'];
  nextRun: Date;
  enabled: boolean;
  lastRun?: Date;
  runCount: number;
}

export class AdvancedFlowRunner extends EventEmitter {
  private config: FlowRunnerConfig;
  private flows: Map<string, FlowDefinition> = new Map();
  private executions: Map<string, FlowExecution> = new Map();
  private scheduledFlows: Map<string, ScheduledFlow> = new Map();
  private running: boolean = false;
  private executionQueue: string[] = [];
  private activeExecutions: Set<string> = new Set();
  private schedulerInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<FlowRunnerConfig> = {}) {
    super();
    
    this.config = {
      dataDir: config.dataDir || './flow-data',
      maxConcurrentExecutions: config.maxConcurrentExecutions || 10,
      defaultTimeout: config.defaultTimeout || 300000, // 5 minutes
      enablePersistence: config.enablePersistence ?? true,
      enableMetrics: config.enableMetrics ?? true,
      enableTracing: config.enableTracing ?? true,
      enableScheduling: config.enableScheduling ?? true,
      maxRetryAttempts: config.maxRetryAttempts || 3,
      maxExecutionHistory: config.maxExecutionHistory || 10000,
      memoryLimit: config.memoryLimit || 512 * 1024 * 1024, // 512MB
      cpuLimit: config.cpuLimit || 80 // 80% CPU
    };
  }

  /**
   * Initialize the flow runner
   */
  async initialize(): Promise<void> {
    if (this.running) {
      throw new Error('Flow runner is already running');
    }

    try {
      // Create data directory
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Load existing flows and executions
      if (this.config.enablePersistence) {
        await this.loadFlows();
        await this.loadExecutions();
      }

      // Start scheduler if enabled
      if (this.config.enableScheduling) {
        this.startScheduler();
      }

      // Start cleanup process
      this.startCleanup();

      this.running = true;
      this.emit('runner:started');
      
      console.log(`Advanced flow runner initialized with ${this.flows.size} flows`);
    } catch (error) {
      this.emit('runner:error', error);
      throw error;
    }
  }

  /**
   * Shutdown the flow runner
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop scheduler
      if (this.schedulerInterval) {
        clearInterval(this.schedulerInterval);
      }

      if (this.cleanupInterval) {
        clearInterval(this.cleanupInterval);
      }

      // Wait for active executions to complete or timeout
      const activeExecutionIds = Array.from(this.activeExecutions);
      if (activeExecutionIds.length > 0) {
        console.log(`Waiting for ${activeExecutionIds.length} active executions to complete...`);
        
        const timeout = 30000; // 30 seconds
        const startTime = Date.now();
        
        while (this.activeExecutions.size > 0 && (Date.now() - startTime) < timeout) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Cancel remaining executions
        for (const executionId of this.activeExecutions) {
          await this.cancelExecution(executionId);
        }
      }

      // Save state if persistence is enabled
      if (this.config.enablePersistence) {
        await this.saveFlows();
        await this.saveExecutions();
      }

      this.running = false;
      this.emit('runner:stopped');
      
      console.log('Advanced flow runner shut down');
    } catch (error) {
      this.emit('runner:error', error);
    }
  }

  /**
   * Register a flow definition
   */
  async registerFlow(flow: FlowDefinition): Promise<void> {
    // Validate flow
    this.validateFlow(flow);

    this.flows.set(flow.id, flow);

    // Set up scheduling if configured
    if (flow.schedule && this.config.enableScheduling) {
      await this.scheduleFlow(flow);
    }

    if (this.config.enablePersistence) {
      await this.saveFlows();
    }

    this.emit('flow:registered', flow);
    console.log(`Flow registered: ${flow.name} (${flow.id})`);
  }

  /**
   * Execute a flow
   */
  async executeFlow(
    flowId: string,
    inputs: Record<string, any> = {},
    options: {
      priority?: number;
      timeout?: number;
      triggeredBy?: string;
      parentExecutionId?: string;
    } = {}
  ): Promise<string> {
    if (!this.running) {
      throw new Error('Flow runner not initialized');
    }

    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    // Create execution
    const execution: FlowExecution = {
      id: crypto.randomUUID(),
      flowId,
      flowVersion: flow.version,
      status: 'pending',
      variables: new Map(),
      stepStates: new Map(),
      startTime: new Date(),
      triggeredBy: options.triggeredBy || 'manual',
      parentExecutionId: options.parentExecutionId,
      childExecutions: [],
      metrics: {
        stepsExecuted: 0,
        stepsSkipped: 0,
        stepsFailed: 0,
        retryCount: 0,
        memoryUsage: 0,
        cpuTime: 0
      },
      trace: []
    };

    // Initialize variables
    this.initializeVariables(execution, flow, inputs);

    // Store execution
    this.executions.set(execution.id, execution);

    // Add to parent if specified
    if (options.parentExecutionId) {
      const parentExecution = this.executions.get(options.parentExecutionId);
      if (parentExecution) {
        parentExecution.childExecutions.push(execution.id);
      }
    }

    // Queue for execution
    this.executionQueue.push(execution.id);
    this.processExecutionQueue();

    this.emit('execution:created', execution);
    return execution.id;
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return;
    }

    if (execution.status === 'running') {
      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.addTraceEntry(execution, 'info', undefined, 'execution_cancelled', 'Execution cancelled by user');
      this.activeExecutions.delete(executionId);
    } else if (execution.status === 'pending') {
      execution.status = 'cancelled';
      const queueIndex = this.executionQueue.indexOf(executionId);
      if (queueIndex >= 0) {
        this.executionQueue.splice(queueIndex, 1);
      }
    }

    this.emit('execution:cancelled', execution);
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): FlowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List all flows
   */
  listFlows(): FlowDefinition[] {
    return Array.from(this.flows.values());
  }

  /**
   * List executions with filtering
   */
  listExecutions(filter?: {
    flowId?: string;
    status?: FlowExecution['status'];
    triggeredBy?: string;
    since?: Date;
    limit?: number;
  }): FlowExecution[] {
    let executions = Array.from(this.executions.values());

    if (filter) {
      if (filter.flowId) {
        executions = executions.filter(e => e.flowId === filter.flowId);
      }
      if (filter.status) {
        executions = executions.filter(e => e.status === filter.status);
      }
      if (filter.triggeredBy) {
        executions = executions.filter(e => e.triggeredBy === filter.triggeredBy);
      }
      if (filter.since) {
        executions = executions.filter(e => e.startTime >= filter.since!);
      }
    }

    // Sort by start time (newest first)
    executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());

    if (filter?.limit) {
      executions = executions.slice(0, filter.limit);
    }

    return executions;
  }

  /**
   * Get execution statistics
   */
  getStats(): {
    totalFlows: number;
    totalExecutions: number;
    activeExecutions: number;
    queuedExecutions: number;
    completedExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    executionsPerHour: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    
    const executions = Array.from(this.executions.values());
    const recentExecutions = executions.filter(e => e.startTime >= oneHourAgo);
    const completedExecutions = executions.filter(e => e.status === 'completed');
    const failedExecutions = executions.filter(e => e.status === 'failed');
    
    const totalExecutionTime = completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0);
    const averageExecutionTime = completedExecutions.length > 0 
      ? totalExecutionTime / completedExecutions.length 
      : 0;

    return {
      totalFlows: this.flows.size,
      totalExecutions: executions.length,
      activeExecutions: this.activeExecutions.size,
      queuedExecutions: this.executionQueue.length,
      completedExecutions: completedExecutions.length,
      failedExecutions: failedExecutions.length,
      averageExecutionTime,
      executionsPerHour: recentExecutions.length
    };
  }

  private validateFlow(flow: FlowDefinition): void {
    if (!flow.id || !flow.name || !flow.version) {
      throw new Error('Flow must have id, name, and version');
    }

    if (!Array.isArray(flow.steps) || flow.steps.length === 0) {
      throw new Error('Flow must have at least one step');
    }

    // Validate step references
    const stepIds = new Set(flow.steps.map(s => s.id));
    
    for (const step of flow.steps) {
      if (step.onTrue && typeof step.onTrue === 'string' && !stepIds.has(step.onTrue)) {
        throw new Error(`Step ${step.id}: onTrue references unknown step ${step.onTrue}`);
      }
      
      if (step.onFalse && typeof step.onFalse === 'string' && !stepIds.has(step.onFalse)) {
        throw new Error(`Step ${step.id}: onFalse references unknown step ${step.onFalse}`);
      }
      
      if (step.errorHandling?.gotoStep && !stepIds.has(step.errorHandling.gotoStep)) {
        throw new Error(`Step ${step.id}: gotoStep references unknown step ${step.errorHandling.gotoStep}`);
      }
    }
  }

  private initializeVariables(execution: FlowExecution, flow: FlowDefinition, inputs: Record<string, any>): void {
    // Add flow inputs as variables
    for (const input of flow.inputs) {
      const variable: FlowVariable = {
        name: input.name,
        value: inputs[input.name] ?? input.value,
        type: input.type,
        source: 'input',
        scope: 'global'
      };
      execution.variables.set(input.name, variable);
    }

    // Add system variables
    const systemVariables = [
      { name: 'execution_id', value: execution.id, type: 'string' as const },
      { name: 'flow_id', value: execution.flowId, type: 'string' as const },
      { name: 'flow_version', value: execution.flowVersion, type: 'string' as const },
      { name: 'started_at', value: execution.startTime.toISOString(), type: 'string' as const },
      { name: 'triggered_by', value: execution.triggeredBy, type: 'string' as const }
    ];

    for (const sysVar of systemVariables) {
      const variable: FlowVariable = {
        name: sysVar.name,
        value: sysVar.value,
        type: sysVar.type,
        source: 'system',
        scope: 'global'
      };
      execution.variables.set(sysVar.name, variable);
    }
  }

  private async processExecutionQueue(): Promise<void> {
    while (this.executionQueue.length > 0 && this.activeExecutions.size < this.config.maxConcurrentExecutions) {
      const executionId = this.executionQueue.shift()!;
      const execution = this.executions.get(executionId);
      
      if (!execution || execution.status !== 'pending') {
        continue;
      }

      this.activeExecutions.add(executionId);
      
      // Start execution asynchronously
      this.runExecution(execution).catch(error => {
        console.error(`Execution ${executionId} failed:`, error);
      });
    }
  }

  private async runExecution(execution: FlowExecution): Promise<void> {
    const flow = this.flows.get(execution.flowId);
    if (!flow) {
      execution.status = 'failed';
      execution.error = { message: `Flow ${execution.flowId} not found`, type: 'flow_not_found' };
      this.activeExecutions.delete(execution.id);
      return;
    }

    try {
      execution.status = 'running';
      this.addTraceEntry(execution, 'info', undefined, 'execution_started', 'Flow execution started');
      
      // Set timeout if configured
      const timeout = flow.config.timeout || this.config.defaultTimeout;
      const timeoutHandle = setTimeout(() => {
        execution.status = 'timeout';
        execution.error = { message: 'Execution timeout', type: 'timeout' };
        this.addTraceEntry(execution, 'error', undefined, 'execution_timeout', 'Execution timed out');
      }, timeout);

      // Execute steps
      await this.executeSteps(execution, flow, flow.steps);

      clearTimeout(timeoutHandle);

      if (execution.status === 'running') {
        execution.status = 'completed';
        this.addTraceEntry(execution, 'info', undefined, 'execution_completed', 'Flow execution completed successfully');
        
        // Set outputs
        execution.outputs = {};
        for (const output of flow.outputs) {
          const variable = execution.variables.get(output.name);
          if (variable) {
            execution.outputs[output.name] = variable.value;
          }
        }
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error = {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        type: 'execution_error'
      };
      this.addTraceEntry(execution, 'error', undefined, 'execution_failed', execution.error.message);
    } finally {
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      
      this.activeExecutions.delete(execution.id);
      this.emit('execution:completed', execution);
      
      // Continue processing queue
      this.processExecutionQueue();
    }
  }

  private async executeSteps(execution: FlowExecution, flow: FlowDefinition, steps: FlowStep[]): Promise<void> {
    for (const step of steps) {
      if (execution.status !== 'running') {
        break;
      }

      if (!step.enabled) {
        this.markStepSkipped(execution, step);
        continue;
      }

      await this.executeStep(execution, flow, step);
    }
  }

  private async executeStep(execution: FlowExecution, flow: FlowDefinition, step: FlowStep): Promise<void> {
    const stepState: StepExecutionState = {
      stepId: step.id,
      status: 'running',
      attempts: 0,
      startTime: new Date(),
      retryHistory: []
    };

    execution.stepStates.set(step.id, stepState);
    this.addTraceEntry(execution, 'info', step.id, 'step_started', `Step ${step.name} started`);

    try {
      // Resolve inputs
      stepState.inputs = await this.resolveInputs(execution, step.inputs || {});

      let result: any;

      // Execute based on step type
      switch (step.type) {
        case 'action':
          result = await this.executeActionStep(execution, step, stepState);
          break;
        case 'condition':
          result = await this.executeConditionStep(execution, flow, step, stepState);
          break;
        case 'loop':
          result = await this.executeLoopStep(execution, flow, step, stepState);
          break;
        case 'parallel':
          result = await this.executeParallelStep(execution, flow, step, stepState);
          break;
        case 'subprocess':
          result = await this.executeSubprocessStep(execution, step, stepState);
          break;
        case 'wait':
          result = await this.executeWaitStep(execution, step, stepState);
          break;
        case 'transform':
          result = await this.executeTransformStep(execution, step, stepState);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepState.outputs = result;
      stepState.status = 'completed';
      execution.metrics.stepsExecuted++;

      // Map outputs to variables
      if (step.outputs && result) {
        for (const [outputName, variableName] of Object.entries(step.outputs)) {
          const variable: FlowVariable = {
            name: variableName,
            value: result[outputName],
            type: typeof result[outputName] as any,
            source: 'step',
            scope: 'global'
          };
          execution.variables.set(variableName, variable);
        }
      }

      this.addTraceEntry(execution, 'info', step.id, 'step_completed', `Step ${step.name} completed`);

    } catch (error) {
      await this.handleStepError(execution, flow, step, stepState, error);
    } finally {
      stepState.endTime = new Date();
      stepState.duration = stepState.endTime.getTime() - (stepState.startTime?.getTime() || 0);
    }
  }

  private async executeActionStep(execution: FlowExecution, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.agentId || !step.action) {
      throw new Error('Action step requires agentId and action');
    }

    // In a real implementation, this would call the agent
    this.addTraceEntry(execution, 'debug', step.id, 'action_call', `Calling agent ${step.agentId} action ${step.action}`);
    
    // Simulate action execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
    
    return {
      success: true,
      result: `Action ${step.action} executed by agent ${step.agentId}`,
      timestamp: new Date().toISOString()
    };
  }

  private async executeConditionStep(execution: FlowExecution, flow: FlowDefinition, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.condition) {
      throw new Error('Condition step requires condition');
    }

    const conditionResult = await this.evaluateCondition(execution, step.condition);
    
    this.addTraceEntry(execution, 'debug', step.id, 'condition_evaluated', `Condition result: ${conditionResult}`);

    let nextSteps: FlowStep[] = [];

    if (conditionResult) {
      if (typeof step.onTrue === 'string') {
        // Find step by ID
        const targetStep = flow.steps.find(s => s.id === step.onTrue);
        if (targetStep) {
          nextSteps = [targetStep];
        }
      } else if (Array.isArray(step.onTrue)) {
        nextSteps = step.onTrue;
      }
    } else {
      if (typeof step.onFalse === 'string') {
        // Find step by ID
        const targetStep = flow.steps.find(s => s.id === step.onFalse);
        if (targetStep) {
          nextSteps = [targetStep];
        }
      } else if (Array.isArray(step.onFalse)) {
        nextSteps = step.onFalse;
      }
    }

    // Execute next steps
    if (nextSteps.length > 0) {
      await this.executeSteps(execution, flow, nextSteps);
    }

    return { conditionResult, executedSteps: nextSteps.length };
  }

  private async executeLoopStep(execution: FlowExecution, flow: FlowDefinition, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.loop) {
      throw new Error('Loop step requires loop configuration');
    }

    const loop = step.loop;
    let iterations = 0;
    const maxIterations = loop.maxIterations || 1000;
    const results: any[] = [];

    switch (loop.type) {
      case 'for':
        if (!loop.iterable) {
          throw new Error('For loop requires iterable');
        }
        
        const iterableValue = await this.resolveExpression(execution, loop.iterable);
        if (!Array.isArray(iterableValue)) {
          throw new Error('For loop iterable must be an array');
        }

        for (const item of iterableValue) {
          if (iterations >= maxIterations) {
            break;
          }

          // Set loop variable
          const loopVariable: FlowVariable = {
            name: 'loop_item',
            value: item,
            type: typeof item as any,
            source: 'step',
            scope: 'local'
          };
          execution.variables.set('loop_item', loopVariable);

          // Set iteration variable
          const iterationVariable: FlowVariable = {
            name: 'loop_index',
            value: iterations,
            type: 'number',
            source: 'step',
            scope: 'local'
          };
          execution.variables.set('loop_index', iterationVariable);

          await this.executeSteps(execution, flow, loop.body);
          iterations++;
          results.push({ iteration: iterations, item });
        }
        break;

      case 'while':
        if (!loop.condition) {
          throw new Error('While loop requires condition');
        }

        while (await this.evaluateCondition(execution, loop.condition) && iterations < maxIterations) {
          const iterationVariable: FlowVariable = {
            name: 'loop_index',
            value: iterations,
            type: 'number',
            source: 'step',
            scope: 'local'
          };
          execution.variables.set('loop_index', iterationVariable);

          await this.executeSteps(execution, flow, loop.body);
          iterations++;
          results.push({ iteration: iterations });
        }
        break;

      case 'foreach':
        if (!loop.iterable) {
          throw new Error('Foreach loop requires iterable');
        }
        
        const forEachIterable = await this.resolveExpression(execution, loop.iterable);
        if (typeof forEachIterable !== 'object' || forEachIterable === null) {
          throw new Error('Foreach loop iterable must be an object');
        }

        for (const [key, value] of Object.entries(forEachIterable)) {
          if (iterations >= maxIterations) {
            break;
          }

          // Set loop variables
          const keyVariable: FlowVariable = {
            name: 'loop_key',
            value: key,
            type: 'string',
            source: 'step',
            scope: 'local'
          };
          execution.variables.set('loop_key', keyVariable);

          const valueVariable: FlowVariable = {
            name: 'loop_value',
            value: value,
            type: typeof value as any,
            source: 'step',
            scope: 'local'
          };
          execution.variables.set('loop_value', valueVariable);

          await this.executeSteps(execution, flow, loop.body);
          iterations++;
          results.push({ iteration: iterations, key, value });
        }
        break;
    }

    this.addTraceEntry(execution, 'info', step.id, 'loop_completed', `Loop completed with ${iterations} iterations`);
    return { iterations, results, type: loop.type };
  }

  private async executeParallelStep(execution: FlowExecution, flow: FlowDefinition, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.parallel) {
      throw new Error('Parallel step requires parallel configuration');
    }

    const parallel = step.parallel;
    const results: any[] = [];
    const errors: any[] = [];

    const branchPromises = parallel.branches.map(async (branch, index) => {
      try {
        this.addTraceEntry(execution, 'debug', step.id, 'parallel_branch_started', `Branch ${index} started`);
        await this.executeSteps(execution, flow, branch);
        this.addTraceEntry(execution, 'debug', step.id, 'parallel_branch_completed', `Branch ${index} completed`);
        return { branch: index, success: true };
      } catch (error) {
        this.addTraceEntry(execution, 'error', step.id, 'parallel_branch_failed', `Branch ${index} failed: ${error}`);
        errors.push({ branch: index, error });
        
        if (parallel.failFast) {
          throw error;
        }
        
        return { branch: index, success: false, error };
      }
    });

    if (parallel.waitForAll) {
      const branchResults = await Promise.allSettled(branchPromises);
      for (const result of branchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          errors.push(result.reason);
        }
      }
    } else {
      // Wait for first completion
      const firstResult = await Promise.race(branchPromises);
      results.push(firstResult);
    }

    if (errors.length > 0 && parallel.failFast) {
      throw new Error(`Parallel execution failed: ${errors.map(e => e.error).join(', ')}`);
    }

    return { 
      completedBranches: results.length,
      failedBranches: errors.length,
      results,
      errors
    };
  }

  private async executeSubprocessStep(execution: FlowExecution, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.subprocess) {
      throw new Error('Subprocess step requires subprocess configuration');
    }

    const subprocess = step.subprocess;
    const subflowId = await this.executeFlow(
      subprocess.flowId,
      subprocess.inputs || {},
      {
        triggeredBy: 'subprocess',
        parentExecutionId: execution.id,
        timeout: subprocess.timeout
      }
    );

    // Wait for subprocess completion
    const timeout = subprocess.timeout || this.config.defaultTimeout;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const subExecution = this.executions.get(subflowId);
      if (!subExecution) {
        throw new Error(`Subprocess execution ${subflowId} not found`);
      }

      if (subExecution.status === 'completed') {
        return {
          subflowId,
          outputs: subExecution.outputs,
          duration: subExecution.duration
        };
      } else if (subExecution.status === 'failed') {
        throw new Error(`Subprocess failed: ${subExecution.error?.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Subprocess timeout');
  }

  private async executeWaitStep(execution: FlowExecution, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.wait) {
      throw new Error('Wait step requires wait configuration');
    }

    const wait = step.wait;

    if (wait.duration) {
      this.addTraceEntry(execution, 'debug', step.id, 'wait_started', `Waiting for ${wait.duration}ms`);
      await new Promise(resolve => setTimeout(resolve, wait.duration));
      return { waited: wait.duration, type: 'duration' };
    }

    if (wait.until) {
      const timeout = wait.timeout || 60000; // 1 minute default
      const startTime = Date.now();

      this.addTraceEntry(execution, 'debug', step.id, 'wait_condition_started', 'Waiting for condition');

      while (Date.now() - startTime < timeout) {
        if (await this.evaluateCondition(execution, wait.until)) {
          const waitTime = Date.now() - startTime;
          this.addTraceEntry(execution, 'debug', step.id, 'wait_condition_met', `Condition met after ${waitTime}ms`);
          return { waited: waitTime, type: 'condition' };
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      throw new Error('Wait condition timeout');
    }

    throw new Error('Wait step requires either duration or condition');
  }

  private async executeTransformStep(execution: FlowExecution, step: FlowStep, stepState: StepExecutionState): Promise<any> {
    if (!step.transform) {
      throw new Error('Transform step requires transform configuration');
    }

    const transform = step.transform;
    let data = await this.resolveExpression(execution, transform.input);

    for (const transformation of transform.transformations) {
      switch (transformation.type) {
        case 'map':
          if (!Array.isArray(data)) {
            throw new Error('Map transformation requires array input');
          }
          data = data.map(item => this.evaluateTransformExpression(transformation.expression, item));
          break;

        case 'filter':
          if (!Array.isArray(data)) {
            throw new Error('Filter transformation requires array input');
          }
          data = data.filter(item => this.evaluateTransformExpression(transformation.expression, item));
          break;

        case 'reduce':
          if (!Array.isArray(data)) {
            throw new Error('Reduce transformation requires array input');
          }
          data = data.reduce((acc, item) => this.evaluateTransformExpression(transformation.expression, { acc, item }), transformation.parameters?.initial || 0);
          break;

        case 'sort':
          if (!Array.isArray(data)) {
            throw new Error('Sort transformation requires array input');
          }
          data = data.sort((a, b) => {
            const aVal = this.evaluateTransformExpression(transformation.expression, a);
            const bVal = this.evaluateTransformExpression(transformation.expression, b);
            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          });
          break;

        case 'group':
          if (!Array.isArray(data)) {
            throw new Error('Group transformation requires array input');
          }
          const groups: Record<string, any[]> = {};
          for (const item of data) {
            const key = this.evaluateTransformExpression(transformation.expression, item);
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
          }
          data = groups;
          break;

        case 'join':
          if (!Array.isArray(data)) {
            throw new Error('Join transformation requires array input');
          }
          data = data.join(transformation.parameters?.separator || ',');
          break;

        case 'extract':
          if (typeof data !== 'object' || data === null) {
            throw new Error('Extract transformation requires object input');
          }
          data = this.evaluateTransformExpression(transformation.expression, data);
          break;
      }
    }

    // Set output variable
    const outputVariable: FlowVariable = {
      name: transform.output,
      value: data,
      type: typeof data as any,
      source: 'step',
      scope: 'global'
    };
    execution.variables.set(transform.output, outputVariable);

    return { transformedData: data, outputVariable: transform.output };
  }

  private async handleStepError(execution: FlowExecution, flow: FlowDefinition, step: FlowStep, stepState: StepExecutionState, error: any): Promise<void> {
    stepState.status = 'failed';
    stepState.error = error instanceof Error ? error.message : 'Unknown error';
    execution.metrics.stepsFailed++;

    this.addTraceEntry(execution, 'error', step.id, 'step_failed', stepState.error);

    // Handle retries
    if (step.errorHandling?.retry && stepState.attempts < step.errorHandling.retry.maxAttempts) {
      stepState.attempts++;
      stepState.retryHistory.push({
        attempt: stepState.attempts,
        error: stepState.error,
        timestamp: new Date()
      });

      execution.metrics.retryCount++;
      stepState.status = 'retrying';

      const delay = this.calculateRetryDelay(step.errorHandling.retry, stepState.attempts);
      this.addTraceEntry(execution, 'info', step.id, 'step_retrying', `Retrying step in ${delay}ms (attempt ${stepState.attempts})`);

      await new Promise(resolve => setTimeout(resolve, delay));
      await this.executeStep(execution, flow, step);
      return;
    }

    // Handle error actions
    switch (step.errorHandling?.onError || flow.config.errorHandling) {
      case 'continue':
        this.addTraceEntry(execution, 'warn', step.id, 'error_continue', 'Continuing execution despite error');
        break;

      case 'stop':
        execution.status = 'failed';
        execution.error = {
          message: stepState.error,
          step: step.id,
          type: 'step_error'
        };
        this.addTraceEntry(execution, 'error', step.id, 'execution_stopped', 'Execution stopped due to step error');
        throw error;

      case 'goto':
        if (step.errorHandling?.gotoStep) {
          const gotoStep = flow.steps.find(s => s.id === step.errorHandling!.gotoStep);
          if (gotoStep) {
            this.addTraceEntry(execution, 'info', step.id, 'error_goto', `Going to step ${gotoStep.id}`);
            await this.executeStep(execution, flow, gotoStep);
          }
        }
        break;

      case 'collect':
        // Continue with execution, errors will be collected
        this.addTraceEntry(execution, 'warn', step.id, 'error_collected', 'Error collected, continuing execution');
        break;
    }
  }

  private calculateRetryDelay(retry: NonNullable<FlowStep['errorHandling']>['retry'], attempt: number): number {
    let delay = retry!.delay;
    
    if (retry!.backoffMultiplier) {
      delay *= Math.pow(retry!.backoffMultiplier, attempt - 1);
    }
    
    if (retry!.maxDelay) {
      delay = Math.min(delay, retry!.maxDelay);
    }
    
    return delay;
  }

  private markStepSkipped(execution: FlowExecution, step: FlowStep): void {
    const stepState: StepExecutionState = {
      stepId: step.id,
      status: 'skipped',
      attempts: 0,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      retryHistory: []
    };

    execution.stepStates.set(step.id, stepState);
    execution.metrics.stepsSkipped++;
    this.addTraceEntry(execution, 'debug', step.id, 'step_skipped', `Step ${step.name} skipped (disabled)`);
  }

  private async resolveInputs(execution: FlowExecution, inputs: Record<string, any>): Promise<Record<string, any>> {
    const resolved: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(inputs)) {
      resolved[key] = await this.resolveExpression(execution, value);
    }
    
    return resolved;
  }

  private async resolveExpression(execution: FlowExecution, expression: any): Promise<any> {
    if (typeof expression !== 'string') {
      return expression;
    }

    // Handle variable references: ${variable_name}
    return expression.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const variable = execution.variables.get(varName);
      return variable ? variable.value : match;
    });
  }

  private async evaluateCondition(execution: FlowExecution, condition: FlowCondition): Promise<boolean> {
    const expression = await this.resolveExpression(execution, condition.expression);
    
    // Simple expression evaluator - in production, use a proper expression engine
    try {
      // Handle simple comparisons
      if (expression.includes('==')) {
        const [left, right] = expression.split('==').map((s: string) => s.trim());
        return left === right;
      }
      
      if (expression.includes('!=')) {
        const [left, right] = expression.split('!=').map((s: string) => s.trim());
        return left !== right;
      }
      
      if (expression.includes('>=')) {
        const [left, right] = expression.split('>=').map((s: string) => Number(s.trim()));
        return left >= right;
      }
      
      if (expression.includes('<=')) {
        const [left, right] = expression.split('<=').map((s: string) => Number(s.trim()));
        return left <= right;
      }
      
      if (expression.includes('>')) {
        const [left, right] = expression.split('>').map((s: string) => Number(s.trim()));
        return left > right;
      }
      
      if (expression.includes('<')) {
        const [left, right] = expression.split('<').map((s: string) => Number(s.trim()));
        return left < right;
      }
      
      // Handle boolean values
      if (expression === 'true') return true;
      if (expression === 'false') return false;
      
      // Default to truthy evaluation
      return Boolean(expression);
    } catch (error) {
      this.addTraceEntry(execution, 'warn', undefined, 'condition_evaluation_error', `Failed to evaluate condition: ${expression}`);
      return false;
    }
  }

  private evaluateTransformExpression(expression: string, context: any): any {
    // Simple expression evaluator for transformations
    // In production, use a safe expression evaluator
    try {
      if (expression.startsWith('item.') && typeof context === 'object') {
        const prop = expression.substring(5);
        return context[prop];
      }
      
      if (expression === 'item') {
        return context;
      }
      
      return expression;
    } catch (error) {
      return undefined;
    }
  }

  private addTraceEntry(execution: FlowExecution, level: ExecutionTraceEntry['level'], stepId: string | undefined, event: string, message: string, data?: any): void {
    if (!this.config.enableTracing) {
      return;
    }

    const entry: ExecutionTraceEntry = {
      timestamp: new Date(),
      level,
      stepId,
      event,
      message,
      data
    };

    execution.trace.push(entry);

    // Limit trace size
    if (execution.trace.length > 10000) {
      execution.trace.splice(0, execution.trace.length - 10000);
    }
  }

  private async scheduleFlow(flow: FlowDefinition): Promise<void> {
    if (!flow.schedule) {
      return;
    }

    const scheduledFlow: ScheduledFlow = {
      id: crypto.randomUUID(),
      flowId: flow.id,
      schedule: flow.schedule,
      nextRun: this.calculateNextRun(flow.schedule),
      enabled: true,
      runCount: 0
    };

    this.scheduledFlows.set(scheduledFlow.id, scheduledFlow);
    this.emit('flow:scheduled', scheduledFlow);
  }

  private calculateNextRun(schedule: FlowDefinition['schedule']): Date {
    const now = new Date();
    
    switch (schedule?.type) {
      case 'interval':
        return new Date(now.getTime() + (schedule.interval || 60000));
      
      case 'cron':
        // Simple cron implementation - in production, use a proper cron library
        return new Date(now.getTime() + 60000); // Next minute
      
      case 'event':
        return new Date(now.getTime() + 86400000); // Next day (placeholder)
      
      default:
        return new Date(now.getTime() + 86400000);
    }
  }

  private startScheduler(): void {
    this.schedulerInterval = setInterval(async () => {
      const now = new Date();
      
      for (const [scheduleId, scheduledFlow] of this.scheduledFlows) {
        if (!scheduledFlow.enabled || scheduledFlow.nextRun > now) {
          continue;
        }

        try {
          await this.executeFlow(scheduledFlow.flowId, {}, {
            triggeredBy: 'scheduler'
          });

          scheduledFlow.lastRun = now;
          scheduledFlow.runCount++;
          scheduledFlow.nextRun = this.calculateNextRun(scheduledFlow.schedule);

          this.emit('flow:scheduled_run', scheduledFlow);
        } catch (error) {
          console.error(`Failed to execute scheduled flow ${scheduledFlow.flowId}:`, error);
        }
      }
    }, 60000); // Check every minute
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up old executions
      const cutoffTime = new Date(Date.now() - 86400000 * 30); // 30 days
      let cleanedCount = 0;

      for (const [executionId, execution] of this.executions) {
        if (execution.startTime < cutoffTime && !this.activeExecutions.has(executionId)) {
          this.executions.delete(executionId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} old executions`);
      }

      // Limit total executions
      if (this.executions.size > this.config.maxExecutionHistory) {
        const executions = Array.from(this.executions.entries())
          .sort(([, a], [, b]) => a.startTime.getTime() - b.startTime.getTime());
        
        const toRemove = this.executions.size - this.config.maxExecutionHistory;
        for (let i = 0; i < toRemove; i++) {
          const [executionId] = executions[i];
          if (!this.activeExecutions.has(executionId)) {
            this.executions.delete(executionId);
          }
        }
      }
    }, 3600000); // Run every hour
  }

  private async loadFlows(): Promise<void> {
    try {
      const flowsPath = path.join(this.config.dataDir, 'flows.json');
      const flowsData = await fs.readFile(flowsPath, 'utf-8');
      const flowsArray = JSON.parse(flowsData);
      
      for (const flowData of flowsArray) {
        // Restore Date objects
        flowData.metadata.createdAt = new Date(flowData.metadata.createdAt);
        flowData.metadata.updatedAt = new Date(flowData.metadata.updatedAt);
        
        this.flows.set(flowData.id, flowData);
      }
      
      console.log(`Loaded ${this.flows.size} flows`);
    } catch (error) {
      console.log('No existing flows found');
    }
  }

  private async saveFlows(): Promise<void> {
    const flowsPath = path.join(this.config.dataDir, 'flows.json');
    const flowsArray = Array.from(this.flows.values());
    await fs.writeFile(flowsPath, JSON.stringify(flowsArray, null, 2));
  }

  private async loadExecutions(): Promise<void> {
    try {
      const executionsPath = path.join(this.config.dataDir, 'executions.json');
      const executionsData = await fs.readFile(executionsPath, 'utf-8');
      const executionsArray = JSON.parse(executionsData);
      
      for (const executionData of executionsArray) {
        // Restore Date objects and Maps
        executionData.startTime = new Date(executionData.startTime);
        if (executionData.endTime) {
          executionData.endTime = new Date(executionData.endTime);
        }
        
        executionData.variables = new Map(executionData.variables);
        executionData.stepStates = new Map(executionData.stepStates.map(([id, state]: [string, any]) => [
          id,
          {
            ...state,
            startTime: state.startTime ? new Date(state.startTime) : undefined,
            endTime: state.endTime ? new Date(state.endTime) : undefined,
            retryHistory: state.retryHistory.map((entry: any) => ({
              ...entry,
              timestamp: new Date(entry.timestamp)
            }))
          }
        ]));
        
        executionData.trace = executionData.trace.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        
        this.executions.set(executionData.id, executionData);
      }
      
      console.log(`Loaded ${this.executions.size} executions`);
    } catch (error) {
      console.log('No existing executions found');
    }
  }

  private async saveExecutions(): Promise<void> {
    const executionsPath = path.join(this.config.dataDir, 'executions.json');
    
    // Convert Maps to arrays for JSON serialization
    const executionsArray = Array.from(this.executions.values()).map(execution => ({
      ...execution,
      variables: Array.from(execution.variables.entries()),
      stepStates: Array.from(execution.stepStates.entries())
    }));
    
    await fs.writeFile(executionsPath, JSON.stringify(executionsArray, null, 2));
  }
}