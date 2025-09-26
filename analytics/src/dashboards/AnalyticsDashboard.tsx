/**
 * Advanced Analytics Dashboard for YUR Framework
 * Real-time metrics visualization and monitoring
 */

import React, { useState, useEffect, useRef } from 'react';
import { MetricsCollector, MetricData } from '../collectors/MetricsCollector';

interface DashboardProps {
  metricsCollector: MetricsCollector;
  refreshInterval?: number;
  theme?: 'light' | 'dark';
}

interface MetricsSummary {
  performance: {
    averageResponseTime: number;
    totalErrors: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  usage: {
    activeUsers: number;
    featuresUsed: Record<string, number>;
    sessionDuration: number;
    pageViews: number;
  };
  interactions: {
    totalInteractions: number;
    topComponents: Array<{ name: string; count: number }>;
    spatialInteractions: number;
    xrSessions: number;
  };
  system: {
    pluginsActive: number;
    agentsRunning: number;
    uptime: number;
    healthScore: number;
  };
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
    fill?: boolean;
  }>;
}

export const AnalyticsDashboard: React.FC<DashboardProps> = ({
  metricsCollector,
  refreshInterval = 5000,
  theme = 'dark'
}) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'usage' | 'realtime'>('overview');
  const [isConnected, setIsConnected] = useState(true);
  const [chartData, setChartData] = useState<Record<string, ChartData>>({});
  
  const wsRef = useRef<WebSocket | null>(null);
  const chartRefs = useRef<Record<string, HTMLCanvasElement>>({});

  useEffect(() => {
    setupRealTimeConnection();
    setupMetricsListener();
    
    const interval = setInterval(() => {
      updateMetrics();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const setupRealTimeConnection = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:8080/analytics');
      
      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Analytics WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleRealTimeMetric(data);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Analytics WebSocket disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(setupRealTimeConnection, 5000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const setupMetricsListener = () => {
    metricsCollector.on('metric_collected', (metric: MetricData) => {
      setMetrics(prev => [...prev.slice(-999), metric]); // Keep last 1000 metrics
    });
  };

  const handleRealTimeMetric = (metric: MetricData) => {
    setMetrics(prev => [...prev.slice(-999), metric]);
    updateChartData(metric);
  };

  const updateMetrics = async () => {
    try {
      // In a real implementation, this would fetch from the metrics API
      const mockSummary: MetricsSummary = {
        performance: {
          averageResponseTime: Math.random() * 100 + 50,
          totalErrors: Math.floor(Math.random() * 10),
          memoryUsage: Math.random() * 100,
          cpuUsage: Math.random() * 100
        },
        usage: {
          activeUsers: Math.floor(Math.random() * 1000) + 100,
          featuresUsed: {
            'Scientific Computing': Math.floor(Math.random() * 50) + 10,
            'Spatial Navigation': Math.floor(Math.random() * 100) + 20,
            'XR Experience': Math.floor(Math.random() * 30) + 5,
            'Plugin System': Math.floor(Math.random() * 40) + 15
          },
          sessionDuration: Math.random() * 3600000 + 300000, // 5-65 minutes
          pageViews: Math.floor(Math.random() * 1000) + 500
        },
        interactions: {
          totalInteractions: Math.floor(Math.random() * 5000) + 1000,
          topComponents: [
            { name: 'Mandala Dock', count: Math.floor(Math.random() * 200) + 100 },
            { name: 'Scientific Viz', count: Math.floor(Math.random() * 150) + 75 },
            { name: 'Agent Panel', count: Math.floor(Math.random() * 100) + 50 },
            { name: 'Plugin Manager', count: Math.floor(Math.random() * 80) + 40 }
          ],
          spatialInteractions: Math.floor(Math.random() * 500) + 100,
          xrSessions: Math.floor(Math.random() * 50) + 10
        },
        system: {
          pluginsActive: Math.floor(Math.random() * 20) + 5,
          agentsRunning: Math.floor(Math.random() * 10) + 2,
          uptime: Date.now() - (Math.random() * 86400000), // Up to 24 hours
          healthScore: Math.random() * 20 + 80 // 80-100%
        }
      };
      
      setSummary(mockSummary);
    } catch (error) {
      console.error('Failed to update metrics:', error);
    }
  };

  const updateChartData = (metric: MetricData) => {
    if (metric.category === 'performance') {
      setChartData(prev => ({
        ...prev,
        performance: {
          labels: [...(prev.performance?.labels || []).slice(-19), new Date().toLocaleTimeString()],
          datasets: [{
            label: 'Response Time',
            data: [...(prev.performance?.datasets[0]?.data || []).slice(-19), typeof metric.value === 'object' ? (metric.value as any).duration || 0 : Number(metric.value)],
            color: '#4facfe',
            fill: true
          }]
        }
      }));
    }
  };

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const renderOverviewTab = () => (
    <div className="overview-grid">
      {/* Key Performance Indicators */}
      <div className="kpi-section">
        <h3>Key Performance Indicators</h3>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-value">{summary?.performance.averageResponseTime.toFixed(0)}ms</div>
            <div className="kpi-label">Avg Response Time</div>
            <div className={`kpi-trend ${summary?.performance.averageResponseTime < 100 ? 'positive' : 'negative'}`}>
              {summary?.performance.averageResponseTime < 100 ? '↗' : '↘'} 
              {Math.abs(Math.random() * 10).toFixed(1)}%
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-value">{formatNumber(summary?.usage.activeUsers || 0)}</div>
            <div className="kpi-label">Active Users</div>
            <div className="kpi-trend positive">↗ {(Math.random() * 20 + 5).toFixed(1)}%</div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-value">{summary?.performance.totalErrors}</div>
            <div className="kpi-label">Total Errors</div>
            <div className={`kpi-trend ${(summary?.performance.totalErrors || 0) < 5 ? 'positive' : 'negative'}`}>
              {(summary?.performance.totalErrors || 0) < 5 ? '↘' : '↗'} 
              {Math.abs(Math.random() * 5).toFixed(0)}
            </div>
          </div>
          
          <div className="kpi-card">
            <div className="kpi-value">{summary?.system.healthScore.toFixed(0)}%</div>
            <div className="kpi-label">System Health</div>
            <div className="kpi-trend positive">↗ {(Math.random() * 5).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="feature-usage">
        <h3>Feature Usage</h3>
        <div className="usage-bars">
          {Object.entries(summary?.usage.featuresUsed || {}).map(([feature, count]) => (
            <div key={feature} className="usage-bar">
              <div className="usage-label">{feature}</div>
              <div className="usage-progress">
                <div 
                  className="usage-fill" 
                  style={{ width: `${(count / 100) * 100}%` }}
                ></div>
              </div>
              <div className="usage-count">{count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Components */}
      <div className="top-components">
        <h3>Most Used Components</h3>
        <div className="component-list">
          {summary?.interactions.topComponents.map((component, index) => (
            <div key={component.name} className="component-item">
              <div className="component-rank">#{index + 1}</div>
              <div className="component-name">{component.name}</div>
              <div className="component-count">{formatNumber(component.count)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="system-status">
        <h3>System Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Plugins Active</span>
            <span className="status-value">{summary?.system.pluginsActive}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Agents Running</span>
            <span className="status-value">{summary?.system.agentsRunning}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Uptime</span>
            <span className="status-value">{formatDuration(Date.now() - (summary?.system.uptime || Date.now()))}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Memory Usage</span>
            <span className="status-value">{summary?.performance.memoryUsage.toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPerformanceTab = () => (
    <div className="performance-tab">
      <div className="performance-charts">
        <div className="chart-container">
          <h3>Response Time Trend</h3>
          <canvas 
            ref={el => el && (chartRefs.current['response-time'] = el)}
            width={600} 
            height={300}
          ></canvas>
        </div>
        
        <div className="chart-container">
          <h3>Memory Usage</h3>
          <div className="memory-gauge">
            <div 
              className="gauge-fill" 
              style={{ 
                width: `${summary?.performance.memoryUsage || 0}%`,
                backgroundColor: (summary?.performance.memoryUsage || 0) > 80 ? '#ff6b6b' : '#4facfe'
              }}
            ></div>
            <div className="gauge-label">{summary?.performance.memoryUsage.toFixed(0)}% Used</div>
          </div>
        </div>
      </div>

      <div className="performance-metrics">
        <h3>Performance Metrics</h3>
        <div className="metrics-table">
          <div className="metric-row">
            <span>Average Response Time</span>
            <span>{summary?.performance.averageResponseTime.toFixed(2)}ms</span>
          </div>
          <div className="metric-row">
            <span>95th Percentile</span>
            <span>{(summary?.performance.averageResponseTime * 1.5).toFixed(2)}ms</span>
          </div>
          <div className="metric-row">
            <span>Error Rate</span>
            <span>{((summary?.performance.totalErrors || 0) / 1000 * 100).toFixed(2)}%</span>
          </div>
          <div className="metric-row">
            <span>Throughput</span>
            <span>{Math.floor(Math.random() * 1000) + 500} req/min</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsageTab = () => (
    <div className="usage-tab">
      <div className="usage-overview">
        <h3>Usage Overview</h3>
        <div className="usage-stats">
          <div className="stat-card">
            <div className="stat-value">{formatNumber(summary?.usage.pageViews || 0)}</div>
            <div className="stat-label">Page Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatDuration(summary?.usage.sessionDuration || 0)}</div>
            <div className="stat-label">Avg Session Duration</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary?.interactions.spatialInteractions}</div>
            <div className="stat-label">Spatial Interactions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{summary?.interactions.xrSessions}</div>
            <div className="stat-label">XR Sessions</div>
          </div>
        </div>
      </div>

      <div className="user-journey">
        <h3>User Journey</h3>
        <div className="journey-flow">
          <div className="journey-step">
            <div className="step-icon">🏠</div>
            <div className="step-label">Landing</div>
            <div className="step-count">100%</div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🔬</div>
            <div className="step-label">Scientific</div>
            <div className="step-count">65%</div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🌌</div>
            <div className="step-label">Spatial</div>
            <div className="step-count">45%</div>
          </div>
          <div className="journey-arrow">→</div>
          <div className="journey-step">
            <div className="step-icon">🥽</div>
            <div className="step-label">XR</div>
            <div className="step-count">20%</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRealTimeTab = () => (
    <div className="realtime-tab">
      <div className="connection-status">
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
        <div className="metrics-count">
          {metrics.length} metrics collected
        </div>
      </div>

      <div className="realtime-feed">
        <h3>Live Metrics Feed</h3>
        <div className="metrics-stream">
          {metrics.slice(-20).reverse().map((metric, index) => (
            <div key={metric.id} className={`metric-item ${metric.category}`}>
              <div className="metric-time">
                {new Date(metric.timestamp).toLocaleTimeString()}
              </div>
              <div className="metric-category">{metric.category}</div>
              <div className="metric-name">{metric.name}</div>
              <div className="metric-value">
                {typeof metric.value === 'object' 
                  ? JSON.stringify(metric.value).substring(0, 50) + '...'
                  : String(metric.value)
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`analytics-dashboard ${theme}`}>
      <div className="dashboard-header">
        <h1>YUR Analytics Dashboard</h1>
        <div className="dashboard-controls">
          <div className="refresh-indicator">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button 
            onClick={updateMetrics}
            className="refresh-button"
            aria-label="Refresh metrics"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        {(['overview', 'performance', 'usage', 'realtime'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'performance' && renderPerformanceTab()}
        {activeTab === 'usage' && renderUsageTab()}
        {activeTab === 'realtime' && renderRealTimeTab()}
      </div>

      <style jsx>{`
        .analytics-dashboard {
          width: 100%;
          height: 100vh;
          overflow: auto;
          background: ${theme === 'dark' ? '#1a1a1a' : '#f5f5f5'};
          color: ${theme === 'dark' ? '#ffffff' : '#333333'};
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid ${theme === 'dark' ? '#333' : '#ddd'};
        }

        .dashboard-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .dashboard-controls {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .refresh-indicator {
          font-size: 14px;
          opacity: 0.7;
        }

        .refresh-button {
          background: none;
          border: 1px solid ${theme === 'dark' ? '#555' : '#ccc'};
          color: inherit;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }

        .refresh-button:hover {
          background: ${theme === 'dark' ? '#333' : '#eee'};
        }

        .dashboard-tabs {
          display: flex;
          border-bottom: 1px solid ${theme === 'dark' ? '#333' : '#ddd'};
          padding: 0 20px;
        }

        .tab-button {
          background: none;
          border: none;
          color: inherit;
          padding: 15px 20px;
          cursor: pointer;
          font-size: 16px;
          border-bottom: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background: ${theme === 'dark' ? '#2a2a2a' : '#eee'};
        }

        .tab-button.active {
          border-bottom-color: #4facfe;
          color: #4facfe;
        }

        .dashboard-content {
          padding: 20px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 20px;
        }

        .kpi-section {
          grid-column: 1 / -1;
        }

        .kpi-section h3 {
          margin: 0 0 15px 0;
          font-size: 18px;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }

        .kpi-card {
          background: ${theme === 'dark' ? '#2a2a2a' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }

        .kpi-value {
          font-size: 32px;
          font-weight: bold;
          color: #4facfe;
          margin-bottom: 8px;
        }

        .kpi-label {
          font-size: 14px;
          opacity: 0.7;
          margin-bottom: 8px;
        }

        .kpi-trend {
          font-size: 12px;
          font-weight: 600;
        }

        .kpi-trend.positive {
          color: #28a745;
        }

        .kpi-trend.negative {
          color: #dc3545;
        }

        .feature-usage, .top-components, .system-status {
          background: ${theme === 'dark' ? '#2a2a2a' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
          border-radius: 8px;
          padding: 20px;
        }

        .feature-usage h3, .top-components h3, .system-status h3 {
          margin: 0 0 15px 0;
          font-size: 16px;
        }

        .usage-bars {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .usage-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .usage-label {
          flex: 0 0 120px;
          font-size: 14px;
        }

        .usage-progress {
          flex: 1;
          height: 8px;
          background: ${theme === 'dark' ? '#444' : '#eee'};
          border-radius: 4px;
          overflow: hidden;
        }

        .usage-fill {
          height: 100%;
          background: linear-gradient(90deg, #4facfe, #00f2fe);
          transition: width 0.3s ease;
        }

        .usage-count {
          flex: 0 0 40px;
          text-align: right;
          font-size: 14px;
          font-weight: 600;
        }

        .component-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .component-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
        }

        .component-rank {
          flex: 0 0 30px;
          text-align: center;
          font-weight: bold;
        }

        .component-name {
          flex: 1;
        }

        .component-count {
          font-weight: 600;
          color: #4facfe;
        }

        .status-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .status-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
        }

        .status-label {
          font-size: 14px;
          opacity: 0.7;
        }

        .status-value {
          font-weight: 600;
        }

        .performance-tab, .usage-tab, .realtime-tab {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .chart-container {
          background: ${theme === 'dark' ? '#2a2a2a' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
          border-radius: 8px;
          padding: 20px;
        }

        .memory-gauge {
          width: 100%;
          height: 40px;
          background: ${theme === 'dark' ? '#444' : '#eee'};
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          margin-top: 10px;
        }

        .gauge-fill {
          height: 100%;
          transition: width 0.3s ease;
          border-radius: 20px;
        }

        .gauge-label {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-weight: 600;
          color: ${theme === 'dark' ? '#000' : '#fff'};
          mix-blend-mode: difference;
        }

        .connection-status {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          background: ${theme === 'dark' ? '#2a2a2a' : '#ffffff'};
          border: 1px solid ${theme === 'dark' ? '#444' : '#ddd'};
          border-radius: 8px;
        }

        .status-indicator {
          font-weight: 600;
        }

        .metrics-stream {
          max-height: 600px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .metric-item {
          display: grid;
          grid-template-columns: 80px 100px 1fr 1fr;
          gap: 10px;
          padding: 8px 12px;
          background: ${theme === 'dark' ? '#333' : '#f8f9fa'};
          border-radius: 4px;
          font-size: 14px;
          border-left: 3px solid #4facfe;
        }

        .metric-item.performance { border-left-color: #28a745; }
        .metric-item.usage { border-left-color: #ffc107; }
        .metric-item.error { border-left-color: #dc3545; }

        @media (max-width: 768px) {
          .overview-grid {
            grid-template-columns: 1fr;
          }
          
          .kpi-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .dashboard-tabs {
            overflow-x: auto;
          }
          
          .metric-item {
            grid-template-columns: 1fr;
            gap: 5px;
          }
        }
      `}</style>
    </div>
  );
};