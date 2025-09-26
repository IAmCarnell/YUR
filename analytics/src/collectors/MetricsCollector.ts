/**
 * Advanced Metrics Collection System for YUR Framework
 * Collects usage metrics, performance data, and user analytics
 */

import { EventEmitter } from 'events';

export interface MetricData {
  id: string;
  timestamp: number;
  category: 'performance' | 'usage' | 'error' | 'user_interaction' | 'system';
  name: string;
  value: number | string | boolean | object;
  tags: Record<string, string>;
  sessionId: string;
  userId?: string;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  memory?: number;
  cpu?: number;
  network?: number;
}

export interface UserInteractionMetric {
  action: string;
  component: string;
  timestamp: number;
  position?: { x: number; y: number };
  metadata?: Record<string, any>;
}

export interface ErrorMetric {
  error: string;
  stack: string;
  timestamp: number;
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userAgent?: string;
  url?: string;
}

export class MetricsCollector extends EventEmitter {
  private sessionId: string;
  private userId?: string;
  private buffer: MetricData[] = [];
  private batchSize: number = 50;
  private flushInterval: number = 30000; // 30 seconds
  private endpoint: string = '/api/metrics';
  private enabled: boolean = true;
  private performanceObserver?: PerformanceObserver;

  constructor(config: {
    sessionId?: string;
    userId?: string;
    batchSize?: number;
    flushInterval?: number;
    endpoint?: string;
    enabled?: boolean;
  } = {}) {
    super();
    
    this.sessionId = config.sessionId || this.generateSessionId();
    this.userId = config.userId;
    this.batchSize = config.batchSize || 50;
    this.flushInterval = config.flushInterval || 30000;
    this.endpoint = config.endpoint || '/api/metrics';
    this.enabled = config.enabled !== false;

    if (this.enabled) {
      this.setupPerformanceObserver();
      this.setupErrorHandler();
      this.setupAutoFlush();
      this.setupPageVisibilityHandler();
    }
  }

  // Core metric collection methods
  collectMetric(data: Omit<MetricData, 'id' | 'timestamp' | 'sessionId'>): void {
    if (!this.enabled) return;

    const metric: MetricData = {
      id: this.generateId(),
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      ...data
    };

    this.buffer.push(metric);
    this.emit('metric_collected', metric);

    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  // Performance metrics
  trackPerformance(name: string, fn: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();

    return fn().then(result => {
      const endTime = performance.now();
      const endMemory = this.getMemoryUsage();

      this.collectMetric({
        category: 'performance',
        name,
        value: {
          duration: endTime - startTime,
          memoryDelta: endMemory - startMemory,
          success: true
        },
        tags: { type: 'function_execution' }
      });

      return result;
    }).catch(error => {
      const endTime = performance.now();
      
      this.collectMetric({
        category: 'performance',
        name,
        value: {
          duration: endTime - startTime,
          success: false,
          error: error.message
        },
        tags: { type: 'function_execution', error: 'true' }
      });

      throw error;
    });
  }

  // User interaction tracking
  trackUserInteraction(interaction: UserInteractionMetric): void {
    this.collectMetric({
      category: 'user_interaction',
      name: `${interaction.component}_${interaction.action}`,
      value: {
        action: interaction.action,
        component: interaction.component,
        position: interaction.position,
        metadata: interaction.metadata
      },
      tags: {
        component: interaction.component,
        action: interaction.action
      }
    });
  }

  // Error tracking
  trackError(error: ErrorMetric): void {
    this.collectMetric({
      category: 'error',
      name: 'application_error',
      value: {
        error: error.error,
        stack: error.stack,
        component: error.component,
        severity: error.severity,
        userAgent: error.userAgent || navigator.userAgent,
        url: error.url || window.location.href
      },
      tags: {
        severity: error.severity,
        component: error.component
      }
    });

    // Emit high-priority errors immediately
    if (error.severity === 'critical' || error.severity === 'high') {
      this.flush();
    }
  }

  // System metrics
  trackSystemMetric(name: string, value: number | string, tags: Record<string, string> = {}): void {
    this.collectMetric({
      category: 'system',
      name,
      value,
      tags: { ...tags, type: 'system_metric' }
    });
  }

  // Usage metrics
  trackUsage(feature: string, metadata: Record<string, any> = {}): void {
    this.collectMetric({
      category: 'usage',
      name: `feature_used_${feature}`,
      value: {
        feature,
        metadata,
        timestamp: Date.now()
      },
      tags: {
        feature,
        type: 'feature_usage'
      }
    });
  }

  // Custom Web Vitals tracking
  trackWebVitals(): void {
    if (typeof window === 'undefined') return;

    // Largest Contentful Paint
    this.observePerformanceEntry('largest-contentful-paint', (entries) => {
      const lcpEntry = entries[entries.length - 1];
      this.collectMetric({
        category: 'performance',
        name: 'largest_contentful_paint',
        value: lcpEntry.startTime,
        tags: { type: 'web_vital' }
      });
    });

    // First Input Delay
    this.observePerformanceEntry('first-input', (entries) => {
      const fidEntry = entries[0];
      this.collectMetric({
        category: 'performance',
        name: 'first_input_delay',
        value: fidEntry.processingStart - fidEntry.startTime,
        tags: { type: 'web_vital' }
      });
    });

    // Cumulative Layout Shift
    this.observePerformanceEntry('layout-shift', (entries) => {
      let cumulativeScore = 0;
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      });
      
      this.collectMetric({
        category: 'performance',
        name: 'cumulative_layout_shift',
        value: cumulativeScore,
        tags: { type: 'web_vital' }
      });
    });
  }

  // Resource timing
  trackResourceTiming(): void {
    const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    entries.forEach(entry => {
      this.collectMetric({
        category: 'performance',
        name: 'resource_timing',
        value: {
          name: entry.name,
          duration: entry.duration,
          size: entry.transferSize,
          type: this.getResourceType(entry.name)
        },
        tags: {
          type: 'resource_timing',
          resource_type: this.getResourceType(entry.name)
        }
      });
    });
  }

  // Page performance
  trackPagePerformance(): void {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstByte: navigation.responseStart - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        domComplete: navigation.domComplete - navigation.navigationStart
      };

      Object.entries(metrics).forEach(([name, value]) => {
        this.collectMetric({
          category: 'performance',
          name: `page_${name}`,
          value,
          tags: { type: 'page_timing' }
        });
      });
    }
  }

  // Scientific computation metrics
  trackScientificComputation(config: {
    type: 'DESI' | 'Bell' | 'AI' | 'Tree';
    dimensions: number;
    duration: number;
    success: boolean;
    result?: any;
    error?: string;
  }): void {
    this.collectMetric({
      category: 'usage',
      name: 'scientific_computation',
      value: {
        type: config.type,
        dimensions: config.dimensions,
        duration: config.duration,
        success: config.success,
        result: config.success ? 'computed' : config.error
      },
      tags: {
        computation_type: config.type,
        success: config.success.toString(),
        dimensions_range: this.getDimensionsRange(config.dimensions)
      }
    });
  }

  // Spatial interaction metrics
  trackSpatialInteraction(config: {
    action: 'navigate' | 'zoom' | 'rotate' | 'select';
    component: string;
    position: { x: number; y: number; z: number };
    duration?: number;
  }): void {
    this.collectMetric({
      category: 'user_interaction',
      name: 'spatial_interaction',
      value: {
        action: config.action,
        component: config.component,
        position: config.position,
        duration: config.duration
      },
      tags: {
        action: config.action,
        component: config.component,
        type: 'spatial'
      }
    });
  }

  // XR metrics
  trackXRSession(config: {
    mode: 'vr' | 'ar';
    duration: number;
    features: string[];
    performance: {
      frameRate: number;
      droppedFrames: number;
      latency: number;
    };
  }): void {
    this.collectMetric({
      category: 'usage',
      name: 'xr_session',
      value: {
        mode: config.mode,
        duration: config.duration,
        features: config.features,
        performance: config.performance
      },
      tags: {
        xr_mode: config.mode,
        features_count: config.features.length.toString(),
        type: 'xr_session'
      }
    });
  }

  // Plugin metrics
  trackPluginActivity(config: {
    pluginId: string;
    action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'error';
    duration?: number;
    error?: string;
  }): void {
    this.collectMetric({
      category: 'usage',
      name: 'plugin_activity',
      value: {
        pluginId: config.pluginId,
        action: config.action,
        duration: config.duration,
        error: config.error
      },
      tags: {
        plugin_id: config.pluginId,
        action: config.action,
        type: 'plugin_activity'
      }
    });
  }

  // Agent framework metrics
  trackAgentActivity(config: {
    agentId: string;
    action: 'create' | 'execute' | 'pause' | 'resume' | 'error';
    duration?: number;
    taskType?: string;
    success?: boolean;
  }): void {
    this.collectMetric({
      category: 'usage',
      name: 'agent_activity',
      value: {
        agentId: config.agentId,
        action: config.action,
        duration: config.duration,
        taskType: config.taskType,
        success: config.success
      },
      tags: {
        agent_id: config.agentId,
        action: config.action,
        task_type: config.taskType || 'unknown',
        type: 'agent_activity'
      }
    });
  }

  // Data management
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const batch = [...this.buffer];
    this.buffer = [];

    try {
      await this.sendMetrics(batch);
      this.emit('metrics_sent', batch.length);
    } catch (error) {
      console.error('Failed to send metrics:', error);
      // Put failed metrics back in buffer for retry
      this.buffer.unshift(...batch);
      this.emit('metrics_send_error', error);
    }
  }

  private async sendMetrics(metrics: MetricData[]): Promise<void> {
    if (typeof fetch === 'undefined') {
      // Node.js environment - use different transport
      return this.sendMetricsNode(metrics);
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: this.sessionId,
        userId: this.userId,
        metrics,
        timestamp: Date.now()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private async sendMetricsNode(metrics: MetricData[]): Promise<void> {
    // In a real implementation, this would use Node.js HTTP client
    console.log('Metrics collected (Node.js):', metrics.length);
  }

  // Utility methods
  private setupPerformanceObserver(): void {
    if (typeof PerformanceObserver === 'undefined') return;

    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.collectMetric({
          category: 'performance',
          name: `performance_${entry.entryType}`,
          value: {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime
          },
          tags: {
            type: 'performance_observer',
            entry_type: entry.entryType
          }
        });
      });
    });

    try {
      this.performanceObserver.observe({ 
        entryTypes: ['measure', 'navigation', 'resource'] 
      });
    } catch (error) {
      console.warn('Performance observer setup failed:', error);
    }
  }

  private setupErrorHandler(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.trackError({
        error: event.error.message || event.message,
        stack: event.error.stack || '',
        timestamp: Date.now(),
        component: 'global',
        severity: 'high',
        url: event.filename
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        error: event.reason.message || 'Unhandled Promise Rejection',
        stack: event.reason.stack || '',
        timestamp: Date.now(),
        component: 'global',
        severity: 'high'
      });
    });
  }

  private setupAutoFlush(): void {
    setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  private setupPageVisibilityHandler(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Flush metrics before page becomes hidden
        this.flush();
      }
    });

    window.addEventListener('beforeunload', () => {
      // Try to send metrics before page unload
      if (this.buffer.length > 0) {
        navigator.sendBeacon(this.endpoint, JSON.stringify({
          sessionId: this.sessionId,
          userId: this.userId,
          metrics: this.buffer,
          timestamp: Date.now()
        }));
      }
    });
  }

  private observePerformanceEntry(entryType: string, callback: (entries: any[]) => void): void {
    if (typeof PerformanceObserver === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      callback(list.getEntries());
    });

    try {
      observer.observe({ entryTypes: [entryType] });
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage(): number {
    return (performance as any).memory?.usedJSHeapSize || 0;
  }

  private getResourceType(url: string): string {
    const extension = url.split('.').pop() || '';
    if (['js', 'ts', 'jsx', 'tsx'].includes(extension)) return 'script';
    if (['css', 'scss', 'less'].includes(extension)) return 'stylesheet';
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(extension)) return 'image';
    if (['woff', 'woff2', 'ttf', 'otf'].includes(extension)) return 'font';
    if (['json', 'xml'].includes(extension)) return 'data';
    return 'other';
  }

  private getDimensionsRange(dimensions: number): string {
    if (dimensions <= 100) return '0-100';
    if (dimensions <= 500) return '101-500';
    if (dimensions <= 1000) return '501-1000';
    if (dimensions <= 5000) return '1001-5000';
    return '5000+';
  }

  // Public API for configuration
  setUserId(userId: string): void {
    this.userId = userId;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getBufferSize(): number {
    return this.buffer.length;
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  destroy(): void {
    this.flush();
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    this.removeAllListeners();
  }
}