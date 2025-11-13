/**
 * System Status Monitoring Component
 * 
 * Displays real-time system health, metrics, and alerts
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Activity, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Users, FileText, Zap } from 'lucide-react';

interface SystemStatus {
  overall: string;
  timestamp: string;
  components: {
    api?: ComponentStatus;
    database?: ComponentStatus;
    queue?: ComponentStatus;
  };
}

interface ComponentStatus {
  status: string;
  message?: string;
  uptime?: number;
}

interface SystemMetrics {
  timestamp: string;
  application: {
    requestRate: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: number;
    responseTime: {
      p50: number;
      p95: number;
      p99: number;
    };
  };
  infrastructure: {
    cpu: { usage: number };
    memory: { heapUsed: number; heapTotal: number; rss: number };
    uptime: number;
  };
  business: {
    activeUsers: number;
    feedbackSubmissions: number;
    policyViews: number;
  };
  backgroundJobs: {
    waiting?: number;
    active?: number;
    failed?: number;
    total?: number;
    successRate?: string;
  };
}

interface AlertItem {
  name: string;
  severity: string;
  status: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}

interface AlertStatus {
  timestamp: string;
  alertCount: number;
  alerts: AlertItem[];
}

export function SystemMonitoring() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [alerts, setAlerts] = useState<AlertStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, metricsRes, alertsRes] = await Promise.all([
          fetch('/api/v1/monitoring/status'),
          fetch('/api/v1/monitoring/metrics'),
          fetch('/api/v1/monitoring/alerts'),
        ]);

        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
        if (metricsRes.ok) {
          setMetrics(await metricsRes.json());
        }
        if (alertsRes.ok) {
          setAlerts(await alertsRes.json());
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return 'bg-green-500';
      case 'degraded_performance':
      case 'degraded':
      case 'warning':
        return 'bg-yellow-500';
      case 'major_outage':
      case 'unhealthy':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'operational':
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded_performance':
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'major_outage':
      case 'unhealthy':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Real-time monitoring dashboard</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {status && getStatusIcon(status.overall)}
              <Badge className={getStatusColor(status?.overall || '')}>
                {status?.overall.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {status?.components.api && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(status.components.api.status)}
                <div>
                  <div className="font-semibold">API</div>
                  <div className="text-sm text-muted-foreground">
                    {status.components.api.message || status.components.api.status}
                  </div>
                  {status.components.api.uptime && (
                    <div className="text-xs text-muted-foreground">
                      Uptime: {formatUptime(status.components.api.uptime)}
                    </div>
                  )}
                </div>
              </div>
            )}
            {status?.components.database && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(status.components.database.status)}
                <div>
                  <div className="font-semibold">Database</div>
                  <div className="text-sm text-muted-foreground">
                    {status.components.database.message || status.components.database.status}
                  </div>
                </div>
              </div>
            )}
            {status?.components.queue && (
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getStatusIcon(status.components.queue.status)}
                <div>
                  <div className="font-semibold">Job Queue</div>
                  <div className="text-sm text-muted-foreground">
                    {status.components.queue.message || status.components.queue.status}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Alerts */}
      {alerts && alerts.alertCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Active Alerts ({alerts.alertCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.alerts.map((alert, index) => (
                <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
                  <AlertTitle className="text-sm font-semibold">
                    {alert.name.replace(/_/g, ' ').toUpperCase()}
                  </AlertTitle>
                  <AlertDescription className="text-sm">
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Overview */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Request Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.application.requestRate.toFixed(2)} req/s
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.application.totalRequests.toLocaleString()} total requests
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.application.errorRate.toFixed(2)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.application.totalErrors} errors
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Response Time (p95)</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.application.responseTime.p95.toFixed(0)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  p50: {metrics.application.responseTime.p50.toFixed(0)}ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics.business.activeUsers}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics.business.feedbackSubmissions} feedback submissions
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">CPU Usage</span>
                    <span className="font-semibold">{metrics.infrastructure.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Memory Used</span>
                    <span className="font-semibold">
                      {formatBytes(metrics.infrastructure.memory.heapUsed)} / {formatBytes(metrics.infrastructure.memory.heapTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="font-semibold">{formatUptime(metrics.infrastructure.uptime)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Background Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Success Rate</span>
                    <span className="font-semibold">{metrics.backgroundJobs.successRate || '0'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active</span>
                    <span className="font-semibold">{metrics.backgroundJobs.active || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Waiting</span>
                    <span className="font-semibold">{metrics.backgroundJobs.waiting || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Failed</span>
                    <span className="font-semibold text-red-600">{metrics.backgroundJobs.failed || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Monitoring Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Data refreshes every 10 seconds</div>
            <div>For detailed metrics, access Grafana at <code className="px-1 py-0.5 bg-muted rounded">http://localhost:3001</code></div>
            <div>Prometheus metrics available at <code className="px-1 py-0.5 bg-muted rounded">http://localhost:3000/metrics</code></div>
            {metrics && <div>Last updated: {new Date(metrics.timestamp).toLocaleTimeString()}</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
