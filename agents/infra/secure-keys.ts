/**
 * YUR Agent Framework - HSM/KMS-Style Secure Key Management
 * Production-ready cryptographic key management with hardware security module
 * style operations, key rotation, and secure agent action signing
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface CryptoKey {
  id: string;
  name: string;
  type: 'rsa' | 'ec' | 'aes' | 'hmac';
  purpose: 'signing' | 'encryption' | 'authentication' | 'kek';
  algorithm: string;
  keySize: number;
  publicKey?: string;
  privateKeyEncrypted: string;
  metadata: {
    createdAt: Date;
    createdBy: string;
    lastUsed?: Date;
    usageCount: number;
    rotationPolicy?: KeyRotationPolicy;
    tags: Record<string, string>;
  };
  status: 'active' | 'inactive' | 'compromised' | 'destroyed';
  version: number;
}

export interface KeyRotationPolicy {
  maxAge: number; // milliseconds
  maxUsage: number;
  autoRotate: boolean;
  notifyBefore: number; // milliseconds before expiry
}

export interface SignatureRequest {
  keyId: string;
  data: Buffer | string;
  algorithm?: string;
  agentId: string;
  purpose: string;
  metadata?: Record<string, any>;
}

export interface SignatureResult {
  signature: string;
  algorithm: string;
  keyId: string;
  keyVersion: number;
  timestamp: Date;
  agentId: string;
  purpose: string;
}

export interface EncryptionRequest {
  keyId: string;
  plaintext: Buffer | string;
  algorithm?: string;
  agentId: string;
  purpose: string;
  associatedData?: Buffer;
}

export interface EncryptionResult {
  ciphertext: string;
  algorithm: string;
  keyId: string;
  keyVersion: number;
  iv?: string;
  tag?: string;
  timestamp: Date;
  agentId: string;
  purpose: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  operation: 'create' | 'sign' | 'encrypt' | 'decrypt' | 'rotate' | 'destroy' | 'access';
  keyId: string;
  agentId: string;
  success: boolean;
  error?: string;
  metadata: Record<string, any>;
  sourceIp?: string;
  userAgent?: string;
}

export interface SecureKeyManagerConfig {
  keyStoreDir: string;
  masterKeyPath: string;
  auditLogPath: string;
  enableHardwareRNG: boolean;
  enableAuditLogging: boolean;
  maxAuditLogEntries: number;
  keyRotationCheckInterval: number;
  backupEnabled: boolean;
  backupDir?: string;
  compressionEnabled: boolean;
  integrityCheckInterval: number;
  allowedSigningAlgorithms: string[];
  allowedEncryptionAlgorithms: string[];
  minKeySize: Record<string, number>;
  accessControlEnabled: boolean;
}

interface KeyAccess {
  agentId: string;
  keyId: string;
  operations: ('sign' | 'encrypt' | 'decrypt')[];
  restrictions?: {
    ipWhitelist?: string[];
    timeWindow?: {
      start: string; // HH:MM format
      end: string;   // HH:MM format
    };
    maxUsesPerHour?: number;
    purposes?: string[];
  };
  expiresAt?: Date;
}

export class SecureKeyManager extends EventEmitter {
  private config: SecureKeyManagerConfig;
  private keys: Map<string, CryptoKey> = new Map();
  private masterKey?: Buffer;
  private auditLog: AuditLogEntry[] = [];
  private keyAccess: Map<string, KeyAccess[]> = new Map();
  private usageTracking: Map<string, { count: number; lastReset: Date }> = new Map();
  private running: boolean = false;
  private rotationCheckInterval?: NodeJS.Timeout;
  private integrityCheckInterval?: NodeJS.Timeout;
  private backupInterval?: NodeJS.Timeout;

  constructor(config: Partial<SecureKeyManagerConfig> = {}) {
    super();
    
    this.config = {
      keyStoreDir: config.keyStoreDir || './secure-keys',
      masterKeyPath: config.masterKeyPath || './master.key',
      auditLogPath: config.auditLogPath || './key-audit.log',
      enableHardwareRNG: config.enableHardwareRNG ?? true,
      enableAuditLogging: config.enableAuditLogging ?? true,
      maxAuditLogEntries: config.maxAuditLogEntries || 1000000,
      keyRotationCheckInterval: config.keyRotationCheckInterval || 3600000, // 1 hour
      backupEnabled: config.backupEnabled ?? true,
      backupDir: config.backupDir,
      compressionEnabled: config.compressionEnabled ?? true,
      integrityCheckInterval: config.integrityCheckInterval || 86400000, // 24 hours
      allowedSigningAlgorithms: config.allowedSigningAlgorithms || [
        'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'
      ],
      allowedEncryptionAlgorithms: config.allowedEncryptionAlgorithms || [
        'aes-256-gcm', 'aes-256-cbc', 'rsa-oaep'
      ],
      minKeySize: config.minKeySize || {
        rsa: 2048,
        ec: 256,
        aes: 256,
        hmac: 256
      },
      accessControlEnabled: config.accessControlEnabled ?? true
    };
  }

  /**
   * Initialize the secure key manager
   */
  async initialize(): Promise<void> {
    if (this.running) {
      throw new Error('Key manager is already running');
    }

    try {
      // Create directories
      await fs.mkdir(this.config.keyStoreDir, { recursive: true });
      if (this.config.backupEnabled && this.config.backupDir) {
        await fs.mkdir(this.config.backupDir, { recursive: true });
      }

      // Initialize or load master key
      await this.initializeMasterKey();

      // Load existing keys
      await this.loadKeys();

      // Load access control rules
      await this.loadAccessControl();

      // Start background processes
      this.startKeyRotationMonitoring();
      this.startIntegrityChecking();
      
      if (this.config.backupEnabled) {
        this.startPeriodicBackup();
      }

      this.running = true;
      this.emit('keymanager:started');
      
      console.log(`Secure key manager initialized with ${this.keys.size} keys`);
    } catch (error) {
      this.emit('keymanager:error', error);
      throw error;
    }
  }

  /**
   * Shutdown the key manager
   */
  async shutdown(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop background processes
      if (this.rotationCheckInterval) {
        clearInterval(this.rotationCheckInterval);
      }
      if (this.integrityCheckInterval) {
        clearInterval(this.integrityCheckInterval);
      }
      if (this.backupInterval) {
        clearInterval(this.backupInterval);
      }

      // Flush audit log
      if (this.config.enableAuditLogging) {
        await this.flushAuditLog();
      }

      // Clear sensitive data from memory
      this.masterKey?.fill(0);
      this.masterKey = undefined;

      this.running = false;
      this.emit('keymanager:stopped');
      
      console.log('Secure key manager shut down');
    } catch (error) {
      this.emit('keymanager:error', error);
    }
  }

  /**
   * Create a new cryptographic key
   */
  async createKey(
    name: string,
    type: 'rsa' | 'ec' | 'aes' | 'hmac',
    purpose: 'signing' | 'encryption' | 'authentication' | 'kek',
    options: {
      keySize?: number;
      algorithm?: string;
      rotationPolicy?: KeyRotationPolicy;
      tags?: Record<string, string>;
      agentId: string;
    }
  ): Promise<string> {
    if (!this.running) {
      throw new Error('Key manager not initialized');
    }

    const keyId = crypto.randomUUID();
    const keySize = options.keySize || this.config.minKeySize[type];
    
    // Validate key size
    if (keySize < this.config.minKeySize[type]) {
      throw new Error(`Key size ${keySize} is below minimum ${this.config.minKeySize[type]} for type ${type}`);
    }

    try {
      let keyPair: { publicKey?: string; privateKey: string };
      let algorithm: string;

      switch (type) {
        case 'rsa':
          algorithm = options.algorithm || 'RS256';
          const rsaKeyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: keySize,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          keyPair = { publicKey: rsaKeyPair.publicKey, privateKey: rsaKeyPair.privateKey };
          break;

        case 'ec':
          algorithm = options.algorithm || 'ES256';
          const curve = keySize === 256 ? 'prime256v1' : keySize === 384 ? 'secp384r1' : 'secp521r1';
          const ecKeyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: curve,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
          });
          keyPair = { publicKey: ecKeyPair.publicKey, privateKey: ecKeyPair.privateKey };
          break;

        case 'aes':
          algorithm = options.algorithm || 'aes-256-gcm';
          const aesKey = this.generateSecureRandom(keySize / 8);
          keyPair = { privateKey: aesKey.toString('base64') };
          break;

        case 'hmac':
          algorithm = options.algorithm || 'HS256';
          const hmacKey = this.generateSecureRandom(keySize / 8);
          keyPair = { privateKey: hmacKey.toString('base64') };
          break;

        default:
          throw new Error(`Unsupported key type: ${type}`);
      }

      // Encrypt private key
      const privateKeyEncrypted = this.encryptWithMasterKey(keyPair.privateKey);

      const cryptoKey: CryptoKey = {
        id: keyId,
        name,
        type,
        purpose,
        algorithm,
        keySize,
        publicKey: keyPair.publicKey,
        privateKeyEncrypted,
        metadata: {
          createdAt: new Date(),
          createdBy: options.agentId,
          usageCount: 0,
          rotationPolicy: options.rotationPolicy,
          tags: options.tags || {}
        },
        status: 'active',
        version: 1
      };

      this.keys.set(keyId, cryptoKey);
      await this.saveKey(cryptoKey);

      await this.auditLog.push({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'create',
        keyId,
        agentId: options.agentId,
        success: true,
        metadata: {
          name,
          type,
          purpose,
          algorithm,
          keySize
        }
      });

      this.emit('key:created', { keyId, name, type, purpose });
      return keyId;

    } catch (error) {
      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'create',
        keyId,
        agentId: options.agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: { name, type, purpose }
      });

      throw error;
    }
  }

  /**
   * Sign data with a key
   */
  async sign(request: SignatureRequest): Promise<SignatureResult> {
    if (!this.running) {
      throw new Error('Key manager not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Get and validate key
      const key = await this.getKey(request.keyId, request.agentId, 'sign');
      
      if (key.purpose !== 'signing') {
        throw new Error(`Key ${request.keyId} is not for signing`);
      }

      // Check algorithm
      const algorithm = request.algorithm || key.algorithm;
      if (!this.config.allowedSigningAlgorithms.includes(algorithm)) {
        throw new Error(`Algorithm ${algorithm} not allowed for signing`);
      }

      // Decrypt private key
      const privateKey = this.decryptWithMasterKey(key.privateKeyEncrypted);
      
      // Sign data
      const dataBuffer = Buffer.isBuffer(request.data) ? request.data : Buffer.from(request.data);
      let signature: Buffer;

      switch (key.type) {
        case 'rsa':
        case 'ec':
          const signAlgorithm = this.getNodeSignAlgorithm(algorithm);
          const signer = crypto.createSign(signAlgorithm);
          signer.update(dataBuffer);
          signature = signer.sign(privateKey);
          break;

        case 'hmac':
          const hmacKey = Buffer.from(privateKey, 'base64');
          const hmacAlgorithm = algorithm.toLowerCase().replace('hs', 'sha');
          const hmac = crypto.createHmac(hmacAlgorithm, hmacKey);
          hmac.update(dataBuffer);
          signature = hmac.digest();
          break;

        default:
          throw new Error(`Key type ${key.type} not supported for signing`);
      }

      // Update usage statistics
      key.metadata.usageCount++;
      key.metadata.lastUsed = new Date();
      await this.saveKey(key);

      // Check if rotation is needed
      if (this.shouldRotateKey(key)) {
        setImmediate(() => this.rotateKey(key.id, request.agentId));
      }

      const result: SignatureResult = {
        signature: signature.toString('base64'),
        algorithm,
        keyId: request.keyId,
        keyVersion: key.version,
        timestamp: new Date(),
        agentId: request.agentId,
        purpose: request.purpose
      };

      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'sign',
        keyId: request.keyId,
        agentId: request.agentId,
        success: true,
        metadata: {
          algorithm,
          purpose: request.purpose,
          dataSize: dataBuffer.length,
          duration: Date.now() - startTime
        }
      });

      this.emit('key:used', { keyId: request.keyId, operation: 'sign', agentId: request.agentId });
      return result;

    } catch (error) {
      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'sign',
        keyId: request.keyId,
        agentId: request.agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          purpose: request.purpose,
          duration: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Encrypt data with a key
   */
  async encrypt(request: EncryptionRequest): Promise<EncryptionResult> {
    if (!this.running) {
      throw new Error('Key manager not initialized');
    }

    const startTime = Date.now();

    try {
      // Get and validate key
      const key = await this.getKey(request.keyId, request.agentId, 'encrypt');
      
      if (key.purpose !== 'encryption' && key.purpose !== 'kek') {
        throw new Error(`Key ${request.keyId} is not for encryption`);
      }

      // Check algorithm
      const algorithm = request.algorithm || key.algorithm;
      if (!this.config.allowedEncryptionAlgorithms.includes(algorithm)) {
        throw new Error(`Algorithm ${algorithm} not allowed for encryption`);
      }

      // Decrypt private key
      const keyMaterial = this.decryptWithMasterKey(key.privateKeyEncrypted);
      
      // Encrypt data
      const plaintextBuffer = Buffer.isBuffer(request.plaintext) 
        ? request.plaintext 
        : Buffer.from(request.plaintext);
      
      let ciphertext: Buffer;
      let iv: Buffer | undefined;
      let tag: Buffer | undefined;

      switch (algorithm) {
        case 'aes-256-gcm':
          iv = this.generateSecureRandom(12); // 96-bit IV for GCM
          const gcmCipher = crypto.createCipher('aes-256-gcm', Buffer.from(keyMaterial, 'base64'));
          gcmCipher.setAAD(request.associatedData || Buffer.alloc(0));
          ciphertext = Buffer.concat([gcmCipher.update(plaintextBuffer), gcmCipher.final()]);
          tag = gcmCipher.getAuthTag();
          break;

        case 'aes-256-cbc':
          iv = this.generateSecureRandom(16); // 128-bit IV for CBC
          const cbcCipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(keyMaterial, 'base64'), iv);
          ciphertext = Buffer.concat([cbcCipher.update(plaintextBuffer), cbcCipher.final()]);
          break;

        case 'rsa-oaep':
          if (key.type !== 'rsa') {
            throw new Error('RSA-OAEP requires RSA key');
          }
          ciphertext = crypto.publicEncrypt({
            key: key.publicKey!,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          }, plaintextBuffer);
          break;

        default:
          throw new Error(`Unsupported encryption algorithm: ${algorithm}`);
      }

      // Update usage statistics
      key.metadata.usageCount++;
      key.metadata.lastUsed = new Date();
      await this.saveKey(key);

      const result: EncryptionResult = {
        ciphertext: ciphertext.toString('base64'),
        algorithm,
        keyId: request.keyId,
        keyVersion: key.version,
        iv: iv?.toString('base64'),
        tag: tag?.toString('base64'),
        timestamp: new Date(),
        agentId: request.agentId,
        purpose: request.purpose
      };

      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'encrypt',
        keyId: request.keyId,
        agentId: request.agentId,
        success: true,
        metadata: {
          algorithm,
          purpose: request.purpose,
          dataSize: plaintextBuffer.length,
          duration: Date.now() - startTime
        }
      });

      this.emit('key:used', { keyId: request.keyId, operation: 'encrypt', agentId: request.agentId });
      return result;

    } catch (error) {
      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'encrypt',
        keyId: request.keyId,
        agentId: request.agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          purpose: request.purpose,
          duration: Date.now() - startTime
        }
      });

      throw error;
    }
  }

  /**
   * Rotate a key
   */
  async rotateKey(keyId: string, agentId: string): Promise<string> {
    if (!this.running) {
      throw new Error('Key manager not initialized');
    }

    try {
      const oldKey = this.keys.get(keyId);
      if (!oldKey) {
        throw new Error(`Key ${keyId} not found`);
      }

      // Create new key with same parameters
      const newKeyId = await this.createKey(
        `${oldKey.name}-v${oldKey.version + 1}`,
        oldKey.type,
        oldKey.purpose,
        {
          keySize: oldKey.keySize,
          algorithm: oldKey.algorithm,
          rotationPolicy: oldKey.metadata.rotationPolicy,
          tags: { ...oldKey.metadata.tags, rotated_from: keyId },
          agentId
        }
      );

      // Mark old key as inactive
      oldKey.status = 'inactive';
      await this.saveKey(oldKey);

      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'rotate',
        keyId,
        agentId,
        success: true,
        metadata: { newKeyId, oldVersion: oldKey.version }
      });

      this.emit('key:rotated', { oldKeyId: keyId, newKeyId, agentId });
      return newKeyId;

    } catch (error) {
      await this.logAudit({
        id: crypto.randomUUID(),
        timestamp: new Date(),
        operation: 'rotate',
        keyId,
        agentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {}
      });

      throw error;
    }
  }

  /**
   * Grant access to a key for an agent
   */
  async grantKeyAccess(
    keyId: string,
    agentId: string,
    operations: ('sign' | 'encrypt' | 'decrypt')[],
    restrictions?: KeyAccess['restrictions'],
    expiresAt?: Date
  ): Promise<void> {
    if (!this.config.accessControlEnabled) {
      return;
    }

    if (!this.keyAccess.has(keyId)) {
      this.keyAccess.set(keyId, []);
    }

    const access: KeyAccess = {
      agentId,
      keyId,
      operations,
      restrictions,
      expiresAt
    };

    const keyAccesses = this.keyAccess.get(keyId)!;
    const existingIndex = keyAccesses.findIndex(a => a.agentId === agentId);
    
    if (existingIndex >= 0) {
      keyAccesses[existingIndex] = access;
    } else {
      keyAccesses.push(access);
    }

    await this.saveAccessControl();
    this.emit('access:granted', { keyId, agentId, operations });
  }

  /**
   * Revoke access to a key for an agent
   */
  async revokeKeyAccess(keyId: string, agentId: string): Promise<void> {
    if (!this.config.accessControlEnabled) {
      return;
    }

    const keyAccesses = this.keyAccess.get(keyId);
    if (keyAccesses) {
      const filtered = keyAccesses.filter(a => a.agentId !== agentId);
      this.keyAccess.set(keyId, filtered);
      await this.saveAccessControl();
      this.emit('access:revoked', { keyId, agentId });
    }
  }

  /**
   * List all keys (metadata only)
   */
  listKeys(agentId?: string): Array<Omit<CryptoKey, 'privateKeyEncrypted'>> {
    const keys = Array.from(this.keys.values());
    
    return keys
      .filter(key => {
        if (!agentId) return true;
        if (!this.config.accessControlEnabled) return true;
        return this.hasKeyAccess(key.id, agentId, 'sign') || 
               this.hasKeyAccess(key.id, agentId, 'encrypt');
      })
      .map(key => ({
        id: key.id,
        name: key.name,
        type: key.type,
        purpose: key.purpose,
        algorithm: key.algorithm,
        keySize: key.keySize,
        publicKey: key.publicKey,
        metadata: key.metadata,
        status: key.status,
        version: key.version
      }));
  }

  /**
   * Get audit log entries
   */
  getAuditLog(limit: number = 1000): AuditLogEntry[] {
    return this.auditLog.slice(-limit);
  }

  private async initializeMasterKey(): Promise<void> {
    try {
      const masterKeyData = await fs.readFile(this.config.masterKeyPath);
      this.masterKey = masterKeyData;
    } catch (error) {
      // Generate new master key
      console.log('Generating new master key...');
      this.masterKey = this.generateSecureRandom(32); // 256-bit key
      await fs.writeFile(this.config.masterKeyPath, this.masterKey, { mode: 0o600 });
      console.log('Master key generated and saved');
    }
  }

  private async loadKeys(): Promise<void> {
    try {
      const keyFiles = await fs.readdir(this.config.keyStoreDir);
      
      for (const file of keyFiles) {
        if (file.endsWith('.key')) {
          try {
            const keyPath = path.join(this.config.keyStoreDir, file);
            const keyData = await fs.readFile(keyPath, 'utf-8');
            const key: CryptoKey = JSON.parse(keyData);
            
            // Restore Date objects
            key.metadata.createdAt = new Date(key.metadata.createdAt);
            if (key.metadata.lastUsed) {
              key.metadata.lastUsed = new Date(key.metadata.lastUsed);
            }
            
            this.keys.set(key.id, key);
          } catch (error) {
            console.warn(`Failed to load key file ${file}:`, error);
          }
        }
      }
    } catch (error) {
      console.log('Key store directory not found, starting fresh');
    }
  }

  private async saveKey(key: CryptoKey): Promise<void> {
    const keyPath = path.join(this.config.keyStoreDir, `${key.id}.key`);
    await fs.writeFile(keyPath, JSON.stringify(key, null, 2), { mode: 0o600 });
  }

  private async loadAccessControl(): Promise<void> {
    if (!this.config.accessControlEnabled) {
      return;
    }

    try {
      const aclPath = path.join(this.config.keyStoreDir, 'access-control.json');
      const aclData = await fs.readFile(aclPath, 'utf-8');
      const accessData = JSON.parse(aclData);
      
      this.keyAccess = new Map(accessData.map(([keyId, accesses]: [string, any[]]) => [
        keyId,
        accesses.map(access => ({
          ...access,
          expiresAt: access.expiresAt ? new Date(access.expiresAt) : undefined
        }))
      ]));
    } catch (error) {
      console.log('No existing access control found, starting fresh');
    }
  }

  private async saveAccessControl(): Promise<void> {
    if (!this.config.accessControlEnabled) {
      return;
    }

    const aclPath = path.join(this.config.keyStoreDir, 'access-control.json');
    const accessData = Array.from(this.keyAccess.entries());
    await fs.writeFile(aclPath, JSON.stringify(accessData, null, 2));
  }

  private async getKey(keyId: string, agentId: string, operation: string): Promise<CryptoKey> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key ${keyId} not found`);
    }

    if (key.status !== 'active') {
      throw new Error(`Key ${keyId} is not active (status: ${key.status})`);
    }

    // Check access control
    if (this.config.accessControlEnabled && !this.hasKeyAccess(keyId, agentId, operation as any)) {
      throw new Error(`Agent ${agentId} does not have ${operation} access to key ${keyId}`);
    }

    return key;
  }

  private hasKeyAccess(keyId: string, agentId: string, operation: 'sign' | 'encrypt' | 'decrypt'): boolean {
    if (!this.config.accessControlEnabled) {
      return true;
    }

    const accesses = this.keyAccess.get(keyId) || [];
    const access = accesses.find(a => a.agentId === agentId);
    
    if (!access) {
      return false;
    }

    // Check expiration
    if (access.expiresAt && access.expiresAt < new Date()) {
      return false;
    }

    // Check operation
    if (!access.operations.includes(operation)) {
      return false;
    }

    // Check restrictions
    if (access.restrictions) {
      // Check usage limits
      if (access.restrictions.maxUsesPerHour) {
        const usageKey = `${keyId}:${agentId}`;
        const usage = this.usageTracking.get(usageKey);
        
        if (usage) {
          const hoursSinceReset = (Date.now() - usage.lastReset.getTime()) / (1000 * 60 * 60);
          if (hoursSinceReset < 1 && usage.count >= access.restrictions.maxUsesPerHour) {
            return false;
          }
        }
      }

      // Check time window
      if (access.restrictions.timeWindow) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        if (currentTime < access.restrictions.timeWindow.start || 
            currentTime > access.restrictions.timeWindow.end) {
          return false;
        }
      }
    }

    return true;
  }

  private shouldRotateKey(key: CryptoKey): boolean {
    if (!key.metadata.rotationPolicy || !key.metadata.rotationPolicy.autoRotate) {
      return false;
    }

    const policy = key.metadata.rotationPolicy;
    const now = Date.now();
    const age = now - key.metadata.createdAt.getTime();

    return age >= policy.maxAge || key.metadata.usageCount >= policy.maxUsage;
  }

  private generateSecureRandom(bytes: number): Buffer {
    if (this.config.enableHardwareRNG) {
      // In production, this would use hardware RNG if available
      return crypto.randomBytes(bytes);
    } else {
      return crypto.randomBytes(bytes);
    }
  }

  private encryptWithMasterKey(data: string): string {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const iv = this.generateSecureRandom(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(data)),
      cipher.final()
    ]);
    
    return Buffer.concat([iv, encrypted]).toString('base64');
  }

  private decryptWithMasterKey(encryptedData: string): string {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }

    const buffer = Buffer.from(encryptedData, 'base64');
    const iv = buffer.subarray(0, 16);
    const encrypted = buffer.subarray(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.masterKey, iv);
    
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString();
  }

  private getNodeSignAlgorithm(algorithm: string): string {
    const mapping: Record<string, string> = {
      'RS256': 'RSA-SHA256',
      'RS384': 'RSA-SHA384', 
      'RS512': 'RSA-SHA512',
      'ES256': 'SHA256',
      'ES384': 'SHA384',
      'ES512': 'SHA512',
      'PS256': 'RSA-PSS',
      'PS384': 'RSA-PSS',
      'PS512': 'RSA-PSS'
    };
    
    return mapping[algorithm] || algorithm;
  }

  private async logAudit(entry: AuditLogEntry): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    this.auditLog.push(entry);
    
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
      console.error('Failed to flush audit log:', error);
    }
  }

  private startKeyRotationMonitoring(): void {
    this.rotationCheckInterval = setInterval(async () => {
      for (const [keyId, key] of this.keys) {
        if (this.shouldRotateKey(key)) {
          try {
            await this.rotateKey(keyId, 'system');
          } catch (error) {
            console.error(`Failed to auto-rotate key ${keyId}:`, error);
          }
        }
      }
    }, this.config.keyRotationCheckInterval);
  }

  private startIntegrityChecking(): void {
    this.integrityCheckInterval = setInterval(async () => {
      let corruptedKeys = 0;
      
      for (const [keyId, key] of this.keys) {
        try {
          // Verify key integrity by attempting decryption
          this.decryptWithMasterKey(key.privateKeyEncrypted);
        } catch (error) {
          console.error(`Key ${keyId} failed integrity check:`, error);
          key.status = 'compromised';
          await this.saveKey(key);
          corruptedKeys++;
        }
      }
      
      if (corruptedKeys > 0) {
        this.emit('integrity:warning', { corruptedKeys });
      }
    }, this.config.integrityCheckInterval);
  }

  private startPeriodicBackup(): void {
    if (!this.config.backupDir) {
      return;
    }

    this.backupInterval = setInterval(async () => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(this.config.backupDir!, `backup-${timestamp}`);
        
        await fs.mkdir(backupPath, { recursive: true });
        
        // Copy all key files
        for (const key of this.keys.values()) {
          const srcPath = path.join(this.config.keyStoreDir, `${key.id}.key`);
          const dstPath = path.join(backupPath, `${key.id}.key`);
          await fs.copyFile(srcPath, dstPath);
        }
        
        // Copy access control
        if (this.config.accessControlEnabled) {
          const srcAcl = path.join(this.config.keyStoreDir, 'access-control.json');
          const dstAcl = path.join(backupPath, 'access-control.json');
          try {
            await fs.copyFile(srcAcl, dstAcl);
          } catch (error) {
            // Access control file might not exist yet
          }
        }
        
        console.log(`Key backup created: ${backupPath}`);
        this.emit('backup:created', { backupPath });
        
      } catch (error) {
        console.error('Backup failed:', error);
        this.emit('backup:failed', error);
      }
    }, 86400000); // Daily backups
  }
}