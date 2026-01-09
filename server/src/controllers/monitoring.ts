/**
 * Monitoring Controller
 * 
 * Handles metrics, health checks, and status endpoints
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { metricsService } from '../services/metrics';
import { jobQueue } from '../services/jobQueue';
import os from 'os';
import { redis } from '../services/redis';

const prisma = new PrismaClient();

/**
 * Get Prometheus-formatted metrics
 * GET /metrics
 */
export const getMetrics = async (_req: Request, res: Response) => {
  try {
    const prometheusOutput = metricsService.exportPrometheus();
    
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusOutput);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).send('Error exporting metrics');
  }
};

/**
 * Get detailed health check
 * GET /api/v1/monitoring/health
 */
export const getDetailedHealth = async (_req: Request, res: Response) => {
  const health: any = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      memory: { status: 'unknown' },
      disk: { status: 'unknown' },
    },
  };

  try {
    // Check database connectivity
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatency = Date.now() - dbStart;
    
    health.checks.database = {
      status: 'healthy',
      latency: dbLatency,
      message: 'Database connection successful',
    };
    
    // Update database connection metric
    const dbMetrics = await prisma.$metrics.json();
    const activeConnections = dbMetrics.counters.find(
      (c: any) => c.key === 'prisma_client_queries_active'
    )?.value || 0;
    
    metricsService.setGauge('database_connections_active', activeConnections);
  } catch (error: any) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  try {
    // Check Redis connectivity
    const redisStart = Date.now();
    await redis.ping();
    const redisLatency = Date.now() - redisStart;
    
    health.checks.redis = {
      status: 'healthy',
      latency: redisLatency,
      message: 'Redis connection successful',
    };
  } catch (error: any) {
    health.status = 'degraded';
    health.checks.redis = {
      status: 'unhealthy',
      message: error.message,
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = ((totalMem - freeMem) / totalMem) * 100;
  
  health.checks.memory = {
    status: usedMemPercent < 90 ? 'healthy' : 'warning',
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    rss: memUsage.rss,
    systemTotal: totalMem,
    systemFree: freeMem,
    systemUsedPercent: usedMemPercent.toFixed(2),
  };

  if (usedMemPercent >= 90) {
    health.status = 'degraded';
  }

  // Check disk space (if possible)
  try {
    const { execSync } = require('child_process');
    const diskUsage = execSync("df -h / | tail -1 | awk '{print $5}'")
      .toString()
      .trim()
      .replace('%', '');
    
    const diskUsedPercent = parseInt(diskUsage);
    
    health.checks.disk = {
      status: diskUsedPercent < 80 ? 'healthy' : 'warning',
      usedPercent: diskUsedPercent,
      message: `Disk usage at ${diskUsedPercent}%`,
    };
    
    if (diskUsedPercent >= 80) {
      health.status = 'degraded';
    }
  } catch (error) {
    // Disk check not available on all systems
    health.checks.disk = {
      status: 'unknown',
      message: 'Disk check not available',
    };
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  res.status(statusCode).json(health);
};

/**
 * Get application metrics in JSON format
 * GET /api/v1/monitoring/metrics
 */
export const getMetricsJSON = async (_req: Request, res: Response) => {
  try {
    const metrics = metricsService.exportJSON();
    
    // Add database metrics
    try {
      const userCount = await prisma.user.count({
        where: { status: 'Active' }
      });
      metrics.business.activeUsers = userCount;
      metricsService.setGauge('active_users_total', userCount);
    } catch (error) {
      console.error('Error getting user count:', error);
    }
    
    // Add job queue metrics
    try {
      const waiting = await jobQueue.getWaitingCount();
      const active = await jobQueue.getActiveCount();
      const delayed = await jobQueue.getDelayedCount();
      const failed = await jobQueue.getFailedCount();
      const completed = await jobQueue.getCompletedCount();
      
      const total = waiting + active + delayed + failed + completed;
      const successRate = total > 0 ? ((completed / total) * 100) : 100;
      
      metrics.backgroundJobs = {
        waiting,
        active,
        delayed,
        failed,
        completed,
        total,
        successRate: successRate.toFixed(2),
      };
      
      metricsService.setGauge('background_jobs_total', total);
      metricsService.setGauge('background_jobs_failed_total', failed);
      metricsService.setGauge('background_jobs_success_rate', successRate);
    } catch (error) {
      console.error('Error getting job queue metrics:', error);
    }
    
    res.json(metrics);
  } catch (error) {
    console.error('Error exporting metrics:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to export metrics',
    });
  }
};

/**
 * Get system status for status page
 * GET /api/v1/monitoring/status
 */
export const getSystemStatus = async (_req: Request, res: Response) => {
  try {
    const status: any = {
      overall: 'operational',
      timestamp: new Date().toISOString(),
      components: {},
    };

    // Check API
    status.components.api = {
      status: 'operational',
      uptime: process.uptime(),
    };

    // Check Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.components.database = {
        status: 'operational',
        message: 'All systems operational',
      };
    } catch (error) {
      status.overall = 'major_outage';
      status.components.database = {
        status: 'major_outage',
        message: 'Database unavailable',
      };
    }

    // Check Redis/Queue
    try {
      await redis.ping();
      status.components.queue = {
        status: 'operational',
        message: 'Job queue operational',
      };
    } catch (error) {
      status.overall = status.overall === 'major_outage' ? 'major_outage' : 'degraded_performance';
      status.components.queue = {
        status: 'degraded_performance',
        message: 'Job queue may be slow',
      };
    }

    // Add performance metrics
    const metrics = metricsService.exportJSON();
    const errorRate = metrics.application.errorRate;
    const p95ResponseTime = metrics.application.responseTime.p95;

    if (errorRate > 5) {
      status.overall = 'degraded_performance';
      status.components.api.status = 'degraded_performance';
      status.components.api.message = `Error rate elevated: ${errorRate.toFixed(2)}%`;
    }

    if (p95ResponseTime > 2000) {
      status.overall = status.overall === 'major_outage' ? 'major_outage' : 'degraded_performance';
      status.components.api.status = 'degraded_performance';
      status.components.api.message = `Response times elevated: ${p95ResponseTime.toFixed(0)}ms`;
    }

    res.json(status);
  } catch (error) {
    console.error('Error getting system status:', error);
    res.status(500).json({
      overall: 'major_outage',
      timestamp: new Date().toISOString(),
      components: {
        api: {
          status: 'major_outage',
          message: 'Unable to determine system status',
        },
      },
    });
  }
};

/**
 * Get alert status
 * GET /api/v1/monitoring/alerts
 */
export const getAlertStatus = async (_req: Request, res: Response) => {
  try {
    const metrics = metricsService.exportJSON();
    const alerts: any[] = [];

    // Check error rate threshold (>5%)
    if (metrics.application.errorRate > 5) {
      alerts.push({
        name: 'high_error_rate',
        severity: 'critical',
        status: 'firing',
        message: `Error rate is ${metrics.application.errorRate.toFixed(2)}% (threshold: 5%)`,
        value: metrics.application.errorRate,
        threshold: 5,
        timestamp: new Date().toISOString(),
      });
    }

    // Check response time threshold (p95 >2s)
    if (metrics.application.responseTime.p95 > 2000) {
      alerts.push({
        name: 'slow_response_time',
        severity: 'warning',
        status: 'firing',
        message: `P95 response time is ${metrics.application.responseTime.p95.toFixed(0)}ms (threshold: 2000ms)`,
        value: metrics.application.responseTime.p95,
        threshold: 2000,
        timestamp: new Date().toISOString(),
      });
    }

    // Check database connections
    const dbConnections = metricsService.getAllMetrics().get('database_connections_active')?.value || 0;
    const maxConnections = parseInt(process.env.DATABASE_MAX_CONNECTIONS || '100');
    const connectionPercent = (dbConnections / maxConnections) * 100;
    
    if (connectionPercent > 80) {
      alerts.push({
        name: 'high_database_connections',
        severity: 'warning',
        status: 'firing',
        message: `Database connection pool at ${connectionPercent.toFixed(1)}% (threshold: 80%)`,
        value: connectionPercent,
        threshold: 80,
        timestamp: new Date().toISOString(),
      });
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memPercent > 90) {
      alerts.push({
        name: 'high_memory_usage',
        severity: 'warning',
        status: 'firing',
        message: `Memory usage at ${memPercent.toFixed(1)}% (threshold: 90%)`,
        value: memPercent,
        threshold: 90,
        timestamp: new Date().toISOString(),
      });
    }

    // Check background job failure rate
    if (metrics.backgroundJobs.successRate < 90) {
      const failureRate = 100 - metrics.backgroundJobs.successRate;
      alerts.push({
        name: 'high_job_failure_rate',
        severity: 'warning',
        status: 'firing',
        message: `Background job failure rate at ${failureRate.toFixed(1)}% (threshold: 10%)`,
        value: failureRate,
        threshold: 10,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      alerts,
    });
  } catch (error) {
    console.error('Error getting alert status:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get alert status',
    });
  }
};
