/**
 * YUR Agent Framework - Secrets Agent
 * Per-agent access control with full audit logging
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAgent } from './base-agent.js';
import { 
  ISecretsManager, 
  SecretAccess, 
  AgentPermissions, 
  AgentTask,
  IAgentRegistry 
} from './types.js';

interface StoredSecret {
  id: string;
  value: string; // encrypted
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  accessControl: {
    allowedAgents: string[];
    permissions: { [agentId: string]: string[] }; // 'read', 'write', 'delete'
  };
  metadata?: Record<string, any>;
}

export class SecretsAgent extends BaseAgent implements ISecretsManager {
  private secrets: Map<string, StoredSecret> = new Map();
  private accessLog: SecretAccess[] = [];
  private encryptionKey: Buffer;
  private secretsFilePath: string;
  private auditLogPath: string;
  private agentRegistry: IAgentRegistry;

  constructor(
    agentRegistry: IAgentRegistry,
    options: {
      secretsFilePath?: string;
      auditLogPath?: string;
      encryptionKey?: string;
    } = {}
  ) {
    super(
      'secrets-agent',
      'Secrets Manager',
      'security',
      {
        allowedTasks: ['getSecret', 'setSecret', 'deleteSecret', 'listSecrets', 'grantAccess', 'revokeAccess'],
        allowedSecrets: ['*'],
        allowedEventTopics: ['secrets.*', 'security.*']
      }
    );

    this.agentRegistry = agentRegistry;
    this.secretsFilePath = path.resolve(options.secretsFilePath || './secrets.enc');
    this.auditLogPath = path.resolve(options.auditLogPath || './secrets-audit.json');
    
    // Initialize encryption key
    this.encryptionKey = options.encryptionKey ? 
      Buffer.from(options.encryptionKey, 'hex') :
      crypto.randomBytes(32);

    this.loadSecrets().catch(error => {
      console.warn('Failed to load secrets:', error.message);
    });

    this.loadAuditLog().catch(error => {
      console.warn('Failed to load audit log:', error.message);
    });
  }

  protected async onInitialize(): Promise<void> {
    console.log('Secrets Agent initialized');
  }

  protected async onShutdown(): Promise<void> {
    await this.saveSecrets();
    await this.saveAuditLog();
    console.log('Secrets Agent shutdown');
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'getSecret':
        return await this.getSecret(task.parameters.secretId, task.parameters.agentId);
      case 'setSecret':
        return await this.setSecret(task.parameters.secretId, task.parameters.value, task.parameters.agentId);
      case 'deleteSecret':
        return await this.deleteSecret(task.parameters.secretId, task.parameters.agentId);
      case 'listSecrets':
        return await this.listSecrets(task.parameters.agentId);
      case 'grantAccess':
        return await this.grantAccess(task.parameters.secretId, task.parameters.agentId, task.parameters.permissions);
      case 'revokeAccess':
        return await this.revokeAccess(task.parameters.secretId, task.parameters.agentId);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  protected async performHealthChecks(): Promise<Array<{ healthy: boolean; reason?: string }>> {
    const checks = [];

    // Check encryption key
    checks.push({
      healthy: this.encryptionKey.length === 32,
      reason: this.encryptionKey.length !== 32 ? 'Invalid encryption key length' : undefined
    });

    // Check file system access
    try {
      await fs.access(path.dirname(this.secretsFilePath), fs.constants.W_OK);
      checks.push({ healthy: true });
    } catch (error) {
      checks.push({ 
        healthy: false, 
        reason: 'Cannot write to secrets directory' 
      });
    }

    return checks;
  }

  protected getDescription(): string {
    return 'Manages secrets with per-agent access control and audit logging';
  }

  protected getCapabilities(): string[] {
    return ['secret-management', 'access-control', 'audit-logging', 'encryption'];
  }

  /**
   * Get a secret value
   */
  async getSecret(secretId: string, agentId: string): Promise<string | null> {
    const access: SecretAccess = {
      secretId,
      agentId,
      operation: 'read',
      timestamp: new Date(),
      success: false
    };

    try {
      const secret = this.secrets.get(secretId);
      if (!secret) {
        access.reason = 'Secret not found';
        this.logAccess(access);
        return null;
      }

      // Check access permissions
      if (!this.hasSecretPermission(secret, agentId, 'read')) {
        access.reason = 'Access denied';
        this.logAccess(access);
        throw new Error(`Agent ${agentId} not authorized to read secret ${secretId}`);
      }

      // Decrypt the secret
      const decryptedValue = this.decryptSecret(secret.value);
      
      access.success = true;
      this.logAccess(access);
      
      return decryptedValue;
    } catch (error) {
      access.reason = error instanceof Error ? error.message : 'Unknown error';
      this.logAccess(access);
      throw error;
    }
  }

  /**
   * Set a secret value
   */
  async setSecret(secretId: string, value: string, agentId: string): Promise<void> {
    const access: SecretAccess = {
      secretId,
      agentId,
      operation: 'write',
      timestamp: new Date(),
      success: false
    };

    try {
      const existingSecret = this.secrets.get(secretId);
      
      // Check permissions for existing secret
      if (existingSecret && !this.hasSecretPermission(existingSecret, agentId, 'write')) {
        access.reason = 'Write access denied';
        this.logAccess(access);
        throw new Error(`Agent ${agentId} not authorized to write secret ${secretId}`);
      }

      // Encrypt the value
      const encryptedValue = this.encryptSecret(value);
      
      const secret: StoredSecret = {
        id: secretId,
        value: encryptedValue,
        createdAt: existingSecret?.createdAt || new Date(),
        updatedAt: new Date(),
        createdBy: existingSecret?.createdBy || agentId,
        accessControl: existingSecret?.accessControl || {
          allowedAgents: [agentId],
          permissions: { [agentId]: ['read', 'write', 'delete'] }
        }
      };

      this.secrets.set(secretId, secret);
      await this.saveSecrets();
      
      access.success = true;
      this.logAccess(access);
      
      this.emit('secret:updated', { secretId, agentId });
    } catch (error) {
      access.reason = error instanceof Error ? error.message : 'Unknown error';
      this.logAccess(access);
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async deleteSecret(secretId: string, agentId: string): Promise<boolean> {
    const access: SecretAccess = {
      secretId,
      agentId,
      operation: 'delete',
      timestamp: new Date(),
      success: false
    };

    try {
      const secret = this.secrets.get(secretId);
      if (!secret) {
        access.reason = 'Secret not found';
        this.logAccess(access);
        return false;
      }

      // Check delete permissions
      if (!this.hasSecretPermission(secret, agentId, 'delete')) {
        access.reason = 'Delete access denied';
        this.logAccess(access);
        throw new Error(`Agent ${agentId} not authorized to delete secret ${secretId}`);
      }

      this.secrets.delete(secretId);
      await this.saveSecrets();
      
      access.success = true;
      this.logAccess(access);
      
      this.emit('secret:deleted', { secretId, agentId });
      return true;
    } catch (error) {
      access.reason = error instanceof Error ? error.message : 'Unknown error';
      this.logAccess(access);
      throw error;
    }
  }

  /**
   * List secrets accessible to an agent
   */
  async listSecrets(agentId: string): Promise<string[]> {
    const accessibleSecrets: string[] = [];
    
    for (const [secretId, secret] of this.secrets) {
      if (this.hasSecretPermission(secret, agentId, 'read')) {
        accessibleSecrets.push(secretId);
      }
    }
    
    return accessibleSecrets;
  }

  /**
   * Grant access to a secret
   */
  async grantAccess(secretId: string, agentId: string, permissions: string[]): Promise<void> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new Error(`Secret ${secretId} not found`);
    }

    // Validate permissions
    const validPermissions = ['read', 'write', 'delete'];
    for (const perm of permissions) {
      if (!validPermissions.includes(perm)) {
        throw new Error(`Invalid permission: ${perm}`);
      }
    }

    // Add agent to allowed list if not already there
    if (!secret.accessControl.allowedAgents.includes(agentId)) {
      secret.accessControl.allowedAgents.push(agentId);
    }

    // Set permissions
    secret.accessControl.permissions[agentId] = permissions;
    secret.updatedAt = new Date();

    await this.saveSecrets();
    this.emit('access:granted', { secretId, agentId, permissions });
  }

  /**
   * Revoke access to a secret
   */
  async revokeAccess(secretId: string, agentId: string): Promise<void> {
    const secret = this.secrets.get(secretId);
    if (!secret) {
      throw new Error(`Secret ${secretId} not found`);
    }

    // Remove from allowed agents
    secret.accessControl.allowedAgents = secret.accessControl.allowedAgents.filter(
      id => id !== agentId
    );

    // Remove permissions
    delete secret.accessControl.permissions[agentId];
    secret.updatedAt = new Date();

    await this.saveSecrets();
    this.emit('access:revoked', { secretId, agentId });
  }

  /**
   * Get access log
   */
  async getAccessLog(secretId?: string, agentId?: string): Promise<SecretAccess[]> {
    let filteredLog = this.accessLog;

    if (secretId) {
      filteredLog = filteredLog.filter(entry => entry.secretId === secretId);
    }

    if (agentId) {
      filteredLog = filteredLog.filter(entry => entry.agentId === agentId);
    }

    return filteredLog.slice(); // Return a copy
  }

  /**
   * Get secrets statistics
   */
  getSecretsStats(): {
    totalSecrets: number;
    totalAccesses: number;
    successfulAccesses: number;
    failedAccesses: number;
    agentsWithAccess: number;
    recentActivity: SecretAccess[];
  } {
    const allAgents = new Set<string>();
    for (const secret of this.secrets.values()) {
      for (const agentId of secret.accessControl.allowedAgents) {
        allAgents.add(agentId);
      }
    }

    const recentActivity = this.accessLog
      .slice(-20)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return {
      totalSecrets: this.secrets.size,
      totalAccesses: this.accessLog.length,
      successfulAccesses: this.accessLog.filter(entry => entry.success).length,
      failedAccesses: this.accessLog.filter(entry => !entry.success).length,
      agentsWithAccess: allAgents.size,
      recentActivity
    };
  }

  private hasSecretPermission(secret: StoredSecret, agentId: string, permission: string): boolean {
    // Check if agent is in allowed list
    if (!secret.accessControl.allowedAgents.includes(agentId)) {
      return false;
    }

    // Check specific permissions
    const agentPermissions = secret.accessControl.permissions[agentId] || [];
    return agentPermissions.includes(permission);
  }

  private encryptSecret(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  private decryptSecret(encryptedValue: string): string {
    const parts = encryptedValue.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted secret format');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  private logAccess(access: SecretAccess): void {
    this.accessLog.push(access);
    
    // Trim log if it gets too large
    if (this.accessLog.length > 10000) {
      this.accessLog.splice(0, 1000); // Remove oldest 1000 entries
    }
    
    // Save audit log periodically
    this.saveAuditLog().catch(error => {
      console.error('Failed to save audit log:', error);
    });
  }

  private async saveSecrets(): Promise<void> {
    try {
      const secretsData = Array.from(this.secrets.values());
      const data = JSON.stringify(secretsData, null, 2);
      
      // Ensure directory exists
      const dir = path.dirname(this.secretsFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.secretsFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save secrets:', error);
    }
  }

  private async loadSecrets(): Promise<void> {
    try {
      const data = await fs.readFile(this.secretsFilePath, 'utf-8');
      const secretsData: StoredSecret[] = JSON.parse(data);
      
      for (const secret of secretsData) {
        // Convert date strings back to Date objects
        secret.createdAt = new Date(secret.createdAt);
        secret.updatedAt = new Date(secret.updatedAt);
        
        this.secrets.set(secret.id, secret);
      }
      
      console.log(`Loaded ${secretsData.length} secrets`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, start with empty secrets
    }
  }

  private async saveAuditLog(): Promise<void> {
    try {
      const data = JSON.stringify(this.accessLog, null, 2);
      
      // Ensure directory exists
      const dir = path.dirname(this.auditLogPath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.auditLogPath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save audit log:', error);
    }
  }

  private async loadAuditLog(): Promise<void> {
    try {
      const data = await fs.readFile(this.auditLogPath, 'utf-8');
      const logData: SecretAccess[] = JSON.parse(data);
      
      // Convert timestamp strings back to Date objects
      for (const entry of logData) {
        entry.timestamp = new Date(entry.timestamp);
      }
      
      this.accessLog = logData;
      console.log(`Loaded ${logData.length} audit log entries`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, start with empty log
    }
  }
}