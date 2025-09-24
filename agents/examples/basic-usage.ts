/**
 * YUR Agent Framework - Basic Usage Example
 * Demonstrates all the production features in action
 */

import { YURAgentFramework, BaseAgent, AgentTask, FlowDefinition } from '../index.js';

// Example custom agent implementation
class DataProcessorAgent extends BaseAgent {
  constructor() {
    super(
      'data-processor',
      'Data Processor',
      'processing',
      {
        allowedTasks: ['processData', 'validateData', 'exportData'],
        allowedSecrets: ['database.*', 'api.*'],
        allowedEventTopics: ['data.*', 'processing.*']
      }
    );
  }

  protected async onInitialize(): Promise<void> {
    console.log('Data Processor Agent initialized');
  }

  protected async onShutdown(): Promise<void> {
    console.log('Data Processor Agent shutdown');
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'processData':
        return await this.processData(task.parameters);
      case 'validateData':
        return await this.validateData(task.parameters);
      case 'exportData':
        return await this.exportData(task.parameters);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  protected async performHealthChecks(): Promise<Array<{ healthy: boolean; reason?: string }>> {
    return [
      { healthy: true }, // All systems operational
    ];
  }

  protected getDescription(): string {
    return 'Processes and validates data with export capabilities';
  }

  protected getCapabilities(): string[] {
    return ['data-processing', 'data-validation', 'data-export'];
  }

  private async processData(params: any): Promise<any> {
    // Simulate data processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      processed: true,
      recordCount: params.records?.length || 0,
      timestamp: new Date()
    };
  }

  private async validateData(params: any): Promise<any> {
    // Simulate data validation
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      valid: true,
      errors: [],
      warnings: []
    };
  }

  private async exportData(params: any): Promise<any> {
    // Simulate data export
    await new Promise(resolve => setTimeout(resolve, 750));
    return {
      exported: true,
      location: `/exports/data_${Date.now()}.json`,
      size: '1.2MB'
    };
  }
}

// Example usage
async function runExample() {
  console.log('🚀 Starting YUR Agent Framework Example');

  // Initialize framework with configuration
  const framework = new YURAgentFramework({
    registry: {
      persistent: true,
      filePath: './example-registry.json'
    },
    security: {
      enableAuthentication: true,
      keySize: 2048,
      signatureAlgorithm: 'RS256'
    },
    flows: {
      maxConcurrentExecutions: 5,
      defaultTimeout: 300000,
      enableLogging: true
    }
  });

  // Start the framework
  await framework.start();

  // Register a custom agent
  const dataProcessor = new DataProcessorAgent();
  await framework.registerAgent(dataProcessor);

  // Get framework components
  const { eventBus, flowRunner, secretsManager, complianceScanner } = framework.getComponents();

  // 1. Demonstrate health monitoring
  console.log('\n📊 Health Check:');
  const health = await framework.healthCheck();
  console.log('Framework Health:', health.healthy ? '✅ Healthy' : '❌ Unhealthy');
  
  // 2. Demonstrate secrets management
  console.log('\n🔐 Secrets Management:');
  await secretsManager.setSecret('api-key', 'sk-test-key-12345', 'data-processor');
  const retrievedSecret = await secretsManager.getSecret('api-key', 'data-processor');
  console.log('Secret retrieved:', retrievedSecret ? '✅ Success' : '❌ Failed');

  // 3. Demonstrate compliance scanning
  console.log('\n🔍 Compliance Scanning:');
  const scanResult = await complianceScanner.scanForSecrets(
    'const API_KEY = "sk-1234567890abcdef"\nconst password = "secret123"',
    'test-file.js'
  );
  console.log('Secrets detected:', scanResult.found ? `⚠️  ${scanResult.summary.totalSecrets} found` : '✅ None');

  // 4. Demonstrate event-driven orchestration
  console.log('\n📡 Event Publishing:');
  const testEvent = await dataProcessor.signEvent({
    id: 'test-event-1',
    type: 'data:processed',
    source: dataProcessor.id,
    topic: 'data.processing',
    data: { recordCount: 100, status: 'completed' },
    timestamp: new Date()
  });
  await eventBus.publish(testEvent);
  console.log('Event published:', '✅ Success');

  // 5. Demonstrate flow execution with conditions and output piping
  console.log('\n⚡ Flow Execution:');
  const dataProcessingFlow: FlowDefinition = {
    id: 'data-processing-workflow',
    name: 'Data Processing Workflow',
    version: '1.0.0',
    steps: [
      {
        id: 'validate-input',
        name: 'Validate Input Data',
        type: 'task',
        agent: 'data-processor',
        action: 'validateData',
        parameters: {
          data: ['record1', 'record2', 'record3']
        }
      },
      {
        id: 'check-validation',
        name: 'Check Validation Result',
        type: 'condition',
        condition: {
          expression: 'steps.validate-input.result.valid == true',
          onTrue: 'process-data',
          onFalse: 'handle-error'
        },
        dependencies: ['validate-input']
      },
      {
        id: 'process-data',
        name: 'Process Valid Data',
        type: 'task',
        agent: 'data-processor',
        action: 'processData',
        parameters: {
          records: '{{steps.validate-input.result}}', // Output piping
          mode: 'production'
        },
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
          delay: 1000
        }
      },
      {
        id: 'export-results',
        name: 'Export Processed Data',
        type: 'task',
        agent: 'data-processor',
        action: 'exportData',
        parameters: {
          processedData: '{{steps.process-data.result}}', // Output piping
          format: 'json'
        },
        dependencies: ['process-data']
      },
      {
        id: 'handle-error',
        name: 'Handle Validation Error',
        type: 'task',
        agent: 'data-processor',
        action: 'processData',
        parameters: {
          errorMode: true,
          data: '{{steps.validate-input.result}}'
        }
      }
    ],
    variables: {
      workflowId: 'example-001',
      environment: 'development'
    }
  };

  const flowResult = await flowRunner.executeFlow(dataProcessingFlow);
  console.log('Flow execution:', flowResult ? '✅ Completed' : '❌ Failed');
  console.log('Final step results:', Object.keys(flowResult.steps).length, 'steps executed');

  // 6. Display framework statistics
  console.log('\n📈 Framework Statistics:');
  const stats = framework.getStats();
  console.log(`- Total Agents: ${stats.totalAgents}`);
  console.log(`- Active Agents: ${stats.activeAgents}`);
  console.log(`- Total Events: ${stats.totalEvents}`);
  console.log(`- Secrets Accessed: ${stats.secretsAccessed}`);
  console.log(`- Security Violations: ${stats.securityViolations}`);
  console.log(`- Uptime: ${stats.uptime}s`);

  // 7. Demonstrate agent authentication
  console.log('\n🔑 Agent Authentication:');
  const signedEvent = await dataProcessor.signEvent({
    id: 'auth-test-event',
    type: 'test:authentication',
    source: dataProcessor.id,
    topic: 'test.auth',
    data: { message: 'Testing authentication' },
    timestamp: new Date()
  });
  
  const isValid = await dataProcessor.verifySignature(signedEvent);
  console.log('Event signature verification:', isValid ? '✅ Valid' : '❌ Invalid');

  // Cleanup
  console.log('\n🧹 Shutting down framework...');
  await framework.stop();
  console.log('✅ Framework shutdown complete');
}

// Error handling wrapper
async function main() {
  try {
    await runExample();
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
}

// Run the example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { runExample, DataProcessorAgent };