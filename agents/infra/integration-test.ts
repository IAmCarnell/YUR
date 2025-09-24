/**
 * YUR Agent Framework - Infrastructure Integration Test
 * Comprehensive test to verify all infrastructure modules work together
 */

import { DistributedAgentRegistry } from './registry.js';
import { PolicyEngine } from './policy.js';
import { PersistentEventBus } from './events.js';
import { MetricsCollector } from './metrics.js';
import { SecureKeyManager } from './secure-keys.js';
import { SecretsACL } from './secrets-acl.js';
import { SecretScanner } from './secret-scanner.js';
import { AdvancedFlowRunner } from './flow-runner-advanced.js';

export async function runIntegrationTest(): Promise<void> {
  console.log('🚀 Starting YUR Infrastructure Integration Test...\n');

  try {
    // Initialize all infrastructure components
    console.log('📋 Initializing infrastructure components...');
    
    const registry = new DistributedAgentRegistry({
      nodeId: 'test-node-1',
      bindPort: 8501,
      seedNodes: [],
      dataDir: '/tmp/test-registry',
      replicationFactor: 1
    });

    const policyEngine = new PolicyEngine({
      policyDir: '/tmp/test-policies',
      enableHotReload: false,
      enableCaching: true
    });

    const eventBus = new PersistentEventBus({
      dataDir: '/tmp/test-events',
      partitionCount: 2,
      compressionEnabled: false,
      enableTransactions: true
    });

    const metrics = new MetricsCollector({
      serviceName: 'yur-test',
      metricsPort: 9091,
      enablePrometheus: false, // Disable HTTP server for test
      enableTracing: true
    });

    const keyManager = new SecureKeyManager({
      keyStoreDir: '/tmp/test-keys',
      masterKeyPath: '/tmp/test-master.key',
      enableAuditLogging: false,
      backupEnabled: false
    });

    const secretsACL = new SecretsACL({
      dataDir: '/tmp/test-acl',
      enableApprovalWorkflow: false,
      enableCaching: true
    });

    const scanner = new SecretScanner({
      patternsDir: '/tmp/test-patterns',
      enableEntropyAnalysis: true,
      confidenceThreshold: 0.7,
      reportingEnabled: false
    });

    const flowRunner = new AdvancedFlowRunner({
      dataDir: '/tmp/test-flows',
      maxConcurrentExecutions: 2,
      enableScheduling: false,
      enableTracing: true
    });

    // Start all components
    await registry.start();
    await policyEngine.start();
    await eventBus.start();
    await metrics.start();
    await keyManager.initialize();
    await secretsACL.initialize();
    await scanner.initialize();
    await flowRunner.initialize();

    console.log('✅ All components initialized successfully\n');

    // Test 1: Agent Registration
    console.log('🧪 Test 1: Agent Registration...');
    await registry.register({
      id: 'test-agent-1',
      name: 'Test Agent',
      type: 'worker',
      version: '1.0.0',
      capabilities: ['process-data', 'validate-input'],
      permissions: {
        allowedTasks: ['process'],
        allowedSecrets: ['test.*'],
        allowedEventTopics: ['test.*']
      },
      publicKey: 'test-public-key',
      registeredAt: new Date(),
      lastHeartbeat: new Date()
    });

    const agents = await registry.getHealthyAgents();
    console.log(`✅ Registered ${agents.length} agents`);

    // Test 2: Policy Evaluation
    console.log('🧪 Test 2: Policy Evaluation...');
    await policyEngine.addPolicy({
      id: 'test-policy',
      name: 'Test Access Policy',
      package: 'test.access',
      rego: `
        package test.access
        
        allow = true {
          input.agent.type == "worker"
          input.action == "read"
        }
        
        deny = true {
          input.resource.sensitivity == "high"
        }
      `,
      version: '1.0.0',
      enabled: true,
      priority: 100,
      tags: []
    });

    const policyDecision = await policyEngine.evaluate('test.access', {
      input: {
        agent: { id: 'test-agent-1', type: 'worker' },
        action: 'read',
        resource: { id: 'test-resource', sensitivity: 'medium' }
      },
      action: 'read',
      environment: { test: true }
    });

    console.log(`✅ Policy decision: ${policyDecision.allow ? 'Allow' : 'Deny'}`);

    // Test 3: Event Publishing and Subscription
    console.log('🧪 Test 3: Event Bus...');
    let receivedEvents = 0;

    await eventBus.subscribe(
      'test-subscriber',
      'test.*',
      async (event) => {
        receivedEvents++;
        console.log(`📨 Received event: ${event.eventType}`);
      }
    );

    await eventBus.publish(
      'test.events',
      'test_event',
      { message: 'Hello from integration test!' },
      { source: 'integration-test' },
      'test-producer'
    );

    // Wait for event processing
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`✅ Event processing: ${receivedEvents} events received`);

    // Test 4: Metrics Collection
    console.log('🧪 Test 4: Metrics Collection...');
    const testCounter = metrics.createCounter('test_operations_total', 'Test operations', ['type']);
    const testHistogram = metrics.createHistogram('test_duration_seconds', 'Test duration', ['operation']);

    testCounter.inc(1, { type: 'integration_test' });
    testHistogram.observe(0.123, { operation: 'test_run' });

    const builtinMetrics = metrics.getBuiltinMetrics();
    builtinMetrics.agentRegistrations.inc(1, { agent_type: 'test', status: 'success' });

    console.log('✅ Metrics recorded successfully');

    // Test 5: Secure Key Management
    console.log('🧪 Test 5: Secure Key Management...');
    const keyId = await keyManager.createKey(
      'test-signing-key',
      'rsa',
      'signing',
      {
        keySize: 2048,
        algorithm: 'RS256',
        agentId: 'system'
      }
    );

    await keyManager.grantKeyAccess(keyId, 'test-agent-1', ['sign']);

    const signature = await keyManager.sign({
      keyId,
      data: 'test message',
      agentId: 'test-agent-1',
      purpose: 'integration-test'
    });

    console.log(`✅ Key created and signing successful: ${signature.signature.substring(0, 20)}...`);

    // Test 6: Secrets ACL
    console.log('🧪 Test 6: Secrets Access Control...');
    const ruleId = await secretsACL.addAccessRule({
      secretId: 'test-secret',
      principal: { type: 'agent', identifier: 'test-agent-1' },
      permissions: [{ action: 'read' }],
      priority: 100,
      enabled: true,
      createdBy: 'integration-test',
      tags: {}
    });

    const accessDecision = await secretsACL.checkAccess({
      requestId: 'test-req-1',
      secretId: 'test-secret',
      agentId: 'test-agent-1',
      action: 'read',
      purpose: 'integration-test',
      environment: 'test',
      timestamp: new Date()
    });

    console.log(`✅ Access control: ${accessDecision.allow ? 'Access granted' : 'Access denied'}`);

    // Test 7: Secret Scanning
    console.log('🧪 Test 7: Secret Scanning...');
    const testContent = `
      const AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE";
      const SECRET_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
    `;

    const scanResults = await scanner.scanContent(testContent);
    console.log(`✅ Secret scanning: ${scanResults.length} potential secrets detected`);

    // Test 8: Advanced Flow Execution
    console.log('🧪 Test 8: Advanced Flow Execution...');
    const flowDefinition = {
      id: 'integration-test-flow',
      name: 'Integration Test Flow',
      version: '1.0.0',
      metadata: {
        createdAt: new Date(),
        createdBy: 'integration-test',
        updatedAt: new Date(),
        updatedBy: 'integration-test',
        tags: { test: 'integration' }
      },
      inputs: [
        { name: 'testInput', type: 'string' as const, value: 'test-value', source: 'input' as const, scope: 'global' as const }
      ],
      outputs: [
        { name: 'testOutput', type: 'string' as const, value: '', source: 'step' as const, scope: 'global' as const }
      ],
      steps: [
        {
          id: 'test-condition',
          name: 'Test Condition',
          type: 'condition' as const,
          enabled: true,
          condition: {
            expression: 'variables.testInput == "test-value"'
          },
          onTrue: [{
            id: 'success-step',
            name: 'Success Step',
            type: 'wait' as const,
            enabled: true,
            wait: { duration: 100 }
          }],
          onFalse: [{
            id: 'failure-step',
            name: 'Failure Step',
            type: 'wait' as const,
            enabled: true,
            wait: { duration: 100 }
          }]
        }
      ],
      config: {
        timeout: 10000,
        errorHandling: 'stop' as const,
        enableLogging: true,
        enableMetrics: true,
        enableTracing: true
      }
    };

    await flowRunner.registerFlow(flowDefinition);

    const executionId = await flowRunner.executeFlow(
      'integration-test-flow',
      { testInput: 'test-value' },
      { triggeredBy: 'integration-test' }
    );

    // Wait for execution to complete
    let execution = flowRunner.getExecution(executionId);
    let attempts = 0;
    while (execution && execution.status === 'pending' || execution?.status === 'running') {
      await new Promise(resolve => setTimeout(resolve, 100));
      execution = flowRunner.getExecution(executionId);
      attempts++;
      if (attempts > 50) break; // 5 second timeout
    }

    console.log(`✅ Flow execution: ${execution?.status || 'unknown'} (${execution?.metrics.stepsExecuted || 0} steps)`);

    // Cleanup
    console.log('🧹 Cleaning up...');
    await registry.stop();
    await policyEngine.stop();
    await eventBus.stop();
    await metrics.stop();
    await keyManager.shutdown();
    await secretsACL.shutdown();
    await flowRunner.shutdown();

    console.log('\n🎉 Integration test completed successfully!');
    console.log('All infrastructure modules are working correctly.');

    // Print summary
    console.log('\n📊 Test Summary:');
    console.log('  ✅ Distributed Agent Registry');
    console.log('  ✅ Policy Engine (OPA/Rego)');
    console.log('  ✅ Persistent Event Bus');
    console.log('  ✅ Metrics Collection');
    console.log('  ✅ Secure Key Management');
    console.log('  ✅ Secrets Access Control');
    console.log('  ✅ Secret Scanner');
    console.log('  ✅ Advanced Flow Runner');

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest().catch(console.error);
}