/**
 * YUR Agent Framework - Event Bus
 * Event-driven orchestration with topic-based subscriptions and event history
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IEventBus, AgentEvent, IAgentRegistry } from './types.js';

export class EventBus extends EventEmitter implements IEventBus {
  private subscriptions: Map<string, Map<string, (event: AgentEvent) => void>> = new Map();
  private eventHistory: AgentEvent[] = [];
  private agentRegistry: IAgentRegistry;
  private maxHistorySize: number;
  private persistenceEnabled: boolean;
  private historyFilePath: string;
  private saveInterval?: NodeJS.Timeout;

  constructor(
    agentRegistry: IAgentRegistry,
    options: {
      maxHistorySize?: number;
      persistenceEnabled?: boolean;
      historyFilePath?: string;
      saveInterval?: number;
    } = {}
  ) {
    super();
    this.agentRegistry = agentRegistry;
    this.maxHistorySize = options.maxHistorySize || 10000;
    this.persistenceEnabled = options.persistenceEnabled || true;
    this.historyFilePath = path.resolve(options.historyFilePath || './event-history.json');

    if (this.persistenceEnabled) {
      this.loadEventHistory().catch(error => {
        console.warn('Failed to load event history:', error.message);
      });

      // Auto-save every 30 seconds
      this.saveInterval = setInterval(() => {
        this.saveEventHistory().catch(error => {
          console.error('Failed to save event history:', error);
        });
      }, options.saveInterval || 30000);
    }
  }

  /**
   * Publish an event
   */
  async publish(event: AgentEvent): Promise<void> {
    try {
      // Verify event signature if provided
      if (event.signature) {
        const agent = await this.agentRegistry.getAgent(event.source);
        if (agent) {
          // In a real implementation, verify signature using agent's public key
          // For now, we'll assume it's valid if the agent exists
        }
      }

      // Check if agent has permission to publish to this topic
      const hasPermission = await this.agentRegistry.checkPermission(
        event.source, 
        event.topic, 
        `event:${event.topic}`
      );

      if (!hasPermission) {
        throw new Error(`Agent ${event.source} not authorized to publish to topic ${event.topic}`);
      }

      // Add to history
      this.addToHistory(event);

      // Notify subscribers
      const topicSubscriptions = this.subscriptions.get(event.topic);
      if (topicSubscriptions) {
        for (const [agentId, callback] of topicSubscriptions) {
          try {
            // Check if subscriber has permission to receive events from this topic
            const subscriberHasPermission = await this.agentRegistry.checkPermission(
              agentId,
              event.topic,
              `event:${event.topic}`
            );

            if (subscriberHasPermission) {
              callback(event);
            }
          } catch (error) {
            console.error(`Error delivering event to ${agentId}:`, error);
            this.emit('delivery:error', agentId, event, error);
          }
        }
      }

      // Notify wildcard subscribers
      const wildcardSubscriptions = this.subscriptions.get('*');
      if (wildcardSubscriptions) {
        for (const [agentId, callback] of wildcardSubscriptions) {
          try {
            const subscriberHasPermission = await this.agentRegistry.checkPermission(
              agentId,
              '*',
              'event:*'
            );

            if (subscriberHasPermission) {
              callback(event);
            }
          } catch (error) {
            console.error(`Error delivering wildcard event to ${agentId}:`, error);
          }
        }
      }

      this.emit('event:published', event);
    } catch (error) {
      this.emit('event:error', event, error);
      throw error;
    }
  }

  /**
   * Subscribe to events on a topic
   */
  async subscribe(topic: string, agentId: string, callback: (event: AgentEvent) => void): Promise<void> {
    // Check if agent has permission to subscribe to this topic
    const hasPermission = await this.agentRegistry.checkPermission(
      agentId,
      topic,
      `event:${topic}`
    );

    if (!hasPermission) {
      throw new Error(`Agent ${agentId} not authorized to subscribe to topic ${topic}`);
    }

    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Map());
    }

    const topicSubscriptions = this.subscriptions.get(topic)!;
    topicSubscriptions.set(agentId, callback);

    this.emit('subscription:added', topic, agentId);
    console.log(`Agent ${agentId} subscribed to topic ${topic}`);
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string, agentId: string): Promise<void> {
    const topicSubscriptions = this.subscriptions.get(topic);
    if (topicSubscriptions) {
      topicSubscriptions.delete(agentId);
      
      if (topicSubscriptions.size === 0) {
        this.subscriptions.delete(topic);
      }
    }

    this.emit('subscription:removed', topic, agentId);
    console.log(`Agent ${agentId} unsubscribed from topic ${topic}`);
  }

  /**
   * Get event history
   */
  async getEventHistory(topic?: string, since?: Date): Promise<AgentEvent[]> {
    let filteredHistory = this.eventHistory;

    if (topic) {
      filteredHistory = filteredHistory.filter(event => event.topic === topic);
    }

    if (since) {
      filteredHistory = filteredHistory.filter(event => event.timestamp >= since);
    }

    return filteredHistory.slice(); // Return a copy
  }

  /**
   * Clear event history
   */
  async clearHistory(topic?: string): Promise<void> {
    if (topic) {
      this.eventHistory = this.eventHistory.filter(event => event.topic !== topic);
    } else {
      this.eventHistory = [];
    }

    if (this.persistenceEnabled) {
      await this.saveEventHistory();
    }

    this.emit('history:cleared', topic);
  }

  /**
   * Get subscription information
   */
  getSubscriptions(): Map<string, string[]> {
    const result = new Map<string, string[]>();
    
    for (const [topic, subscribers] of this.subscriptions) {
      result.set(topic, Array.from(subscribers.keys()));
    }
    
    return result;
  }

  /**
   * Get topics that an agent is subscribed to
   */
  getAgentSubscriptions(agentId: string): string[] {
    const topics: string[] = [];
    
    for (const [topic, subscribers] of this.subscriptions) {
      if (subscribers.has(agentId)) {
        topics.push(topic);
      }
    }
    
    return topics;
  }

  /**
   * Replay events to a subscriber
   */
  async replayEvents(agentId: string, topic: string, since?: Date): Promise<void> {
    const agent = await this.agentRegistry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const hasPermission = await this.agentRegistry.checkPermission(
      agentId,
      topic,
      `event:${topic}`
    );

    if (!hasPermission) {
      throw new Error(`Agent ${agentId} not authorized to replay events from topic ${topic}`);
    }

    const subscription = this.subscriptions.get(topic)?.get(agentId);
    if (!subscription) {
      throw new Error(`Agent ${agentId} not subscribed to topic ${topic}`);
    }

    const events = await this.getEventHistory(topic, since);
    
    for (const event of events) {
      try {
        subscription(event);
      } catch (error) {
        console.error(`Error replaying event to ${agentId}:`, error);
      }
    }

    this.emit('events:replayed', agentId, topic, events.length);
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    totalEvents: number;
    totalSubscriptions: number;
    topicCount: number;
    subscriberCount: number;
    topicStats: Record<string, { events: number; subscribers: number }>;
  } {
    const topicStats: Record<string, { events: number; subscribers: number }> = {};
    
    // Count events by topic
    for (const event of this.eventHistory) {
      if (!topicStats[event.topic]) {
        topicStats[event.topic] = { events: 0, subscribers: 0 };
      }
      topicStats[event.topic].events++;
    }

    // Count subscribers by topic
    for (const [topic, subscribers] of this.subscriptions) {
      if (!topicStats[topic]) {
        topicStats[topic] = { events: 0, subscribers: 0 };
      }
      topicStats[topic].subscribers = subscribers.size;
    }

    const allSubscribers = new Set<string>();
    for (const subscribers of this.subscriptions.values()) {
      for (const agentId of subscribers.keys()) {
        allSubscribers.add(agentId);
      }
    }

    return {
      totalEvents: this.eventHistory.length,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce(
        (sum, subs) => sum + subs.size, 0
      ),
      topicCount: this.subscriptions.size,
      subscriberCount: allSubscribers.size,
      topicStats
    };
  }

  /**
   * Shutdown the event bus
   */
  async shutdown(): Promise<void> {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }

    if (this.persistenceEnabled) {
      await this.saveEventHistory();
    }

    this.subscriptions.clear();
    this.emit('shutdown');
  }

  private addToHistory(event: AgentEvent): void {
    this.eventHistory.push(event);

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      const overflow = this.eventHistory.length - this.maxHistorySize;
      this.eventHistory.splice(0, overflow);
    }
  }

  private async loadEventHistory(): Promise<void> {
    try {
      const data = await fs.readFile(this.historyFilePath, 'utf-8');
      const events: AgentEvent[] = JSON.parse(data);
      
      // Convert timestamp strings back to Date objects
      for (const event of events) {
        event.timestamp = new Date(event.timestamp);
      }
      
      this.eventHistory = events;
      console.log(`Loaded ${events.length} events from history file`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // File doesn't exist, start with empty history
    }
  }

  private async saveEventHistory(): Promise<void> {
    try {
      const data = JSON.stringify(this.eventHistory, null, 2);
      
      // Ensure directory exists
      const dir = path.dirname(this.historyFilePath);
      await fs.mkdir(dir, { recursive: true });
      
      await fs.writeFile(this.historyFilePath, data, 'utf-8');
    } catch (error) {
      console.error('Failed to save event history:', error);
      this.emit('save:error', error);
    }
  }

  /**
   * Create a standardized event
   */
  static createEvent(
    type: string,
    source: string,
    topic: string,
    data: any,
    id?: string
  ): Omit<AgentEvent, 'signature'> {
    return {
      id: id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      topic,
      data,
      timestamp: new Date()
    };
  }
}