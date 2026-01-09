# Monitoring and Alerting Infrastructure

This document describes the comprehensive monitoring and alerting infrastructure for the RTO Compliance Hub.

## Overview

The monitoring stack includes:
- **Prometheus** - Metrics collection and storage (90-day retention)
- **Grafana** - Visualization dashboards
- **Alertmanager** - Alert routing and notification
- **Node Exporter** - System metrics
- **PostgreSQL Exporter** - Database metrics
- **Redis Exporter** - Queue/cache metrics
- **Custom Application Metrics** - Business and application metrics

## Quick Start

### Starting the Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# View logs
docker-compose logs -f prometheus grafana alertmanager
```

### Accessing the Services

- **Application**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### Metrics Endpoints

- **Prometheus Format**: http://localhost:3000/metrics
- **JSON Format**: http://localhost:3000/api/v1/monitoring/metrics
- **Health Check**: http://localhost:3000/api/v1/monitoring/health
- **System Status**: http://localhost:3000/api/v1/monitoring/status
- **Alert Status**: http://localhost:3000/api/v1/monitoring/alerts

## Metrics Collected

### Application Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `http_requests_total` | Counter | Total HTTP requests by method, path, status |
| `http_request_duration_seconds` | Histogram | Request duration (p50, p95, p99) |
| `http_errors_total` | Counter | Total HTTP errors |
| `process_uptime_seconds` | Gauge | Application uptime |
| `process_cpu_usage_percent` | Gauge | CPU usage percentage |
| `process_memory_usage_bytes` | Gauge | Memory usage in bytes |

### Database Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `database_connections_active` | Gauge | Active database connections |
| `database_query_duration_seconds` | Histogram | Query execution time |

### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `active_users_total` | Gauge | Number of active users |
| `feedback_submissions_total` | Counter | Total feedback submissions |
| `policy_views_total` | Counter | Total policy views |
| `sync_completion_rate` | Gauge | Sync success rate percentage |

### Background Job Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `background_jobs_total` | Counter | Total background jobs |
| `background_jobs_failed_total` | Counter | Failed background jobs |
| `background_jobs_success_rate` | Gauge | Job success rate percentage |

## Alert Rules

### Critical Alerts

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| **HighErrorRate** | Error rate too high | >5% | 5 minutes |
| **ApplicationDown** | Application unavailable | N/A | 2 minutes |
| **DatabaseDown** | Database unavailable | N/A | 1 minute |
| **RedisDown** | Redis unavailable | N/A | 2 minutes |

### Warning Alerts

| Alert | Condition | Threshold | Duration |
|-------|-----------|-----------|----------|
| **SlowResponseTime** | P95 response time high | >2 seconds | 5 minutes |
| **HighDatabaseConnections** | Connection pool saturated | >80% | 5 minutes |
| **HighMemoryUsage** | Memory usage high | >90% | 5 minutes |
| **HighCPUUsage** | CPU usage high | >80% | 10 minutes |
| **LowDiskSpace** | Disk space low | <20% | 5 minutes |
| **HighJobFailureRate** | Job failures high | >10% | 10 minutes |

## Alert Notification

Alerts are routed through Alertmanager to configured receivers:

### Email Configuration

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@rto-compliance-hub.com'
  smtp_auth_username: 'your-email@example.com'
  smtp_auth_password: 'your-app-password'
```

### Notification Channels

1. **Default** - All alerts to team@rto-compliance-hub.com
2. **Critical** - Urgent alerts to oncall@rto-compliance-hub.com
3. **Warning** - Non-urgent alerts to team@rto-compliance-hub.com

### Adding Slack Notifications

Uncomment and configure in `alertmanager.yml`:

```yaml
slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts-critical'
    title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
```

## Grafana Dashboards

### System Overview Dashboard

The main dashboard (`system-overview.json`) displays:

1. **Status Indicators**
   - System status (UP/DOWN)
   - Uptime
   - Request rate
   - Error rate

2. **Performance Graphs**
   - Request rate over time
   - Response time percentiles (p50, p95, p99)
   - HTTP status code distribution

3. **Infrastructure Metrics**
   - CPU usage
   - Memory usage
   - Database connections

4. **Business Metrics**
   - Active users
   - Feedback submissions
   - Policy views
   - Sync completion rate

5. **Background Jobs**
   - Job queue status
   - Success/failure rates

### Accessing Dashboards

1. Open Grafana: http://localhost:3001
2. Login with admin/admin
3. Navigate to Dashboards → RTO Compliance Hub → System Overview

## Data Retention

- **Prometheus**: 90 days (configurable in docker-compose.yml)
- **Grafana**: Indefinite (stored in volume)
- **Alert History**: Available in Alertmanager

## Troubleshooting

### Prometheus Not Scraping Metrics

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check application metrics endpoint
curl http://localhost:3000/metrics
```

### Grafana Dashboard Not Loading

```bash
# Check Grafana logs
docker-compose logs grafana

# Verify Prometheus datasource
curl http://localhost:3001/api/datasources
```

### Alerts Not Firing

```bash
# Check Alertmanager status
curl http://localhost:9093/api/v1/status

# View active alerts
curl http://localhost:9093/api/v1/alerts

# Check alert rules in Prometheus
curl http://localhost:9090/api/v1/rules
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Reduce Prometheus retention
# Edit docker-compose.yml: --storage.tsdb.retention.time=30d
```

## Environment Variables

Add to `.env` for monitoring configuration:

```bash
# Monitoring
DATABASE_MAX_CONNECTIONS=100

# Alerting (optional)
ALERT_EMAIL_TO=oncall@rto-compliance-hub.com
ALERT_SMTP_HOST=smtp.gmail.com
ALERT_SMTP_PORT=587
ALERT_SMTP_USER=alerts@rto-compliance-hub.com
ALERT_SMTP_PASSWORD=your-password
```

## Production Considerations

### Security

1. **Change Grafana password** immediately after first login
2. **Secure Alertmanager** with authentication
3. **Use TLS** for production endpoints
4. **Restrict access** to monitoring ports with firewall rules

### Scaling

1. **Prometheus Federation** for multi-datacenter deployments
2. **Thanos** for long-term storage
3. **Horizontal scaling** with multiple Prometheus instances

### Backup

```bash
# Backup Grafana dashboards
docker exec rto-grafana grafana-cli admin export-dashboard

# Backup Prometheus data
docker exec rto-prometheus promtool tsdb snapshot /prometheus

# Backup configuration
tar -czf monitoring-backup.tar.gz monitoring/
```

## API Integration

### Recording Custom Metrics

```typescript
import { metricsService } from './services/metrics';

// Increment counter
metricsService.incrementCounter('feedback_submissions_total', 1);

// Set gauge
metricsService.setGauge('active_users_total', 150);

// Record histogram
metricsService.observeHistogram('database_query_duration_seconds', 0.042);
```

### Custom Business Metrics

```typescript
// Track custom event
metricsService.incrementCounter('custom_metric', 1, {
  type: 'event_type',
  source: 'event_source'
});
```

## Performance Impact

The monitoring infrastructure has minimal performance impact:

- **Metrics collection**: <5ms per request
- **Memory overhead**: ~50MB
- **Storage**: ~100MB per day (with default scrape intervals)

## Support and Documentation

- **Prometheus**: https://prometheus.io/docs/
- **Grafana**: https://grafana.com/docs/
- **Alertmanager**: https://prometheus.io/docs/alerting/latest/alertmanager/
- **Node Exporter**: https://github.com/prometheus/node_exporter

## Runbooks

Create runbooks for each alert at:
- https://docs.rto-compliance-hub.com/runbooks/

Example structure:
1. Alert description
2. Impact on users
3. Investigation steps
4. Resolution steps
5. Prevention measures
