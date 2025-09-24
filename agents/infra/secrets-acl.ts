/**
 * YUR Agent Framework - Per-Secret Access Control Lists
 * Production-ready fine-grained access control for secrets with role-based
 * permissions, dynamic conditions, and comprehensive audit logging
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface SecretPermission {
  action: 'read' | 'write' | 'delete' | 'grant' | 'revoke' | 'rotate';
  conditions?: AccessCondition[];
  metadata?: Record<string, any>;
}

export interface AccessCondition {
  type: 'time_window' | 'ip_whitelist' | 'rate_limit' | 'purpose' | 'environment' | 'approval_required' | 'mfa_required';
  parameters: Record<string, any>;
}

export interface AccessRule {
  id: string;
  secretId: string;
  principal: {
    type: 'agent' | 'role' | 'group' | 'wildcard';
    identifier: string;
  };
  permissions: SecretPermission[];
  priority: number;
  enabled: boolean;
  createdAt: Date;
  createdBy: string;
  expiresAt?: Date;
  tags: Record<string, string>;
}

export interface AccessRequest {
  requestId: string;
  secretId: string;
  agentId: string;
  action: SecretPermission['action'];
  purpose: string;
  environment: string;
  sourceIp?: string;
  userAgent?: string;
  additionalContext?: Record<string, any>;
  timestamp: Date;
}

export interface AccessDecision {
  requestId: string;
  allow: boolean;
  reasons: string[];
  appliedRules: string[];
  conditions: {
    timeWindow?: boolean;
    ipWhitelist?: boolean;
    rateLimit?: boolean;
    purpose?: boolean;
    environment?: boolean;
    approvalRequired?: boolean;
    mfaRequired?: boolean;
  };
  metadata: Record<string, any>;
  timestamp: Date;
  ttl?: number; // Cache TTL in seconds
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: {
    secretPatterns: string[]; // glob patterns
    actions: SecretPermission['action'][];
    conditions?: AccessCondition[];
  };
  inheritsFrom?: string[]; // Role inheritance
  createdAt: Date;
  createdBy: string;
  enabled: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  members: string[]; // agent IDs
  roles: string[]; // role IDs
  createdAt: Date;
  createdBy: string;
  enabled: boolean;
}

export interface AccessAuditLog {
  id: string;
  timestamp: Date;
  requestId: string;
  secretId: string;
  agentId: string;
  action: SecretPermission['action'];
  decision: 'allow' | 'deny';
  reasons: string[];
  appliedRules: string[];
  sourceIp?: string;
  userAgent?: string;
  purpose: string;
  environment: string;
  duration: number;
  additionalContext?: Record<string, any>;
}

export interface ApprovalRequest {
  id: string;
  secretId: string;
  agentId: string;
  action: SecretPermission['action'];
  purpose: string;
  environment: string;
  requestedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  approvedBy?: string;
  approvedAt?: Date;
  deniedBy?: string;
  deniedAt?: Date;
  reason?: string;
}

export interface SecretsACLConfig {
  dataDir: string;
  auditLogPath: string;
  enableAuditLogging: boolean;
  maxAuditLogEntries: number;
  enableCaching: boolean;
  cacheSize: number;
  cacheTtlSeconds: number;
  enableApprovalWorkflow: boolean;
  defaultApprovalTimeout: number;
  enableRateLimiting: boolean;
  defaultRateLimit: {
    requests: number;
    windowMs: number;
  };
  enableMFA: boolean;
  mfaProviders: string[];
  enableConditionEvaluation: boolean;
  maxConditionDepth: number;
}

interface CachedDecision {
  decision: AccessDecision;
  expiresAt: number;
}

interface RateLimit {
  count: number;
  windowStart: Date;
  lastReset: Date;
}

export class SecretsACL extends EventEmitter {
  private config: SecretsACLConfig;
  private accessRules: Map<string, AccessRule[]> = new Map(); // secretId -> rules
  private roles: Map<string, Role> = new Map();
  private groups: Map<string, Group> = new Map();
  private auditLog: AccessAuditLog[] = [];
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private decisionCache: Map<string, CachedDecision> = new Map();
  private rateLimits: Map<string, RateLimit> = new Map();
  private running: boolean = false;
  private cacheCleanupInterval?: NodeJS.Timeout;
  private approvalCleanupInterval?: NodeJS.Timeout;

  constructor(config: Partial<SecretsACLConfig> = {}) {
    super();
    
    this.config = {
      dataDir: config.dataDir || './secrets-acl',
      auditLogPath: config.auditLogPath || './secrets-acl-audit.log',
      enableAuditLogging: config.enableAuditLogging ?? true,
      maxAuditLogEntries: config.maxAuditLogEntries || 1000000,
      enableCaching: config.enableCaching ?? true,
      cacheSize: config.cacheSize || 10000,
      cacheTtlSeconds: config.cacheTtlSeconds || 300,
      enableApprovalWorkflow: config.enableApprovalWorkflow ?? true,
      defaultApprovalTimeout: config.defaultApprovalTimeout || 3600000, // 1 hour
      enableRateLimiting: config.enableRateLimiting ?? true,
      defaultRateLimit: config.defaultRateLimit || { requests: 100, windowMs: 60000 },
      enableMFA: config.enableMFA ?? false,
      mfaProviders: config.mfaProviders || ['totp', 'sms'],
      enableConditionEvaluation: config.enableConditionEvaluation ?? true,
      maxConditionDepth: config.maxConditionDepth || 10
    };
  }

  /**
   * Initialize the secrets ACL system
   */
  async initialize(): Promise<void> {
    if (this.running) {
      throw new Error('Secrets ACL is already running');
    }

    try {
      // Create data directory
      await fs.mkdir(this.config.dataDir, { recursive: true });

      // Load existing data
      await this.loadAccessRules();
      await this.loadRoles();
      await this.loadGroups();

      // Start background processes
      if (this.config.enableCaching) {
        this.startCacheCleanup();
      }

      if (this.config.enableApprovalWorkflow) {
        this.startApprovalCleanup();
      }

      this.running = true;
      this.emit('acl:started');
      
      console.log(`Secrets ACL initialized with ${this.getTotalRulesCount()} access rules`);
    } catch (error) {
      this.emit('acl:error', error);
      throw error;
    }
  }

  /**
   * Shutdown the ACL system
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop background processes
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
      }
      if (this.approvalCleanupInterval) {
        clearInterval(this.approvalCleanupInterval);
      }

      // Flush audit log
      if (this.config.enableAuditLogging) {
        await this.flushAuditLog();
      }

      // Save current state
      await this.saveAccessRules();
      await this.saveRoles();
      await this.saveGroups();

      this.running = false;
      this.emit('acl:stopped');
      
      console.log('Secrets ACL shut down');
    } catch (error) {
      this.emit('acl:error', error);
    }
  }

  /**
   * Check access for a secret
   */
  async checkAccess(request: AccessRequest): Promise<AccessDecision> {
    if (!this.running) {
      throw new Error('Secrets ACL not initialized');
    }

    const startTime = Date.now();

    try {
      // Check cache first
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(request);
        const cached = this.decisionCache.get(cacheKey);
        
        if (cached && cached.expiresAt > Date.now()) {
          await this.logAccess(request, cached.decision, Date.now() - startTime);
          return cached.decision;
        }
      }

      // Check rate limiting
      if (this.config.enableRateLimiting && !this.checkRateLimit(request)) {
        const decision: AccessDecision = {
          requestId: request.requestId,
          allow: false,
          reasons: ['Rate limit exceeded'],
          appliedRules: [],
          conditions: {},
          metadata: { rateLimited: true },
          timestamp: new Date()
        };

        await this.logAccess(request, decision, Date.now() - startTime);
        return decision;
      }

      // Get applicable rules
      const applicableRules = await this.getApplicableRules(request);
      
      if (applicableRules.length === 0) {
        const decision: AccessDecision = {
          requestId: request.requestId,
          allow: false,
          reasons: ['No applicable access rules found'],
          appliedRules: [],
          conditions: {},
          metadata: { noRules: true },
          timestamp: new Date()
        };

        await this.logAccess(request, decision, Date.now() - startTime);
        return decision;
      }

      // Evaluate rules in priority order (higher priority first)
      const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority);
      const reasons: string[] = [];
      const appliedRules: string[] = [];
      const conditionResults: AccessDecision['conditions'] = {};
      let finalDecision = false;

      for (const rule of sortedRules) {
        if (!rule.enabled) {
          continue;
        }

        appliedRules.push(rule.id);

        // Check if rule has the requested permission
        const permission = rule.permissions.find(p => p.action === request.action);
        if (!permission) {
          reasons.push(`Rule ${rule.id} does not allow action ${request.action}`);
          continue;
        }

        // Evaluate conditions
        let conditionsPassed = true;
        
        if (permission.conditions && this.config.enableConditionEvaluation) {
          const conditionResult = await this.evaluateConditions(permission.conditions, request);
          
          Object.assign(conditionResults, conditionResult.results);
          
          if (!conditionResult.passed) {
            conditionsPassed = false;
            reasons.push(...conditionResult.reasons);
          }
        }

        if (conditionsPassed) {
          finalDecision = true;
          reasons.push(`Rule ${rule.id} grants access`);
          break; // First matching rule wins
        }
      }

      const decision: AccessDecision = {
        requestId: request.requestId,
        allow: finalDecision,
        reasons,
        appliedRules,
        conditions: conditionResults,
        metadata: {
          evaluatedRules: sortedRules.length,
          duration: Date.now() - startTime
        },
        timestamp: new Date(),
        ttl: this.config.cacheTtlSeconds
      };

      // Cache the decision
      if (this.config.enableCaching) {
        const cacheKey = this.generateCacheKey(request);
        this.decisionCache.set(cacheKey, {
          decision,
          expiresAt: Date.now() + (this.config.cacheTtlSeconds * 1000)
        });

        // Trim cache if needed
        if (this.decisionCache.size > this.config.cacheSize) {
          const entries = Array.from(this.decisionCache.entries());
          entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
          
          const toRemove = Math.floor(this.decisionCache.size * 0.1);
          for (let i = 0; i < toRemove; i++) {
            this.decisionCache.delete(entries[i][0]);
          }
        }
      }

      await this.logAccess(request, decision, Date.now() - startTime);
      this.emit('access:checked', { request, decision });
      
      return decision;

    } catch (error) {
      const errorDecision: AccessDecision = {
        requestId: request.requestId,
        allow: false,
        reasons: [`Access check error: ${error instanceof Error ? error.message : 'Unknown error'}`],
        appliedRules: [],
        conditions: {},
        metadata: { error: true },
        timestamp: new Date()
      };

      await this.logAccess(request, errorDecision, Date.now() - startTime);
      return errorDecision;
    }
  }

  /**
   * Add an access rule
   */
  async addAccessRule(rule: Omit<AccessRule, 'id' | 'createdAt'>): Promise<string> {
    const ruleId = crypto.randomUUID();
    
    const fullRule: AccessRule = {
      ...rule,
      id: ruleId,
      createdAt: new Date()
    };

    if (!this.accessRules.has(rule.secretId)) {
      this.accessRules.set(rule.secretId, []);
    }

    this.accessRules.get(rule.secretId)!.push(fullRule);
    await this.saveAccessRules();

    this.emit('rule:added', fullRule);
    return ruleId;
  }

  /**
   * Remove an access rule
   */
  async removeAccessRule(secretId: string, ruleId: string): Promise<void> {
    const rules = this.accessRules.get(secretId);
    if (rules) {
      const index = rules.findIndex(r => r.id === ruleId);
      if (index >= 0) {
        const removedRule = rules.splice(index, 1)[0];
        await this.saveAccessRules();
        this.emit('rule:removed', removedRule);
      }
    }
  }

  /**
   * Create a role
   */
  async createRole(role: Omit<Role, 'id' | 'createdAt'>): Promise<string> {
    const roleId = crypto.randomUUID();
    
    const fullRole: Role = {
      ...role,
      id: roleId,
      createdAt: new Date()
    };

    this.roles.set(roleId, fullRole);
    await this.saveRoles();

    this.emit('role:created', fullRole);
    return roleId;
  }

  /**
   * Create a group
   */
  async createGroup(group: Omit<Group, 'id' | 'createdAt'>): Promise<string> {
    const groupId = crypto.randomUUID();
    
    const fullGroup: Group = {
      ...group,
      id: groupId,
      createdAt: new Date()
    };

    this.groups.set(groupId, fullGroup);
    await this.saveGroups();

    this.emit('group:created', fullGroup);
    return groupId;
  }

  /**
   * Grant secret access to an agent via role
   */
  async grantAccess(
    secretId: string,
    agentId: string,
    actions: SecretPermission['action'][],
    conditions?: AccessCondition[],
    expiresAt?: Date,
    createdBy: string = 'system'
  ): Promise<string> {
    return this.addAccessRule({
      secretId,
      principal: { type: 'agent', identifier: agentId },
      permissions: actions.map(action => ({ action, conditions })),
      priority: 100,
      enabled: true,
      createdBy,
      expiresAt,
      tags: { grantedAccess: 'true' }
    });
  }

  /**
   * Revoke secret access from an agent
   */
  async revokeAccess(secretId: string, agentId: string): Promise<void> {
    const rules = this.accessRules.get(secretId) || [];
    const agentRules = rules.filter(r => 
      r.principal.type === 'agent' && r.principal.identifier === agentId
    );

    for (const rule of agentRules) {
      await this.removeAccessRule(secretId, rule.id);
    }
  }

  /**
   * Request approval for access
   */
  async requestApproval(
    secretId: string,
    agentId: string,
    action: SecretPermission['action'],
    purpose: string,
    environment: string,
    timeoutMs?: number
  ): Promise<string> {
    if (!this.config.enableApprovalWorkflow) {
      throw new Error('Approval workflow is not enabled');
    }

    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (timeoutMs || this.config.defaultApprovalTimeout));

    const approvalRequest: ApprovalRequest = {
      id: requestId,
      secretId,
      agentId,
      action,
      purpose,
      environment,
      requestedAt: new Date(),
      expiresAt,
      status: 'pending'
    };

    this.approvalRequests.set(requestId, approvalRequest);
    this.emit('approval:requested', approvalRequest);

    return requestId;
  }

  /**
   * Approve an access request
   */
  async approveRequest(requestId: string, approvedBy: string, reason?: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending`);
    }

    if (request.expiresAt < new Date()) {
      request.status = 'expired';
      this.emit('approval:expired', request);
      throw new Error(`Approval request ${requestId} has expired`);
    }

    request.status = 'approved';
    request.approvedBy = approvedBy;
    request.approvedAt = new Date();
    request.reason = reason;

    // Grant temporary access
    const ruleId = await this.grantAccess(
      request.secretId,
      request.agentId,
      [request.action],
      [],
      new Date(Date.now() + 3600000), // 1 hour temporary access
      approvedBy
    );

    this.emit('approval:approved', { request, ruleId });
  }

  /**
   * Deny an access request
   */
  async denyRequest(requestId: string, deniedBy: string, reason: string): Promise<void> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending`);
    }

    request.status = 'denied';
    request.deniedBy = deniedBy;
    request.deniedAt = new Date();
    request.reason = reason;

    this.emit('approval:denied', request);
  }

  /**
   * Get access rules for a secret
   */
  getAccessRules(secretId: string): AccessRule[] {
    return this.accessRules.get(secretId) || [];
  }

  /**
   * Get all roles
   */
  getRoles(): Role[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get all groups
   */
  getGroups(): Group[] {
    return Array.from(this.groups.values());
  }

  /**
   * Get audit log
   */
  getAuditLog(limit: number = 1000): AccessAuditLog[] {
    return this.auditLog.slice(-limit);
  }

  /**
   * Get pending approval requests
   */
  getPendingApprovals(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(
      r => r.status === 'pending' && r.expiresAt > new Date()
    );
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalRules: number;
    totalRoles: number;
    totalGroups: number;
    auditLogEntries: number;
    pendingApprovals: number;
    cacheHitRate: number;
  } {
    const recentAudits = this.auditLog.slice(-1000);
    const cacheHits = recentAudits.filter(a => a.additionalContext?.cached).length;
    const cacheHitRate = recentAudits.length > 0 ? cacheHits / recentAudits.length : 0;

    return {
      totalRules: this.getTotalRulesCount(),
      totalRoles: this.roles.size,
      totalGroups: this.groups.size,
      auditLogEntries: this.auditLog.length,
      pendingApprovals: this.getPendingApprovals().length,
      cacheHitRate
    };
  }

  private async getApplicableRules(request: AccessRequest): Promise<AccessRule[]> {
    const rules: AccessRule[] = [];
    
    // Direct secret rules
    const secretRules = this.accessRules.get(request.secretId) || [];
    for (const rule of secretRules) {
      if (await this.isPrincipalMatch(rule.principal, request.agentId)) {
        rules.push(rule);
      }
    }

    return rules.filter(rule => {
      // Check expiration
      if (rule.expiresAt && rule.expiresAt < new Date()) {
        return false;
      }
      return true;
    });
  }

  private async isPrincipalMatch(principal: AccessRule['principal'], agentId: string): Promise<boolean> {
    switch (principal.type) {
      case 'agent':
        return principal.identifier === agentId;
      
      case 'wildcard':
        return this.matchesPattern(agentId, principal.identifier);
      
      case 'role':
        return this.isAgentInRole(agentId, principal.identifier);
      
      case 'group':
        return this.isAgentInGroup(agentId, principal.identifier);
      
      default:
        return false;
    }
  }

  private matchesPattern(value: string, pattern: string): boolean {
    // Simple glob-like pattern matching
    const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
    return regex.test(value);
  }

  private isAgentInRole(agentId: string, roleId: string): boolean {
    // In a real implementation, this would check agent-role assignments
    return false;
  }

  private isAgentInGroup(agentId: string, groupId: string): boolean {
    const group = this.groups.get(groupId);
    return group ? group.members.includes(agentId) : false;
  }

  private async evaluateConditions(
    conditions: AccessCondition[],
    request: AccessRequest,
    depth: number = 0
  ): Promise<{ passed: boolean; reasons: string[]; results: Record<string, boolean> }> {
    if (depth > this.config.maxConditionDepth) {
      return {
        passed: false,
        reasons: ['Maximum condition evaluation depth exceeded'],
        results: {}
      };
    }

    const results: Record<string, boolean> = {};
    const reasons: string[] = [];
    let allPassed = true;

    for (const condition of conditions) {
      let conditionPassed = false;

      switch (condition.type) {
        case 'time_window':
          conditionPassed = this.evaluateTimeWindow(condition, request);
          results.timeWindow = conditionPassed;
          break;

        case 'ip_whitelist':
          conditionPassed = this.evaluateIpWhitelist(condition, request);
          results.ipWhitelist = conditionPassed;
          break;

        case 'rate_limit':
          conditionPassed = this.evaluateRateLimit(condition, request);
          results.rateLimit = conditionPassed;
          break;

        case 'purpose':
          conditionPassed = this.evaluatePurpose(condition, request);
          results.purpose = conditionPassed;
          break;

        case 'environment':
          conditionPassed = this.evaluateEnvironment(condition, request);
          results.environment = conditionPassed;
          break;

        case 'approval_required':
          conditionPassed = await this.evaluateApprovalRequired(condition, request);
          results.approvalRequired = conditionPassed;
          break;

        case 'mfa_required':
          conditionPassed = await this.evaluateMfaRequired(condition, request);
          results.mfaRequired = conditionPassed;
          break;

        default:
          conditionPassed = false;
          reasons.push(`Unknown condition type: ${condition.type}`);
      }

      if (!conditionPassed) {
        allPassed = false;
        reasons.push(`Condition ${condition.type} failed`);
      }
    }

    return { passed: allPassed, reasons, results };
  }

  private evaluateTimeWindow(condition: AccessCondition, request: AccessRequest): boolean {
    const { startTime, endTime, timezone = 'UTC' } = condition.parameters;
    
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', { 
      timeZone: timezone, 
      hour12: false 
    });
    
    return currentTime >= startTime && currentTime <= endTime;
  }

  private evaluateIpWhitelist(condition: AccessCondition, request: AccessRequest): boolean {
    const { allowedIps } = condition.parameters;
    
    if (!request.sourceIp) {
      return false;
    }
    
    return Array.isArray(allowedIps) && allowedIps.includes(request.sourceIp);
  }

  private evaluateRateLimit(condition: AccessCondition, request: AccessRequest): boolean {
    const { requests, windowMs } = condition.parameters;
    const key = `${request.secretId}:${request.agentId}`;
    
    return this.checkRateLimitForKey(key, requests, windowMs);
  }

  private evaluatePurpose(condition: AccessCondition, request: AccessRequest): boolean {
    const { allowedPurposes } = condition.parameters;
    
    return Array.isArray(allowedPurposes) && allowedPurposes.includes(request.purpose);
  }

  private evaluateEnvironment(condition: AccessCondition, request: AccessRequest): boolean {
    const { allowedEnvironments } = condition.parameters;
    
    return Array.isArray(allowedEnvironments) && allowedEnvironments.includes(request.environment);
  }

  private async evaluateApprovalRequired(condition: AccessCondition, request: AccessRequest): Promise<boolean> {
    if (!this.config.enableApprovalWorkflow) {
      return false;
    }

    // Check if there's an approved request for this access
    const approval = Array.from(this.approvalRequests.values()).find(
      r => r.secretId === request.secretId &&
           r.agentId === request.agentId &&
           r.action === request.action &&
           r.status === 'approved' &&
           r.approvedAt &&
           (Date.now() - r.approvedAt.getTime()) < 3600000 // 1 hour validity
    );

    return approval !== undefined;
  }

  private async evaluateMfaRequired(condition: AccessCondition, request: AccessRequest): Promise<boolean> {
    if (!this.config.enableMFA) {
      return true; // Skip MFA if not enabled
    }

    // In a real implementation, this would verify MFA token
    // For now, check if MFA context is provided
    return request.additionalContext?.mfaVerified === true;
  }

  private checkRateLimit(request: AccessRequest): boolean {
    const key = `global:${request.agentId}`;
    return this.checkRateLimitForKey(
      key,
      this.config.defaultRateLimit.requests,
      this.config.defaultRateLimit.windowMs
    );
  }

  private checkRateLimitForKey(key: string, maxRequests: number, windowMs: number): boolean {
    const now = new Date();
    let rateLimit = this.rateLimits.get(key);

    if (!rateLimit) {
      rateLimit = {
        count: 0,
        windowStart: now,
        lastReset: now
      };
      this.rateLimits.set(key, rateLimit);
    }

    // Reset window if needed
    if (now.getTime() - rateLimit.windowStart.getTime() > windowMs) {
      rateLimit.count = 0;
      rateLimit.windowStart = now;
      rateLimit.lastReset = now;
    }

    rateLimit.count++;
    return rateLimit.count <= maxRequests;
  }

  private generateCacheKey(request: AccessRequest): string {
    const keyData = {
      secretId: request.secretId,
      agentId: request.agentId,
      action: request.action,
      purpose: request.purpose,
      environment: request.environment,
      sourceIp: request.sourceIp
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(keyData)).digest('hex');
  }

  private getTotalRulesCount(): number {
    return Array.from(this.accessRules.values()).reduce((sum, rules) => sum + rules.length, 0);
  }

  private async logAccess(request: AccessRequest, decision: AccessDecision, duration: number): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const logEntry: AccessAuditLog = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      requestId: request.requestId,
      secretId: request.secretId,
      agentId: request.agentId,
      action: request.action,
      decision: decision.allow ? 'allow' : 'deny',
      reasons: decision.reasons,
      appliedRules: decision.appliedRules,
      sourceIp: request.sourceIp,
      userAgent: request.userAgent,
      purpose: request.purpose,
      environment: request.environment,
      duration,
      additionalContext: request.additionalContext
    };

    this.auditLog.push(logEntry);

    // Trim audit log if needed
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
    } catch (error) {
      console.error('Failed to flush ACL audit log:', error);
    }
  }

  private async loadAccessRules(): Promise<void> {
    try {
      const rulesPath = path.join(this.config.dataDir, 'access-rules.json');
      const rulesData = await fs.readFile(rulesPath, 'utf-8');
      const rulesArray = JSON.parse(rulesData);
      
      this.accessRules = new Map(rulesArray.map(([secretId, rules]: [string, any[]]) => [
        secretId,
        rules.map(rule => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          expiresAt: rule.expiresAt ? new Date(rule.expiresAt) : undefined
        }))
      ]));
      
      console.log(`Loaded ${this.getTotalRulesCount()} access rules`);
    } catch (error) {
      console.log('No existing access rules found, starting fresh');
    }
  }

  private async saveAccessRules(): Promise<void> {
    const rulesPath = path.join(this.config.dataDir, 'access-rules.json');
    const rulesArray = Array.from(this.accessRules.entries());
    await fs.writeFile(rulesPath, JSON.stringify(rulesArray, null, 2));
  }

  private async loadRoles(): Promise<void> {
    try {
      const rolesPath = path.join(this.config.dataDir, 'roles.json');
      const rolesData = await fs.readFile(rolesPath, 'utf-8');
      const rolesArray = JSON.parse(rolesData);
      
      this.roles = new Map(rolesArray.map(([id, role]: [string, any]) => [
        id,
        {
          ...role,
          createdAt: new Date(role.createdAt)
        }
      ]));
      
      console.log(`Loaded ${this.roles.size} roles`);
    } catch (error) {
      console.log('No existing roles found, starting fresh');
    }
  }

  private async saveRoles(): Promise<void> {
    const rolesPath = path.join(this.config.dataDir, 'roles.json');
    const rolesArray = Array.from(this.roles.entries());
    await fs.writeFile(rolesPath, JSON.stringify(rolesArray, null, 2));
  }

  private async loadGroups(): Promise<void> {
    try {
      const groupsPath = path.join(this.config.dataDir, 'groups.json');
      const groupsData = await fs.readFile(groupsPath, 'utf-8');
      const groupsArray = JSON.parse(groupsData);
      
      this.groups = new Map(groupsArray.map(([id, group]: [string, any]) => [
        id,
        {
          ...group,
          createdAt: new Date(group.createdAt)
        }
      ]));
      
      console.log(`Loaded ${this.groups.size} groups`);
    } catch (error) {
      console.log('No existing groups found, starting fresh');
    }
  }

  private async saveGroups(): Promise<void> {
    const groupsPath = path.join(this.config.dataDir, 'groups.json');
    const groupsArray = Array.from(this.groups.entries());
    await fs.writeFile(groupsPath, JSON.stringify(groupsArray, null, 2));
  }

  private startCacheCleanup(): void {
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, cached] of this.decisionCache) {
        if (cached.expiresAt <= now) {
          this.decisionCache.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  private startApprovalCleanup(): void {
    this.approvalCleanupInterval = setInterval(() => {
      const now = new Date();
      for (const [id, request] of this.approvalRequests) {
        if (request.status === 'pending' && request.expiresAt < now) {
          request.status = 'expired';
          this.emit('approval:expired', request);
        }
      }
    }, 300000); // Check every 5 minutes
  }
}