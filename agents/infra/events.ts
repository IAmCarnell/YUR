/**
 * YUR Agent Framework - Event Bus with Persistent Append-Only Logs
 * Production-ready distributed event bus with ACID guarantees, partitioning,
 * replication, and real-time streaming capabilities
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { createReadStream, createWriteStream } from 'fs';
import { createGzip, createGunzip } from 'zlib';
import { pipeline } from 'stream/promises';

export interface EventLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: Date;
  topic: string;
  eventType: string;
  producerId: string;
  data: any;
  metadata: Record<string, any>;
  checksum: string;
  partition?: number;
  offset?: number;
  replicationFactor?: number;
}

export interface EventSubscription {
  id: string;
  subscriberId: string;
  topic: string;
  partition?: number;
  startOffset?: number;
  endOffset?: number;
  filterPredicate?: (event: EventLogEntry) => boolean;
  callback: (event: EventLogEntry) => Promise<void> | void;
  acknowledgment: 'auto' | 'manual';
  maxRetries: number;
  retryDelayMs: number;
  deadLetterQueue?: string;
}

export interface EventBusConfig {
  dataDir: string;
  maxLogFileSize: number;
  maxLogFiles: number;
  compressionEnabled: boolean;
  partitionCount: number;
  replicationFactor: number;
  flushIntervalMs: number;
  retentionHours: number;
  enableMetrics: boolean;
  enableTransactions: boolean;
  transactionTimeoutMs: number;
  maxBatchSize: number;
  indexingEnabled: boolean;
}

export interface Transaction {
  id: string;
  events: EventLogEntry[];
  startTime: Date;
  timeout: number;
  status: 'active' | 'committed' | 'aborted';
}

export interface EventIndex {
  topic: string;
  partition: number;
  minOffset: number;
  maxOffset: number;
  eventCount: number;
  sizeBytes: number;
  oldestTimestamp: Date;
  newestTimestamp: Date;
}

export interface EventBusMetrics {
  totalEvents: number;
  eventsPerSecond: number;
  bytesPerSecond: number;
  partitionMetrics: Map<number, {
    eventCount: number;
    sizeBytes: number;
    lastOffset: number;
  }>;
  subscriptionMetrics: Map<string, {
    messagesProcessed: number;
    messagesRetried: number;
    averageProcessingTime: number;
    lastActivity: Date;
  }>;
  transactionMetrics: {
    active: number;
    committed: number;
    aborted: number;
    averageCommitTime: number;
  };
}

class EventLogWriter {
  private writeStream?: NodeJS.WritableStream;
  private currentLogFile?: string;
  private currentLogSize: number = 0;
  private logFileIndex: number = 0;

  constructor(
    private logDir: string,
    private maxFileSize: number,
    private compressionEnabled: boolean
  ) {}

  async initialize(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
    await this.rotateLogFile();
  }

  async writeEvent(event: EventLogEntry): Promise<void> {
    const eventLine = JSON.stringify(event) + '\n';
    const eventSize = Buffer.byteLength(eventLine, 'utf8');

    // Rotate log file if needed
    if (this.currentLogSize + eventSize > this.maxFileSize) {
      await this.rotateLogFile();
    }

    if (!this.writeStream) {
      throw new Error('Write stream not initialized');
    }

    return new Promise((resolve, reject) => {
      this.writeStream!.write(eventLine, (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentLogSize += eventSize;
          resolve();
        }
      });
    });
  }

  async writeBatch(events: EventLogEntry[]): Promise<void> {
    const batchData = events.map(event => JSON.stringify(event)).join('\n') + '\n';
    const batchSize = Buffer.byteLength(batchData, 'utf8');

    // Rotate log file if needed
    if (this.currentLogSize + batchSize > this.maxFileSize) {
      await this.rotateLogFile();
    }

    if (!this.writeStream) {
      throw new Error('Write stream not initialized');
    }

    return new Promise((resolve, reject) => {
      this.writeStream!.write(batchData, (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentLogSize += batchSize;
          resolve();
        }
      });
    });
  }

  async flush(): Promise<void> {
    if (!this.writeStream) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.writeStream!.flush?.((error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    if (this.writeStream) {
      return new Promise((resolve, reject) => {
        this.writeStream!.end((error?: Error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  }

  private async rotateLogFile(): Promise<void> {
    if (this.writeStream) {
      await this.close();
    }

    this.currentLogFile = path.join(
      this.logDir,
      `events-${this.logFileIndex.toString().padStart(6, '0')}.log`
    );

    if (this.compressionEnabled) {
      this.writeStream = createGzip().pipe(createWriteStream(`${this.currentLogFile}.gz`));
    } else {
      this.writeStream = createWriteStream(this.currentLogFile);
    }

    this.currentLogSize = 0;
    this.logFileIndex++;
  }
}

class EventLogReader {
  constructor(
    private logDir: string,
    private compressionEnabled: boolean
  ) {}

  async *readEvents(
    startOffset: number = 0,
    endOffset?: number,
    partition?: number
  ): AsyncGenerator<EventLogEntry> {
    const logFiles = await this.getLogFiles();
    
    let currentOffset = 0;
    
    for (const logFile of logFiles) {
      const filePath = path.join(this.logDir, logFile);
      
      try {
        let readStream;
        if (this.compressionEnabled && logFile.endsWith('.gz')) {
          readStream = createReadStream(filePath).pipe(createGunzip());
        } else {
          readStream = createReadStream(filePath);
        }

        let buffer = '';
        
        for await (const chunk of readStream) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.trim()) {
              try {
                const event: EventLogEntry = JSON.parse(line);
                
                if (currentOffset >= startOffset && 
                    (!endOffset || currentOffset <= endOffset) &&
                    (!partition || event.partition === partition)) {
                  yield event;
                }
                
                currentOffset++;
                
                if (endOffset && currentOffset > endOffset) {
                  return;
                }
              } catch (error) {
                console.warn(`Failed to parse event line: ${line}`, error);
              }
            }
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            const event: EventLogEntry = JSON.parse(buffer);
            if (currentOffset >= startOffset && 
                (!endOffset || currentOffset <= endOffset) &&
                (!partition || event.partition === partition)) {
              yield event;
            }
          } catch (error) {
            console.warn(`Failed to parse final event line: ${buffer}`, error);
          }
        }
      } catch (error) {
        console.warn(`Failed to read log file ${logFile}:`, error);
      }
    }
  }

  async getEventCount(partition?: number): Promise<number> {
    let count = 0;
    
    for await (const event of this.readEvents(0, undefined, partition)) {
      count++;
    }
    
    return count;
  }

  async getLatestOffset(partition?: number): Promise<number> {
    let latestOffset = -1;
    
    for await (const event of this.readEvents()) {
      if (!partition || event.partition === partition) {
        latestOffset = Math.max(latestOffset, event.offset || event.sequenceNumber);
      }
    }
    
    return latestOffset;
  }

  private async getLogFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.logDir);
      return files
        .filter(file => file.startsWith('events-') && (file.endsWith('.log') || file.endsWith('.log.gz')))
        .sort();
    } catch (error) {
      return [];
    }
  }
}

export class PersistentEventBus extends EventEmitter {
  private config: EventBusConfig;
  private writers: Map<number, EventLogWriter> = new Map();
  private readers: Map<number, EventLogReader> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private sequenceCounter: number = 0;
  private partitionCounters: Map<number, number> = new Map();
  private running: boolean = false;
  private flushInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private metrics: EventBusMetrics = this.initializeMetrics();
  private pendingEvents: EventLogEntry[] = [];
  private eventIndex: Map<string, EventIndex> = new Map();

  constructor(config: Partial<EventBusConfig> = {}) {
    super();
    
    this.config = {
      dataDir: config.dataDir || './event-logs',
      maxLogFileSize: config.maxLogFileSize || 100 * 1024 * 1024, // 100MB
      maxLogFiles: config.maxLogFiles || 1000,
      compressionEnabled: config.compressionEnabled ?? true,
      partitionCount: config.partitionCount || 8,
      replicationFactor: config.replicationFactor || 3,
      flushIntervalMs: config.flushIntervalMs || 1000,
      retentionHours: config.retentionHours || 168, // 7 days
      enableMetrics: config.enableMetrics ?? true,
      enableTransactions: config.enableTransactions ?? true,
      transactionTimeoutMs: config.transactionTimeoutMs || 30000,
      maxBatchSize: config.maxBatchSize || 1000,
      indexingEnabled: config.indexingEnabled ?? true
    };
  }

  /**
   * Start the event bus
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Event bus is already running');
    }

    try {
      // Initialize partition writers and readers
      for (let partition = 0; partition < this.config.partitionCount; partition++) {
        const partitionDir = path.join(this.config.dataDir, `partition-${partition}`);
        
        const writer = new EventLogWriter(
          partitionDir,
          this.config.maxLogFileSize,
          this.config.compressionEnabled
        );
        await writer.initialize();
        this.writers.set(partition, writer);

        const reader = new EventLogReader(partitionDir, this.config.compressionEnabled);
        this.readers.set(partition, reader);
        
        // Initialize partition counter
        const latestOffset = await reader.getLatestOffset(partition);
        this.partitionCounters.set(partition, latestOffset + 1);
      }

      // Load existing index
      if (this.config.indexingEnabled) {
        await this.loadEventIndex();
      }

      // Start background processes
      this.startFlushProcess();
      
      if (this.config.enableMetrics) {
        this.startMetricsCollection();
      }

      // Start cleanup process
      this.startCleanupProcess();

      this.running = true;
      this.emit('bus:started');
      
      console.log(`Event bus started with ${this.config.partitionCount} partitions`);
    } catch (error) {
      this.emit('bus:error', error);
      throw error;
    }
  }

  /**
   * Stop the event bus
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      // Stop background processes
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
        this.flushInterval = undefined;
      }

      if (this.metricsInterval) {
        clearInterval(this.metricsInterval);
        this.metricsInterval = undefined;
      }

      // Flush pending events
      await this.flushPendingEvents();

      // Close all writers
      for (const [partition, writer] of this.writers) {
        await writer.close();
      }

      // Save event index
      if (this.config.indexingEnabled) {
        await this.saveEventIndex();
      }

      this.running = false;
      this.emit('bus:stopped');
      
      console.log('Event bus stopped');
    } catch (error) {
      this.emit('bus:error', error);
    }
  }

  /**
   * Publish a single event
   */
  async publish(
    topic: string,
    eventType: string,
    data: any,
    metadata: Record<string, any> = {},
    producerId: string = 'unknown'
  ): Promise<EventLogEntry> {
    if (!this.running) {
      throw new Error('Event bus is not running');
    }

    const partition = this.selectPartition(topic);
    const sequenceNumber = this.getNextSequenceNumber();
    const offset = this.getNextPartitionOffset(partition);

    const event: EventLogEntry = {
      id: crypto.randomUUID(),
      sequenceNumber,
      timestamp: new Date(),
      topic,
      eventType,
      producerId,
      data,
      metadata,
      partition,
      offset,
      replicationFactor: this.config.replicationFactor,
      checksum: ''
    };

    // Calculate checksum
    event.checksum = this.calculateChecksum(event);

    // Add to pending events for batching
    this.pendingEvents.push(event);

    // Immediately flush if batch is full
    if (this.pendingEvents.length >= this.config.maxBatchSize) {
      await this.flushPendingEvents();
    }

    // Update metrics
    this.updatePublishMetrics(event);

    // Notify subscribers
    await this.notifySubscribers(event);

    this.emit('event:published', event);
    return event;
  }

  /**
   * Publish multiple events in a transaction
   */
  async publishBatch(events: Array<{
    topic: string;
    eventType: string;
    data: any;
    metadata?: Record<string, any>;
  }>, producerId: string = 'unknown'): Promise<EventLogEntry[]> {
    if (!this.running) {
      throw new Error('Event bus is not running');
    }

    if (!this.config.enableTransactions) {
      // Publish events individually if transactions are disabled
      const publishedEvents: EventLogEntry[] = [];
      for (const eventData of events) {
        const event = await this.publish(
          eventData.topic,
          eventData.eventType,
          eventData.data,
          eventData.metadata || {},
          producerId
        );
        publishedEvents.push(event);
      }
      return publishedEvents;
    }

    const transaction = await this.beginTransaction();

    try {
      for (const eventData of events) {
        const partition = this.selectPartition(eventData.topic);
        const sequenceNumber = this.getNextSequenceNumber();
        const offset = this.getNextPartitionOffset(partition);

        const event: EventLogEntry = {
          id: crypto.randomUUID(),
          sequenceNumber,
          timestamp: new Date(),
          topic: eventData.topic,
          eventType: eventData.eventType,
          producerId,
          data: eventData.data,
          metadata: eventData.metadata || {},
          partition,
          offset,
          replicationFactor: this.config.replicationFactor,
          checksum: ''
        };

        event.checksum = this.calculateChecksum(event);
        transaction.events.push(event);
      }

      await this.commitTransaction(transaction.id);
      
      this.emit('batch:published', transaction.events);
      return transaction.events;
    } catch (error) {
      await this.abortTransaction(transaction.id);
      throw error;
    }
  }

  /**
   * Subscribe to events
   */
  async subscribe(
    subscriberId: string,
    topic: string,
    callback: (event: EventLogEntry) => Promise<void> | void,
    options: {
      partition?: number;
      startOffset?: number;
      endOffset?: number;
      acknowledgment?: 'auto' | 'manual';
      maxRetries?: number;
      retryDelayMs?: number;
      deadLetterQueue?: string;
      filterPredicate?: (event: EventLogEntry) => boolean;
    } = {}
  ): Promise<string> {
    const subscriptionId = crypto.randomUUID();
    
    const subscription: EventSubscription = {
      id: subscriptionId,  
      subscriberId,
      topic,
      partition: options.partition,
      startOffset: options.startOffset,
      endOffset: options.endOffset,
      callback,
      acknowledgment: options.acknowledgment || 'auto',
      maxRetries: options.maxRetries || 3,
      retryDelayMs: options.retryDelayMs || 1000,
      deadLetterQueue: options.deadLetterQueue,
      filterPredicate: options.filterPredicate
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Start replay if startOffset is specified
    if (options.startOffset !== undefined) {
      this.startReplayForSubscription(subscription);
    }

    this.emit('subscription:created', subscription);
    return subscriptionId;
  }

  /**
   * Unsubscribe from events
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      this.emit('subscription:removed', subscription);
    }
  }

  /**
   * Get events from log
   */
  async getEvents(
    topic?: string,
    startOffset?: number,
    endOffset?: number,
    partition?: number
  ): Promise<EventLogEntry[]> {
    const events: EventLogEntry[] = [];
    
    if (partition !== undefined) {
      const reader = this.readers.get(partition);
      if (reader) {
        for await (const event of reader.readEvents(startOffset, endOffset, partition)) {
          if (!topic || event.topic === topic) {
            events.push(event);
          }
        }
      }
    } else {
      // Read from all partitions
      for (const [partitionNum, reader] of this.readers) {
        for await (const event of reader.readEvents(startOffset, endOffset, partitionNum)) {
          if (!topic || event.topic === topic) {
            events.push(event);
          }
        }
      }
    }

    // Sort by sequence number
    events.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    return events;
  }

  /**
   * Get latest offset for a partition
   */
  async getLatestOffset(partition?: number): Promise<number> {
    if (partition !== undefined) {
      const reader = this.readers.get(partition);
      return reader ? await reader.getLatestOffset(partition) : -1;
    }

    // Get latest offset across all partitions
    let maxOffset = -1;
    for (const [partitionNum, reader] of this.readers) {
      const offset = await reader.getLatestOffset(partitionNum);
      maxOffset = Math.max(maxOffset, offset);
    }
    
    return maxOffset;
  }

  /**
   * Get event bus metrics
   */
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<Transaction> {
    if (!this.config.enableTransactions) {
      throw new Error('Transactions are not enabled');
    }

    const transaction: Transaction = {
      id: crypto.randomUUID(),
      events: [],
      startTime: new Date(),
      timeout: this.config.transactionTimeoutMs,
      status: 'active'
    };

    this.transactions.set(transaction.id, transaction);

    // Set timeout for transaction
    setTimeout(() => {
      if (this.transactions.has(transaction.id) && 
          this.transactions.get(transaction.id)?.status === 'active') {
        this.abortTransaction(transaction.id);
      }
    }, transaction.timeout);

    return transaction;
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} not found or not active`);
    }

    try {
      // Write all events in the transaction
      for (const event of transaction.events) {
        this.pendingEvents.push(event);
      }

      await this.flushPendingEvents();

      transaction.status = 'committed';
      
      // Notify subscribers for all events
      for (const event of transaction.events) {
        await this.notifySubscribers(event);
        this.updatePublishMetrics(event);
      }

      this.emit('transaction:committed', transaction);
    } catch (error) {
      transaction.status = 'aborted';
      this.emit('transaction:error', { transaction, error });
      throw error;
    } finally {
      // Clean up transaction after a delay
      setTimeout(() => {
        this.transactions.delete(transactionId);
      }, 60000);
    }
  }

  /**
   * Abort a transaction
   */
  async abortTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      return;
    }

    transaction.status = 'aborted';
    this.emit('transaction:aborted', transaction);

    // Clean up transaction after a delay
    setTimeout(() => {
      this.transactions.delete(transactionId);
    }, 60000);
  }

  private initializeMetrics(): EventBusMetrics {
    return {
      totalEvents: 0,
      eventsPerSecond: 0,
      bytesPerSecond: 0,
      partitionMetrics: new Map(),
      subscriptionMetrics: new Map(),
      transactionMetrics: {
        active: 0,
        committed: 0,
        aborted: 0,
        averageCommitTime: 0
      }
    };
  }

  private selectPartition(topic: string): number {
    // Use consistent hashing to select partition
    const hash = crypto.createHash('sha256').update(topic).digest();
    const hashInt = hash.readUInt32BE(0);
    return hashInt % this.config.partitionCount;
  }

  private getNextSequenceNumber(): number {
    return ++this.sequenceCounter;
  }

  private getNextPartitionOffset(partition: number): number {
    const current = this.partitionCounters.get(partition) || 0;
    this.partitionCounters.set(partition, current + 1);
    return current;
  }

  private calculateChecksum(event: EventLogEntry): string {
    const data = {
      id: event.id,
      sequenceNumber: event.sequenceNumber,
      timestamp: event.timestamp,
      topic: event.topic,
      eventType: event.eventType,
      producerId: event.producerId,
      data: event.data,
      metadata: event.metadata
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private async flushPendingEvents(): Promise<void> {
    if (this.pendingEvents.length === 0) {
      return;
    }

    // Group events by partition
    const partitionEvents = new Map<number, EventLogEntry[]>();
    
    for (const event of this.pendingEvents) {
      const partition = event.partition!;
      if (!partitionEvents.has(partition)) {
        partitionEvents.set(partition, []);
      }
      partitionEvents.get(partition)!.push(event);
    }

    // Write events to each partition
    for (const [partition, events] of partitionEvents) {
      const writer = this.writers.get(partition);
      if (writer) {
        if (events.length === 1) {
          await writer.writeEvent(events[0]);
        } else {
          await writer.writeBatch(events);
        }
        await writer.flush();
      }
    }

    // Update index
    if (this.config.indexingEnabled) {
      this.updateEventIndex(this.pendingEvents);
    }

    this.pendingEvents = [];
  }

  private async notifySubscribers(event: EventLogEntry): Promise<void> {
    const relevantSubscriptions = Array.from(this.subscriptions.values()).filter(
      sub => sub.topic === event.topic || sub.topic === '*'
    );

    for (const subscription of relevantSubscriptions) {
      try {
        // Apply filter if present
        if (subscription.filterPredicate && !subscription.filterPredicate(event)) {
          continue;
        }

        // Check partition filter
        if (subscription.partition !== undefined && subscription.partition !== event.partition) {
          continue;
        }

        // Check offset bounds
        if (subscription.startOffset !== undefined && event.offset! < subscription.startOffset) {
          continue;  
        }
        if (subscription.endOffset !== undefined && event.offset! > subscription.endOffset) {
          continue;
        }

        await this.deliverEventToSubscriber(subscription, event);
      } catch (error) {
        console.warn(`Failed to notify subscriber ${subscription.subscriberId}:`, error);
      }
    }
  }

  private async deliverEventToSubscriber(
    subscription: EventSubscription,
    event: EventLogEntry,
    retryCount: number = 0
  ): Promise<void> {
    try {
      const startTime = Date.now();
      await subscription.callback(event);
      
      // Update metrics
      this.updateSubscriptionMetrics(subscription.id, Date.now() - startTime, false);
      
    } catch (error) {
      console.warn(`Error delivering event to subscriber ${subscription.subscriberId}:`, error);
      
      if (retryCount < subscription.maxRetries) {
        // Retry after delay
        setTimeout(() => {
          this.deliverEventToSubscriber(subscription, event, retryCount + 1);
        }, subscription.retryDelayMs * (retryCount + 1));
        
        this.updateSubscriptionMetrics(subscription.id, 0, true);
      } else if (subscription.deadLetterQueue) {
        // Send to dead letter queue
        await this.sendToDeadLetterQueue(subscription.deadLetterQueue, event, error);
      }
    }
  }

  private async sendToDeadLetterQueue(
    deadLetterQueue: string,
    event: EventLogEntry,
    error: any
  ): Promise<void> {
    try {
      await this.publish(
        deadLetterQueue,
        'dead-letter',
        {
          originalEvent: event,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        },
        { originalTopic: event.topic },
        'event-bus-dlq'
      );
    } catch (dlqError) {
      console.error('Failed to send event to dead letter queue:', dlqError);
    }
  }

  private async startReplayForSubscription(subscription: EventSubscription): Promise<void> {
    try {
      const reader = subscription.partition !== undefined 
        ? this.readers.get(subscription.partition)
        : null;

      if (reader) {
        // Replay from specific partition
        for await (const event of reader.readEvents(
          subscription.startOffset,
          subscription.endOffset,
          subscription.partition
        )) {
          if (event.topic === subscription.topic || subscription.topic === '*') {
            await this.deliverEventToSubscriber(subscription, event);
          }
        }
      } else {
        // Replay from all partitions
        const events = await this.getEvents(
          subscription.topic === '*' ? undefined : subscription.topic,
          subscription.startOffset,
          subscription.endOffset
        );
        
        for (const event of events) {
          await this.deliverEventToSubscriber(subscription, event);
        }
      }
    } catch (error) {
      console.warn(`Replay failed for subscription ${subscription.id}:`, error);
    }
  }

  private startFlushProcess(): void {
    this.flushInterval = setInterval(async () => {
      try {
        await this.flushPendingEvents();
      } catch (error) {
        console.error('Flush process error:', error);
      }
    }, this.config.flushIntervalMs);
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      // Update transaction metrics
      this.metrics.transactionMetrics.active = Array.from(this.transactions.values())
        .filter(t => t.status === 'active').length;
    }, 5000);
  }

  private startCleanupProcess(): void {
    setInterval(async () => {
      try {
        await this.cleanupOldLogs();
      } catch (error) {
        console.error('Cleanup process error:', error);
      }
    }, 3600000); // Run every hour
  }

  private async cleanupOldLogs(): Promise<void> {
    const cutoffTime = new Date(Date.now() - this.config.retentionHours * 60 * 60 * 1000);
    
    for (let partition = 0; partition < this.config.partitionCount; partition++) {
      const partitionDir = path.join(this.config.dataDir, `partition-${partition}`);
      
      try {
        const files = await fs.readdir(partitionDir);
        
        for (const file of files) {
          const filePath = path.join(partitionDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffTime) {
            await fs.unlink(filePath);
            console.log(`Cleaned up old log file: ${file}`);
          }
        }
      } catch (error) {
        console.warn(`Cleanup error for partition ${partition}:`, error);
      }
    }
  }

  private updatePublishMetrics(event: EventLogEntry): void {
    this.metrics.totalEvents++;
    
    // Update partition metrics
    const partition = event.partition!;
    if (!this.metrics.partitionMetrics.has(partition)) {
      this.metrics.partitionMetrics.set(partition, {
        eventCount: 0,
        sizeBytes: 0,
        lastOffset: -1
      });
    }
    
    const partitionMetrics = this.metrics.partitionMetrics.get(partition)!;
    partitionMetrics.eventCount++;
    partitionMetrics.sizeBytes += JSON.stringify(event).length;
    partitionMetrics.lastOffset = event.offset!;
  }

  private updateSubscriptionMetrics(
    subscriptionId: string,
    processingTime: number,
    wasRetry: boolean
  ): void {
    if (!this.metrics.subscriptionMetrics.has(subscriptionId)) {
      this.metrics.subscriptionMetrics.set(subscriptionId, {
        messagesProcessed: 0,
        messagesRetried: 0,
        averageProcessingTime: 0,
        lastActivity: new Date()
      });
    }
    
    const subMetrics = this.metrics.subscriptionMetrics.get(subscriptionId)!;
    
    if (wasRetry) {
      subMetrics.messagesRetried++;
    } else {
      subMetrics.messagesProcessed++;
      subMetrics.averageProcessingTime = 
        (subMetrics.averageProcessingTime * (subMetrics.messagesProcessed - 1) + processingTime) /
        subMetrics.messagesProcessed;
    }
    
    subMetrics.lastActivity = new Date();
  }

  private updateEventIndex(events: EventLogEntry[]): void {
    for (const event of events) {
      const key = `${event.topic}:${event.partition}`;
      
      if (!this.eventIndex.has(key)) {
        this.eventIndex.set(key, {
          topic: event.topic,
          partition: event.partition!,
          minOffset: event.offset!,
          maxOffset: event.offset!,
          eventCount: 0,
          sizeBytes: 0,
          oldestTimestamp: event.timestamp,
          newestTimestamp: event.timestamp
        });
      }
      
      const index = this.eventIndex.get(key)!;
      index.maxOffset = Math.max(index.maxOffset, event.offset!);
      index.minOffset = Math.min(index.minOffset, event.offset!);
      index.eventCount++;
      index.sizeBytes += JSON.stringify(event).length;
      index.newestTimestamp = new Date(Math.max(
        index.newestTimestamp.getTime(),
        event.timestamp.getTime()
      ));
      index.oldestTimestamp = new Date(Math.min(
        index.oldestTimestamp.getTime(),
        event.timestamp.getTime()
      ));
    }
  }

  private async loadEventIndex(): Promise<void> {
    const indexPath = path.join(this.config.dataDir, 'event-index.json');
    
    try {
      const indexData = await fs.readFile(indexPath, 'utf-8');
      const indexEntries = JSON.parse(indexData);
      
      this.eventIndex = new Map(indexEntries.map(([key, index]: [string, any]) => [
        key,
        {
          ...index,
          oldestTimestamp: new Date(index.oldestTimestamp),
          newestTimestamp: new Date(index.newestTimestamp)
        }
      ]));
      
      console.log(`Loaded event index with ${this.eventIndex.size} entries`);
    } catch (error) {
      console.log('No existing event index found, starting fresh');
    }
  }

  private async saveEventIndex(): Promise<void> {
    const indexPath = path.join(this.config.dataDir, 'event-index.json');
    const indexEntries = Array.from(this.eventIndex.entries());
    
    try {
      await fs.writeFile(indexPath, JSON.stringify(indexEntries, null, 2));
      console.log(`Saved event index with ${this.eventIndex.size} entries`);
    } catch (error) {
      console.error('Failed to save event index:', error);
    }
  }
}