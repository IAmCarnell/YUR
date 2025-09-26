/**
 * Performance benchmarking tool for YUR Framework
 * Measures build times, bundle sizes, and runtime performance
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class PerformanceBenchmark {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      buildMetrics: {},
      bundleMetrics: {},
      runtimeMetrics: {},
    };
    this.outputDir = path.join(__dirname, '../benchmark-results');
    this.ensureOutputDir();
  }

  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async measureBuildTime() {
    console.log('📊 Measuring build performance...');
    
    const iterations = 3;
    const buildTimes = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Build iteration ${i + 1}/${iterations}`);
      
      // Clean previous build
      await execAsync('rm -rf frontend/dist', { cwd: path.join(__dirname, '..') });
      
      const startTime = Date.now();
      
      try {
        await execAsync('npm run build:frontend', { 
          cwd: path.join(__dirname, '..'),
          timeout: 300000 // 5 minutes timeout
        });
        
        const endTime = Date.now();
        const buildTime = endTime - startTime;
        buildTimes.push(buildTime);
        
        console.log(`Build ${i + 1} completed in ${buildTime}ms`);
      } catch (error) {
        console.error(`Build ${i + 1} failed:`, error.message);
      }
    }
    
    this.results.buildMetrics = {
      iterations,
      times: buildTimes,
      average: buildTimes.reduce((a, b) => a + b, 0) / buildTimes.length,
      min: Math.min(...buildTimes),
      max: Math.max(...buildTimes),
    };
    
    console.log(`✅ Average build time: ${this.results.buildMetrics.average.toFixed(2)}ms`);
  }

  async analyzeBundleSize() {
    console.log('📦 Analyzing bundle sizes...');
    
    const distPath = path.join(__dirname, '../frontend/dist');
    
    if (!fs.existsSync(distPath)) {
      console.error('❌ Build directory not found. Run build first.');
      return;
    }
    
    const files = fs.readdirSync(distPath, { recursive: true });
    const bundleStats = {};
    let totalSize = 0;
    
    files.forEach(file => {
      const filePath = path.join(distPath, file);
      
      if (fs.statSync(filePath).isFile()) {
        const size = fs.statSync(filePath).size;
        const extension = path.extname(file);
        
        if (!bundleStats[extension]) {
          bundleStats[extension] = { count: 0, totalSize: 0, files: [] };
        }
        
        bundleStats[extension].count++;
        bundleStats[extension].totalSize += size;
        bundleStats[extension].files.push({
          name: file,
          size: size,
          sizeKB: (size / 1024).toFixed(2),
        });
        
        totalSize += size;
      }
    });
    
    // Sort files by size within each category
    Object.keys(bundleStats).forEach(ext => {
      bundleStats[ext].files.sort((a, b) => b.size - a.size);
    });
    
    this.results.bundleMetrics = {
      totalSizeBytes: totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      fileTypes: bundleStats,
      largestFiles: this.getLargestFiles(bundleStats, 10),
    };
    
    console.log(`✅ Total bundle size: ${this.results.bundleMetrics.totalSizeMB}MB`);
    
    // Check performance budgets
    this.checkPerformanceBudgets();
  }

  getLargestFiles(bundleStats, count) {
    const allFiles = [];
    
    Object.keys(bundleStats).forEach(ext => {
      bundleStats[ext].files.forEach(file => {
        allFiles.push({ ...file, type: ext });
      });
    });
    
    return allFiles
      .sort((a, b) => b.size - a.size)
      .slice(0, count);
  }

  checkPerformanceBudgets() {
    const budgets = {
      totalSizeMB: 5.0,  // 5MB total
      largestJSFileKB: 512,  // 512KB per JS file
      largestCSSFileKB: 128, // 128KB per CSS file
    };
    
    const violations = [];
    
    // Check total size
    if (parseFloat(this.results.bundleMetrics.totalSizeMB) > budgets.totalSizeMB) {
      violations.push(`Total bundle size (${this.results.bundleMetrics.totalSizeMB}MB) exceeds budget (${budgets.totalSizeMB}MB)`);
    }
    
    // Check individual JS files
    if (this.results.bundleMetrics.fileTypes['.js']) {
      this.results.bundleMetrics.fileTypes['.js'].files.forEach(file => {
        if (parseFloat(file.sizeKB) > budgets.largestJSFileKB) {
          violations.push(`JS file ${file.name} (${file.sizeKB}KB) exceeds budget (${budgets.largestJSFileKB}KB)`);
        }
      });
    }
    
    // Check individual CSS files
    if (this.results.bundleMetrics.fileTypes['.css']) {
      this.results.bundleMetrics.fileTypes['.css'].files.forEach(file => {
        if (parseFloat(file.sizeKB) > budgets.largestCSSFileKB) {
          violations.push(`CSS file ${file.name} (${file.sizeKB}KB) exceeds budget (${budgets.largestCSSFileKB}KB)`);
        }
      });
    }
    
    this.results.budgetViolations = violations;
    
    if (violations.length > 0) {
      console.log('⚠️  Performance budget violations:');
      violations.forEach(violation => console.log(`   ${violation}`));
    } else {
      console.log('✅ All performance budgets met');
    }
  }

  async measureCacheEffectiveness() {
    console.log('🗄️  Measuring cache effectiveness...');
    
    // First build (cold cache)
    await execAsync('rm -rf node_modules/.cache', { cwd: path.join(__dirname, '..') });
    await execAsync('rm -rf frontend/dist', { cwd: path.join(__dirname, '..') });
    
    const coldCacheStart = Date.now();
    await execAsync('npm run build:frontend', { cwd: path.join(__dirname, '..') });
    const coldCacheTime = Date.now() - coldCacheStart;
    
    // Second build (warm cache)
    const warmCacheStart = Date.now();
    await execAsync('npm run build:frontend', { cwd: path.join(__dirname, '..') });
    const warmCacheTime = Date.now() - warmCacheStart;
    
    const cacheEffectiveness = ((coldCacheTime - warmCacheTime) / coldCacheTime) * 100;
    
    this.results.cacheMetrics = {
      coldCacheTimeMs: coldCacheTime,
      warmCacheTimeMs: warmCacheTime,
      improvementMs: coldCacheTime - warmCacheTime,
      effectivenessPercent: cacheEffectiveness.toFixed(2),
    };
    
    console.log(`✅ Cache effectiveness: ${cacheEffectiveness.toFixed(2)}% improvement`);
  }

  async generateLighthouseReport() {
    console.log('🔍 Generating Lighthouse performance report...');
    
    try {
      // Start dev server in background
      const devServer = exec('npm run dev', { cwd: path.join(__dirname, '..') });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Run Lighthouse
      const { stdout } = await execAsync(
        'npx lighthouse http://localhost:5173 --output json --output-path ./benchmark-results/lighthouse.json --chrome-flags="--headless --no-sandbox"',
        { cwd: path.join(__dirname, '..') }
      );
      
      // Kill dev server
      devServer.kill();
      
      // Parse Lighthouse results
      const lighthouseResults = JSON.parse(
        fs.readFileSync(path.join(this.outputDir, 'lighthouse.json'), 'utf8')
      );
      
      this.results.lighthouseMetrics = {
        performance: lighthouseResults.categories.performance.score * 100,
        accessibility: lighthouseResults.categories.accessibility.score * 100,
        bestPractices: lighthouseResults.categories['best-practices'].score * 100,
        seo: lighthouseResults.categories.seo.score * 100,
        metrics: {
          firstContentfulPaint: lighthouseResults.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lighthouseResults.audits['largest-contentful-paint'].numericValue,
          cumulativeLayoutShift: lighthouseResults.audits['cumulative-layout-shift'].numericValue,
          totalBlockingTime: lighthouseResults.audits['total-blocking-time'].numericValue,
        },
      };
      
      console.log(`✅ Lighthouse Performance Score: ${this.results.lighthouseMetrics.performance}`);
      
    } catch (error) {
      console.error('❌ Lighthouse report failed:', error.message);
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `benchmark-${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    
    // Also save as latest
    fs.writeFileSync(
      path.join(this.outputDir, 'latest.json'),
      JSON.stringify(this.results, null, 2)
    );
    
    console.log(`📄 Results saved to ${filename}`);
    
    // Generate summary report
    this.generateSummaryReport();
  }

  generateSummaryReport() {
    const summaryPath = path.join(this.outputDir, 'summary.md');
    
    const summary = `# YUR Framework Performance Benchmark Report

## Summary
- **Timestamp**: ${this.results.timestamp}
- **Average Build Time**: ${this.results.buildMetrics?.average?.toFixed(2) || 'N/A'}ms
- **Total Bundle Size**: ${this.results.bundleMetrics?.totalSizeMB || 'N/A'}MB
- **Cache Effectiveness**: ${this.results.cacheMetrics?.effectivenessPercent || 'N/A'}%

## Build Performance
${this.results.buildMetrics ? `
- **Iterations**: ${this.results.buildMetrics.iterations}
- **Average Time**: ${this.results.buildMetrics.average.toFixed(2)}ms
- **Min Time**: ${this.results.buildMetrics.min}ms
- **Max Time**: ${this.results.buildMetrics.max}ms
` : 'Not measured'}

## Bundle Analysis
${this.results.bundleMetrics ? `
- **Total Size**: ${this.results.bundleMetrics.totalSizeMB}MB (${this.results.bundleMetrics.totalSizeKB}KB)

### Largest Files
${this.results.bundleMetrics.largestFiles.map(file => 
  `- ${file.name}: ${file.sizeKB}KB`
).join('\n')}

### Performance Budget Violations
${this.results.budgetViolations?.length > 0 
  ? this.results.budgetViolations.map(v => `- ⚠️ ${v}`).join('\n')
  : '✅ No violations'
}
` : 'Not analyzed'}

## Cache Performance
${this.results.cacheMetrics ? `
- **Cold Cache Build**: ${this.results.cacheMetrics.coldCacheTimeMs}ms
- **Warm Cache Build**: ${this.results.cacheMetrics.warmCacheTimeMs}ms
- **Improvement**: ${this.results.cacheMetrics.improvementMs}ms (${this.results.cacheMetrics.effectivenessPercent}%)
` : 'Not measured'}

## Lighthouse Scores
${this.results.lighthouseMetrics ? `
- **Performance**: ${this.results.lighthouseMetrics.performance}/100
- **Accessibility**: ${this.results.lighthouseMetrics.accessibility}/100
- **Best Practices**: ${this.results.lighthouseMetrics.bestPractices}/100
- **SEO**: ${this.results.lighthouseMetrics.seo}/100

### Core Web Vitals
- **First Contentful Paint**: ${this.results.lighthouseMetrics.metrics.firstContentfulPaint}ms
- **Largest Contentful Paint**: ${this.results.lighthouseMetrics.metrics.largestContentfulPaint}ms
- **Cumulative Layout Shift**: ${this.results.lighthouseMetrics.metrics.cumulativeLayoutShift}
- **Total Blocking Time**: ${this.results.lighthouseMetrics.metrics.totalBlockingTime}ms
` : 'Not measured'}
`;
    
    fs.writeFileSync(summaryPath, summary);
    console.log('📊 Summary report generated: summary.md');
  }

  async run() {
    console.log('🚀 Starting YUR Framework Performance Benchmark\n');
    
    try {
      await this.measureBuildTime();
      await this.analyzeBundleSize();
      await this.measureCacheEffectiveness();
      await this.generateLighthouseReport();
      await this.saveResults();
      
      console.log('\n✅ Benchmark completed successfully!');
      console.log(`📂 Results available in: ${this.outputDir}`);
      
    } catch (error) {
      console.error('\n❌ Benchmark failed:', error);
      process.exit(1);
    }
  }
}

// Run benchmark if called directly
if (require.main === module) {
  const benchmark = new PerformanceBenchmark();
  benchmark.run();
}

module.exports = PerformanceBenchmark;