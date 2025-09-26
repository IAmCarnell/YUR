/**
 * Workflow Engine for YUR Agent Framework
 * Provides advanced workflow orchestration with conditional logic, loops, and event-driven execution
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { AgentRegistry } from '../core/agent-registry';
import { SecurityManager, SecurityContext } from '../security/security-manager';

// Workflow interfaces
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'task' | 'condition' | 'loop' | 'parallel' | 'wait' | 'event' | 'script';
  agentType?: string;
  taskType?: string;
  payload?: any;
  condition?: WorkflowCondition;
  loopConfig?: LoopConfig;
  parallelSteps?: string[];
  waitConfig?: WaitConfig;
  eventConfig?: EventConfig;
  scriptConfig?: ScriptConfig;
  onSuccess?: string[]; // Next step IDs on success
  onFailure?: string[]; // Next step IDs on failure
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
  timeout?: number;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  type: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'custom';
  left: string; // Reference to previous step result: "{{steps.stepId.result.field}}"
  right: any; // Value or reference
  operator?: 'and' | 'or';
  customFunction?: string;
}

export interface LoopConfig {
  type: 'for' | 'while' | 'foreach';
  condition?: WorkflowCondition;
  iterationVariable?: string;
  maxIterations: number;
  breakCondition?: WorkflowCondition;
}

export interface WaitConfig {
  type: 'duration' | 'condition' | 'event';
  duration?: number; // milliseconds
  condition?: WorkflowCondition;
  eventType?: string;
}

export interface EventConfig {
  eventType: string;
  eventPayload?: any;
  waitForResponse?: boolean;
  responseTimeout?: number;
}

export interface ScriptConfig {
  language: 'javascript' | 'python';
  code: string;
  inputVariables?: string[];
  outputVariables?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  variables: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  id: string;
  type: 'manual' | 'scheduled' | 'event' | 'webhook';
  config: any;
  enabled: boolean;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  currentStep?: string;
  stepResults: Map<string, any>;
  variables: Record<string, any>;
  startTime: Date;
  endTime?: Date;
  error?: string;
  executionContext: SecurityContext;
  metadata: Record<string, any>;
}

export interface WorkflowStepExecution {
  stepId: string;
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: Date;
  endTime?: Date;
  result?: any;
  error?: string;
  retryCount: number;
  agentId?: string;
}

// Workflow Engine implementation
export class WorkflowEngine extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepExecutions: Map<string, WorkflowStepExecution[]> = new Map();
  private triggers: Map<string, WorkflowTrigger> = new Map();
  private agentRegistry: AgentRegistry;
  private securityManager: SecurityManager;
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(agentRegistry: AgentRegistry, securityManager: SecurityManager) {
    super();
    this.agentRegistry = agentRegistry;
    this.securityManager = securityManager;
    this.setupEventListeners();
  }

  /**
   * Register a new workflow definition
   */
  public async registerWorkflow(workflow: Omit<WorkflowDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const workflowId = uuidv4();
    const now = new Date();

    const fullWorkflow: WorkflowDefinition = {
      id: workflowId,
      createdAt: now,
      updatedAt: now,
      ...workflow,
    };

    // Validate workflow definition
    await this.validateWorkflowDefinition(fullWorkflow);

    this.workflows.set(workflowId, fullWorkflow);
    
    // Setup triggers
    await this.setupWorkflowTriggers(fullWorkflow);

    this.emit('workflow:registered', { workflowId, workflow: fullWorkflow });
    console.log(`Workflow '${workflow.name}' registered with ID: ${workflowId}`);

    return workflowId;
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    context: SecurityContext,
    initialVariables: Record<string, any> = {}
  ): Promise<string> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const executionId = uuidv4();
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId,
      status: 'pending',
      stepResults: new Map(),
      variables: { ...workflow.variables, ...initialVariables },
      startTime: new Date(),
      executionContext: context,
      metadata: {},
    };

    this.executions.set(executionId, execution);
    this.stepExecutions.set(executionId, []);

    this.emit('workflow:started', { executionId, workflowId, context });

    // Start workflow execution asynchronously
    this.executeWorkflowAsync(execution).catch(error => {
      console.error(`Workflow execution ${executionId} failed:`, error);
      this.updateExecutionStatus(executionId, 'failed', error.message);
    });

    return executionId;
  }

  /**
   * Cancel a workflow execution
   */
  public async cancelWorkflowExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'cancelled') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();

    // Cancel any running agent tasks
    const stepExecutions = this.stepExecutions.get(executionId) || [];
    const runningSteps = stepExecutions.filter(step => step.status === 'running');
    
    for (const step of runningSteps) {
      if (step.agentId) {
        const agent = this.agentRegistry.getAgent(step.agentId);
        if (agent) {
          try {
            await agent.instance.cancelTask(step.stepId);
          } catch (error) {
            console.warn(`Failed to cancel task for step ${step.stepId}:`, error.message);
          }
        }
      }
    }

    this.emit('workflow:cancelled', { executionId, reason: 'User requested cancellation' });
    return true;
  }

  /**
   * Get workflow execution status
   */
  public getExecutionStatus(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get workflow step executions
   */
  public getStepExecutions(executionId: string): WorkflowStepExecution[] {
    return this.stepExecutions.get(executionId) || [];
  }

  /**
   * List all registered workflows
   */
  public listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get workflow definition
   */
  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }

  // Private execution methods
  private async executeWorkflowAsync(execution: WorkflowExecution): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId)!;
    
    try {
      execution.status = 'running';
      this.emit('workflow:running', { executionId: execution.id });

      // Find entry points (steps with no dependencies)
      const entrySteps = workflow.steps.filter(step => 
        !workflow.steps.some(otherStep => 
          otherStep.onSuccess?.includes(step.id) || otherStep.onFailure?.includes(step.id)
        )
      );

      if (entrySteps.length === 0) {
        throw new Error('No entry point found in workflow');
      }

      // Execute steps starting from entry points
      await this.executeSteps(execution, entrySteps);

      execution.status = 'completed';
      execution.endTime = new Date();
      
      this.emit('workflow:completed', { 
        executionId: execution.id, 
        duration: execution.endTime.getTime() - execution.startTime.getTime() 
      });

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.error = error.message;
      
      this.emit('workflow:failed', { 
        executionId: execution.id, 
        error: error.message 
      });
    }
  }

  private async executeSteps(execution: WorkflowExecution, steps: WorkflowStep[]): Promise<void> {
    const workflow = this.workflows.get(execution.workflowId)!;
    
    for (const step of steps) {
      if (execution.status === 'cancelled') {
        break;
      }

      try {
        execution.currentStep = step.id;
        const result = await this.executeStep(execution, step);
        
        // Store step result
        execution.stepResults.set(step.id, result);
        
        // Execute next steps based on result
        const nextSteps = result.success ? step.onSuccess : step.onFailure;
        if (nextSteps && nextSteps.length > 0) {
          const nextStepDefinitions = nextSteps
            .map(stepId => workflow.steps.find(s => s.id === stepId))
            .filter(s => s !== undefined) as WorkflowStep[];
          
          await this.executeSteps(execution, nextStepDefinitions);
        }
        
      } catch (error) {
        console.error(`Step ${step.id} failed:`, error);
        
        // Handle step failure
        if (step.onFailure && step.onFailure.length > 0) {
          const failureSteps = step.onFailure
            .map(stepId => workflow.steps.find(s => s.id === stepId))
            .filter(s => s !== undefined) as WorkflowStep[];
          
          await this.executeSteps(execution, failureSteps);
        } else {
          throw error; // Propagate error if no failure handling
        }
      }
    }
  }

  private async executeStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    const stepExecution: WorkflowStepExecution = {
      stepId: step.id,
      executionId: execution.id,
      status: 'running',
      startTime: new Date(),
      retryCount: 0,
    };

    // Add to step executions
    const executions = this.stepExecutions.get(execution.id) || [];
    executions.push(stepExecution);
    this.stepExecutions.set(execution.id, executions);

    this.emit('step:started', { executionId: execution.id, stepId: step.id });

    try {
      let result: any;

      switch (step.type) {
        case 'task':
          result = await this.executeTaskStep(execution, step, stepExecution);
          break;
          
        case 'condition':
          result = await this.executeConditionStep(execution, step);
          break;
          
        case 'loop':
          result = await this.executeLoopStep(execution, step);
          break;
          
        case 'parallel':
          result = await this.executeParallelStep(execution, step);
          break;
          
        case 'wait':
          result = await this.executeWaitStep(execution, step);
          break;
          
        case 'event':
          result = await this.executeEventStep(execution, step);
          break;
          
        case 'script':
          result = await this.executeScriptStep(execution, step);
          break;
          
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepExecution.status = 'completed';
      stepExecution.endTime = new Date();
      stepExecution.result = result;

      this.emit('step:completed', { executionId: execution.id, stepId: step.id, result });

      return { success: true, result };

    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.endTime = new Date();
      stepExecution.error = error.message;

      this.emit('step:failed', { executionId: execution.id, stepId: step.id, error: error.message });

      // Handle retries
      if (step.retryPolicy && stepExecution.retryCount < step.retryPolicy.maxRetries) {
        stepExecution.retryCount++;
        
        // Calculate retry delay with backoff
        const delay = step.retryPolicy.retryDelay * 
                     Math.pow(step.retryPolicy.backoffMultiplier, stepExecution.retryCount - 1);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.emit('step:retry', { executionId: execution.id, stepId: step.id, attempt: stepExecution.retryCount });
        
        return this.executeStep(execution, step); // Retry
      }

      throw error;
    }
  }

  private async executeTaskStep(
    execution: WorkflowExecution, 
    step: WorkflowStep, 
    stepExecution: WorkflowStepExecution
  ): Promise<any> {
    if (!step.agentType || !step.taskType) {
      throw new Error(`Task step ${step.id} missing agentType or taskType`);
    }

    // Select agent for task
    const agent = this.agentRegistry.selectAgentForTask(step.taskType, {
      tags: [step.agentType],
      loadBalancing: 'least-loaded',
    });

    if (!agent) {
      throw new Error(`No suitable agent found for task ${step.taskType} (type: ${step.agentType})`);
    }

    stepExecution.agentId = agent.id;

    // Resolve payload variables
    const resolvedPayload = this.resolveVariables(step.payload || {}, execution);

    // Create and execute task
    const task = {
      id: `${execution.id}_${step.id}`,
      type: step.taskType,
      payload: resolvedPayload,
      priority: 'medium' as const,
      createdAt: new Date(),
      timeout: step.timeout,
    };

    return await agent.instance.executeTask(task);
  }

  private async executeConditionStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.condition) {
      throw new Error(`Condition step ${step.id} missing condition`);
    }

    const conditionResult = this.evaluateCondition(step.condition, execution);
    
    return {
      conditionMet: conditionResult,
      condition: step.condition,
    };
  }

  private async executeLoopStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.loopConfig) {
      throw new Error(`Loop step ${step.id} missing loopConfig`);
    }

    const { loopConfig } = step;
    const results: any[] = [];
    let iterations = 0;

    while (iterations < loopConfig.maxIterations) {
      // Check break condition
      if (loopConfig.breakCondition && this.evaluateCondition(loopConfig.breakCondition, execution)) {
        break;
      }

      // Check loop condition for while loops
      if (loopConfig.type === 'while' && loopConfig.condition) {
        if (!this.evaluateCondition(loopConfig.condition, execution)) {
          break;
        }
      }

      // Execute loop body (would need to be defined in step configuration)
      // For now, just simulate loop execution
      results.push({ iteration: iterations, timestamp: new Date() });
      iterations++;

      // Prevent infinite loops
      if (iterations >= 1000) {
        throw new Error('Loop iteration limit exceeded');
      }
    }

    return { iterations, results };
  }

  private async executeParallelStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.parallelSteps || step.parallelSteps.length === 0) {
      throw new Error(`Parallel step ${step.id} missing parallelSteps`);
    }

    const workflow = this.workflows.get(execution.workflowId)!;
    const parallelStepDefinitions = step.parallelSteps
      .map(stepId => workflow.steps.find(s => s.id === stepId))
      .filter(s => s !== undefined) as WorkflowStep[];

    // Execute all parallel steps concurrently
    const promises = parallelStepDefinitions.map(parallelStep => 
      this.executeStep(execution, parallelStep)
    );

    const results = await Promise.allSettled(promises);
    
    return {
      parallelResults: results.map((result, index) => ({
        stepId: parallelStepDefinitions[index].id,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : undefined,
        reason: result.status === 'rejected' ? result.reason : undefined,
      })),
    };
  }

  private async executeWaitStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.waitConfig) {
      throw new Error(`Wait step ${step.id} missing waitConfig`);
    }

    const { waitConfig } = step;

    switch (waitConfig.type) {
      case 'duration':
        if (!waitConfig.duration) {
          throw new Error('Duration wait step missing duration');
        }
        await new Promise(resolve => setTimeout(resolve, waitConfig.duration));
        return { waited: waitConfig.duration };

      case 'condition':
        if (!waitConfig.condition) {
          throw new Error('Condition wait step missing condition');
        }
        
        // Poll condition until it's met (with timeout)
        const timeout = step.timeout || 60000; // 1 minute default
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
          if (this.evaluateCondition(waitConfig.condition, execution)) {
            return { conditionMet: true, waitTime: Date.now() - startTime };
          }
          await new Promise(resolve => setTimeout(resolve, 1000)); // Check every second
        }
        
        throw new Error('Wait condition timeout');

      case 'event':
        if (!waitConfig.eventType) {
          throw new Error('Event wait step missing eventType');
        }
        
        return new Promise((resolve, reject) => {
          const timeout = step.timeout || 60000;
          const timer = setTimeout(() => {
            reject(new Error('Event wait timeout'));
          }, timeout);

          const handler = (eventData: any) => {
            clearTimeout(timer);
            this.removeListener(waitConfig.eventType!, handler);
            resolve({ eventReceived: true, eventData });
          };

          this.once(waitConfig.eventType, handler);
        });

      default:
        throw new Error(`Unknown wait type: ${waitConfig.type}`);
    }
  }

  private async executeEventStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.eventConfig) {
      throw new Error(`Event step ${step.id} missing eventConfig`);
    }

    const { eventConfig } = step;
    const eventPayload = this.resolveVariables(eventConfig.eventPayload || {}, execution);

    this.emit(eventConfig.eventType, {
      executionId: execution.id,
      stepId: step.id,
      payload: eventPayload,
    });

    if (eventConfig.waitForResponse) {
      const timeout = eventConfig.responseTimeout || 30000;
      
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Event response timeout'));
        }, timeout);

        const responseHandler = (responseData: any) => {
          clearTimeout(timer);
          this.removeListener(`${eventConfig.eventType}:response`, responseHandler);
          resolve({ eventEmitted: true, response: responseData });
        };

        this.once(`${eventConfig.eventType}:response`, responseHandler);
      });
    }

    return { eventEmitted: true };
  }

  private async executeScriptStep(execution: WorkflowExecution, step: WorkflowStep): Promise<any> {
    if (!step.scriptConfig) {
      throw new Error(`Script step ${step.id} missing scriptConfig`);
    }

    const { scriptConfig } = step;
    
    // For security, only allow pre-approved scripts or sandbox execution
    // This is a simplified implementation
    if (scriptConfig.language === 'javascript') {
      try {
        // Create a sandbox context with limited global access
        const sandbox = {
          execution,
          variables: execution.variables,
          console: { log: console.log }, // Limited console access
          Math,
          Date,
          JSON,
        };

        // Execute script in sandbox (in production, use a proper sandbox like vm2)
        const func = new Function('sandbox', `
          with (sandbox) {
            ${scriptConfig.code}
          }
        `);

        const result = func(sandbox);
        return { scriptResult: result, language: scriptConfig.language };
      } catch (error) {
        throw new Error(`Script execution failed: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported script language: ${scriptConfig.language}`);
    }
  }

  // Utility methods
  private resolveVariables(payload: any, execution: WorkflowExecution): any {
    if (typeof payload === 'string') {
      // Replace variable references like {{steps.stepId.result.field}}
      return payload.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
        const value = this.getValueByPath(path, execution);
        return value !== undefined ? String(value) : match;
      });
    } else if (Array.isArray(payload)) {
      return payload.map(item => this.resolveVariables(item, execution));
    } else if (typeof payload === 'object' && payload !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(payload)) {
        resolved[key] = this.resolveVariables(value, execution);
      }
      return resolved;
    }
    
    return payload;
  }

  private getValueByPath(path: string, execution: WorkflowExecution): any {
    const parts = path.split('.');
    
    if (parts[0] === 'steps' && parts.length >= 3) {
      const stepId = parts[1];
      const stepResult = execution.stepResults.get(stepId);
      
      if (stepResult) {
        let value = stepResult;
        for (let i = 2; i < parts.length; i++) {
          value = value?.[parts[i]];
        }
        return value;
      }
    } else if (parts[0] === 'variables') {
      let value = execution.variables;
      for (let i = 1; i < parts.length; i++) {
        value = value?.[parts[i]];
      }
      return value;
    }
    
    return undefined;
  }

  private evaluateCondition(condition: WorkflowCondition, execution: WorkflowExecution): boolean {
    const leftValue = this.resolveVariables(condition.left, execution);
    const rightValue = this.resolveVariables(condition.right, execution);

    switch (condition.type) {
      case 'equals':
        return leftValue === rightValue;
      case 'not_equals':
        return leftValue !== rightValue;
      case 'greater_than':
        return Number(leftValue) > Number(rightValue);
      case 'less_than':
        return Number(leftValue) < Number(rightValue);
      case 'contains':
        return String(leftValue).includes(String(rightValue));
      case 'regex':
        const regex = new RegExp(String(rightValue));
        return regex.test(String(leftValue));
      default:
        return false;
    }
  }

  private async validateWorkflowDefinition(workflow: WorkflowDefinition): Promise<void> {
    // Validate step IDs are unique
    const stepIds = new Set();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Validate step references
    for (const step of workflow.steps) {
      const allReferences = [...(step.onSuccess || []), ...(step.onFailure || [])];
      for (const ref of allReferences) {
        if (!stepIds.has(ref)) {
          throw new Error(`Step ${step.id} references unknown step: ${ref}`);
        }
      }
    }

    // Additional validation can be added here
  }

  private async setupWorkflowTriggers(workflow: WorkflowDefinition): Promise<void> {
    for (const trigger of workflow.triggers) {
      if (trigger.enabled) {
        await this.setupTrigger(workflow.id, trigger);
      }
    }
  }

  private async setupTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    switch (trigger.type) {
      case 'scheduled':
        // Setup scheduled trigger (would use cron or similar)
        console.log(`Setting up scheduled trigger for workflow ${workflowId}`);
        break;
        
      case 'event':
        // Setup event listener
        this.on(trigger.config.eventType, async (eventData) => {
          console.log(`Event trigger activated for workflow ${workflowId}`);
          // Would start workflow execution here
        });
        break;
        
      default:
        console.warn(`Unknown trigger type: ${trigger.type}`);
    }
  }

  private setupEventListeners(): void {
    // Listen for agent events that might trigger workflows
    this.agentRegistry.on('agent:task_completed', (event) => {
      this.emit('agent_task_completed', event);
    });

    this.agentRegistry.on('agent:task_failed', (event) => {
      this.emit('agent_task_failed', event);
    });
  }

  private updateExecutionStatus(executionId: string, status: WorkflowExecution['status'], error?: string): void {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = status;
      if (error) {
        execution.error = error;
      }
      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        execution.endTime = new Date();
      }
    }
  }
}

export default WorkflowEngine;