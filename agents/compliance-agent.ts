/**
 * YUR Agent Framework - Compliance Agent
 * Scans for leaked secrets and integrates with recovery systems
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAgent } from './base-agent.js';
import { 
  IComplianceScanner, 
  AgentTask, 
  IAgentRegistry,
  ISecretsManager,
  IEventBus
} from './types.js';

interface SecretPattern {
  name: string;
  pattern: RegExp;
  confidence: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ScanResult {
  found: boolean;
  secrets: Array<{
    type: string;
    value: string;
    confidence: number;
    location: {
      line: number;
      column: number;
    };
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestion?: string;
  }>;
  summary: {
    totalSecrets: number;
    criticalSecrets: number;
    highSecrets: number;
    mediumSecrets: number;
    lowSecrets: number;
  };
}

export class ComplianceAgent extends BaseAgent implements IComplianceScanner {
  private secretPatterns: SecretPattern[] = [];
  private agentRegistry: IAgentRegistry;
  private secretsManager?: ISecretsManager;
  private eventBus?: IEventBus;
  private scanHistory: Array<{
    timestamp: Date;
    source: string;
    result: ScanResult;
  }> = [];

  constructor(
    agentRegistry: IAgentRegistry,
    secretsManager?: ISecretsManager,
    eventBus?: IEventBus
  ) {
    super(
      'compliance-agent',
      'Compliance Scanner',
      'security',
      {
        allowedTasks: ['scanForSecrets', 'scanRepository', 'scanPullRequest', 'rotateSecret'],
        allowedSecrets: ['recovery.*', 'rotation.*'],
        allowedEventTopics: ['security.*', 'compliance.*', 'recovery.*'] // This should match what we're publishing to
      }
    );

    this.agentRegistry = agentRegistry;
    this.secretsManager = secretsManager;
    this.eventBus = eventBus;
    
    this.initializeSecretPatterns();
  }

  protected async onInitialize(): Promise<void> {
    console.log('Compliance Agent initialized with', this.secretPatterns.length, 'secret patterns');
  }

  protected async onShutdown(): Promise<void> {
    console.log('Compliance Agent shutdown');
  }

  protected async onExecuteTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'scanForSecrets':
        return await this.scanForSecrets(task.parameters.content, task.parameters.source);
      case 'scanRepository':
        return await this.scanRepository(task.parameters.path);
      case 'scanPullRequest':
        return await this.scanPullRequest(task.parameters.prId);
      case 'rotateSecret':
        return await this.rotateSecret(task.parameters.secretId, task.parameters.reason);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  protected async performHealthChecks(): Promise<Array<{ healthy: boolean; reason?: string }>> {
    return [
      {
        healthy: this.secretPatterns.length > 0,
        reason: this.secretPatterns.length === 0 ? 'No secret patterns loaded' : undefined
      }
    ];
  }

  protected getDescription(): string {
    return 'Scans content for leaked secrets and triggers recovery processes';
  }

  protected getCapabilities(): string[] {
    return ['secret-scanning', 'compliance-monitoring', 'auto-recovery', 'pattern-matching'];
  }

  /**
   * Scan content for secrets
   */
  async scanForSecrets(content: string, source: string): Promise<ScanResult> {
    const lines = content.split('\n');
    const secrets: ScanResult['secrets'] = [];

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of this.secretPatterns) {
        const matches = line.matchAll(pattern.pattern);
        
        for (const match of matches) {
          if (match.index !== undefined) {
            const value = match[0];
            
            // Calculate confidence based on pattern and context
            const confidence = this.calculateConfidence(pattern, value, line);
            
            if (confidence >= 0.7) { // Only report high-confidence matches
              secrets.push({
                type: pattern.name,
                value: this.maskSecret(value),
                confidence,
                location: {
                  line: lineIndex + 1,
                  column: match.index + 1
                },
                severity: pattern.severity,
                suggestion: this.generateSuggestion(pattern, value)
              });
            }
          }
        }
      }
    }

    const result: ScanResult = {
      found: secrets.length > 0,
      secrets,
      summary: {
        totalSecrets: secrets.length,
        criticalSecrets: secrets.filter(s => s.severity === 'critical').length,
        highSecrets: secrets.filter(s => s.severity === 'high').length,
        mediumSecrets: secrets.filter(s => s.severity === 'medium').length,
        lowSecrets: secrets.filter(s => s.severity === 'low').length
      }
    };

    // Log scan result
    this.scanHistory.push({
      timestamp: new Date(),
      source,
      result
    });

    // Trigger recovery if critical secrets found
    if (result.summary.criticalSecrets > 0 || result.summary.highSecrets > 0) {
      await this.triggerRecovery(source, result);
    }

    return result;
  }

  /**
   * Scan entire repository
   */
  async scanRepository(repositoryPath: string): Promise<any> {
    try {
      const results: { [filePath: string]: ScanResult } = {};
      const scanSummary = {
        totalFiles: 0,
        filesWithSecrets: 0,
        totalSecrets: 0,
        criticalSecrets: 0,
        startTime: new Date()
      };

      await this.scanDirectory(repositoryPath, results, scanSummary);

      const endTime = new Date();
      const duration = endTime.getTime() - scanSummary.startTime.getTime();

      const repositoryResult = {
        repository: repositoryPath,
        scanTime: duration,
        summary: scanSummary,
        files: results,
        recommendations: this.generateRepositoryRecommendations(results)
      };

      // Emit event for repository scan completion
      if (this.eventBus) {
        await this.eventBus.publish(await this.signEvent({
          id: `scan_${Date.now()}`,
          type: 'repository:scanned',
          source: this.id,
          topic: 'compliance.repository',
          data: repositoryResult,
          timestamp: new Date()
        }));
      }

      return repositoryResult;
    } catch (error) {
      console.error('Repository scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan pull request changes
   */
  async scanPullRequest(prId: string): Promise<any> {
    // In a real implementation, this would integrate with Git/GitHub APIs
    // to get PR diff and scan only changed lines
    
    const mockPRData = {
      prId,
      changes: [
        { file: 'config.js', additions: ['const API_KEY = "sk-1234567890abcdef"'] },
        { file: 'auth.py', additions: ['password = "secret123"'] }
      ]
    };

    const results: { [file: string]: ScanResult } = {};
    
    for (const change of mockPRData.changes) {
      const content = change.additions.join('\n');
      results[change.file] = await this.scanForSecrets(content, `PR#${prId}:${change.file}`);
    }

    const prResult = {
      prId,
      scanTime: new Date(),
      files: results,
      summary: this.aggregateResults(Object.values(results)),
      blocked: Object.values(results).some(r => r.summary.criticalSecrets > 0),
      recommendations: this.generatePRRecommendations(results)
    };

    // Emit event for PR scan completion
    if (this.eventBus) {
      await this.eventBus.publish(await this.signEvent({
        id: `pr_scan_${Date.now()}`,
        type: 'pullrequest:scanned',
        source: this.id,
        topic: 'compliance.pullrequest',
        data: prResult,
        timestamp: new Date()
      }));
    }

    return prResult;
  }

  private async scanDirectory(
    dirPath: string, 
    results: { [filePath: string]: ScanResult },
    summary: any
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Skip common directories that shouldn't contain secrets
          if (!this.shouldSkipDirectory(entry.name)) {
            await this.scanDirectory(fullPath, results, summary);
          }
        } else if (entry.isFile()) {
          if (this.shouldScanFile(entry.name)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const result = await this.scanForSecrets(content, fullPath);
              
              summary.totalFiles++;
              if (result.found) {
                summary.filesWithSecrets++;
                summary.totalSecrets += result.summary.totalSecrets;
                summary.criticalSecrets += result.summary.criticalSecrets;
                results[fullPath] = result;
              }
            } catch (error) {
              console.warn(`Failed to scan file ${fullPath}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${dirPath}:`, error);
    }
  }

  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
      'node_modules', '.git', '.svn', '.hg', 'vendor', 'build', 'dist',
      '.next', '__pycache__', '.pytest_cache', '.vscode', '.idea'
    ];
    return skipDirs.includes(name) || name.startsWith('.');
  }

  private shouldScanFile(name: string): boolean {
    const textExtensions = [
      '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h',
      '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
      '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
      '.env', '.properties', '.txt', '.md', '.rst', '.sql', '.sh', '.bat'
    ];
    
    const ext = path.extname(name).toLowerCase();
    return textExtensions.includes(ext) || !path.extname(name);
  }

  private initializeSecretPatterns(): void {
    this.secretPatterns = [
      {
        name: 'AWS Access Key',
        pattern: /AKIA[0-9A-Z]{16}/g,
        confidence: 0.9,
        description: 'AWS Access Key ID',
        severity: 'critical'
      },
      {
        name: 'AWS Secret Key',
        pattern: /[A-Za-z0-9\/+=]{40}/g,
        confidence: 0.7,
        description: 'AWS Secret Access Key',
        severity: 'critical'
      },
      {
        name: 'GitHub Token',
        pattern: /ghp_[0-9a-zA-Z]{36}/g,
        confidence: 0.95,
        description: 'GitHub Personal Access Token',
        severity: 'high'
      },
      {
        name: 'OpenAI API Key',
        pattern: /sk-[0-9a-zA-Z]{48}/g,
        confidence: 0.95,
        description: 'OpenAI API Key',
        severity: 'high'
      },
      {
        name: 'Generic API Key',
        pattern: /[Aa][Pp][Ii][_]?[Kk][Ee][Yy]\s*[:=]\s*['""]?([0-9a-zA-Z\-_]{20,})['""]?/g,
        confidence: 0.8,
        description: 'Generic API Key',
        severity: 'medium'
      },
      {
        name: 'Database Password',
        pattern: /[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]\s*[:=]\s*['""]?([^'"\s]{8,})['""]?/g,
        confidence: 0.7,
        description: 'Database Password',
        severity: 'high'
      },
      {
        name: 'JWT Token',
        pattern: /eyJ[0-9a-zA-Z_-]*\.[0-9a-zA-Z_-]*\.[0-9a-zA-Z_-]*/g,
        confidence: 0.85,
        description: 'JSON Web Token',
        severity: 'medium'
      },
      {
        name: 'SSH Private Key',
        pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
        confidence: 0.99,
        description: 'SSH Private Key',
        severity: 'critical'
      }
    ];
  }

  private calculateConfidence(pattern: SecretPattern, value: string, context: string): number {
    let confidence = pattern.confidence;
    
    // Reduce confidence for common false positives
    if (context.toLowerCase().includes('example') || 
        context.toLowerCase().includes('test') ||
        context.toLowerCase().includes('dummy') ||
        value.includes('xxx') ||
        value.includes('***')) {
      confidence *= 0.3;
    }
    
    // Increase confidence for production-like contexts
    if (context.toLowerCase().includes('prod') ||
        context.toLowerCase().includes('production') ||
        context.toLowerCase().includes('live')) {
      confidence = Math.min(1.0, confidence * 1.2);
    }
    
    return confidence;
  }

  private maskSecret(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    
    const start = value.substring(0, 4);
    const end = value.substring(value.length - 4);
    const middle = '*'.repeat(value.length - 8);
    
    return start + middle + end;
  }

  private generateSuggestion(pattern: SecretPattern, value: string): string {
    switch (pattern.name) {
      case 'AWS Access Key':
      case 'AWS Secret Key':
        return 'Use AWS IAM roles or store in AWS Secrets Manager';
      case 'GitHub Token':
        return 'Use GitHub Actions secrets or environment variables';
      case 'OpenAI API Key':
        return 'Store in environment variables or secure key management';
      case 'Database Password':
        return 'Use environment variables or secure configuration management';
      default:
        return 'Store sensitive values in environment variables or secure key management system';
    }
  }

  private async triggerRecovery(source: string, scanResult: ScanResult): Promise<void> {
    console.warn(`Critical secrets detected in ${source}, triggering recovery process`);
    
    // Emit security event
    if (this.eventBus) {
      await this.eventBus.publish(await this.signEvent({
        id: `security_alert_${Date.now()}`,
        type: 'security:secrets_detected',
        source: this.id,
        topic: 'security.alerts',
        data: {
          source,
          severity: 'critical',
          secretsFound: scanResult.summary.totalSecrets,
          criticalSecrets: scanResult.summary.criticalSecrets,
          recommendation: 'Immediate secret rotation required'
        },
        timestamp: new Date()
      }));
    }

    // Auto-rotate known secrets if possible
    for (const secret of scanResult.secrets) {
      if (secret.severity === 'critical' && this.secretsManager) {
        try {
          await this.rotateSecret(secret.type, `Auto-rotation due to leak detection in ${source}`);
        } catch (error) {
          console.error(`Failed to rotate ${secret.type}:`, error);
        }
      }
    }
  }

  private async rotateSecret(secretId: string, reason: string): Promise<void> {
    if (!this.secretsManager) {
      throw new Error('Secrets manager not available for rotation');
    }

    // Generate new secret value (implementation depends on secret type)
    const newValue = this.generateNewSecretValue(secretId);
    
    // Store new secret
    await this.secretsManager.setSecret(`${secretId}_new`, newValue, this.id);
    
    // Log rotation
    console.log(`Rotated secret ${secretId}: ${reason}`);
    
    // Emit rotation event
    if (this.eventBus) {
      await this.eventBus.publish(await this.signEvent({
        id: `rotation_${Date.now()}`,
        type: 'security:secret_rotated',
        source: this.id,
        topic: 'security.rotation',
        data: {
          secretId,
          reason,
          timestamp: new Date(),
          newSecretId: `${secretId}_new`
        },
        timestamp: new Date()
      }));
    }
  }

  private generateNewSecretValue(secretType: string): string {
    // Generate secure random values based on secret type
    const crypto = require('crypto');
    
    switch (secretType) {
      case 'AWS Access Key':
        return 'AKIA' + crypto.randomBytes(8).toString('hex').toUpperCase();
      case 'Generic API Key':
        return crypto.randomBytes(32).toString('hex');
      case 'Database Password':
        return crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
      default:
        return crypto.randomBytes(24).toString('base64');
    }
  }

  private aggregateResults(results: ScanResult[]): ScanResult['summary'] {
    return results.reduce((acc, result) => ({
      totalSecrets: acc.totalSecrets + result.summary.totalSecrets,
      criticalSecrets: acc.criticalSecrets + result.summary.criticalSecrets,
      highSecrets: acc.highSecrets + result.summary.highSecrets,
      mediumSecrets: acc.mediumSecrets + result.summary.mediumSecrets,
      lowSecrets: acc.lowSecrets + result.summary.lowSecrets
    }), {
      totalSecrets: 0,
      criticalSecrets: 0,
      highSecrets: 0,
      mediumSecrets: 0,
      lowSecrets: 0
    });
  }

  private generateRepositoryRecommendations(results: { [filePath: string]: ScanResult }): string[] {
    const recommendations: string[] = [];
    
    if (Object.keys(results).length > 0) {
      recommendations.push('Implement pre-commit hooks to scan for secrets');
      recommendations.push('Use environment variables for sensitive configuration');
      recommendations.push('Add .env files to .gitignore');
      recommendations.push('Consider using a secrets management service');
    }
    
    return recommendations;
  }

  private generatePRRecommendations(results: { [file: string]: ScanResult }): string[] {
    const recommendations: string[] = [];
    
    const hasSecrets = Object.values(results).some(r => r.found);
    if (hasSecrets) {
      recommendations.push('Remove all hardcoded secrets before merging');
      recommendations.push('Use environment variables or secure key management');
      recommendations.push('Consider adding secrets scanning to CI/CD pipeline');
    }
    
    return recommendations;
  }

  /**
   * Get compliance statistics
   */
  getComplianceStats(): {
    totalScans: number;
    secretsDetected: number;
    criticalFindings: number;
    recentScans: Array<{ timestamp: Date; source: string; secretsFound: number }>;
  } {
    const recentScans = this.scanHistory
      .slice(-10)
      .map(scan => ({
        timestamp: scan.timestamp,
        source: scan.source,
        secretsFound: scan.result.summary.totalSecrets
      }));

    return {
      totalScans: this.scanHistory.length,
      secretsDetected: this.scanHistory.reduce((sum, scan) => sum + scan.result.summary.totalSecrets, 0),
      criticalFindings: this.scanHistory.reduce((sum, scan) => sum + scan.result.summary.criticalSecrets, 0),
      recentScans
    };
  }
}