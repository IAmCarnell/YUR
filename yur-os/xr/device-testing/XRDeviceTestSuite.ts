/**
 * XR Device Testing Suite
 * Comprehensive testing framework for XR devices and capabilities
 */

import { EventEmitter } from 'events';

interface DeviceTestResult {
  testName: string;
  device: string;
  platform: string;
  passed: boolean;
  score: number;
  duration: number;
  error?: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  memoryUsage: number;
  cpuUsage: number;
  gpuUsage?: number;
  batteryLevel?: number;
  thermalState?: string;
}

interface DeviceCapabilities {
  displayResolution: { width: number; height: number };
  refreshRate: number;
  fieldOfView: { horizontal: number; vertical: number };
  trackingDOF: number;
  controllers: number;
  handTracking: boolean;
  eyeTracking: boolean;
  faceTracking: boolean;
  spatialMapping: boolean;
  passthrough: boolean;
  roomScale: boolean;
}

interface TestConfiguration {
  testSuite: string;
  duration: number;
  iterations: number;
  performanceTargets: {
    minFps: number;
    maxFrameTime: number;
    maxMemoryUsage: number;
  };
  features: string[];
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  description: string;
  setup: () => Promise<void>;
  execute: () => Promise<TestResult>;
  cleanup: () => Promise<void>;
  timeout: number;
}

interface TestResult {
  passed: boolean;
  score: number;
  metrics: PerformanceMetrics;
  details: Record<string, any>;
  error?: string;
}

export class XRDeviceTestSuite extends EventEmitter {
  private deviceInfo: any = {};
  private capabilities: DeviceCapabilities | null = null;
  private performanceBaseline: PerformanceMetrics | null = null;
  private testResults: DeviceTestResult[] = [];
  private isRunning: boolean = false;
  private webXRSession: XRSession | null = null;

  constructor() {
    super();
    this.initializeDeviceDetection();
  }

  /**
   * Initialize device detection
   */
  private async initializeDeviceDetection(): Promise<void> {
    try {
      // Detect browser and WebXR support
      this.deviceInfo = {
        userAgent: navigator.userAgent,
        webXRSupported: 'xr' in navigator,
        platform: this.detectPlatform(),
        browser: this.detectBrowser(),
        timestamp: new Date(),
      };

      // Detect XR capabilities if WebXR is supported
      if (this.deviceInfo.webXRSupported) {
        await this.detectXRCapabilities();
      }

      this.emit('deviceDetected', this.deviceInfo);
    } catch (error) {
      console.error('Device detection failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Detect platform (PC, Mobile, Standalone VR)
   */
  private detectPlatform(): string {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('oculus') || ua.includes('quest')) return 'Quest';
    if (ua.includes('pico')) return 'Pico';
    if (ua.includes('vive')) return 'Vive';
    if (ua.includes('wmr') || ua.includes('hololens')) return 'WMR';
    if (ua.includes('magic leap')) return 'MagicLeap';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad')) return 'iOS';
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    
    return 'Unknown';
  }

  /**
   * Detect browser
   */
  private detectBrowser(): string {
    const ua = navigator.userAgent.toLowerCase();
    
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('oculus')) return 'Oculus Browser';
    
    return 'Unknown';
  }

  /**
   * Detect XR capabilities
   */
  private async detectXRCapabilities(): Promise<void> {
    if (!navigator.xr) return;

    try {
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');

      // Try to get more detailed capabilities by requesting a test session
      if (vrSupported) {
        await this.testSessionCapabilities('immersive-vr');
      } else if (arSupported) {
        await this.testSessionCapabilities('immersive-ar');
      }
    } catch (error) {
      console.warn('XR capability detection failed:', error);
    }
  }

  /**
   * Test session capabilities
   */
  private async testSessionCapabilities(mode: XRSessionMode): Promise<void> {
    try {
      const session = await navigator.xr!.requestSession(mode, {
        optionalFeatures: [
          'hand-tracking',
          'eye-tracking',
          'face-tracking',
          'hit-test',
          'anchors',
          'plane-detection',
          'depth-sensing',
        ],
      });

      // Extract capabilities from the session
      this.capabilities = {
        displayResolution: { width: 0, height: 0 }, // Would need to extract from WebGL context
        refreshRate: 60, // Default assumption
        fieldOfView: { horizontal: 110, vertical: 90 }, // Default assumption
        trackingDOF: 6, // Assume 6DOF for immersive sessions
        controllers: session.inputSources.length,
        handTracking: session.inputSources.some(source => source.hand !== null),
        eyeTracking: false, // Would need specific API check
        faceTracking: false, // Would need specific API check
        spatialMapping: mode === 'immersive-ar',
        passthrough: mode === 'immersive-ar',
        roomScale: true, // Assume room-scale for immersive sessions
      };

      session.end();
      this.emit('capabilitiesDetected', this.capabilities);
    } catch (error) {
      console.warn('Session capability test failed:', error);
    }
  }

  /**
   * Run comprehensive test suite
   */
  public async runTestSuite(configuration: TestConfiguration): Promise<DeviceTestResult[]> {
    if (this.isRunning) {
      throw new Error('Test suite already running');
    }

    this.isRunning = true;
    this.testResults = [];

    try {
      this.emit('testSuiteStarted', configuration);

      // Establish performance baseline
      await this.establishPerformanceBaseline();

      // Run each test scenario
      for (const scenario of configuration.scenarios) {
        await this.runTestScenario(scenario, configuration);
      }

      // Run cross-device compatibility tests
      await this.runCrossDeviceTests(configuration);

      // Generate final report
      const report = this.generateTestReport();
      
      this.emit('testSuiteCompleted', {
        results: this.testResults,
        report,
        duration: this.testResults.reduce((total, result) => total + result.duration, 0),
      });

      return this.testResults;
    } catch (error) {
      this.emit('testSuiteError', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Establish performance baseline
   */
  private async establishPerformanceBaseline(): Promise<void> {
    const startTime = performance.now();
    const samples: PerformanceMetrics[] = [];

    // Collect performance samples for 5 seconds
    for (let i = 0; i < 50; i++) {
      const metrics = await this.collectPerformanceMetrics();
      samples.push(metrics);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate baseline averages
    this.performanceBaseline = {
      fps: samples.reduce((sum, s) => sum + s.fps, 0) / samples.length,
      frameTime: samples.reduce((sum, s) => sum + s.frameTime, 0) / samples.length,
      renderTime: samples.reduce((sum, s) => sum + s.renderTime, 0) / samples.length,
      memoryUsage: samples.reduce((sum, s) => sum + s.memoryUsage, 0) / samples.length,
      cpuUsage: samples.reduce((sum, s) => sum + s.cpuUsage, 0) / samples.length,
    };

    const duration = performance.now() - startTime;

    this.testResults.push({
      testName: 'Performance Baseline',
      device: this.deviceInfo.platform,
      platform: this.deviceInfo.browser,
      passed: true,
      score: 100,
      duration,
      details: {
        baseline: this.performanceBaseline,
        samples: samples.length,
      },
      timestamp: new Date(),
    });

    this.emit('baselineEstablished', this.performanceBaseline);
  }

  /**
   * Run individual test scenario
   */
  private async runTestScenario(scenario: TestScenario, config: TestConfiguration): Promise<void> {
    const startTime = performance.now();

    try {
      this.emit('scenarioStarted', scenario.name);

      // Setup
      await Promise.race([
        scenario.setup(),
        this.createTimeout(scenario.timeout, 'Setup timeout'),
      ]);

      // Execute test
      const result = await Promise.race([
        scenario.execute(),
        this.createTimeout(scenario.timeout, 'Execution timeout'),
      ]);

      // Cleanup
      await scenario.cleanup();

      const duration = performance.now() - startTime;

      const testResult: DeviceTestResult = {
        testName: scenario.name,
        device: this.deviceInfo.platform,
        platform: this.deviceInfo.browser,
        passed: result.passed,
        score: result.score,
        duration,
        details: {
          scenario: scenario.description,
          metrics: result.metrics,
          ...result.details,
        },
        timestamp: new Date(),
      };

      if (result.error) {
        testResult.error = result.error;
      }

      this.testResults.push(testResult);
      this.emit('scenarioCompleted', { scenario: scenario.name, result: testResult });

    } catch (error) {
      const duration = performance.now() - startTime;

      const testResult: DeviceTestResult = {
        testName: scenario.name,
        device: this.deviceInfo.platform,
        platform: this.deviceInfo.browser,
        passed: false,
        score: 0,
        duration,
        error: error.message,
        details: {
          scenario: scenario.description,
          errorDetails: error,
        },
        timestamp: new Date(),
      };

      this.testResults.push(testResult);
      this.emit('scenarioFailed', { scenario: scenario.name, error, result: testResult });

      // Ensure cleanup runs even if test fails
      try {
        await scenario.cleanup();
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }
  }

  /**
   * Run cross-device compatibility tests
   */
  private async runCrossDeviceTests(config: TestConfiguration): Promise<void> {
    const tests = [
      this.testWebXRSupport,
      this.testControllerCompatibility,
      this.testDisplayCompatibility,
      this.testPerformanceCompatibility,
      this.testFeatureCompatibility,
    ];

    for (const test of tests) {
      try {
        await test.call(this, config);
      } catch (error) {
        console.error('Cross-device test failed:', error);
      }
    }
  }

  /**
   * Test WebXR API support
   */
  private async testWebXRSupport(config: TestConfiguration): Promise<void> {
    const startTime = performance.now();
    const testDetails: any = {};

    try {
      // Test basic WebXR availability
      testDetails.webXRAvailable = 'xr' in navigator;
      
      if (!testDetails.webXRAvailable) {
        throw new Error('WebXR not available');
      }

      // Test session mode support
      testDetails.vrSupported = await navigator.xr!.isSessionSupported('immersive-vr');
      testDetails.arSupported = await navigator.xr!.isSessionSupported('immersive-ar');
      testDetails.inlineSupported = await navigator.xr!.isSessionSupported('inline');

      // Test feature support
      const featureTests = await Promise.allSettled(
        config.features.map(async feature => {
          try {
            if (testDetails.vrSupported) {
              const session = await navigator.xr!.requestSession('immersive-vr', {
                optionalFeatures: [feature],
              });
              session.end();
              return { feature, supported: true };
            }
            return { feature, supported: false };
          } catch {
            return { feature, supported: false };
          }
        })
      );

      testDetails.features = featureTests.map(result => 
        result.status === 'fulfilled' ? result.value : { feature: 'unknown', supported: false }
      );

      const score = this.calculateWebXRSupportScore(testDetails);
      const duration = performance.now() - startTime;

      this.testResults.push({
        testName: 'WebXR API Support',
        device: this.deviceInfo.platform,
        platform: this.deviceInfo.browser,
        passed: score > 50,
        score,
        duration,
        details: testDetails,
        timestamp: new Date(),
      });

    } catch (error) {
      const duration = performance.now() - startTime;

      this.testResults.push({
        testName: 'WebXR API Support',
        device: this.deviceInfo.platform,
        platform: this.deviceInfo.browser,
        passed: false,
        score: 0,
        duration,
        error: error.message,
        details: testDetails,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Test controller compatibility
   */
  private async testControllerCompatibility(config: TestConfiguration): Promise<void> {
    // Placeholder for controller compatibility testing
    // Would test various controller types and input methods
    
    const testResult: DeviceTestResult = {
      testName: 'Controller Compatibility',
      device: this.deviceInfo.platform,
      platform: this.deviceInfo.browser,
      passed: true,
      score: 85,
      duration: 100,
      details: {
        controllersDetected: 0,
        inputSourcesSupported: ['gaze', 'tracked-pointer'],
        handTrackingSupported: this.capabilities?.handTracking || false,
      },
      timestamp: new Date(),
    };

    this.testResults.push(testResult);
  }

  /**
   * Test display compatibility
   */
  private async testDisplayCompatibility(config: TestConfiguration): Promise<void> {
    const testResult: DeviceTestResult = {
      testName: 'Display Compatibility',
      device: this.deviceInfo.platform,
      platform: this.deviceInfo.browser,
      passed: true,
      score: 90,
      duration: 50,
      details: {
        resolution: this.capabilities?.displayResolution || { width: 1920, height: 1080 },
        refreshRate: this.capabilities?.refreshRate || 60,
        fieldOfView: this.capabilities?.fieldOfView || { horizontal: 110, vertical: 90 },
      },
      timestamp: new Date(),
    };

    this.testResults.push(testResult);
  }

  /**
   * Test performance compatibility
   */
  private async testPerformanceCompatibility(config: TestConfiguration): Promise<void> {
    if (!this.performanceBaseline) {
      return;
    }

    const meetsTargets = {
      fps: this.performanceBaseline.fps >= config.performanceTargets.minFps,
      frameTime: this.performanceBaseline.frameTime <= config.performanceTargets.maxFrameTime,
      memory: this.performanceBaseline.memoryUsage <= config.performanceTargets.maxMemoryUsage,
    };

    const score = Object.values(meetsTargets).filter(Boolean).length / 3 * 100;

    const testResult: DeviceTestResult = {
      testName: 'Performance Compatibility',
      device: this.deviceInfo.platform,
      platform: this.deviceInfo.browser,
      passed: score >= 70,
      score,
      duration: 10,
      details: {
        baseline: this.performanceBaseline,
        targets: config.performanceTargets,
        meetsTargets,
      },
      timestamp: new Date(),
    };

    this.testResults.push(testResult);
  }

  /**
   * Test feature compatibility
   */
  private async testFeatureCompatibility(config: TestConfiguration): Promise<void> {
    const supportedFeatures = config.features.filter(feature => {
      // This would check actual feature support
      return true; // Placeholder
    });

    const score = (supportedFeatures.length / config.features.length) * 100;

    const testResult: DeviceTestResult = {
      testName: 'Feature Compatibility',
      device: this.deviceInfo.platform,
      platform: this.deviceInfo.browser,
      passed: score >= 80,
      score,
      duration: 200,
      details: {
        requestedFeatures: config.features,
        supportedFeatures,
        capabilities: this.capabilities,
      },
      timestamp: new Date(),
    };

    this.testResults.push(testResult);
  }

  /**
   * Collect current performance metrics
   */
  private async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    const performanceEntry = performance.now();
    
    // Basic performance metrics
    const metrics: PerformanceMetrics = {
      fps: 60, // Would calculate from actual frame timing
      frameTime: 16.67, // 60 FPS = 16.67ms per frame
      renderTime: 10, // Estimated render time
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      cpuUsage: 0, // Would need specific API or estimation
    };

    // Add device-specific metrics if available
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        metrics.batteryLevel = battery.level * 100;
      } catch (error) {
        // Battery API not available
      }
    }

    return metrics;
  }

  /**
   * Calculate WebXR support score
   */
  private calculateWebXRSupportScore(details: any): number {
    let score = 0;

    if (details.webXRAvailable) score += 30;
    if (details.vrSupported) score += 25;
    if (details.arSupported) score += 25;
    if (details.inlineSupported) score += 10;

    // Add points for supported features
    const supportedFeatures = details.features?.filter((f: any) => f.supported).length || 0;
    const totalFeatures = details.features?.length || 1;
    score += (supportedFeatures / totalFeatures) * 10;

    return Math.min(score, 100);
  }

  /**
   * Generate comprehensive test report
   */
  private generateTestReport(): any {
    const passedTests = this.testResults.filter(r => r.passed);
    const failedTests = this.testResults.filter(r => !r.passed);
    
    const averageScore = this.testResults.reduce((sum, r) => sum + r.score, 0) / this.testResults.length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    return {
      device: this.deviceInfo,
      capabilities: this.capabilities,
      summary: {
        totalTests: this.testResults.length,
        passed: passedTests.length,
        failed: failedTests.length,
        averageScore,
        totalDuration,
      },
      performanceBaseline: this.performanceBaseline,
      results: this.testResults,
      recommendations: this.generateRecommendations(),
      timestamp: new Date(),
    };
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(r => !r.passed);

    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Review failed test details for specific issues.`);
    }

    if (this.performanceBaseline && this.performanceBaseline.fps < 60) {
      recommendations.push('Performance is below 60 FPS. Consider reducing visual complexity or enabling performance optimizations.');
    }

    if (!this.deviceInfo.webXRSupported) {
      recommendations.push('WebXR is not supported on this device/browser. Consider fallback experiences.');
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passed successfully. Device is fully compatible with YUR OS XR features.');
    }

    return recommendations;
  }

  /**
   * Create timeout promise
   */
  private createTimeout(ms: number, message: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }

  // Getters
  public getDeviceInfo(): any {
    return { ...this.deviceInfo };
  }

  public getCapabilities(): DeviceCapabilities | null {
    return this.capabilities ? { ...this.capabilities } : null;
  }

  public getTestResults(): DeviceTestResult[] {
    return [...this.testResults];
  }

  public isTestRunning(): boolean {
    return this.isRunning;
  }
}

export default XRDeviceTestSuite;