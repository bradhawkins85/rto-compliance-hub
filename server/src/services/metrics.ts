/**
 * Metrics Collection Service
 * 
 * Collects application, infrastructure, and business metrics
 * Compatible with Prometheus exposition format
 */

interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  help: string;
  value: number;
  labels?: Record<string, string>;
}

interface HistogramMetric {
  count: number;
  sum: number;
  buckets: Map<number, number>;
}

interface PercentileData {
  p50: number;
  p95: number;
  p99: number;
  mean: number;
  count: number;
}

class MetricsService {
  private metrics: Map<string, Metric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();
  private responseTimeSamples: number[] = [];
  private errorCount: number = 0;
  private requestCount: number = 0;
  private startTime: number = Date.now();

  constructor() {
    // Initialize default metrics
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics() {
    // Application metrics
    this.registerMetric('http_requests_total', 'counter', 'Total HTTP requests');
    this.registerMetric('http_request_duration_seconds', 'histogram', 'HTTP request duration in seconds');
    this.registerMetric('http_errors_total', 'counter', 'Total HTTP errors');
    
    // Database metrics
    this.registerMetric('database_connections_active', 'gauge', 'Active database connections');
    this.registerMetric('database_query_duration_seconds', 'histogram', 'Database query duration');
    
    // Business metrics
    this.registerMetric('active_users_total', 'gauge', 'Total active users');
    this.registerMetric('feedback_submissions_total', 'counter', 'Total feedback submissions');
    this.registerMetric('policy_views_total', 'counter', 'Total policy views');
    this.registerMetric('sync_completion_rate', 'gauge', 'Sync completion rate percentage');
    
    // Background job metrics
    this.registerMetric('background_jobs_total', 'counter', 'Total background jobs');
    this.registerMetric('background_jobs_failed_total', 'counter', 'Total failed background jobs');
    this.registerMetric('background_jobs_success_rate', 'gauge', 'Background job success rate percentage');
    
    // Infrastructure metrics
    this.registerMetric('process_cpu_usage_percent', 'gauge', 'Process CPU usage percentage');
    this.registerMetric('process_memory_usage_bytes', 'gauge', 'Process memory usage in bytes');
    this.registerMetric('process_uptime_seconds', 'gauge', 'Process uptime in seconds');
  }

  private registerMetric(name: string, type: Metric['type'], help: string) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, { name, type, help, value: 0 });
    }
  }

  // Counter operations
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>) {
    // Auto-register metric if not exists
    if (!this.metrics.has(name)) {
      this.registerMetric(name, 'counter', `Custom counter: ${name}`);
    }
    
    const key = this.makeKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
    
    // Update metric
    const metric = this.metrics.get(name);
    if (metric) {
      metric.value = this.counters.get(key) || 0;
      metric.labels = labels;
    }
  }

  // Gauge operations
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    // Auto-register metric if not exists
    if (!this.metrics.has(name)) {
      this.registerMetric(name, 'gauge', `Custom gauge: ${name}`);
    }
    
    const key = this.makeKey(name, labels);
    this.gauges.set(key, value);
    
    // Update metric
    const metric = this.metrics.get(name);
    if (metric) {
      metric.value = value;
      metric.labels = labels;
    }
  }

  incrementGauge(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, (this.gauges.get(key) || 0) + value);
    
    // Update metric
    const metric = this.metrics.get(name);
    if (metric) {
      metric.value = this.gauges.get(key) || 0;
      metric.labels = labels;
    }
  }

  decrementGauge(name: string, value: number = 1, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    this.gauges.set(key, (this.gauges.get(key) || 0) - value);
    
    // Update metric
    const metric = this.metrics.get(name);
    if (metric) {
      metric.value = this.gauges.get(key) || 0;
      metric.labels = labels;
    }
  }

  // Histogram operations
  observeHistogram(name: string, value: number, labels?: Record<string, string>) {
    const key = this.makeKey(name, labels);
    let histogram = this.histograms.get(key);
    
    if (!histogram) {
      histogram = {
        count: 0,
        sum: 0,
        buckets: new Map([
          [0.005, 0], [0.01, 0], [0.025, 0], [0.05, 0],
          [0.1, 0], [0.25, 0], [0.5, 0], [1, 0],
          [2.5, 0], [5, 0], [10, 0], [Infinity, 0]
        ])
      };
      this.histograms.set(key, histogram);
    }
    
    histogram.count++;
    histogram.sum += value;
    
    // Update buckets
    for (const [bucket, _] of histogram.buckets) {
      if (value <= bucket) {
        histogram.buckets.set(bucket, (histogram.buckets.get(bucket) || 0) + 1);
      }
    }
  }

  // Track HTTP request
  recordRequest(method: string, path: string, statusCode: number, duration: number) {
    this.requestCount++;
    
    // Increment request counter
    this.incrementCounter('http_requests_total', 1, {
      method,
      path: this.normalizePath(path),
      status: statusCode.toString()
    });
    
    // Record duration
    this.observeHistogram('http_request_duration_seconds', duration / 1000, {
      method,
      path: this.normalizePath(path)
    });
    
    // Track errors
    if (statusCode >= 400) {
      this.errorCount++;
      this.incrementCounter('http_errors_total', 1, {
        method,
        path: this.normalizePath(path),
        status: statusCode.toString()
      });
    }
    
    // Store sample for percentile calculation
    this.responseTimeSamples.push(duration);
    
    // Keep only last 10000 samples
    if (this.responseTimeSamples.length > 10000) {
      this.responseTimeSamples.shift();
    }
  }

  // Calculate response time percentiles
  getResponseTimePercentiles(): PercentileData {
    if (this.responseTimeSamples.length === 0) {
      return { p50: 0, p95: 0, p99: 0, mean: 0, count: 0 };
    }
    
    const sorted = [...this.responseTimeSamples].sort((a, b) => a - b);
    const count = sorted.length;
    
    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
      mean: sorted.reduce((a, b) => a + b, 0) / count,
      count
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  // Get error rate
  getErrorRate(): number {
    if (this.requestCount === 0) return 0;
    return (this.errorCount / this.requestCount) * 100;
  }

  // Get requests per second
  getRequestRate(): number {
    const uptimeSeconds = (Date.now() - this.startTime) / 1000;
    if (uptimeSeconds === 0) return 0;
    return this.requestCount / uptimeSeconds;
  }

  // Update infrastructure metrics
  updateInfrastructureMetrics() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.setGauge('process_memory_usage_bytes', usage.heapUsed);
    this.setGauge('process_uptime_seconds', process.uptime());
    
    // CPU usage as percentage (approximation)
    const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / process.uptime() * 100;
    this.setGauge('process_cpu_usage_percent', Math.min(100, cpuPercent));
  }

  // Get all metrics
  getAllMetrics(): Map<string, Metric> {
    this.updateInfrastructureMetrics();
    return this.metrics;
  }

  // Export metrics in Prometheus format
  exportPrometheus(): string {
    this.updateInfrastructureMetrics();
    
    let output = '';
    
    for (const [_, metric] of this.metrics) {
      output += `# HELP ${metric.name} ${metric.help}\n`;
      output += `# TYPE ${metric.name} ${metric.type}\n`;
      
      if (metric.labels) {
        const labels = Object.entries(metric.labels)
          .map(([key, value]) => `${key}="${value}"`)
          .join(',');
        output += `${metric.name}{${labels}} ${metric.value}\n`;
      } else {
        output += `${metric.name} ${metric.value}\n`;
      }
    }
    
    // Add histograms
    for (const [key, histogram] of this.histograms) {
      const metricName = key.split('|')[0];
      const labels = key.includes('|') ? key.split('|')[1] : '';
      
      output += `# TYPE ${metricName} histogram\n`;
      
      for (const [bucket, count] of histogram.buckets) {
        const bucketLabel = bucket === Infinity ? '+Inf' : bucket.toString();
        const labelStr = labels ? `${labels},le="${bucketLabel}"` : `le="${bucketLabel}"`;
        output += `${metricName}_bucket{${labelStr}} ${count}\n`;
      }
      
      const labelStr = labels ? `${labels}` : '';
      output += `${metricName}_sum{${labelStr}} ${histogram.sum}\n`;
      output += `${metricName}_count{${labelStr}} ${histogram.count}\n`;
    }
    
    return output;
  }

  // Export metrics as JSON
  exportJSON(): Record<string, any> {
    this.updateInfrastructureMetrics();
    
    const percentiles = this.getResponseTimePercentiles();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      application: {
        requestRate: this.getRequestRate(),
        totalRequests: this.requestCount,
        totalErrors: this.errorCount,
        errorRate: this.getErrorRate(),
        responseTime: {
          p50: percentiles.p50,
          p95: percentiles.p95,
          p99: percentiles.p99,
          mean: percentiles.mean
        }
      },
      infrastructure: {
        cpu: {
          usage: this.gauges.get('process_cpu_usage_percent') || 0
        },
        memory: {
          heapUsed: this.gauges.get('process_memory_usage_bytes') || 0,
          heapTotal: process.memoryUsage().heapTotal,
          rss: process.memoryUsage().rss
        },
        uptime: process.uptime()
      },
      business: {
        activeUsers: this.gauges.get('active_users_total') || 0,
        feedbackSubmissions: this.counters.get('feedback_submissions_total') || 0,
        policyViews: this.counters.get('policy_views_total') || 0,
        syncCompletionRate: this.gauges.get('sync_completion_rate') || 0
      },
      backgroundJobs: {
        total: this.counters.get('background_jobs_total') || 0,
        failed: this.counters.get('background_jobs_failed_total') || 0,
        successRate: this.gauges.get('background_jobs_success_rate') || 0
      }
    };
  }

  // Helper to create unique keys for labeled metrics
  private makeKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
    
    return `${name}|${labelStr}`;
  }

  // Normalize API paths to remove IDs
  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }

  // Reset metrics (for testing)
  reset() {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.responseTimeSamples = [];
    this.errorCount = 0;
    this.requestCount = 0;
    this.startTime = Date.now();
    this.initializeDefaultMetrics();
  }
}

// Export singleton instance
export const metricsService = new MetricsService();
