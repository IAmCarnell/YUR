/**
 * YUR Agent Framework - Flow Runner
 * Supports conditional execution, retries, branching, looping, and output piping
 */

import { EventEmitter } from 'events';
import { 
  IFlowRunner, 
  FlowDefinition, 
  FlowContext, 
  FlowStep, 
  AgentTask,
  IAgentRegistry 
} from './types.js';

export class FlowRunner extends EventEmitter implements IFlowRunner {
  private activeExecutions: Map<string, FlowContext> = new Map();
  private agentRegistry: IAgentRegistry;
  private maxConcurrentExecutions: number;

  constructor(
    agentRegistry: IAgentRegistry,
    options: {
      maxConcurrentExecutions?: number;
    } = {}
  ) {
    super();
    this.agentRegistry = agentRegistry;
    this.maxConcurrentExecutions = options.maxConcurrentExecutions || 10;
  }

  /**
   * Execute a flow definition
   */
  async executeFlow(definition: FlowDefinition, contextOverrides?: Partial<FlowContext>): Promise<FlowContext> {
    if (this.activeExecutions.size >= this.maxConcurrentExecutions) {
      throw new Error('Maximum concurrent flow executions reached');
    }

    const executionId = this.generateExecutionId();
    
    const context: FlowContext = {
      flowId: definition.id,
      executionId,
      steps: {},
      variables: { ...definition.variables, ...contextOverrides?.variables },
      permissions: definition.permissions || {
        allowedTasks: ['*'],
        allowedSecrets: [],
        allowedEventTopics: []
      },
      ...contextOverrides
    };

    // Initialize step states
    for (const step of definition.steps) {
      context.steps[step.id] = {
        status: 'pending'
      };
    }

    this.activeExecutions.set(executionId, context);

    try {
      this.emit('flow:started', context);
      
      // Execute the flow
      await this.executeSteps(definition, context);
      
      this.emit('flow:completed', context);
      return context;
    } catch (error) {
      this.emit('flow:error', context, error);
      
      // Handle error step if defined
      if (definition.onError) {
        try {
          await this.executeStep(
            definition.steps.find(s => s.id === definition.onError)!, 
            definition, 
            context
          );
        } catch (errorHandlingError) {
          console.error('Error in error handling step:', errorHandlingError);
        }
      }
      
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Pause flow execution
   */
  async pauseFlow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Flow execution ${executionId} not found`);
    }

    // Implementation would set a pause flag and respect it in execution loop
    this.emit('flow:paused', context);
  }

  /**
   * Resume flow execution
   */
  async resumeFlow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Flow execution ${executionId} not found`);
    }

    this.emit('flow:resumed', context);
  }

  /**
   * Cancel flow execution
   */
  async cancelFlow(executionId: string): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Flow execution ${executionId} not found`);
    }

    // Mark all pending steps as cancelled
    for (const [stepId, stepContext] of Object.entries(context.steps)) {
      if (stepContext.status === 'pending' || stepContext.status === 'running') {
        stepContext.status = 'skipped';
      }
    }

    this.activeExecutions.delete(executionId);
    this.emit('flow:cancelled', context);
  }

  /**
   * Get flow execution status
   */
  async getFlowStatus(executionId: string): Promise<FlowContext> {
    const context = this.activeExecutions.get(executionId);
    if (!context) {
      throw new Error(`Flow execution ${executionId} not found`);
    }

    return { ...context };
  }

  private async executeSteps(definition: FlowDefinition, context: FlowContext): Promise<void> {
    const executionOrder = this.determineExecutionOrder(definition.steps);
    
    for (const stepId of executionOrder) {
      const step = definition.steps.find(s => s.id === stepId);
      if (!step) continue;

      // Check if step should be executed based on dependencies
      if (!await this.shouldExecuteStep(step, context)) {
        context.steps[stepId].status = 'skipped';
        continue;
      }

      await this.executeStep(step, definition, context);
    }
  }

  private async executeStep(step: FlowStep, definition: FlowDefinition, context: FlowContext): Promise<void> {
    const stepContext = context.steps[step.id];
    stepContext.status = 'running';
    stepContext.startTime = new Date();

    this.emit('step:started', context, step);

    try {
      let result: any;

      switch (step.type) {
        case 'task':
          result = await this.executeTaskStep(step, context);
          break;
        case 'condition':
          result = await this.executeConditionStep(step, definition, context);
          break;
        case 'loop':
          result = await this.executeLoopStep(step, definition, context);
          break;
        case 'parallel':
          result = await this.executeParallelStep(step, definition, context);
          break;
        case 'wait':
          result = await this.executeWaitStep(step, context);
          break;
        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      stepContext.result = result;
      stepContext.status = 'completed';
      stepContext.endTime = new Date();

      this.emit('step:completed', context, step, result);
    } catch (error) {
      stepContext.error = error as Error;
      stepContext.status = 'failed';
      stepContext.endTime = new Date();

      this.emit('step:failed', context, step, error);

      // Handle retries
      if (step.retry && (stepContext.retryCount || 0) < step.retry.maxAttempts) {
        stepContext.retryCount = (stepContext.retryCount || 0) + 1;
        
        const delay = this.calculateRetryDelay(step.retry, stepContext.retryCount);
        await this.delay(delay);
        
        // Reset step state for retry
        stepContext.status = 'pending';
        stepContext.error = undefined;
        stepContext.startTime = undefined;
        stepContext.endTime = undefined;
        
        // Retry the step
        return this.executeStep(step, definition, context);
      }

      throw error;
    }
  }

  private async executeTaskStep(step: FlowStep, context: FlowContext): Promise<any> {
    if (!step.agent || !step.action) {
      throw new Error(`Task step ${step.id} missing agent or action`);
    }

    // Resolve parameters with variable substitution and output piping
    const resolvedParameters = this.resolveParameters(step.parameters || {}, context);

    const task: AgentTask = {
      id: this.generateTaskId(),
      type: step.action,
      parameters: resolvedParameters,
      timeout: step.timeout,
      status: 'pending',
      createdAt: new Date()
    };

    // Find and assign to agent
    const agent = await this.agentRegistry.getAgent(step.agent);
    if (!agent) {
      throw new Error(`Agent ${step.agent} not found`);
    }

    // Execute task (in a real implementation, this would call the agent)
    const result = await this.callAgent(agent.id, task);
    
    return result;
  }

  private async executeConditionStep(step: FlowStep, definition: FlowDefinition, context: FlowContext): Promise<any> {
    if (!step.condition) {
      throw new Error(`Condition step ${step.id} missing condition`);
    }

    const conditionResult = this.evaluateExpression(step.condition.expression, context);
    
    const nextStepId = conditionResult ? step.condition.onTrue : step.condition.onFalse;
    
    if (nextStepId) {
      const nextStep = definition.steps.find(s => s.id === nextStepId);
      if (nextStep) {
        await this.executeStep(nextStep, definition, context);
      }
    }

    return { condition: conditionResult, nextStep: nextStepId };
  }

  private async executeLoopStep(step: FlowStep, definition: FlowDefinition, context: FlowContext): Promise<any> {
    const results: any[] = [];
    let iteration = 0;
    const maxIterations = step.parameters?.maxIterations || 100;

    while (iteration < maxIterations) {
      // Check loop condition if specified
      if (step.parameters?.condition) {
        const shouldContinue = this.evaluateExpression(step.parameters.condition, {
          ...context,
          variables: { ...context.variables, iteration }
        });
        
        if (!shouldContinue) break;
      }

      // Execute loop body steps
      if (step.parameters?.steps && Array.isArray(step.parameters.steps)) {
        for (const stepId of step.parameters.steps) {
          const bodyStep = definition.steps.find(s => s.id === stepId);
          if (bodyStep) {
            const bodyContext = {
              ...context,
              variables: { ...context.variables, iteration }
            };
            await this.executeStep(bodyStep, definition, bodyContext);
            results.push(bodyContext.steps[stepId].result);
          }
        }
      }

      iteration++;
    }

    return { iterations: iteration, results };
  }

  private async executeParallelStep(step: FlowStep, definition: FlowDefinition, context: FlowContext): Promise<any> {
    if (!step.parameters?.steps || !Array.isArray(step.parameters.steps)) {
      throw new Error(`Parallel step ${step.id} missing steps array`);
    }

    const parallelSteps = step.parameters.steps.map((stepId: string) =>
      definition.steps.find(s => s.id === stepId)
    ).filter(Boolean);

    const promises = parallelSteps.map(parallelStep =>
      this.executeStep(parallelStep!, definition, context)
    );

    const results = await Promise.all(promises);
    return { parallelResults: results };
  }

  private async executeWaitStep(step: FlowStep, context: FlowContext): Promise<any> {
    const duration = step.parameters?.duration || 1000;
    await this.delay(duration);
    return { waited: duration };
  }

  private resolveParameters(parameters: Record<string, any>, context: FlowContext): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      resolved[key] = this.resolveValue(value, context);
    }

    return resolved;
  }

  private resolveValue(value: any, context: FlowContext): any {
    if (typeof value === 'string') {
      // Handle output piping: {{steps.stepId.result}}
      return value.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
        return this.evaluateExpression(expression.trim(), context);
      });
    }

    if (Array.isArray(value)) {
      return value.map(item => this.resolveValue(item, context));
    }

    if (value && typeof value === 'object') {
      const resolved: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        resolved[key] = this.resolveValue(val, context);
      }
      return resolved;
    }

    return value;
  }

  private evaluateExpression(expression: string, context: FlowContext): any {
    try {
      // Simple expression evaluator for conditions and variable references
      // In production, you might want to use a proper expression parser
      
      // Handle steps.stepId.result references
      if (expression.startsWith('steps.')) {
        const parts = expression.split('.');
        if (parts.length >= 3) {
          const stepId = parts[1];
          const property = parts.slice(2).join('.');
          
          const stepContext = context.steps[stepId];
          if (stepContext && property === 'result') {
            return stepContext.result;
          }
          
          if (stepContext && property === 'status') {
            return stepContext.status;
          }
        }
      }

      // Handle variables
      if (expression.startsWith('variables.')) {
        const variableName = expression.substring('variables.'.length);
        return context.variables[variableName];
      }

      // Simple boolean expressions
      if (expression.includes('==')) {
        const [left, right] = expression.split('==').map(s => s.trim());
        return this.evaluateExpression(left, context) == this.evaluateExpression(right, context);
      }

      if (expression.includes('!=')) {
        const [left, right] = expression.split('!=').map(s => s.trim());
        return this.evaluateExpression(left, context) != this.evaluateExpression(right, context);
      }

      // Return literal values
      if (expression === 'true') return true;
      if (expression === 'false') return false;
      if (/^\d+$/.test(expression)) return parseInt(expression);
      if (/^\d+\.\d+$/.test(expression)) return parseFloat(expression);
      if (expression.startsWith('"') && expression.endsWith('"')) {
        return expression.slice(1, -1);
      }

      return expression;
    } catch (error) {
      console.error(`Error evaluating expression "${expression}":`, error);
      return false;
    }
  }

  private async shouldExecuteStep(step: FlowStep, context: FlowContext): Promise<boolean> {
    // Check dependencies
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        const depContext = context.steps[depId];
        if (!depContext || depContext.status !== 'completed') {
          return false;
        }
      }
    }

    return true;
  }

  private determineExecutionOrder(steps: FlowStep[]): string[] {
    // Simple topological sort based on dependencies
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      
      const step = steps.find(s => s.id === stepId);
      if (!step) return;

      if (step.dependencies) {
        for (const depId of step.dependencies) {
          visit(depId);
        }
      }

      visited.add(stepId);
      order.push(stepId);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return order;
  }

  private calculateRetryDelay(retry: { backoff: 'linear' | 'exponential'; delay: number }, attempt: number): number {
    if (retry.backoff === 'exponential') {
      return retry.delay * Math.pow(2, attempt - 1);
    }
    return retry.delay * attempt;
  }

  private async callAgent(agentId: string, task: AgentTask): Promise<any> {
    // In a real implementation, this would call the actual agent
    // For now, simulate task execution
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ 
          taskId: task.id, 
          agentId, 
          result: `Task ${task.type} completed`,
          timestamp: new Date() 
        });
      }, 100);
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get statistics about flow executions
   */
  getStats(): {
    activeExecutions: number;
    maxConcurrentExecutions: number;
    executionIds: string[];
  } {
    return {
      activeExecutions: this.activeExecutions.size,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      executionIds: Array.from(this.activeExecutions.keys())
    };
  }
}