/**
 * Metrics Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { metricsService } from '../../../server/src/services/metrics';

describe('MetricsService', () => {
  beforeEach(() => {
    metricsService.reset();
  });

  it('should increment counter', () => {
    metricsService.incrementCounter('test_counter', 1);
    metricsService.incrementCounter('test_counter', 2);
    
    const metrics = metricsService.getAllMetrics();
    const counter = metrics.get('test_counter');
    
    expect(counter).toBeDefined();
    expect(counter?.value).toBe(3);
  });

  it('should set gauge value', () => {
    metricsService.setGauge('test_gauge', 42);
    
    const metrics = metricsService.getAllMetrics();
    const gauge = metrics.get('test_gauge');
    
    expect(gauge?.value).toBe(42);
  });

  it('should record HTTP request', () => {
    metricsService.recordRequest('GET', '/api/v1/users', 200, 150);
    
    const metrics = metricsService.getAllMetrics();
    expect(metrics.has('http_requests_total')).toBe(true);
    expect(metrics.has('http_request_duration_seconds')).toBe(true);
  });

  it('should track error rate', () => {
    metricsService.recordRequest('GET', '/api/v1/users', 200, 100);
    metricsService.recordRequest('GET', '/api/v1/users', 500, 100);
    metricsService.recordRequest('GET', '/api/v1/users', 200, 100);
    
    const errorRate = metricsService.getErrorRate();
    expect(errorRate).toBeCloseTo(33.33, 1);
  });

  it('should calculate response time percentiles', () => {
    // Add some response times
    for (let i = 0; i < 100; i++) {
      metricsService.recordRequest('GET', '/api/v1/test', 200, i * 10);
    }
    
    const percentiles = metricsService.getResponseTimePercentiles();
    
    expect(percentiles.count).toBe(100);
    expect(percentiles.p50).toBeGreaterThan(0);
    expect(percentiles.p95).toBeGreaterThan(percentiles.p50);
    expect(percentiles.p99).toBeGreaterThan(percentiles.p95);
  });

  it('should export prometheus format', () => {
    metricsService.incrementCounter('test_metric', 5);
    
    const prometheus = metricsService.exportPrometheus();
    
    expect(prometheus).toContain('# HELP');
    expect(prometheus).toContain('# TYPE');
    expect(prometheus).toContain('test_metric');
  });

  it('should export JSON format', () => {
    metricsService.recordRequest('GET', '/api/v1/test', 200, 100);
    
    const json = metricsService.exportJSON();
    
    expect(json).toHaveProperty('timestamp');
    expect(json).toHaveProperty('application');
    expect(json).toHaveProperty('infrastructure');
    expect(json.application).toHaveProperty('requestRate');
    expect(json.application).toHaveProperty('errorRate');
  });

  it('should normalize API paths', () => {
    metricsService.recordRequest('GET', '/api/v1/users/123', 200, 100);
    metricsService.recordRequest('GET', '/api/v1/users/456', 200, 100);
    
    // Both should be normalized to the same path
    const prometheus = metricsService.exportPrometheus();
    expect(prometheus).toContain('/api/v1/users/:id');
  });
});
