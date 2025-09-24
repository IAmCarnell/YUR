/**
 * YUR Agent Framework - OPA/Rego Policy-as-Code Integration
 * Production-ready policy engine with hot-reloadable policies, decision caching,
 * and comprehensive audit logging
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { FSWatcher, watch } from 'fs';

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  package: string;
  rego: string;
  version: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  hash: string;
}

export interface PolicyDecision {
  allow: boolean;
  deny: boolean;
  reasons: string[];
  metadata: Record<string, any>;
  policy: string;
  rule: string;
  timestamp: Date;
  executionTimeMs: number;
}

export interface PolicyEvaluationContext {
  input: Record<string, any>;
  data?: Record<string, any>;
  agent?: {
    id: string;
    type: string;
    permissions: string[];
  };
  resource?: {
    type: string;
    id: string;
    attributes: Record<string, any>;
  };
  action: string;
  environment: Record<string, any>;
}

export interface PolicyAuditLog {
  id: string;
  timestamp: Date;
  agentId?: string;
  policyId: string;
  action: string;
  input: Record<string, any>;
  decision: PolicyDecision;
  context: PolicyEvaluationContext;
  duration: number;
  cached: boolean;
}

export interface PolicyEngineConfig {
  policyDir: string;
  dataDir: string;
  auditLogPath: string;
  enableHotReload: boolean;
  enableCaching: boolean;
  cacheSize: number;
  cacheTtlMs: number;
  enableAuditLogging: boolean;
  maxAuditLogEntries: number;
  compilationTimeout: number;
  evaluationTimeout: number;
}

/**
 * Simple Rego-like policy evaluator
 * In production, you would use the official OPA Go library or WASM module
 */
class RegoEvaluator {
  private rules: Map<string, CompiledRule> = new Map();

  async compile(rego: string, packageName: string): Promise<CompiledRule> {
    // This is a simplified Rego parser/compiler
    // In production, use official OPA compiler
    const rule: CompiledRule = {
      package: packageName,
      rules: this.parseRego(rego),
      functions: new Map(),
      data: new Map()
    };

    return rule;
  }

  async evaluate(rule: CompiledRule, input: any, data: any = {}): Promise<PolicyDecision> {
    const startTime = Date.now();
    
    try {
      const context = {
        input,
        data,
        functions: this.getBuiltinFunctions()
      };

      const results = [];
      
      // Evaluate each rule in the package
      for (const ruleExpr of rule.rules) {
        const result = await this.evaluateExpression(ruleExpr, context);
        results.push(result);
      }

      // Determine overall decision
      const allow = results.some(r => r.allow === true);
      const deny = results.some(r => r.deny === true);
      const reasons = results.flatMap(r => r.reasons || []);

      return {
        allow: allow && !deny,
        deny,
        reasons,
        metadata: { results },
        policy: rule.package,
        rule: 'default',
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        allow: false,
        deny: true,
        reasons: [`Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        policy: rule.package,
        rule: 'error',
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      };
    }
  }

  private parseRego(rego: string): ParsedRule[] {
    // Simplified Rego parser - in production, use official OPA parser
    const rules: ParsedRule[] = [];
    const lines = rego.split('\n').map(line => line.trim()).filter(Boolean);
    
    let currentRule: Partial<ParsedRule> = {};
    
    for (const line of lines) {
      if (line.startsWith('package ')) {
        continue; // Package declaration handled separately
      }
      
      if (line.includes('allow') && line.includes('=')) {
        const parts = line.split('=');
        if (parts.length === 2) {
          currentRule.name = 'allow';
          currentRule.expression = parts[1].trim();
          currentRule.type = 'decision';
        }
      } else if (line.includes('deny') && line.includes('=')) {
        const parts = line.split('=');
        if (parts.length === 2) {
          currentRule.name = 'deny';
          currentRule.expression = parts[1].trim();
          currentRule.type = 'decision';
        }
      } else if (line.includes('reasons') && line.includes('=')) {
        const parts = line.split('=');
        if (parts.length === 2) {
          currentRule.name = 'reasons';
          currentRule.expression = parts[1].trim();
          currentRule.type = 'reason';
        }
      }
      
      if (currentRule.name && currentRule.expression) {
        rules.push(currentRule as ParsedRule);
        currentRule = {};
      }
    }
    
    return rules;
  }

  private async evaluateExpression(rule: ParsedRule, context: any): Promise<any> {
    // Simplified expression evaluator
    // In production, use official OPA evaluation engine
    
    const expression = rule.expression;
    
    // Handle simple boolean expressions
    if (expression === 'true') {
      return { [rule.name]: true };
    }
    if (expression === 'false') {
      return { [rule.name]: false };
    }
    
    // Handle input field references
    if (expression.startsWith('input.')) {
      const fieldPath = expression.substring(6);
      const value = this.getNestedValue(context.input, fieldPath);
      return { [rule.name]: value };
    }
    
    // Handle data field references
    if (expression.startsWith('data.')) {
      const fieldPath = expression.substring(5);
      const value = this.getNestedValue(context.data, fieldPath);
      return { [rule.name]: value };
    }
    
    // Handle simple comparisons
    if (expression.includes('==')) {
      const [left, right] = expression.split('==').map(s => s.trim());
      const leftValue = this.resolveValue(left, context);
      const rightValue = this.resolveValue(right, context);
      return { [rule.name]: leftValue === rightValue };
    }
    
    if (expression.includes('!=')) {
      const [left, right] = expression.split('!=').map(s => s.trim());
      const leftValue = this.resolveValue(left, context);
      const rightValue = this.resolveValue(right, context);
      return { [rule.name]: leftValue !== rightValue };
    }
    
    // Handle array contains
    if (expression.includes(' in ')) {
      const [item, array] = expression.split(' in ').map(s => s.trim());
      const itemValue = this.resolveValue(item, context);
      const arrayValue = this.resolveValue(array, context);
      
      if (Array.isArray(arrayValue)) {
        return { [rule.name]: arrayValue.includes(itemValue) };
      }
    }
    
    return { [rule.name]: false };
  }

  private resolveValue(expr: string, context: any): any {
    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1); // String literal
    }
    
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    
    if (!isNaN(Number(expr))) {
      return Number(expr);
    }
    
    if (expr.startsWith('input.')) {
      const fieldPath = expr.substring(6);
      return this.getNestedValue(context.input, fieldPath);
    }
    
    if (expr.startsWith('data.')) {
      const fieldPath = expr.substring(5);
      return this.getNestedValue(context.data, fieldPath);
    }
    
    return expr;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private getBuiltinFunctions(): Map<string, Function> {
    const functions = new Map<string, Function>();
    
    functions.set('count', (arr: any[]) => Array.isArray(arr) ? arr.length : 0);
    functions.set('contains', (str: string, substr: string) => str.includes(substr));
    functions.set('startswith', (str: string, prefix: string) => str.startsWith(prefix));
    functions.set('endswith', (str: string, suffix: string) => str.endsWith(suffix));
    functions.set('regex.match', (pattern: string, str: string) => new RegExp(pattern).test(str));
    
    return functions;
  }
}

interface CompiledRule {
  package: string;
  rules: ParsedRule[];
  functions: Map<string, Function>;
  data: Map<string, any>;
}

interface ParsedRule {
  name: string;
  expression: string;
  type: 'decision' | 'reason' | 'data';
}

export class PolicyEngine extends EventEmitter {
  private config: PolicyEngineConfig;
  private policies: Map<string, PolicyRule> = new Map();
  private compiledRules: Map<string, CompiledRule> = new Map();
  private evaluator: RegoEvaluator = new RegoEvaluator();
  private decisionCache: Map<string, { decision: PolicyDecision; expiresAt: number }> = new Map();
  private auditLog: PolicyAuditLog[] = [];
  private watchers: Map<string, FSWatcher> = new Map();
  private running: boolean = false;

  constructor(config: Partial<PolicyEngineConfig> = {}) {
    super();
    
    this.config = {
      policyDir: config.policyDir || './policies',
      dataDir: config.dataDir || './policy-data',
      auditLogPath: config.auditLogPath || './policy-audit.log',
      enableHotReload: config.enableHotReload ?? true,
      enableCaching: config.enableCaching ?? true,
      cacheSize: config.cacheSize || 10000,
      cacheTtlMs: config.cacheTtlMs || 300000, // 5 minutes
      enableAuditLogging: config.enableAuditLogging ?? true,
      maxAuditLogEntries: config.maxAuditLogEntries || 100000,
      compilationTimeout: config.compilationTimeout || 10000,
      evaluationTimeout: config.evaluationTimeout || 5000,
    };
  }

  /**
   * Start the policy engine
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Policy engine is already running');
    }

    try {
      // Ensure directories exist
      await fs.mkdir(this.config.policyDir, { recursive: true });
      await fs.mkdir(this.config.dataDir, { recursive: true });
      await fs.mkdir(path.dirname(this.config.auditLogPath), { recursive: true });

      // Load existing policies
      await this.loadPolicies();

      // Start hot reload if enabled
      if (this.config.enableHotReload) {
        this.startHotReload();
      }

      // Start cache cleanup
      if (this.config.enableCaching) {
        this.startCacheCleanup();
      }

      this.running = true;
      this.emit('engine:started');
      
      console.log(`Policy engine started with ${this.policies.size} policies`);
    } catch (error) {
      this.emit('engine:error', error);
      throw error;
    }
  }

  /**
   * Stop the policy engine
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop file watchers
      for (const [filePath, watcher] of this.watchers) {
        watcher.close();
      }
      this.watchers.clear();

      // Flush audit log
      if (this.config.enableAuditLogging && this.auditLog.length > 0) {
        await this.flushAuditLog();
      }

      this.running = false;
      this.emit('engine:stopped');
      
      console.log('Policy engine stopped');
    } catch (error) {
      this.emit('engine:error', error);
    }
  }

  /**
   * Add or update a policy
   */
  async addPolicy(policy: Omit<PolicyRule, 'hash' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = new Date();
    const hash = crypto.createHash('sha256').update(policy.rego).digest('hex');
    
    const fullPolicy: PolicyRule = {
      ...policy,
      hash,
      createdAt: this.policies.get(policy.id)?.createdAt || now,
      updatedAt: now
    };

    // Compile the policy
    try {
      const compiledRule = await this.evaluator.compile(policy.rego, policy.package);
      
      this.policies.set(policy.id, fullPolicy);
      this.compiledRules.set(policy.id, compiledRule);
      
      // Clear cache entries that might be affected
      this.invalidateCache(policy.package);
      
      // Save to file
      await this.savePolicyToFile(fullPolicy);
      
      this.emit('policy:added', fullPolicy);
      console.log(`Policy ${policy.id} added/updated`);
    } catch (error) {
      this.emit('policy:compilation-error', { policy: policy.id, error });
      throw new Error(`Failed to compile policy ${policy.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a policy
   */
  async removePolicy(policyId: string): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy) {
      return;
    }

    this.policies.delete(policyId);
    this.compiledRules.delete(policyId);
    
    // Clear cache entries
    this.invalidateCache(policy.package);
    
    // Remove file
    const filePath = path.join(this.config.policyDir, `${policyId}.rego`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File might not exist, ignore
    }
    
    this.emit('policy:removed', policyId);
    console.log(`Policy ${policyId} removed`);
  }

  /**
   * Evaluate policies for a given context
   */
  async evaluate(
    packageName: string, 
    context: PolicyEvaluationContext
  ): Promise<PolicyDecision> {
    if (!this.running) {
      throw new Error('Policy engine is not running');
    }

    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(packageName, context);
        const cached = this.decisionCache.get(cacheKey);
        
        if (cached && cached.expiresAt > Date.now()) {
          if (this.config.enableAuditLogging) {
            await this.logDecision(context, cached.decision, Date.now() - startTime, true);
          }
          return cached.decision;
        }
      }

      // Find policies for the package
      const relevantPolicies = Array.from(this.policies.values()).filter(
        policy => policy.package === packageName && policy.enabled
      ).sort((a, b) => b.priority - a.priority); // Higher priority first

      if (relevantPolicies.length === 0) {
        const decision: PolicyDecision = {
          allow: false,
          deny: true,
          reasons: [`No policies found for package: ${packageName}`],
          metadata: { package: packageName },
          policy: packageName,
          rule: 'no-policy',
          timestamp: new Date(),
          executionTimeMs: Date.now() - startTime
        };

        if (this.config.enableAuditLogging) {
          await this.logDecision(context, decision, Date.now() - startTime, false);
        }

        return decision;
      }

      // Evaluate policies in priority order
      const decisions: PolicyDecision[] = [];
      
      for (const policy of relevantPolicies) {
        const compiledRule = this.compiledRules.get(policy.id);
        if (!compiledRule) {
          continue;
        }

        try {
          const decision = await this.evaluateWithTimeout(
            compiledRule, 
            context.input, 
            context.data || {}
          );
          
          decision.policy = policy.id;
          decisions.push(decision);
          
          // If we get a definitive decision (allow or deny), we can stop
          if (decision.allow || decision.deny) {
            break;
          }
        } catch (error) {
          console.warn(`Error evaluating policy ${policy.id}:`, error);
        }
      }

      // Combine decisions
      const finalDecision = this.combineDecisions(decisions, packageName, startTime);

      // Cache the decision
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(packageName, context);
        this.decisionCache.set(cacheKey, {
          decision: finalDecision,
          expiresAt: Date.now() + this.config.cacheTtlMs
        });
        
        // Trim cache if needed
        if (this.decisionCache.size > this.config.cacheSize) {
          const entries = Array.from(this.decisionCache.entries());
          entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
          
          // Remove oldest 10% of entries
          const toRemove = Math.floor(entries.length * 0.1);
          for (let i = 0; i < toRemove; i++) {
            this.decisionCache.delete(entries[i][0]);
          }
        }
      }

      // Log the decision
      if (this.config.enableAuditLogging) {
        await this.logDecision(context, finalDecision, Date.now() - startTime, false);
      }

      return finalDecision;
    } catch (error) {
      const errorDecision: PolicyDecision = {
        allow: false,
        deny: true,
        reasons: [`Policy evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
        policy: packageName,
        rule: 'error',
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      };

      if (this.config.enableAuditLogging) {
        await this.logDecision(context, errorDecision, Date.now() - startTime, false);
      }

      return errorDecision;
    }
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): PolicyRule | undefined {
    return this.policies.get(policyId);
  }

  /**
   * List all policies
   */
  listPolicies(packageName?: string): PolicyRule[] {
    const policies = Array.from(this.policies.values());
    return packageName 
      ? policies.filter(policy => policy.package === packageName)
      : policies;
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit: number = 100): PolicyAuditLog[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalPolicies: number;
    enabledPolicies: number;
    cacheHitRate: number;
    averageEvaluationTime: number;
    auditLogEntries: number;
  } {
    const enabledPolicies = Array.from(this.policies.values()).filter(p => p.enabled).length;
    
    // Calculate cache hit rate from recent audit entries
    const recentEntries = this.auditLog.slice(-1000);
    const cacheHits = recentEntries.filter(entry => entry.cached).length;
    const cacheHitRate = recentEntries.length > 0 ? cacheHits / recentEntries.length : 0;
    
    // Calculate average evaluation time
    const averageEvaluationTime = recentEntries.length > 0
      ? recentEntries.reduce((sum, entry) => sum + entry.duration, 0) / recentEntries.length
      : 0;

    return {
      totalPolicies: this.policies.size,
      enabledPolicies,
      cacheHitRate,
      averageEvaluationTime,
      auditLogEntries: this.auditLog.length
    };
  }

  private async loadPolicies(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.policyDir);
      const regoFiles = files.filter(file => file.endsWith('.rego'));
      
      console.log(`Loading ${regoFiles.length} policy files...`);
      
      for (const file of regoFiles) {
        try {
          await this.loadPolicyFromFile(path.join(this.config.policyDir, file));
        } catch (error) {
          console.warn(`Failed to load policy file ${file}:`, error);
        }
      }
    } catch (error) {
      console.warn('Policy directory not found or inaccessible');
    }
  }

  private async loadPolicyFromFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8');
    const metadata = await this.extractPolicyMetadata(content);
    
    const policy: PolicyRule = {
      id: metadata.id || path.basename(filePath, '.rego'),
      name: metadata.name || path.basename(filePath, '.rego'),
      description: metadata.description,
      package: metadata.package || 'default',
      rego: content,
      version: metadata.version || '1.0.0',
      enabled: metadata.enabled ?? true,
      priority: metadata.priority || 100,
      tags: metadata.tags || [],
      hash: crypto.createHash('sha256').update(content).digest('hex'),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      const compiledRule = await this.evaluator.compile(policy.rego, policy.package);
      
      this.policies.set(policy.id, policy);
      this.compiledRules.set(policy.id, compiledRule);
      
      console.log(`Loaded policy: ${policy.id}`);
    } catch (error) {
      console.error(`Failed to compile policy ${policy.id}:`, error);
    }
  }

  private async extractPolicyMetadata(content: string): Promise<any> {
    const metadata: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('# @')) {
        const parts = trimmed.substring(3).split(':');
        if (parts.length === 2) {
          const key = parts[0].trim();
          const value = parts[1].trim();
          
          if (key === 'tags') {
            metadata[key] = value.split(',').map(tag => tag.trim());
          } else if (key === 'enabled') {
            metadata[key] = value.toLowerCase() === 'true';
          } else if (key === 'priority') {
            metadata[key] = parseInt(value, 10);
          } else {
            metadata[key] = value;
          }
        }
      } else if (trimmed.startsWith('package ')) {
        metadata.package = trimmed.substring(8).trim();
      }
    }
    
    return metadata;
  }

  private async savePolicyToFile(policy: PolicyRule): Promise<void> {
    const filePath = path.join(this.config.policyDir, `${policy.id}.rego`);
    
    const header = [
      `# @id: ${policy.id}`,
      `# @name: ${policy.name}`,
      policy.description ? `# @description: ${policy.description}` : null,
      `# @version: ${policy.version}`,
      `# @enabled: ${policy.enabled}`,
      `# @priority: ${policy.priority}`,
      policy.tags.length > 0 ? `# @tags: ${policy.tags.join(', ')}` : null,
      ''
    ].filter(Boolean).join('\n');
    
    const content = header + policy.rego;
    await fs.writeFile(filePath, content);
  }

  private startHotReload(): void {
    try {
      const watcher = watch(this.config.policyDir, { recursive: true }, async (eventType, filename) => {
        if (!filename || !filename.endsWith('.rego')) {
          return;
        }

        const filePath = path.join(this.config.policyDir, filename);
        
        try {
          if (eventType === 'rename') {
            // File was deleted or moved
            const policyId = path.basename(filename, '.rego');
            if (this.policies.has(policyId)) {
              await this.removePolicy(policyId);
            }
          } else if (eventType === 'change') {
            // File was modified
            await this.loadPolicyFromFile(filePath);
            this.emit('policy:reloaded', filename);
          }
        } catch (error) {
          console.warn(`Hot reload error for ${filename}:`, error);
        }
      });

      this.watchers.set(this.config.policyDir, watcher);
      console.log('Hot reload enabled for policy directory');
    } catch (error) {
      console.warn('Failed to enable hot reload:', error);
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.decisionCache) {
        if (entry.expiresAt <= now) {
          this.decisionCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private async evaluateWithTimeout(
    rule: CompiledRule, 
    input: any, 
    data: any
  ): Promise<PolicyDecision> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Policy evaluation timeout'));
      }, this.config.evaluationTimeout);

      this.evaluator.evaluate(rule, input, data)
        .then(decision => {
          clearTimeout(timeout);
          resolve(decision);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private combineDecisions(decisions: PolicyDecision[], packageName: string, startTime: number): PolicyDecision {
    if (decisions.length === 0) {
      return {
        allow: false,
        deny: true,
        reasons: ['No policy decisions made'],
        metadata: {},
        policy: packageName,
        rule: 'no-decisions',
        timestamp: new Date(),
        executionTimeMs: Date.now() - startTime
      };
    }

    // If any policy explicitly denies, deny
    const explicitDeny = decisions.find(d => d.deny === true);
    if (explicitDeny) {
      return {
        ...explicitDeny,
        executionTimeMs: Date.now() - startTime
      };
    }

    // If any policy explicitly allows, allow
    const explicitAllow = decisions.find(d => d.allow === true);
    if (explicitAllow) {
      return {
        ...explicitAllow,
        executionTimeMs: Date.now() - startTime
      };
    }

    // Default deny
    return {
      allow: false,
      deny: true,
      reasons: decisions.flatMap(d => d.reasons),
      metadata: { decisions },
      policy: packageName,
      rule: 'default-deny',
      timestamp: new Date(),
      executionTimeMs: Date.now() - startTime
    };
  }

  private generateCacheKey(packageName: string, context: PolicyEvaluationContext): string {
    const cacheData = {
      package: packageName,
      input: context.input,
      data: context.data,
      action: context.action
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(cacheData))
      .digest('hex');
  }

  private invalidateCache(packageName: string): void {
    for (const [key, entry] of this.decisionCache) {
      if (entry.decision.policy.includes(packageName)) {
        this.decisionCache.delete(key);
      }
    }
  }

  private async logDecision(
    context: PolicyEvaluationContext,
    decision: PolicyDecision,
    duration: number,
    cached: boolean
  ): Promise<void> {
    const logEntry: PolicyAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      agentId: context.agent?.id,
      policyId: decision.policy,
      action: context.action,
      input: context.input,
      decision,
      context,
      duration,
      cached
    };

    this.auditLog.push(logEntry);

    // Trim audit log if it gets too large
    if (this.auditLog.length > this.config.maxAuditLogEntries) {
      this.auditLog.splice(0, this.auditLog.length - this.config.maxAuditLogEntries);
    }

    // Periodically flush to file
    if (this.auditLog.length % 100 === 0) {
      await this.flushAuditLog();
    }
  }

  private async flushAuditLog(): Promise<void> {
    if (this.auditLog.length === 0) {
      return;
    }

    try {
      const logEntries = this.auditLog.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(this.config.auditLogPath, logEntries);
      console.log(`Flushed ${this.auditLog.length} audit log entries`);
    } catch (error) {
      console.error('Failed to flush audit log:', error);
    }
  }
}