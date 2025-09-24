/**
 * YUR Agent Framework - Orchestrator Agent
 * Event-driven orchestration that listens for events and triggers flows automatically
 */

import { BaseAgent } from './base-agent.js';
import { 
  AgentTask, 
  IAgentRegistry,
  IEventBus,
  IFlowRunner,
  FlowDefinition,
  AgentEvent
} from './types.js';

interface FlowTrigger {
  id: string;
  name: string;
  eventType: string;
  eventTopic: string;
  condition?: string; // Optional condition to evaluate
  flowId: string;
  enabled: boolean;
  parameters?: Record<string, any>;
}

interface OrchestrationRule {
  id: string;
  name: string;
  triggers: FlowTrigger[];
  flowDefinition: FlowDefinition;
  enabled: boolean;
  lastTriggered?: Date;
  triggerCount: number;
}

export class OrchestratorAgent extends BaseAgent {
  private agentRegistry: IAgentRegistry;
  private eventBus: IEventBus;
  private flowRunner: IFlowRunner;
  private orchestrationRules: Map<string, OrchestrationRule> = new Map();
  private activeFlows: Map<string, string> = new Map(); // flowExecutionId -> ruleId

  constructor(
    agentRegistry: IAgentRegistry,
    eventBus: IEventBus,
    flowRunner: IFlowRunner
  ) {
    super(
      'orchestrator-agent',
      'Flow Orchestrator',
      'orchestration',
      {
        allowedTasks: ['addRule', 'removeRule', 'enableRule', 'disableRule', 'triggerFlow'],
        allowedSecrets: [],
        allowedEventTopics: ['*'] // Orchestrator needs access to all events
      }
    );

    this.agentRegistry = agentRegistry;
    this.eventBus = eventBus;
    this.flowRunner = flowRunner;

    this.setupDefaultRules();
  }

  protected async onInitialize(): Promise<void> {
    // Subscribe to all events for orchestration
    await this.eventBus.subscribe('*', this.id, this.handleEvent.bind(this));
    
    console.log('Orchestrator Agent initialized with', this.orchestrationRules.size, 'rules');
  }

  protected async onShutdown(): Promise<void> {
    await this.eventBus.unsubscribe('*', this.id);
    console.log('Orchestrator Agent shutdown');
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'addRule':
        return await this.addOrchestrationRule(task.parameters.rule);
      case 'removeRule':
        return await this.removeOrchestrationRule(task.parameters.ruleId);
      case 'enableRule':
        return await this.enableRule(task.parameters.ruleId);
      case 'disableRule':
        return await this.disableRule(task.parameters.ruleId);
      case 'triggerFlow':
        return await this.triggerFlow(task.parameters.ruleId, task.parameters.context);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  protected async performHealthChecks(): Promise<Array<{ healthy: boolean; reason?: string }>> {
    const checks = [];

    // Check event bus connection
    try {
      await this.eventBus.getEventHistory('*', new Date(Date.now() - 1000));
      checks.push({ healthy: true });
    } catch (error) {
      checks.push({ 
        healthy: false, 
        reason: 'Cannot access event bus' 
      });
    }

    // Check flow runner
    try {
      this.flowRunner.getStats();
      checks.push({ healthy: true });
    } catch (error) {
      checks.push({ 
        healthy: false, 
        reason: 'Flow runner not available' 
      });
    }

    return checks;
  }

  protected getDescription(): string {
    return 'Orchestrates workflows based on events and triggers';
  }

  protected getCapabilities(): string[] {
    return ['event-orchestration', 'flow-automation', 'rule-management', 'conditional-execution'];
  }

  /**
   * Handle incoming events and check for trigger matches
   */
  private async handleEvent(event: AgentEvent): Promise<void> {
    try {
      for (const rule of this.orchestrationRules.values()) {
        if (!rule.enabled) continue;

        for (const trigger of rule.triggers) {
          if (await this.shouldTriggerFlow(trigger, event)) {
            await this.executeTriggeredFlow(rule, trigger, event);
          }
        }
      }
    } catch (error) {
      console.error('Error handling orchestration event:', error);
      this.emit('orchestration:error', event, error);
    }
  }

  /**
   * Check if an event should trigger a flow
   */
  private async shouldTriggerFlow(trigger: FlowTrigger, event: AgentEvent): Promise<boolean> {
    // Check event type match
    if (trigger.eventType !== '*' && trigger.eventType !== event.type) {
      return false;
    }

    // Check topic match (support wildcards)
    if (!this.topicMatches(trigger.eventTopic, event.topic)) {
      return false;
    }

    // Evaluate condition if present
    if (trigger.condition) {
      return this.evaluateCondition(trigger.condition, event);
    }

    return true;
  }

  /**
   * Execute a flow triggered by an event
   */
  private async executeTriggeredFlow(
    rule: OrchestrationRule, 
    trigger: FlowTrigger, 
    event: AgentEvent
  ): Promise<void> {
    try {
      console.log(`Triggering flow ${rule.flowDefinition.name} due to event ${event.type}`);

      // Prepare flow context with event data
      const flowContext = {
        variables: {
          ...rule.flowDefinition.variables,
          ...trigger.parameters,
          triggerEvent: event,
          eventData: event.data,
          eventSource: event.source,
          eventTimestamp: event.timestamp
        },
        user: `orchestrator:${rule.id}`,
        permissions: rule.flowDefinition.permissions || {
          allowedTasks: ['*'],
          allowedSecrets: [],
          allowedEventTopics: []
        }
      };

      // Execute the flow
      const executionContext = await this.flowRunner.executeFlow(rule.flowDefinition, flowContext);
      
      // Track active flow
      this.activeFlows.set(executionContext.executionId, rule.id);
      
      // Update rule statistics
      rule.lastTriggered = new Date();
      rule.triggerCount++;

      this.emit('flow:triggered', {
        ruleId: rule.id,
        flowId: rule.flowDefinition.id,
        executionId: executionContext.executionId,
        trigger: trigger.name,
        event: event.type
      });

      // Emit orchestration event
      await this.eventBus.publish(await this.signEvent({
        id: `orchestration_${Date.now()}`,
        type: 'orchestration:flow_triggered',
        source: this.id,
        topic: 'orchestration.flows',
        data: {
          ruleId: rule.id,
          flowId: rule.flowDefinition.id,
          executionId: executionContext.executionId,
          triggerEvent: event.type,
          triggerSource: event.source
        },
        timestamp: new Date()
      }));

    } catch (error) {
      console.error(`Failed to execute triggered flow for rule ${rule.id}:`, error);
      
      await this.eventBus.publish(await this.signEvent({
        id: `orchestration_error_${Date.now()}`,
        type: 'orchestration:flow_error',
        source: this.id,
        topic: 'orchestration.errors',
        data: {
          ruleId: rule.id,
          flowId: rule.flowDefinition.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          triggerEvent: event.type
        },
        timestamp: new Date()
      }));
    }
  }

  /**
   * Add new orchestration rule
   */
  async addOrchestrationRule(rule: OrchestrationRule): Promise<void> {
    this.orchestrationRules.set(rule.id, {
      ...rule,
      triggerCount: 0,
      enabled: rule.enabled !== false
    });

    console.log(`Added orchestration rule: ${rule.name}`);
    this.emit('rule:added', rule);
  }

  /**
   * Remove orchestration rule
   */
  async removeOrchestrationRule(ruleId: string): Promise<void> {
    const rule = this.orchestrationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Orchestration rule ${ruleId} not found`);
    }

    this.orchestrationRules.delete(ruleId);
    console.log(`Removed orchestration rule: ${rule.name}`);
    this.emit('rule:removed', rule);
  }

  /**
   * Enable orchestration rule
   */
  async enableRule(ruleId: string): Promise<void> {
    const rule = this.orchestrationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Orchestration rule ${ruleId} not found`);
    }

    rule.enabled = true;
    console.log(`Enabled orchestration rule: ${rule.name}`);
    this.emit('rule:enabled', rule);
  }

  /**
   * Disable orchestration rule
   */
  async disableRule(ruleId: string): Promise<void> {
    const rule = this.orchestrationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Orchestration rule ${ruleId} not found`);
    }

    rule.enabled = false;
    console.log(`Disabled orchestration rule: ${rule.name}`);
    this.emit('rule:disabled', rule);
  }

  /**
   * Manually trigger a flow
   */
  async triggerFlow(ruleId: string, context?: Record<string, any>): Promise<string> {
    const rule = this.orchestrationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Orchestration rule ${ruleId} not found`);
    }

    const flowContext = {
      variables: {
        ...rule.flowDefinition.variables,
        ...context,
        manualTrigger: true,
        triggerTimestamp: new Date()
      },
      user: `orchestrator:manual:${ruleId}`,
      permissions: rule.flowDefinition.permissions || {
        allowedTasks: ['*'],
        allowedSecrets: [],
        allowedEventTopics: []
      }
    };

    const executionContext = await this.flowRunner.executeFlow(rule.flowDefinition, flowContext);
    this.activeFlows.set(executionContext.executionId, ruleId);

    return executionContext.executionId;
  }

  /**
   * Get orchestration statistics
   */
  getOrchestrationStats(): {
    totalRules: number;
    enabledRules: number;
    totalTriggers: number;
    activeFlows: number;
    recentTriggers: Array<{
      ruleId: string;
      ruleName: string;
      lastTriggered?: Date;
      triggerCount: number;
    }>;
  } {
    const rules = Array.from(this.orchestrationRules.values());
    
    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalTriggers: rules.reduce((sum, r) => sum + r.triggerCount, 0),
      activeFlows: this.activeFlows.size,
      recentTriggers: rules
        .sort((a, b) => (b.lastTriggered?.getTime() || 0) - (a.lastTriggered?.getTime() || 0))
        .slice(0, 10)
        .map(r => ({
          ruleId: r.id,
          ruleName: r.name,
          lastTriggered: r.lastTriggered,
          triggerCount: r.triggerCount
        }))
    };
  }

  /**
   * List all orchestration rules
   */
  getOrchestrationRules(): OrchestrationRule[] {
    return Array.from(this.orchestrationRules.values());
  }

  private topicMatches(pattern: string, topic: string): boolean {
    if (pattern === '*') return true;
    if (pattern === topic) return true;
    
    // Simple wildcard matching
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$'
    );
    return regex.test(topic);
  }

  private evaluateCondition(condition: string, event: AgentEvent): boolean {
    try {
      // Simple condition evaluation
      // In production, use a proper expression evaluator
      
      // Replace event properties in condition
      const evaluatedCondition = condition
        .replace(/event\.type/g, `"${event.type}"`)
        .replace(/event\.source/g, `"${event.source}"`)
        .replace(/event\.topic/g, `"${event.topic}"`)
        .replace(/event\.data\.(\w+)/g, (match, prop) => {
          const value = event.data?.[prop];
          return typeof value === 'string' ? `"${value}"` : String(value || 'null');
        });

      // Simple boolean evaluation
      if (evaluatedCondition.includes('==')) {
        const [left, right] = evaluatedCondition.split('==').map(s => s.trim());
        return left === right;
      }
      
      if (evaluatedCondition.includes('!=')) {
        const [left, right] = evaluatedCondition.split('!=').map(s => s.trim());
        return left !== right;
      }

      return false;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  private setupDefaultRules(): void {
    // Rule 1: Auto-recovery on build failures
    this.orchestrationRules.set('build-failure-recovery', {
      id: 'build-failure-recovery',
      name: 'Build Failure Recovery',
      enabled: true,
      triggerCount: 0,
      triggers: [{
        id: 'build-failed-trigger',
        name: 'Build Failed',
        eventType: 'build:failed',
        eventTopic: 'build.*',
        flowId: 'recovery-flow',
        enabled: true
      }],
      flowDefinition: {
        id: 'recovery-flow',
        name: 'Build Recovery Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'notify-team',
            name: 'Notify Team',
            type: 'task',
            agent: 'notification-agent',
            action: 'sendAlert',
            parameters: {
              message: 'Build failed: {{triggerEvent.data.buildId}}',
              severity: 'high'
            }
          },
          {
            id: 'restart-build',
            name: 'Restart Build',
            type: 'task',
            agent: 'build-agent',
            action: 'restart',
            parameters: {
              buildId: '{{triggerEvent.data.buildId}}'
            },
            retry: {
              maxAttempts: 3,
              backoff: 'exponential',
              delay: 5000
            }
          }
        ]
      }
    });

    // Rule 2: Security incident response
    this.orchestrationRules.set('security-incident-response', {
      id: 'security-incident-response',
      name: 'Security Incident Response',
      enabled: true,
      triggerCount: 0,
      triggers: [{
        id: 'security-alert-trigger',
        name: 'Security Alert',
        eventType: 'security:secrets_detected',
        eventTopic: 'security.alerts',
        condition: 'event.data.severity == "critical"',
        flowId: 'security-response-flow',
        enabled: true
      }],
      flowDefinition: {
        id: 'security-response-flow',
        name: 'Security Response Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'lock-resources',
            name: 'Lock Compromised Resources',
            type: 'task',
            agent: 'security-agent',
            action: 'lockResources',
            parameters: {
              source: '{{triggerEvent.data.source}}'
            }
          },
          {
            id: 'rotate-secrets',
            name: 'Rotate Secrets',
            type: 'task',
            agent: 'secrets-agent',
            action: 'rotateSecrets',
            parameters: {
              reason: 'Security incident: {{triggerEvent.data.source}}'
            }
          },
          {
            id: 'notify-security-team',
            name: 'Notify Security Team',
            type: 'task',
            agent: 'notification-agent',
            action: 'sendSecurityAlert',
            parameters: {
              incident: '{{triggerEvent.data}}',
              priority: 'critical'
            }
          }
        ]
      }
    });

    // Rule 3: Agent health monitoring
    this.orchestrationRules.set('agent-health-monitoring', {
      id: 'agent-health-monitoring',
      name: 'Agent Health Monitoring',
      enabled: true,
      triggerCount: 0,
      triggers: [{
        id: 'agent-unhealthy-trigger',
        name: 'Agent Unhealthy',
        eventType: 'agent:health:warning',
        eventTopic: 'agents.health',
        flowId: 'agent-recovery-flow',
        enabled: true
      }],
      flowDefinition: {
        id: 'agent-recovery-flow',
        name: 'Agent Recovery Flow',
        version: '1.0.0',
        steps: [
          {
            id: 'diagnose-agent',
            name: 'Diagnose Agent',
            type: 'task',
            agent: 'monitoring-agent',
            action: 'diagnose',
            parameters: {
              agentId: '{{triggerEvent.source}}'
            }
          },
          {
            id: 'restart-agent',
            name: 'Restart Agent',
            type: 'condition',
            condition: {
              expression: 'steps.diagnose-agent.result.severity == "high"',
              onTrue: 'perform-restart',
              onFalse: 'monitor-continued'
            }
          },
          {
            id: 'perform-restart',
            name: 'Perform Restart',
            type: 'task',
            agent: 'system-agent',
            action: 'restartAgent',
            parameters: {
              agentId: '{{triggerEvent.source}}'
            }
          },
          {
            id: 'monitor-continued',
            name: 'Continue Monitoring',
            type: 'task',
            agent: 'monitoring-agent',
            action: 'increaseMonitoring',
            parameters: {
              agentId: '{{triggerEvent.source}}',
              duration: 300000
            }
          }
        ]
      }
    });
  }
}