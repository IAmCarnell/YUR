/**
 * YUR Agent Framework - Secret Scanner for Repository/Files
 * Production-ready secret detection with high-precision patterns, entropy analysis,
 * context awareness, and comprehensive reporting
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

export interface SecretPattern {
  id: string;
  name: string;
  description: string;
  category: 'api_key' | 'token' | 'password' | 'certificate' | 'database' | 'cloud' | 'generic';
  severity: 'critical' | 'high' | 'medium' | 'low';
  regex: RegExp;
  keywords: string[];
  entropy?: {
    threshold: number;
    algorithm: 'shannon' | 'base64' | 'hex';
  };
  context?: {
    nearby_keywords: string[];
    file_extensions: string[];
    path_patterns: string[];
  };
  validation?: {
    length?: { min: number; max: number };
    charset?: string;
    checksum?: 'luhn' | 'custom';
  };
  falsePositiveFilters: RegExp[];
  enabled: boolean;
}

export interface SecretMatch {
  id: string;
  patternId: string;
  patternName: string;
  category: SecretPattern['category'];
  severity: SecretPattern['severity'];
  value: string;
  maskedValue: string;
  confidence: number;
  location: {
    filePath: string;
    line: number;
    column: number;
    context: string;
  };
  entropy?: number;
  metadata: {
    fileSize: number;
    fileModified: Date;
    nearbyKeywords: string[];
    environmentContext?: string;
    validationResult?: 'valid' | 'invalid' | 'unknown';
  };
  risk: {
    exposure: 'public' | 'internal' | 'restricted';
    impact: 'critical' | 'high' | 'medium' | 'low';
    likelihood: 'high' | 'medium' | 'low';
  };
  remediation: {
    urgency: 'immediate' | 'high' | 'medium' | 'low';
    suggestions: string[];
    autoFixable: boolean;
  };
  detectedAt: Date;
}

export interface ScanResult {
  scanId: string;
  target: {
    type: 'file' | 'directory' | 'repository' | 'content';
    path?: string;
    url?: string;
    description: string;
  };
  summary: {
    totalFiles: number;
    scannedFiles: number;
    skippedFiles: number;
    totalSecrets: number;
    criticalSecrets: number;
    highSecrets: number;
    mediumSecrets: number;
    lowSecrets: number;
    avgConfidence: number;
  };
  secrets: SecretMatch[];
  errors: Array<{
    file: string;
    error: string;
    timestamp: Date;
  }>;
  performance: {
    startTime: Date;
    endTime: Date;
    duration: number;
    filesPerSecond: number;
    bytesScanned: number;
  };
  configuration: {
    patterns: string[];
    excludePatterns: string[];
    maxFileSize: number;
    enableEntropyAnalysis: boolean;
    enableContextAnalysis: boolean;
  };
}

export interface ScannerConfig {
  patternsDir: string;
  excludePatterns: string[];
  includePatterns: string[];
  maxFileSize: number;
  maxLineLength: number;
  enableEntropyAnalysis: boolean;
  enableContextAnalysis: boolean;
  enableValidation: boolean;
  confidenceThreshold: number;
  parallelScans: number;
  memoryLimit: number;
  reportingEnabled: boolean;
  reportDir: string;
  webhookUrl?: string;
  customPatterns: SecretPattern[];
}

interface FileContext {
  filePath: string;
  fileSize: number;
  fileExtension: string;
  isTestFile: boolean;
  isConfigFile: boolean;
  isDocumentation: boolean;
  containsSensitiveKeywords: boolean;
  nearbyKeywords: string[];
}

export class SecretScanner extends EventEmitter {
  private config: ScannerConfig;
  private patterns: Map<string, SecretPattern> = new Map();
  private scanHistory: Map<string, ScanResult> = new Map();
  private running: boolean = false;

  constructor(config: Partial<ScannerConfig> = {}) {
    super();
    
    this.config = {
      patternsDir: config.patternsDir || './secret-patterns',
      excludePatterns: config.excludePatterns || [
        '**/node_modules/**',
        '**/vendor/**',
        '**/dist/**',
        '**/build/**',
        '**/.git/**',
        '**/test/**',
        '**/tests/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/coverage/**'
      ],
      includePatterns: config.includePatterns || ['**/*'],
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
      maxLineLength: config.maxLineLength || 10000,
      enableEntropyAnalysis: config.enableEntropyAnalysis ?? true,
      enableContextAnalysis: config.enableContextAnalysis ?? true,
      enableValidation: config.enableValidation ?? true,
      confidenceThreshold: config.confidenceThreshold || 0.7,
      parallelScans: config.parallelScans || 4,
      memoryLimit: config.memoryLimit || 512 * 1024 * 1024, // 512MB
      reportingEnabled: config.reportingEnabled ?? true,
      reportDir: config.reportDir || './scan-reports',
      webhookUrl: config.webhookUrl,
      customPatterns: config.customPatterns || []
    };

    this.initializeBuiltinPatterns();
  }

  /**
   * Initialize the secret scanner
   */
  async initialize(): Promise<void> {
    if (this.running) {
      throw new Error('Secret scanner is already running');
    }

    try {
      // Create directories
      await fs.mkdir(this.config.patternsDir, { recursive: true });
      if (this.config.reportingEnabled) {
        await fs.mkdir(this.config.reportDir, { recursive: true });
      }

      // Load custom patterns
      await this.loadCustomPatterns();

      // Add user-provided patterns
      for (const pattern of this.config.customPatterns) {
        this.patterns.set(pattern.id, pattern);
      }

      this.running = true;
      this.emit('scanner:started');
      
      console.log(`Secret scanner initialized with ${this.patterns.size} patterns`);
    } catch (error) {
      this.emit('scanner:error', error);
      throw error;
    }
  }

  /**
   * Scan a file for secrets
   */
  async scanFile(filePath: string): Promise<SecretMatch[]> {
    if (!this.running) {
      throw new Error('Scanner not initialized');
    }

    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File ${filePath} is too large (${stats.size} bytes)`);
      }

      const content = await fs.readFile(filePath, 'utf-8');
      const context = await this.analyzeFileContext(filePath, stats);
      
      return this.scanContent(content, context);
    } catch (error) {
      this.emit('scan:error', { file: filePath, error });
      return [];
    }
  }

  /**
   * Scan directory recursively
   */
  async scanDirectory(dirPath: string): Promise<ScanResult> {
    if (!this.running) {
      throw new Error('Scanner not initialized');
    }

    const scanId = crypto.randomUUID();
    const startTime = new Date();
    const secrets: SecretMatch[] = [];
    const errors: ScanResult['errors'] = [];
    let totalFiles = 0;
    let scannedFiles = 0;
    let skippedFiles = 0;
    let bytesScanned = 0;

    try {
      const files = await this.getFilesToScan(dirPath);
      totalFiles = files.length;

      this.emit('scan:started', { scanId, target: dirPath, totalFiles });

      // Process files in batches
      const batchSize = this.config.parallelScans;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        const batchPromises = batch.map(async (filePath) => {
          try {
            const fileSecrets = await this.scanFile(filePath);
            const stats = await fs.stat(filePath);
            
            secrets.push(...fileSecrets);
            scannedFiles++;
            bytesScanned += stats.size;
            
            this.emit('scan:progress', {
              scanId,
              progress: scannedFiles / totalFiles,
              currentFile: filePath,
              secretsFound: fileSecrets.length
            });
          } catch (error) {
            errors.push({
              file: filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date()
            });
            skippedFiles++;
          }
        });

        await Promise.all(batchPromises);
      }

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const result: ScanResult = {
        scanId,
        target: {
          type: 'directory',
          path: dirPath,
          description: `Directory scan of ${dirPath}`
        },
        summary: {
          totalFiles,
          scannedFiles,
          skippedFiles,
          totalSecrets: secrets.length,
          criticalSecrets: secrets.filter(s => s.severity === 'critical').length,
          highSecrets: secrets.filter(s => s.severity === 'high').length,
          mediumSecrets: secrets.filter(s => s.severity === 'medium').length,
          lowSecrets: secrets.filter(s => s.severity === 'low').length,
          avgConfidence: secrets.length > 0 
            ? secrets.reduce((sum, s) => sum + s.confidence, 0) / secrets.length 
            : 0
        },
        secrets,
        errors,
        performance: {
          startTime,
          endTime,
          duration,
          filesPerSecond: duration > 0 ? (scannedFiles / (duration / 1000)) : 0,
          bytesScanned
        },
        configuration: {
          patterns: Array.from(this.patterns.keys()),
          excludePatterns: this.config.excludePatterns,
          maxFileSize: this.config.maxFileSize,
          enableEntropyAnalysis: this.config.enableEntropyAnalysis,
          enableContextAnalysis: this.config.enableContextAnalysis
        }
      };

      this.scanHistory.set(scanId, result);

      if (this.config.reportingEnabled) {
        await this.generateReport(result);
      }

      if (this.config.webhookUrl && secrets.length > 0) {
        await this.sendWebhookNotification(result);
      }

      this.emit('scan:completed', result);
      return result;

    } catch (error) {
      this.emit('scan:error', { scanId, error });
      throw error;
    }
  }

  /**
   * Scan raw content
   */
  async scanContent(content: string, context?: FileContext): Promise<SecretMatch[]> {
    const secrets: SecretMatch[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      if (line.length > this.config.maxLineLength) {
        continue; // Skip very long lines to avoid performance issues
      }

      for (const [patternId, pattern] of this.patterns) {
        if (!pattern.enabled) {
          continue;
        }

        // Skip pattern if file context doesn't match
        if (context && !this.contextMatches(pattern, context)) {
          continue;
        }

        const matches = Array.from(line.matchAll(new RegExp(pattern.regex, 'gi')));
        
        for (const match of matches) {
          if (!match[0] || match.index === undefined) {
            continue;
          }

          const value = match[0];
          
          // Apply false positive filters
          if (this.isFalsePositive(value, pattern)) {
            continue;
          }

          // Calculate confidence
          const confidence = await this.calculateConfidence(value, pattern, line, context);
          
          if (confidence < this.config.confidenceThreshold) {
            continue;
          }

          // Validate secret if validation is enabled
          let validationResult: 'valid' | 'invalid' | 'unknown' = 'unknown';
          if (this.config.enableValidation && pattern.validation) {
            validationResult = this.validateSecret(value, pattern);
          }

          const secret: SecretMatch = {
            id: crypto.randomUUID(),
            patternId,
            patternName: pattern.name,
            category: pattern.category,
            severity: pattern.severity,
            value,
            maskedValue: this.maskSecret(value),
            confidence,
            location: {
              filePath: context?.filePath || '<content>',
              line: lineIndex + 1,
              column: match.index + 1,
              context: this.getLineContext(lines, lineIndex)
            },
            entropy: this.config.enableEntropyAnalysis 
              ? this.calculateEntropy(value, pattern.entropy?.algorithm || 'shannon')
              : undefined,
            metadata: {
              fileSize: context?.fileSize || content.length,
              fileModified: new Date(),
              nearbyKeywords: context?.nearbyKeywords || [],
              validationResult
            },
            risk: this.assessRisk(pattern, context),
            remediation: this.generateRemediation(pattern, context),
            detectedAt: new Date()
          };

          secrets.push(secret);
        }
      }
    }

    return secrets;
  }

  /**
   * Add a custom pattern
   */
  async addPattern(pattern: SecretPattern): Promise<void> {
    this.patterns.set(pattern.id, pattern);
    await this.saveCustomPattern(pattern);
    this.emit('pattern:added', pattern);
  }

  /**
   * Remove a pattern
   */
  removePattern(patternId: string): void {
    if (this.patterns.delete(patternId)) {
      this.emit('pattern:removed', patternId);
    }
  }

  /**
   * Get all patterns
   */
  getPatterns(): SecretPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get scan history
   */
  getScanHistory(): ScanResult[] {
    return Array.from(this.scanHistory.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalPatterns: number;
    enabledPatterns: number;
    totalScans: number;
    totalSecretsFound: number;
    avgConfidence: number;
    scanSuccessRate: number;
  } {
    const scans = Array.from(this.scanHistory.values());
    const totalSecrets = scans.reduce((sum, scan) => sum + scan.secrets.length, 0);
    const totalConfidence = scans.reduce(
      (sum, scan) => sum + scan.secrets.reduce((s, secret) => s + secret.confidence, 0),
      0
    );
    const successfulScans = scans.filter(scan => scan.errors.length === 0).length;

    return {
      totalPatterns: this.patterns.size,
      enabledPatterns: Array.from(this.patterns.values()).filter(p => p.enabled).length,
      totalScans: scans.length,
      totalSecretsFound: totalSecrets,
      avgConfidence: totalSecrets > 0 ? totalConfidence / totalSecrets : 0,
      scanSuccessRate: scans.length > 0 ? successfulScans / scans.length : 0
    };
  }

  private initializeBuiltinPatterns(): void {
    const builtinPatterns: SecretPattern[] = [
      {
        id: 'aws-access-key',
        name: 'AWS Access Key ID',
        description: 'Amazon Web Services access key identifier',
        category: 'cloud',
        severity: 'critical',
        regex: /AKIA[0-9A-Z]{16}/,
        keywords: ['aws', 'amazon', 'access', 'key'],
        entropy: { threshold: 4.5, algorithm: 'base64' },
        context: {
          nearby_keywords: ['aws', 'amazon', 'secret', 'access'],
          file_extensions: ['.env', '.config', '.json', '.yaml', '.yml'],
          path_patterns: ['**/config/**', '**/secrets/**']
        },
        validation: {
          length: { min: 20, max: 20 },
          charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
        },
        falsePositiveFilters: [/AKIAIOSFODNN7EXAMPLE/],
        enabled: true
      },
      {
        id: 'aws-secret-key',
        name: 'AWS Secret Access Key',
        description: 'Amazon Web Services secret access key',
        category: 'cloud',
        severity: 'critical',
        regex: /[A-Za-z0-9/+=]{40}/,
        keywords: ['aws', 'secret', 'key'],
        entropy: { threshold: 5.0, algorithm: 'base64' },
        context: {
          nearby_keywords: ['secret', 'aws', 'access', 'key'],
          file_extensions: ['.env', '.config', '.json', '.yaml', '.yml'],
          path_patterns: ['**/config/**', '**/secrets/**']
        },
        validation: {
          length: { min: 40, max: 40 },
          charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/+='
        },
        falsePositiveFilters: [
          /wJalrXUtnFEMI\/K7MDENG\/bPxRfiCYEXAMPLEKEY/,
          /AKIAIOSFODNN7EXAMPLE/
        ],
        enabled: true
      },
      {
        id: 'github-token',
        name: 'GitHub Personal Access Token',
        description: 'GitHub personal access token',
        category: 'token',
        severity: 'high',
        regex: /ghp_[A-Za-z0-9]{36}/,
        keywords: ['github', 'token', 'pat'],
        entropy: { threshold: 4.0, algorithm: 'base64' },
        context: {
          nearby_keywords: ['github', 'token', 'pat', 'access'],
          file_extensions: ['.env', '.config', '.json'],
          path_patterns: ['**/config/**', '**/secrets/**']
        },
        validation: {
          length: { min: 40, max: 40 }
        },
        falsePositiveFilters: [],
        enabled: true
      },
      {
        id: 'slack-token',
        name: 'Slack Token',
        description: 'Slack API token',
        category: 'api_key',
        severity: 'high',
        regex: /xox[baprs]-[A-Za-z0-9-]+/,
        keywords: ['slack', 'token', 'xox'],
        entropy: { threshold: 3.5, algorithm: 'base64' },
        context: {
          nearby_keywords: ['slack', 'token', 'bot', 'api'],
          file_extensions: ['.env', '.config', '.json'],
          path_patterns: ['**/config/**']
        },
        validation: {
          length: { min: 20, max: 200 }
        },
        falsePositiveFilters: [],
        enabled: true
      },
      {
        id: 'generic-api-key',
        name: 'Generic API Key',
        description: 'Generic high-entropy API key',
        category: 'api_key',
        severity: 'medium',
        regex: /[A-Za-z0-9]{32,}/,
        keywords: ['api', 'key', 'token', 'secret'],
        entropy: { threshold: 4.0, algorithm: 'shannon' },
        context: {
          nearby_keywords: ['api', 'key', 'token', 'secret', 'auth'],
          file_extensions: ['.env', '.config', '.json', '.yaml', '.yml'],
          path_patterns: ['**/config/**', '**/secrets/**']
        },
        validation: {
          length: { min: 32, max: 128 }
        },
        falsePositiveFilters: [
          /^[0-9a-f]+$/i, // Pure hex (likely hash)
          /^[A-Z0-9]{32,}$/, // All uppercase (likely ID)
          /test|example|sample|demo|placeholder/i
        ],
        enabled: true
      },
      {
        id: 'jwt-token',
        name: 'JSON Web Token',
        description: 'JWT token with high entropy',
        category: 'token',
        severity: 'medium',
        regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
        keywords: ['jwt', 'token', 'bearer'],
        entropy: { threshold: 4.5, algorithm: 'base64' },
        context: {
          nearby_keywords: ['jwt', 'token', 'bearer', 'auth'],
          file_extensions: ['.env', '.config', '.json'],
          path_patterns: ['**/config/**']
        },
        validation: {
          length: { min: 50, max: 2000 }
        },
        falsePositiveFilters: [],
        enabled: true
      },
      {
        id: 'private-key',
        name: 'Private Key',
        description: 'RSA, EC, or other private key',
        category: 'certificate',
        severity: 'critical',
        regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/,
        keywords: ['private', 'key', 'rsa', 'ec'],
        context: {
          nearby_keywords: ['private', 'key', 'certificate', 'pem'],
          file_extensions: ['.pem', '.key', '.crt', '.p12'],
          path_patterns: ['**/certs/**', '**/keys/**', '**/ssl/**']
        },
        validation: {
          length: { min: 100, max: 10000 }
        },
        falsePositiveFilters: [],
        enabled: true
      },
      {
        id: 'database-url',
        name: 'Database Connection URL',
        description: 'Database connection string with credentials',
        category: 'database',
        severity: 'high',
        regex: /(mysql|postgresql|mongodb):\/\/[^\/\s"']+:[^\/\s"']+@[^\/\s"']+/,
        keywords: ['database', 'mysql', 'postgresql', 'mongodb'],
        context: {
          nearby_keywords: ['database', 'connection', 'url', 'dsn'],
          file_extensions: ['.env', '.config', '.json', '.yaml', '.yml'],
          path_patterns: ['**/config/**']
        },
        validation: {
          length: { min: 20, max: 500 }
        },
        falsePositiveFilters: [
          /localhost|127\.0\.0\.1|example\.com|test\.com/
        ],
        enabled: true
      }
    ];

    for (const pattern of builtinPatterns) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  private async loadCustomPatterns(): Promise<void> {
    try {
      const patternsFile = path.join(this.config.patternsDir, 'custom-patterns.json');
      const patternsData = await fs.readFile(patternsFile, 'utf-8');
      const customPatterns: SecretPattern[] = JSON.parse(patternsData);
      
      for (const pattern of customPatterns) {
        // Convert regex string back to RegExp
        if (typeof pattern.regex === 'string') {
          pattern.regex = new RegExp(pattern.regex);
        }
        
        this.patterns.set(pattern.id, pattern);
      }
      
      console.log(`Loaded ${customPatterns.length} custom patterns`);
    } catch (error) {
      console.log('No custom patterns found');
    }
  }

  private async saveCustomPattern(pattern: SecretPattern): Promise<void> {
    const patternsFile = path.join(this.config.patternsDir, 'custom-patterns.json');
    
    try {
      const existingData = await fs.readFile(patternsFile, 'utf-8');
      const existingPatterns: SecretPattern[] = JSON.parse(existingData);
      
      // Add or update pattern
      const index = existingPatterns.findIndex(p => p.id === pattern.id);
      if (index >= 0) {
        existingPatterns[index] = pattern;
      } else {
        existingPatterns.push(pattern);
      }
      
      await fs.writeFile(patternsFile, JSON.stringify(existingPatterns, null, 2));
    } catch (error) {
      // File doesn't exist, create new
      await fs.writeFile(patternsFile, JSON.stringify([pattern], null, 2));
    }
  }

  private async getFilesToScan(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (currentPath: string): Promise<void> => {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          // Check exclude patterns for directories
          if (!this.matchesPatterns(fullPath, this.config.excludePatterns)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile()) {
          // Check include/exclude patterns for files
          if (this.matchesPatterns(fullPath, this.config.includePatterns) &&
              !this.matchesPatterns(fullPath, this.config.excludePatterns)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    await scanDirectory(dirPath);
    return files;
  }

  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
      if (regex.test(filePath)) {
        return true;
      }
    }
    return false;
  }

  private async analyzeFileContext(filePath: string, stats: { size: number; mtime: Date }): Promise<FileContext> {
    const fileExtension = path.extname(filePath);
    const fileName = path.basename(filePath);
    
    const isTestFile = /\.(test|spec)\.|\/tests?\/|\/test\//.test(filePath);
    const isConfigFile = /\.(config|conf|env|yaml|yml|json|toml|ini)$/.test(fileName);
    const isDocumentation = /\.(md|txt|doc|pdf|rst)$/.test(fileName);
    
    // Read file content to analyze keywords
    let nearbyKeywords: string[] = [];
    let containsSensitiveKeywords = false;
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sensitiveKeywords = [
        'password', 'secret', 'key', 'token', 'api', 'auth', 'credential',
        'private', 'confidential', 'secure', 'encrypt', 'decrypt'
      ];
      
      const words = content.toLowerCase().match(/\b\w+\b/g) || [];
      nearbyKeywords = [...new Set(words.filter(word => 
        sensitiveKeywords.includes(word) && word.length > 2
      ))];
      
      containsSensitiveKeywords = nearbyKeywords.length > 0;
    } catch (error) {
      // Ignore read errors
    }
    
    return {
      filePath,
      fileSize: stats.size,
      fileExtension,
      isTestFile,
      isConfigFile,
      isDocumentation,
      containsSensitiveKeywords,
      nearbyKeywords
    };
  }

  private contextMatches(pattern: SecretPattern, context: FileContext): boolean {
    if (!pattern.context) {
      return true;
    }
    
    // Check file extensions
    if (pattern.context.file_extensions?.length > 0) {
      if (!pattern.context.file_extensions.includes(context.fileExtension)) {
        return false;
      }
    }
    
    // Check path patterns
    if (pattern.context.path_patterns?.length > 0) {
      const pathMatches = pattern.context.path_patterns.some(pathPattern => 
        this.matchesPatterns(context.filePath, [pathPattern])
      );
      if (!pathMatches) {
        return false;
      }
    }
    
    return true;
  }

  private isFalsePositive(value: string, pattern: SecretPattern): boolean {
    for (const filter of pattern.falsePositiveFilters) {
      if (filter.test(value)) {
        return true;
      }
    }
    return false;
  }

  private async calculateConfidence(
    value: string, 
    pattern: SecretPattern, 
    line: string, 
    context?: FileContext
  ): Promise<number> {
    let confidence = 0.5; // Base confidence
    
    // Pattern-specific confidence boost
    if (pattern.regex.test(value)) {
      confidence += 0.3;
    }
    
    // Keyword proximity boost
    const lineWords = line.toLowerCase().split(/\W+/);
    const keywordMatches = pattern.keywords.filter(keyword => 
      lineWords.some(word => word.includes(keyword.toLowerCase()))
    );
    confidence += keywordMatches.length * 0.05;
    
    // Entropy analysis
    if (this.config.enableEntropyAnalysis && pattern.entropy) {
      const entropy = this.calculateEntropy(value, pattern.entropy.algorithm);
      if (entropy >= pattern.entropy.threshold) {
        confidence += 0.2;
      } else {
        confidence *= 0.8;
      }
    }
    
    // Context analysis
    if (this.config.enableContextAnalysis && context) {
      if (context.containsSensitiveKeywords) {
        confidence += 0.1;
      }
      
      if (context.isConfigFile) {
        confidence += 0.1;
      }
      
      if (context.isTestFile) {
        confidence *= 0.7; // Reduce confidence for test files
      }
      
      if (context.isDocumentation) {
        confidence *= 0.5; // Reduce confidence for documentation
      }
    }
    
    // Validation boost
    if (this.config.enableValidation && pattern.validation) {
      const validationResult = this.validateSecret(value, pattern);
      if (validationResult === 'valid') {
        confidence += 0.15;
      } else if (validationResult === 'invalid') {
        confidence *= 0.6;
      }
    }
    
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  private calculateEntropy(value: string, algorithm: string): number {
    switch (algorithm) {
      case 'shannon':
        return this.calculateShannonEntropy(value);
      case 'base64':
        return this.calculateBase64Entropy(value);
      case 'hex':
        return this.calculateHexEntropy(value);
      default:
        return this.calculateShannonEntropy(value);
    }
  }

  private calculateShannonEntropy(value: string): number {
    const charCounts = new Map<string, number>();
    
    for (const char of value) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }
    
    let entropy = 0;
    const valueLength = value.length;
    
    for (const count of charCounts.values()) {
      const probability = count / valueLength;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  private calculateBase64Entropy(value: string): number {
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    const uniqueChars = new Set(value.split('').filter(char => base64Chars.includes(char)));
    return uniqueChars.size / base64Chars.length * 6; // Theoretical max entropy for base64
  }

  private calculateHexEntropy(value: string): number {
    const hexChars = '0123456789abcdefABCDEF';
    const uniqueChars = new Set(value.split('').filter(char => hexChars.includes(char)));
    return uniqueChars.size / 16 * 4; // Theoretical max entropy for hex
  }

  private validateSecret(value: string, pattern: SecretPattern): 'valid' | 'invalid' | 'unknown' {
    if (!pattern.validation) {
      return 'unknown';
    }
    
    const validation = pattern.validation;
    
    // Length validation
    if (validation.length) {
      if (value.length < validation.length.min || value.length > validation.length.max) {
        return 'invalid';
      }
    }
    
    // Charset validation
    if (validation.charset) {
      const charsetRegex = new RegExp(`^[${validation.charset}]+$`);
      if (!charsetRegex.test(value)) {
        return 'invalid';
      }
    }
    
    // Checksum validation (Luhn algorithm for credit cards, etc.)
    if (validation.checksum === 'luhn') {
      if (!this.luhnCheck(value)) {
        return 'invalid';
      }
    }
    
    return 'valid';
  }

  private luhnCheck(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return sum % 10 === 0;
  }

  private maskSecret(value: string): string {
    if (value.length <= 8) {
      return '*'.repeat(value.length);
    }
    
    const visibleLength = Math.min(4, Math.floor(value.length * 0.2));
    const prefix = value.substring(0, visibleLength);
    const suffix = value.substring(value.length - visibleLength);
    const maskLength = value.length - (visibleLength * 2);
    
    return `${prefix}${'*'.repeat(maskLength)}${suffix}`;
  }

  private getLineContext(lines: string[], lineIndex: number, contextLines: number = 2): string {
    const startLine = Math.max(0, lineIndex - contextLines);
    const endLine = Math.min(lines.length - 1, lineIndex + contextLines);
    
    return lines.slice(startLine, endLine + 1).join('\n');
  }

  private assessRisk(pattern: SecretPattern, context?: FileContext): SecretMatch['risk'] {
    let exposure: SecretMatch['risk']['exposure'] = 'internal';
    let impact: SecretMatch['risk']['impact'] = pattern.severity;
    let likelihood: SecretMatch['risk']['likelihood'] = 'medium';
    
    if (context) {
      // Public exposure indicators
      if (context.filePath.includes('public') || 
          context.filePath.includes('www') ||
          context.filePath.includes('static')) {
        exposure = 'public';
        likelihood = 'high';
      }
      
      // Configuration files are more likely to be exposed
      if (context.isConfigFile) {
        likelihood = 'high';
      }
      
      // Test files have lower likelihood of exposure
      if (context.isTestFile) {
        likelihood = 'low';
        impact = impact === 'critical' ? 'high' : impact === 'high' ? 'medium' : 'low';
      }
    }
    
    return { exposure, impact, likelihood };
  }

  private generateRemediation(pattern: SecretPattern, context?: FileContext): SecretMatch['remediation'] {
    const suggestions: string[] = [];
    let urgency: SecretMatch['remediation']['urgency'] = 'medium';
    let autoFixable = false;
    
    // General suggestions
    suggestions.push('Remove the secret from the code');
    suggestions.push('Use environment variables or a secure secret management system');
    suggestions.push('Rotate the secret if it has been exposed');
    
    // Pattern-specific suggestions
    switch (pattern.category) {
      case 'api_key':
        suggestions.push('Regenerate the API key');
        suggestions.push('Use API key rotation policies');
        break;
      case 'cloud':
        suggestions.push('Rotate cloud credentials immediately');
        suggestions.push('Review cloud access logs for unauthorized usage');
        urgency = 'immediate';
        break;
      case 'database':
        suggestions.push('Change database credentials');
        suggestions.push('Review database access logs');
        urgency = 'high';
        break;
      case 'certificate':
        suggestions.push('Regenerate certificates');
        suggestions.push('Update certificate distribution');
        urgency = 'high';
        break;
    }
    
    // Context-specific suggestions
    if (context?.isTestFile) {
      suggestions.push('Use mock secrets or test-specific credentials');
      urgency = 'low';
      autoFixable = true;
    }
    
    if (context?.isConfigFile) {
      suggestions.push('Move secrets to environment variables');
      suggestions.push('Use a configuration management system');
      autoFixable = true;
    }
    
    return { urgency, suggestions, autoFixable };
  }

  private async generateReport(result: ScanResult): Promise<void> {
    const reportPath = path.join(
      this.config.reportDir,
      `scan-report-${result.scanId}.json`
    );
    
    await fs.writeFile(reportPath, JSON.stringify(result, null, 2));
    
    // Generate summary report
    const summaryPath = path.join(
      this.config.reportDir,
      `scan-summary-${result.scanId}.txt`
    );
    
    const summary = this.generateTextSummary(result);
    await fs.writeFile(summaryPath, summary);
    
    console.log(`Reports generated: ${reportPath}, ${summaryPath}`);
  }

  private generateTextSummary(result: ScanResult): string {
    const lines: string[] = [];
    
    lines.push('SECRET SCAN REPORT');
    lines.push('=================');
    lines.push('');
    lines.push(`Scan ID: ${result.scanId}`);
    lines.push(`Target: ${result.target.description}`);
    lines.push(`Duration: ${result.performance.duration}ms`);
    lines.push('');
    
    lines.push('SUMMARY');
    lines.push('-------');
    lines.push(`Total Files: ${result.summary.totalFiles}`);
    lines.push(`Scanned Files: ${result.summary.scannedFiles}`);
    lines.push(`Skipped Files: ${result.summary.skippedFiles}`);
    lines.push(`Total Secrets: ${result.summary.totalSecrets}`);
    lines.push(`  - Critical: ${result.summary.criticalSecrets}`);
    lines.push(`  - High: ${result.summary.highSecrets}`);
    lines.push(`  - Medium: ${result.summary.mediumSecrets}`);
    lines.push(`  - Low: ${result.summary.lowSecrets}`);
    lines.push(`Average Confidence: ${(result.summary.avgConfidence * 100).toFixed(1)}%`);
    lines.push('');
    
    if (result.secrets.length > 0) {
      lines.push('SECRETS FOUND');
      lines.push('-------------');
      
      for (const secret of result.secrets) {
        lines.push(`${secret.patternName} (${secret.severity.toUpperCase()})`);
        lines.push(`  File: ${secret.location.filePath}:${secret.location.line}:${secret.location.column}`);
        lines.push(`  Value: ${secret.maskedValue}`);
        lines.push(`  Confidence: ${(secret.confidence * 100).toFixed(1)}%`);
        lines.push(`  Remediation: ${secret.remediation.urgency} priority`);
        lines.push('');
      }
    }
    
    if (result.errors.length > 0) {
      lines.push('ERRORS');
      lines.push('------');
      
      for (const error of result.errors) {
        lines.push(`${error.file}: ${error.error}`);
      }
      lines.push('');
    }
    
    return lines.join('\n');
  }

  private async sendWebhookNotification(result: ScanResult): Promise<void> {
    if (!this.config.webhookUrl) {
      return;
    }
    
    const payload = {
      scanId: result.scanId,
      target: result.target,
      summary: result.summary,
      timestamp: new Date().toISOString(),
      criticalSecrets: result.secrets.filter(s => s.severity === 'critical'),
      highSecrets: result.secrets.filter(s => s.severity === 'high')
    };
    
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status: ${response.status}`);
      }
      
      console.log('Webhook notification sent successfully');
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
}