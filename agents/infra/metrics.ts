/**
 * YUR Agent Framework - Prometheus/OpenTelemetry Metrics
 * Production-ready observability with metrics, traces, and logs integration
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as url from 'url';

// Basic metric types - in production, use @opentelemetry/api
export interface MetricValue {
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface Counter {
  inc(value?: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface Gauge {
  set(value: number, labels?: Record<string, string>): void;
  inc(value?: number, labels?: Record<string, string>): void;
  dec(value?: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): number;
}

export interface Histogram {
  observe(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): {
    count: number;
    sum: number;
    buckets: Map<number, number>;
  };
}

export interface Summary {
  observe(value: number, labels?: Record<string, string>): void;
  get(labels?: Record<string, string>): {
    count: number;
    sum: number;
    quantiles: Map<number, number>;
  };
}

export interface Trace {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  tags: Record<string, any>;
  logs: Array<{
    timestamp: Date;
    fields: Record<string, any>;
  }>;
  status: 'ok' | 'error' | 'timeout';
}

export interface MetricsConfig {
  serviceName: string;
  serviceVersion: string;
  namespace: string;
  metricsPort: number;
  enablePrometheus: boolean;
  enableOpenTelemetry: boolean;
  enableTracing: boolean;
  enableLogging: boolean;
  tracingSampleRate: number;
  exportInterval: number;
  histogramBuckets: number[];
  summaryQuantiles: number[];
  customLabels: Record<string, string>;
  jaegerEndpoint?: string;
  prometheusEndpoint: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface MetricDefinition {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  labels: string[];
}

class MetricImpl {
  protected values: Map<string, MetricValue> = new Map();
  
  constructor(
    public name: string,
    public help: string,
    public labels: string[] = []
  ) {}

  protected getLabelKey(labels: Record<string, string> = {}): string {
    return this.labels
      .map(label => `${label}="${labels[label] || ''}"`)
      .join(',');
  }

  protected getValue(labels: Record<string, string> = {}): MetricValue {
    const key = this.getLabelKey(labels);
    return this.values.get(key) || {
      value: 0,
      timestamp: new Date(),
      labels
    };
  }

  protected setValue(value: number, labels: Record<string, string> = {}): void {
    const key = this.getLabelKey(labels);
    this.values.set(key, {
      value,
      timestamp: new Date(),
      labels
    });
  }

  getAllValues(): Map<string, MetricValue> {
    return new Map(this.values);
  }
}

class CounterImpl extends MetricImpl implements Counter {
  inc(value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getValue(labels);
    this.setValue(current.value + Math.abs(value), labels);
  }

  get(labels: Record<string, string> = {}): number {
    return this.getValue(labels).value;
  }
}

class GaugeImpl extends MetricImpl implements Gauge {
  set(value: number, labels: Record<string, string> = {}): void {
    this.setValue(value, labels);
  }

  inc(value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getValue(labels);
    this.setValue(current.value + value, labels);
  }

  dec(value: number = 1, labels: Record<string, string> = {}): void {
    const current = this.getValue(labels);
    this.setValue(current.value - value, labels);
  }

  get(labels: Record<string, string> = {}): number {
    return this.getValue(labels).value;
  }
}

class HistogramImpl extends MetricImpl implements Histogram {
  private buckets: number[];
  private observations: Map<string, number[]> = new Map();

  constructor(name: string, help: string, labels: string[] = [], buckets: number[] = []) {
    super(name, help, labels);
    this.buckets = buckets.length > 0 ? buckets : [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.getLabelKey(labels);
    
    if (!this.observations.has(key)) {
      this.observations.set(key, []);
    }
    
    this.observations.get(key)!.push(value);
    
    // Update count and sum
    const current = this.getValue(labels);
    this.setValue(current.value + 1, labels);
  }

  get(labels: Record<string, string> = {}): {
    count: number;
    sum: number;
    buckets: Map<number, number>;
  } {
    const key = this.getLabelKey(labels);
    const observations = this.observations.get(key) || [];
    
    const buckets = new Map<number, number>();
    for (const bucket of this.buckets) {
      buckets.set(bucket, observations.filter(obs => obs <= bucket).length);
    }
    
    return {
      count: observations.length,
      sum: observations.reduce((sum, obs) => sum + obs, 0),
      buckets
    };
  }
}

class SummaryImpl extends MetricImpl implements Summary {
  private quantiles: number[];
  private observations: Map<string, number[]> = new Map();

  constructor(name: string, help: string, labels: string[] = [], quantiles: number[] = []) {
    super(name, help, labels);
    this.quantiles = quantiles.length > 0 ? quantiles : [0.5, 0.9, 0.95, 0.99];
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.getLabelKey(labels);
    
    if (!this.observations.has(key)) {
      this.observations.set(key, []);
    }
    
    this.observations.get(key)!.push(value);
    
    // Update count
    const current = this.getValue(labels);
    this.setValue(current.value + 1, labels);
  }

  get(labels: Record<string, string> = {}): {
    count: number;
    sum: number;
    quantiles: Map<number, number>;
  } {
    const key = this.getLabelKey(labels);
    const observations = this.observations.get(key) || [];
    const sorted = [...observations].sort((a, b) => a - b);
    
    const quantiles = new Map<number, number>();
    for (const quantile of this.quantiles) {
      const index = Math.ceil(quantile * sorted.length) - 1;
      quantiles.set(quantile, sorted[Math.max(0, index)] || 0);
    }
    
    return {
      count: observations.length,
      sum: observations.reduce((sum, obs) => sum + obs, 0),
      quantiles
    };
  }
}

class TracingSpan {
  private span: Trace;
  private childSpans: TracingSpan[] = [];

  constructor(
    operationName: string,
    parentSpan?: TracingSpan,
    tags: Record<string, any> = {}
  ) {
    this.span = {
      traceId: parentSpan?.span.traceId || this.generateTraceId(),
      spanId: this.generateSpanId(),
      parentSpanId: parentSpan?.span.spanId,
      operationName,
      startTime: new Date(),
      tags,
      logs: [],
      status: 'ok'
    };

    if (parentSpan) {
      parentSpan.childSpans.push(this);
    }
  }

  setTag(key: string, value: any): TracingSpan {
    this.span.tags[key] = value;
    return this;
  }

  setStatus(status: 'ok' | 'error' | 'timeout'): TracingSpan {
    this.span.status = status;
    return this;
  }

  log(fields: Record<string, any>): TracingSpan {
    this.span.logs.push({
      timestamp: new Date(),
      fields
    });
    return this;
  }

  finish(): void {
    this.span.endTime = new Date();
    this.span.duration = this.span.endTime.getTime() - this.span.startTime.getTime();
  }

  getTrace(): Trace {
    return { ...this.span };
  }

  createChildSpan(operationName: string, tags: Record<string, any> = {}): TracingSpan {
    return new TracingSpan(operationName, this, tags);
  }

  private generateTraceId(): string {
    return Math.random().toString(16).substr(2, 16);
  }

  private generateSpanId(): string {
    return Math.random().toString(16).substr(2, 8);
  }
}

export class MetricsCollector extends EventEmitter {
  private config: MetricsConfig;
  private metrics: Map<string, MetricImpl> = new Map();
  private traces: Map<string, Trace> = new Map();
  private httpServer?: http.Server;
  private exportInterval?: NodeJS.Timeout;
  private running: boolean = false;

  // Built-in framework metrics
  private agentRegistrations: Counter;
  private agentHeartbeats: Counter;
  private eventPublications: Counter;
  private policyEvaluations: Counter;
  private secretAccesses: Counter;
  private flowExecutions: Counter;
  private httpRequests: Counter;
  private httpRequestDuration: Histogram;
  private activeConnections: Gauge;
  private memoryUsage: Gauge;
  private cpuUsage: Gauge;
  private errorCount: Counter;

  constructor(config: Partial<MetricsConfig> = {}) {
    super();
    
    this.config = {
      serviceName: config.serviceName || 'yur-agent-framework',
      serviceVersion: config.serviceVersion || '1.0.0',
      namespace: config.namespace || 'yur',
      metricsPort: config.metricsPort || 9090,
      enablePrometheus: config.enablePrometheus ?? true,
      enableOpenTelemetry: config.enableOpenTelemetry ?? true,
      enableTracing: config.enableTracing ?? true,
      enableLogging: config.enableLogging ?? true,
      tracingSampleRate: config.tracingSampleRate || 0.1,
      exportInterval: config.exportInterval || 15000,
      histogramBuckets: config.histogramBuckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      summaryQuantiles: config.summaryQuantiles || [0.5, 0.9, 0.95, 0.99],
      customLabels: config.customLabels || {},
      prometheusEndpoint: config.prometheusEndpoint || '/metrics',
      logLevel: config.logLevel || 'info'
    };

    this.initializeBuiltinMetrics();
  }

  /**
   * Start the metrics collector
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Metrics collector is already running');
    }

    try {
      if (this.config.enablePrometheus) {
        await this.startPrometheusServer();
      }

      if (this.config.enableOpenTelemetry) {
        this.startPeriodicExport();
      }

      this.startSystemMetricsCollection();
      
      this.running = true;
      this.emit('metrics:started');
      
      console.log(`Metrics collector started on port ${this.config.metricsPort}`);
    } catch (error) {
      this.emit('metrics:error', error);
      throw error;
    }
  }

  /**
   * Stop the metrics collector
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer!.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }

      if (this.exportInterval) {
        clearInterval(this.exportInterval);
        this.exportInterval = undefined;
      }

      this.running = false;
      this.emit('metrics:stopped');
      
      console.log('Metrics collector stopped');
    } catch (error) {
      this.emit('metrics:error', error);
    }
  }

  /**
   * Create a counter metric
   */
  createCounter(name: string, help: string, labels: string[] = []): Counter {
    const fullName = this.getMetricName(name);
    const counter = new CounterImpl(fullName, help, labels);
    this.metrics.set(fullName, counter);
    return counter;
  }

  /**
   * Create a gauge metric
   */
  createGauge(name: string, help: string, labels: string[] = []): Gauge {
    const fullName = this.getMetricName(name);
    const gauge = new GaugeImpl(fullName, help, labels);
    this.metrics.set(fullName, gauge);
    return gauge;
  }

  /**
   * Create a histogram metric
   */
  createHistogram(name: string, help: string, labels: string[] = [], buckets?: number[]): Histogram {
    const fullName = this.getMetricName(name);
    const histogram = new HistogramImpl(
      fullName, 
      help, 
      labels, 
      buckets || this.config.histogramBuckets
    );
    this.metrics.set(fullName, histogram);
    return histogram;
  }

  /**
   * Create a summary metric
   */
  createSummary(name: string, help: string, labels: string[] = [], quantiles?: number[]): Summary {
    const fullName = this.getMetricName(name);
    const summary = new SummaryImpl(
      fullName, 
      help, 
      labels, 
      quantiles || this.config.summaryQuantiles
    );
    this.metrics.set(fullName, summary);
    return summary;
  }

  /**
   * Start a trace span
   */
  startSpan(operationName: string, tags: Record<string, any> = {}): TracingSpan {
    if (!this.config.enableTracing) {
      return new TracingSpan(operationName, undefined, tags);
    }

    // Apply sampling
    if (Math.random() > this.config.tracingSampleRate) {
      return new TracingSpan(operationName, undefined, tags);
    }

    const span = new TracingSpan(operationName, undefined, {
      'service.name': this.config.serviceName,
      'service.version': this.config.serviceVersion,
      ...tags
    });

    return span;
  }

  /**
   * Record a trace
   */
  recordTrace(trace: Trace): void {
    this.traces.set(trace.traceId, trace);
    this.emit('trace:recorded', trace);
  }

  /**
   * Get built-in metrics for framework components
   */
  getBuiltinMetrics(): {
    agentRegistrations: Counter;
    agentHeartbeats: Counter;
    eventPublications: Counter;
    policyEvaluations: Counter;
    secretAccesses: Counter;
    flowExecutions: Counter;
    httpRequests: Counter;
    httpRequestDuration: Histogram;
    activeConnections: Gauge;
    memoryUsage: Gauge;
    cpuUsage: Gauge;
    errorCount: Counter;
  } {
    return {
      agentRegistrations: this.agentRegistrations,
      agentHeartbeats: this.agentHeartbeats,
      eventPublications: this.eventPublications,
      policyEvaluations: this.policyEvaluations,
      secretAccesses: this.secretAccesses,
      flowExecutions: this.flowExecutions,
      httpRequests: this.httpRequests,
      httpRequestDuration: this.httpRequestDuration,
      activeConnections: this.activeConnections,
      memoryUsage: this.memoryUsage,
      cpuUsage: this.cpuUsage,
      errorCount: this.errorCount
    };
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const lines: string[] = [];
    
    for (const [name, metric] of this.metrics) {
      const values = metric.getAllValues();
      
      if (values.size === 0) {
        continue;
      }

      // Add help comment
      lines.push(`# HELP ${name} ${metric.help}`);
      
      // Add type comment
      let type = 'gauge';
      if (metric instanceof CounterImpl) type = 'counter';
      else if (metric instanceof HistogramImpl) type = 'histogram';
      else if (metric instanceof SummaryImpl) type = 'summary';
      
      lines.push(`# TYPE ${name} ${type}`);

      if (metric instanceof HistogramImpl) {
        // Export histogram
        for (const [labelKey, metricValue] of values) {
          const histogramData = (metric as HistogramImpl).get(metricValue.labels);
          const labelStr = labelKey ? `{${labelKey}}` : '';
          
          // Export buckets
          for (const [bucket, count] of histogramData.buckets) {
            const bucketLabelStr = labelKey 
              ? `{${labelKey},le="${bucket}"}` 
              : `{le="${bucket}"}`;
            lines.push(`${name}_bucket${bucketLabelStr} ${count}`);
          }
          
          // Export +Inf bucket
          const infLabelStr = labelKey 
            ? `{${labelKey},le="+Inf"}` 
            : `{le="+Inf"}`;
          lines.push(`${name}_bucket${infLabelStr} ${histogramData.count}`);
          
          // Export count and sum
          lines.push(`${name}_count${labelStr} ${histogramData.count}`);
          lines.push(`${name}_sum${labelStr} ${histogramData.sum}`);
        }
      } else if (metric instanceof SummaryImpl) {
        // Export summary
        for (const [labelKey, metricValue] of values) {
          const summaryData = (metric as SummaryImpl).get(metricValue.labels);
          const labelStr = labelKey ? `{${labelKey}}` : '';
          
          // Export quantiles
          for (const [quantile, value] of summaryData.quantiles) {
            const quantileLabelStr = labelKey 
              ? `{${labelKey},quantile="${quantile}"}` 
              : `{quantile="${quantile}"}`;
            lines.push(`${name}${quantileLabelStr} ${value}`);
          }
          
          // Export count and sum
          lines.push(`${name}_count${labelStr} ${summaryData.count}`);
          lines.push(`${name}_sum${labelStr} ${summaryData.sum}`);
        }
      } else {
        // Export counter or gauge
        for (const [labelKey, metricValue] of values) {
          const labelStr = labelKey ? `{${labelKey}}` : '';
          lines.push(`${name}${labelStr} ${metricValue.value} ${metricValue.timestamp.getTime()}`);
        }
      }
      
      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Export traces in Jaeger format
   */
  exportTraces(): Trace[] {
    return Array.from(this.traces.values());
  }

  /**
   * Get collector statistics
   */
  getStats(): {
    metricsCount: number;
    tracesCount: number;
    memoryUsage: NodeJS.MemoryUsage;
    uptime: number;
  } {
    return {
      metricsCount: this.metrics.size,
      tracesCount: this.traces.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Record custom event for debugging
   */
  recordEvent(
    eventType: string, 
    data: any, 
    tags: Record<string, string> = {}
  ): void {
    if (this.config.enableLogging) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        service: this.config.serviceName,
        event: eventType,
        data,
        tags: { ...this.config.customLabels, ...tags }
      };
      
      console.log(JSON.stringify(logEntry));
      this.emit('event:recorded', logEntry);
    }
  }

  private initializeBuiltinMetrics(): void {
    // Agent framework metrics
    this.agentRegistrations = this.createCounter(
      'agent_registrations_total',
      'Total number of agent registrations',
      ['agent_type', 'status']
    );

    this.agentHeartbeats = this.createCounter(
      'agent_heartbeats_total',
      'Total number of agent heartbeats',
      ['agent_id', 'agent_type']
    );

    this.eventPublications = this.createCounter(
      'event_publications_total',
      'Total number of events published',
      ['topic', 'event_type', 'producer_id']
    );

    this.policyEvaluations = this.createCounter(
      'policy_evaluations_total',
      'Total number of policy evaluations',
      ['policy_package', 'decision', 'cached']
    );

    this.secretAccesses = this.createCounter(
      'secret_accesses_total',
      'Total number of secret access attempts',
      ['secret_id', 'agent_id', 'status']
    );

    this.flowExecutions = this.createCounter(
      'flow_executions_total',
      'Total number of flow executions',
      ['flow_id', 'status']
    );

    // HTTP metrics
    this.httpRequests = this.createCounter(
      'http_requests_total',
      'Total number of HTTP requests',
      ['method', 'status_code', 'endpoint']
    );

    this.httpRequestDuration = this.createHistogram(
      'http_request_duration_seconds',
      'HTTP request duration in seconds',
      ['method', 'status_code', 'endpoint']
    );

    // Resource metrics
    this.activeConnections = this.createGauge(
      'active_connections',
      'Number of active connections'
    );

    this.memoryUsage = this.createGauge(
      'memory_usage_bytes',
      'Memory usage in bytes',
      ['type']
    );

    this.cpuUsage = this.createGauge(
      'cpu_usage_percent',
      'CPU usage percentage'
    );

    this.errorCount = this.createCounter(
      'errors_total',
      'Total number of errors',
      ['component', 'error_type']
    );
  }

  private getMetricName(name: string): string {
    return this.config.namespace ? `${this.config.namespace}_${name}` : name;
  }

  private async startPrometheusServer(): Promise<void> {
    this.httpServer = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || '', true);
      
      if (parsedUrl.pathname === this.config.prometheusEndpoint) {
        try {
          const metrics = this.exportPrometheusMetrics();
          
          res.writeHead(200, {
            'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
            'Content-Length': Buffer.byteLength(metrics)
          });
          res.end(metrics);
          
          this.httpRequests.inc(1, {
            method: req.method || 'GET',
            status_code: '200',
            endpoint: this.config.prometheusEndpoint
          });
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          
          this.httpRequests.inc(1, {
            method: req.method || 'GET',
            status_code: '500',
            endpoint: this.config.prometheusEndpoint
          });
          
          this.errorCount.inc(1, {
            component: 'metrics_server',
            error_type: 'export_error'
          });
        }
      } else if (parsedUrl.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
        
        this.httpRequests.inc(1, {
          method: req.method || 'GET',
          status_code: '200',
          endpoint: '/health'
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        
        this.httpRequests.inc(1, {
          method: req.method || 'GET',
          status_code: '404',
          endpoint: parsedUrl.pathname || 'unknown'
        });
      }
    });

    return new Promise((resolve, reject) => {
      this.httpServer!.listen(this.config.metricsPort, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private startPeriodicExport(): void {
    this.exportInterval = setInterval(() => {
      try {
        // In production, export to OpenTelemetry collector
        const traces = this.exportTraces();
        
        if (traces.length > 0) {
          this.emit('traces:exported', traces);
          
          // Clear old traces to prevent memory leaks
          const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour
          for (const [traceId, trace] of this.traces) {
            if (trace.startTime.getTime() < cutoffTime) {
              this.traces.delete(traceId);
            }
          }
        }
      } catch (error) {
        this.errorCount.inc(1, {
          component: 'metrics_exporter',
          error_type: 'export_error'
        });
        
        console.error('Metrics export error:', error);
      }
    }, this.config.exportInterval);
  }

  private startSystemMetricsCollection(): void {
    setInterval(() => {
      try {
        // Memory metrics
        const memUsage = process.memoryUsage();
        this.memoryUsage.set(memUsage.rss, { type: 'rss' });
        this.memoryUsage.set(memUsage.heapUsed, { type: 'heap_used' });
        this.memoryUsage.set(memUsage.heapTotal, { type: 'heap_total' });
        this.memoryUsage.set(memUsage.external, { type: 'external' });

        // CPU usage (approximation)
        const cpuUsage = process.cpuUsage();
        const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
        this.cpuUsage.set(totalUsage);

      } catch (error) {
        this.errorCount.inc(1, {
          component: 'system_metrics',
          error_type: 'collection_error'
        });
      }
    }, 10000); // Collect every 10 seconds
  }
}

// Utility functions for common patterns
export function timing<T>(
  collector: MetricsCollector,
  operationName: string,
  operation: () => Promise<T>,
  tags: Record<string, any> = {}
): Promise<T> {
  const span = collector.startSpan(operationName, tags);
  const startTime = Date.now();

  return operation()
    .then(result => {
      span.setStatus('ok').finish();
      collector.recordTrace(span.getTrace());
      return result;
    })
    .catch(error => {
      span.setStatus('error')
        .setTag('error', true)
        .setTag('error.message', error.message)
        .finish();
      collector.recordTrace(span.getTrace());
      throw error;
    });
}

export function withMetrics<T extends any[], R>(
  collector: MetricsCollector,
  counter: Counter,
  histogram: Histogram,
  operationName: string,
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now();
    const span = collector.startSpan(operationName);

    try {
      const result = await fn(...args);
      
      const duration = (Date.now() - startTime) / 1000;
      counter.inc(1, { status: 'success' });
      histogram.observe(duration, { status: 'success' });
      
      span.setStatus('ok').finish();
      collector.recordTrace(span.getTrace());
      
      return result;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      counter.inc(1, { status: 'error' });
      histogram.observe(duration, { status: 'error' });
      
      span.setStatus('error')
        .setTag('error', true)
        .setTag('error.message', error instanceof Error ? error.message : 'Unknown error')
        .finish();
      collector.recordTrace(span.getTrace());
      
      throw error;
    }
  };
}