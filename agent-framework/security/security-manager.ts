/**
 * Security Manager for YUR Agent Framework
 * Provides comprehensive security validation, access control, and audit logging
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';
import { BaseAgent, AgentPermissions, AgentTask } from '../core/agent-base';

// Security interfaces
export interface SecurityPolicy {
  id: string;
  name: string;
  rules: SecurityRule[];
  createdAt: Date;
  updatedAt: Date;
  version: string;
}

export interface SecurityRule {
  id: string;
  type: 'permission' | 'rate_limit' | 'resource_limit' | 'content_filter' | 'ip_restriction';
  target: string; // Agent ID, type, or '*' for all
  conditions: Record<string, any>;
  action: 'allow' | 'deny' | 'require_approval';
  priority: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  resource: string;
  allowed: boolean;
  reason: string;
  metadata: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SecurityContext {
  agentId: string;
  sessionId: string;
  remoteAddress?: string;
  userAgent?: string;
  permissions: AgentPermissions;
  securityLevel: 'low' | 'medium' | 'high' | 'restricted';
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (context: SecurityContext) => string;
}

export interface ResourceLimitConfig {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxExecutionTimeMs: number;
  maxConcurrentTasks: number;
}

// Security Manager implementation
export class SecurityManager extends EventEmitter {
  private policies: Map<string, SecurityPolicy> = new Map();
  private auditLogs: SecurityAuditLog[] = [];
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();
  private secretsCache: Map<string, { value: any; expiresAt: Date }> = new Map();
  private trustedAgents: Set<string> = new Set();
  private quarantinedAgents: Set<string> = new Set();
  private maxAuditLogSize: number = 10000;
  private secretScanRegex: RegExp[];

  constructor() {
    super();
    this.initializeDefaultPolicies();
    this.initializeSecretScanPatterns();
    this.startPeriodicTasks();
  }

  /**
   * Validate if an agent can perform a specific action
   */
  public async validateAction(
    context: SecurityContext,
    action: string,
    resource: string,
    metadata: Record<string, any> = {}
  ): Promise<{ allowed: boolean; reason: string; requiresApproval?: boolean }> {
    const auditId = this.generateAuditId();
    let allowed = false;
    let reason = '';
    let requiresApproval = false;
    let riskLevel: SecurityAuditLog['riskLevel'] = 'low';

    try {
      // Check if agent is quarantined
      if (this.quarantinedAgents.has(context.agentId)) {
        allowed = false;
        reason = 'Agent is quarantined';
        riskLevel = 'critical';
      } else {
        // Apply security policies
        const policyResult = await this.applySecurityPolicies(context, action, resource, metadata);
        allowed = policyResult.allowed;
        reason = policyResult.reason;
        requiresApproval = policyResult.requiresApproval;
        riskLevel = policyResult.riskLevel;
      }

      // Log the security decision
      this.logSecurityEvent({
        id: auditId,
        timestamp: new Date(),
        agentId: context.agentId,
        action,
        resource,
        allowed,
        reason,
        metadata,
        riskLevel,
      });

      // Emit security event
      this.emit('security:validation', {
        auditId,
        agentId: context.agentId,
        action,
        resource,
        allowed,
        reason,
        riskLevel,
      });

      return { allowed, reason, requiresApproval };
    } catch (error) {
      // Log security validation error
      this.logSecurityEvent({
        id: auditId,
        timestamp: new Date(),
        agentId: context.agentId,
        action,
        resource,
        allowed: false,
        reason: `Security validation error: ${error.message}`,
        metadata: { ...metadata, error: error.message },
        riskLevel: 'high',
      });

      return { allowed: false, reason: `Security validation failed: ${error.message}` };
    }
  }

  /**
   * Validate task execution permissions and limits
   */
  public async validateTaskExecution(
    context: SecurityContext,
    task: AgentTask
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check task permissions
    const hasPermission = this.hasTaskPermission(context.permissions, task.type);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: `Agent does not have permission to execute task type: ${task.type}`,
      };
    }

    // Check rate limits
    const rateLimitResult = await this.checkRateLimit(context, 'task_execution');
    if (!rateLimitResult.allowed) {
      return rateLimitResult;
    }

    // Validate task payload for security risks
    const payloadValidation = await this.validateTaskPayload(task.payload);
    if (!payloadValidation.allowed) {
      return payloadValidation;
    }

    // Check resource limits
    const resourceValidation = await this.validateResourceLimits(context, task);
    if (!resourceValidation.allowed) {
      return resourceValidation;
    }

    return { allowed: true, reason: 'Task execution approved' };
  }

  /**
   * Manage secrets with encryption and access control
   */
  public async storeSecret(
    secretName: string,
    secretValue: any,
    permissions: string[],
    expiresIn?: number
  ): Promise<void> {
    // Encrypt the secret value
    const encryptedValue = this.encryptSecret(secretValue);
    
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24 hours

    this.secretsCache.set(secretName, {
      value: {
        encrypted: encryptedValue,
        permissions,
      },
      expiresAt,
    });

    this.emit('secret:stored', { secretName, permissions, expiresAt });
  }

  /**
   * Retrieve and decrypt secrets with access control
   */
  public async getSecret(context: SecurityContext, secretName: string): Promise<any> {
    const validation = await this.validateAction(
      context,
      'get_secret',
      secretName,
      { secretName }
    );

    if (!validation.allowed) {
      throw new Error(`Access denied to secret '${secretName}': ${validation.reason}`);
    }

    const secretEntry = this.secretsCache.get(secretName);
    if (!secretEntry) {
      throw new Error(`Secret '${secretName}' not found`);
    }

    // Check if secret has expired
    if (secretEntry.expiresAt < new Date()) {
      this.secretsCache.delete(secretName);
      throw new Error(`Secret '${secretName}' has expired`);
    }

    // Check permissions
    const hasPermission = secretEntry.value.permissions.includes(context.agentId) ||
                         secretEntry.value.permissions.includes('*') ||
                         this.trustedAgents.has(context.agentId);

    if (!hasPermission) {
      throw new Error(`Agent '${context.agentId}' does not have permission to access secret '${secretName}'`);
    }

    // Decrypt and return the secret
    const decryptedValue = this.decryptSecret(secretEntry.value.encrypted);
    
    this.emit('secret:accessed', {
      agentId: context.agentId,
      secretName,
      timestamp: new Date(),
    });

    return decryptedValue;
  }

  /**
   * Scan content for leaked secrets
   */
  public scanForSecrets(content: string): { found: boolean; matches: Array<{ type: string; match: string }> } {
    const matches: Array<{ type: string; match: string }> = [];

    this.secretScanRegex.forEach((regex, index) => {
      const regexMatches = content.match(regex);
      if (regexMatches) {
        regexMatches.forEach(match => {
          matches.push({
            type: this.getSecretType(index),
            match: this.maskSecret(match),
          });
        });
      }
    });

    if (matches.length > 0) {
      this.emit('security:secrets_detected', {
        content: this.maskContent(content),
        matches,
        timestamp: new Date(),
      });
    }

    return { found: matches.length > 0, matches };
  }

  /**
   * Add or update security policy
   */
  public async addSecurityPolicy(policy: Omit<SecurityPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const policyId = this.generatePolicyId();
    const now = new Date();

    const fullPolicy: SecurityPolicy = {
      id: policyId,
      createdAt: now,
      updatedAt: now,
      ...policy,
    };

    this.policies.set(policyId, fullPolicy);
    this.emit('security:policy_added', { policyId, policy: fullPolicy });

    return policyId;
  }

  /**
   * Quarantine an agent due to security violations
   */
  public quarantineAgent(agentId: string, reason: string): void {
    this.quarantinedAgents.add(agentId);
    
    this.logSecurityEvent({
      id: this.generateAuditId(),
      timestamp: new Date(),
      agentId,
      action: 'quarantine',
      resource: 'agent',
      allowed: true,
      reason,
      metadata: { quarantined: true },
      riskLevel: 'critical',
    });

    this.emit('security:agent_quarantined', { agentId, reason, timestamp: new Date() });
  }

  /**
   * Release an agent from quarantine
   */
  public releaseFromQuarantine(agentId: string, reason: string): boolean {
    const wasQuarantined = this.quarantinedAgents.delete(agentId);
    
    if (wasQuarantined) {
      this.logSecurityEvent({
        id: this.generateAuditId(),
        timestamp: new Date(),
        agentId,
        action: 'release_quarantine',
        resource: 'agent',
        allowed: true,
        reason,
        metadata: { quarantined: false },
        riskLevel: 'medium',
      });

      this.emit('security:agent_released', { agentId, reason, timestamp: new Date() });
    }

    return wasQuarantined;
  }

  /**
   * Get security audit logs
   */
  public getAuditLogs(filter: {
    agentId?: string;
    action?: string;
    resource?: string;
    riskLevel?: SecurityAuditLog['riskLevel'];
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): SecurityAuditLog[] {
    let logs = this.auditLogs;

    // Apply filters
    if (filter.agentId) {
      logs = logs.filter(log => log.agentId === filter.agentId);
    }
    if (filter.action) {
      logs = logs.filter(log => log.action === filter.action);
    }
    if (filter.resource) {
      logs = logs.filter(log => log.resource === filter.resource);
    }
    if (filter.riskLevel) {
      logs = logs.filter(log => log.riskLevel === filter.riskLevel);
    }
    if (filter.startDate) {
      logs = logs.filter(log => log.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      logs = logs.filter(log => log.timestamp <= filter.endDate!);
    }

    // Sort by timestamp (newest first)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter.limit && filter.limit > 0) {
      logs = logs.slice(0, filter.limit);
    }

    return logs;
  }

  // Private methods
  private async applySecurityPolicies(
    context: SecurityContext,
    action: string,
    resource: string,
    metadata: Record<string, any>
  ): Promise<{ allowed: boolean; reason: string; requiresApproval: boolean; riskLevel: SecurityAuditLog['riskLevel'] }> {
    const applicablePolicies = Array.from(this.policies.values())
      .filter(policy => this.isPolicyApplicable(policy, context, action, resource))
      .sort((a, b) => b.rules[0]?.priority || 0 - (a.rules[0]?.priority || 0));

    let finalDecision = { allowed: true, reason: 'Default allow', requiresApproval: false, riskLevel: 'low' as const };

    for (const policy of applicablePolicies) {
      for (const rule of policy.rules) {
        if (this.isRuleApplicable(rule, context, action, resource)) {
          const ruleResult = await this.evaluateRule(rule, context, action, resource, metadata);
          
          if (ruleResult.action === 'deny') {
            return {
              allowed: false,
              reason: ruleResult.reason,
              requiresApproval: false,
              riskLevel: ruleResult.riskLevel,
            };
          } else if (ruleResult.action === 'require_approval') {
            finalDecision = {
              allowed: true,
              reason: ruleResult.reason,
              requiresApproval: true,
              riskLevel: ruleResult.riskLevel,
            };
          }
        }
      }
    }

    return finalDecision;
  }

  private isPolicyApplicable(
    policy: SecurityPolicy,
    context: SecurityContext,
    action: string,
    resource: string
  ): boolean {
    // Simple policy applicability check
    return policy.rules.some(rule => this.isRuleApplicable(rule, context, action, resource));
  }

  private isRuleApplicable(
    rule: SecurityRule,
    context: SecurityContext,
    action: string,
    resource: string
  ): boolean {
    // Check if rule target matches
    const targetMatches = rule.target === '*' || 
                         rule.target === context.agentId || 
                         rule.target === context.permissions.tasks[0]; // Simple type matching

    if (!targetMatches) return false;

    // Check rule conditions
    if (rule.conditions.action && rule.conditions.action !== action) return false;
    if (rule.conditions.resource && rule.conditions.resource !== resource) return false;

    return true;
  }

  private async evaluateRule(
    rule: SecurityRule,
    context: SecurityContext,
    action: string,
    resource: string,
    metadata: Record<string, any>
  ): Promise<{ action: SecurityRule['action']; reason: string; riskLevel: SecurityAuditLog['riskLevel'] }> {
    let riskLevel: SecurityAuditLog['riskLevel'] = 'low';

    switch (rule.type) {
      case 'permission':
        return {
          action: context.permissions.tasks.includes(action) ? 'allow' : 'deny',
          reason: `Permission check for action: ${action}`,
          riskLevel: 'medium',
        };

      case 'rate_limit':
        const rateLimitResult = await this.checkRateLimit(context, action);
        return {
          action: rateLimitResult.allowed ? 'allow' : 'deny',
          reason: rateLimitResult.reason,
          riskLevel: rateLimitResult.allowed ? 'low' : 'medium',
        };

      case 'resource_limit':
        const resourceResult = await this.checkResourceLimits(rule.conditions, metadata);
        return {
          action: resourceResult.allowed ? 'allow' : 'deny',
          reason: resourceResult.reason,
          riskLevel: resourceResult.allowed ? 'low' : 'high',
        };

      case 'content_filter':
        const contentResult = this.checkContentFilter(rule.conditions, metadata);
        return {
          action: contentResult.allowed ? 'allow' : 'deny',
          reason: contentResult.reason,
          riskLevel: contentResult.allowed ? 'low' : 'high',
        };

      default:
        return {
          action: 'allow',
          reason: `Unknown rule type: ${rule.type}`,
          riskLevel: 'medium',
        };
    }
  }

  private async checkRateLimit(
    context: SecurityContext,
    action: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
  ): Promise<{ allowed: boolean; reason: string }> {
    const key = `${context.agentId}:${action}`;
    const now = Date.now();
    const window = this.rateLimitStore.get(key);

    if (!window || now > window.resetTime) {
      this.rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
      return { allowed: true, reason: 'Rate limit: OK' };
    }

    if (window.count >= config.maxRequests) {
      return {
        allowed: false,
        reason: `Rate limit exceeded: ${window.count}/${config.maxRequests} requests in window`,
      };
    }

    window.count++;
    return { allowed: true, reason: 'Rate limit: OK' };
  }

  private async checkResourceLimits(
    conditions: Record<string, any>,
    metadata: Record<string, any>
  ): Promise<{ allowed: boolean; reason: string }> {
    // Check memory limit
    if (conditions.maxMemoryMB && metadata.memoryUsageMB > conditions.maxMemoryMB) {
      return {
        allowed: false,
        reason: `Memory limit exceeded: ${metadata.memoryUsageMB}MB > ${conditions.maxMemoryMB}MB`,
      };
    }

    // Check execution time limit
    if (conditions.maxExecutionTimeMs && metadata.executionTimeMs > conditions.maxExecutionTimeMs) {
      return {
        allowed: false,
        reason: `Execution time limit exceeded: ${metadata.executionTimeMs}ms > ${conditions.maxExecutionTimeMs}ms`,
      };
    }

    return { allowed: true, reason: 'Resource limits: OK' };
  }

  private checkContentFilter(
    conditions: Record<string, any>,
    metadata: Record<string, any>
  ): { allowed: boolean; reason: string } {
    const content = metadata.content || '';
    
    // Check for prohibited patterns
    if (conditions.prohibitedPatterns) {
      for (const pattern of conditions.prohibitedPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
          return {
            allowed: false,
            reason: `Content contains prohibited pattern: ${pattern}`,
          };
        }
      }
    }

    // Check for required patterns
    if (conditions.requiredPatterns) {
      for (const pattern of conditions.requiredPatterns) {
        const regex = new RegExp(pattern, 'i');
        if (!regex.test(content)) {
          return {
            allowed: false,
            reason: `Content missing required pattern: ${pattern}`,
          };
        }
      }
    }

    return { allowed: true, reason: 'Content filter: OK' };
  }

  private hasTaskPermission(permissions: AgentPermissions, taskType: string): boolean {
    return permissions.tasks.includes(taskType) || permissions.tasks.includes('*');
  }

  private async validateTaskPayload(payload: any): Promise<{ allowed: boolean; reason: string }> {
    try {
      const payloadString = JSON.stringify(payload);
      const secretScan = this.scanForSecrets(payloadString);
      
      if (secretScan.found) {
        return {
          allowed: false,
          reason: `Task payload contains potential secrets: ${secretScan.matches.map(m => m.type).join(', ')}`,
        };
      }

      // Check payload size
      if (payloadString.length > 1024 * 1024) { // 1MB limit
        return {
          allowed: false,
          reason: `Task payload too large: ${payloadString.length} bytes`,
        };
      }

      return { allowed: true, reason: 'Task payload validation: OK' };
    } catch (error) {
      return {
        allowed: false,
        reason: `Task payload validation error: ${error.message}`,
      };
    }
  }

  private async validateResourceLimits(
    context: SecurityContext,
    task: AgentTask
  ): Promise<{ allowed: boolean; reason: string }> {
    // This would integrate with actual resource monitoring
    // For now, return a simple validation
    return { allowed: true, reason: 'Resource limits: OK' };
  }

  private encryptSecret(value: any): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync('your-secret-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    let encrypted = cipher.update(JSON.stringify(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decryptSecret(encryptedValue: string): any {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync('your-secret-key', 'salt', 32);
    
    const [ivHex, encrypted] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  private initializeDefaultPolicies(): void {
    // Add some default security policies
    this.addSecurityPolicy({
      name: 'Default Rate Limiting',
      version: '1.0.0',
      rules: [
        {
          id: 'rate-limit-default',
          type: 'rate_limit',
          target: '*',
          conditions: { maxRequests: 100, windowMs: 60000 },
          action: 'deny',
          priority: 100,
        },
      ],
    });
  }

  private initializeSecretScanPatterns(): void {
    this.secretScanRegex = [
      /[A-Za-z0-9]{20,}/g, // Generic secrets
      /sk-[A-Za-z0-9]{48}/g, // OpenAI API keys
      /(?:password|pwd|pass|secret|key)\s*[:=]\s*["']?([^"'\s]+)/gi, // Common secret patterns
      /-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, // Private keys
    ];
  }

  private getSecretType(regexIndex: number): string {
    const types = ['generic', 'openai_key', 'credential', 'private_key'];
    return types[regexIndex] || 'unknown';
  }

  private maskSecret(secret: string): string {
    if (secret.length <= 8) return '*'.repeat(secret.length);
    return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
  }

  private maskContent(content: string): string {
    return content.length > 100 ? content.substring(0, 100) + '...[truncated]' : content;
  }

  private logSecurityEvent(event: SecurityAuditLog): void {
    this.auditLogs.push(event);
    
    // Maintain audit log size limit
    if (this.auditLogs.length > this.maxAuditLogSize) {
      this.auditLogs = this.auditLogs.slice(-this.maxAuditLogSize);
    }
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePolicyId(): string {
    return `policy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPeriodicTasks(): void {
    // Clean up expired secrets every 5 minutes
    setInterval(() => {
      const now = new Date();
      for (const [key, entry] of this.secretsCache.entries()) {
        if (entry.expiresAt < now) {
          this.secretsCache.delete(key);
          this.emit('secret:expired', { secretName: key, timestamp: now });
        }
      }
    }, 5 * 60 * 1000);

    // Clean up rate limit store every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, window] of this.rateLimitStore.entries()) {
        if (now > window.resetTime) {
          this.rateLimitStore.delete(key);
        }
      }
    }, 60 * 1000);
  }
}

export default SecurityManager;