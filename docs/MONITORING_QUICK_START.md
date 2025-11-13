# Monitoring Quick Start Guide

Get the RTO Compliance Hub monitoring stack up and running in minutes.

## Prerequisites

- Docker and Docker Compose installed
- Ports available: 3000 (app), 3001 (Grafana), 9090 (Prometheus), 9093 (Alertmanager)
- At least 4GB RAM available for Docker

## Step 1: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (optional)
nano .env
```

Key monitoring variables:
```bash
DATABASE_MAX_CONNECTIONS=100
METRICS_RETENTION_DAYS=90
```

## Step 2: Start the Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Verify all services are running
docker-compose ps

# You should see:
# - rto-app (application)
# - rto-postgres (database)
# - rto-redis (cache/queue)
# - rto-prometheus (metrics)
# - rto-grafana (dashboards)
# - rto-alertmanager (alerts)
# - rto-node-exporter (system metrics)
# - rto-postgres-exporter (DB metrics)
# - rto-redis-exporter (Redis metrics)
```

## Step 3: Verify Monitoring

### Check Application Health
```bash
curl http://localhost:3000/health | jq
```

Expected output:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 120.5,
  "database": "connected",
  "version": "1.0.0"
}
```

### Check Metrics Collection
```bash
curl http://localhost:3000/metrics | head -20
```

You should see Prometheus-formatted metrics.

### Check Detailed Metrics
```bash
curl http://localhost:3000/api/v1/monitoring/metrics | jq
```

## Step 4: Access Dashboards

### Grafana
1. Open http://localhost:3001
2. Login with:
   - Username: `admin`
   - Password: `admin`
3. **Change the password immediately!**
4. Navigate to: Dashboards → RTO Compliance Hub → System Overview

### Prometheus
1. Open http://localhost:9090
2. Explore metrics and run queries
3. Check targets: Status → Targets

### Alertmanager
1. Open http://localhost:9093
2. View active alerts and silences

## Step 5: Test Monitoring

### Generate Test Traffic
```bash
# Make some requests
for i in {1..100}; do
  curl -s http://localhost:3000/api/v1/monitoring/status > /dev/null
  sleep 0.1
done
```

### View Updated Metrics
```bash
# Check request rate
curl -s http://localhost:3000/api/v1/monitoring/metrics | jq '.application.requestRate'

# Check response times
curl -s http://localhost:3000/api/v1/monitoring/metrics | jq '.application.responseTime'
```

### View in Grafana
1. Go to Grafana dashboard
2. Watch the "Request Rate Over Time" graph update
3. Check "Response Time" percentiles

## Step 6: Configure Alerts (Optional)

### Email Notifications

Edit `monitoring/alertmanager/alertmanager.yml`:

```yaml
global:
  smtp_smarthost: 'smtp.gmail.com:587'
  smtp_from: 'alerts@your-domain.com'
  smtp_auth_username: 'your-email@gmail.com'
  smtp_auth_password: 'your-app-password'
```

### Slack Notifications

Uncomment and configure in `alertmanager.yml`:

```yaml
slack_configs:
  - api_url: 'YOUR_SLACK_WEBHOOK_URL'
    channel: '#alerts'
```

### Apply Changes
```bash
docker-compose restart alertmanager
```

## Common Tasks

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f prometheus
docker-compose logs -f grafana
```

### Restart a Service
```bash
docker-compose restart app
```

### Stop Monitoring
```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Update Grafana Dashboard
1. Edit `monitoring/grafana/dashboards/system-overview.json`
2. Restart Grafana: `docker-compose restart grafana`
3. Refresh dashboard in browser

### Check Disk Usage
```bash
# See volume sizes
docker system df -v | grep rto

# Clean up old data
docker system prune -a
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check port conflicts
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :9090

# Restart specific service
docker-compose restart [service-name]
```

### No Metrics in Prometheus
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job, health}'

# Check application metrics endpoint
curl http://localhost:3000/metrics | head -20

# Restart Prometheus
docker-compose restart prometheus
```

### Grafana Dashboard Not Loading
```bash
# Check Grafana logs
docker-compose logs grafana

# Verify datasource
curl http://localhost:3001/api/datasources -u admin:admin | jq

# Re-provision datasource
docker-compose restart grafana
```

### Alerts Not Firing
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules | jq '.data.groups[] | .name'

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts | jq

# Verify email configuration
docker-compose logs alertmanager | grep -i smtp
```

## Next Steps

1. **Customize Dashboards**: Create additional Grafana dashboards for specific needs
2. **Set Up Backups**: Configure automated backups of Prometheus and Grafana data
3. **Tune Alerts**: Adjust alert thresholds based on your usage patterns
4. **Add Runbooks**: Create runbooks for each alert type (see `docs/runbooks/`)
5. **Monitor Costs**: Track monitoring infrastructure costs and optimize

## Resources

- **Full Documentation**: [MONITORING.md](../MONITORING.md)
- **Runbooks**: [docs/runbooks/](./runbooks/)
- **Grafana Docs**: https://grafana.com/docs/
- **Prometheus Docs**: https://prometheus.io/docs/
- **Alert Rules**: `monitoring/prometheus/alerts/alerts.yml`

## Support

For issues or questions:
- Check the troubleshooting section above
- Review logs: `docker-compose logs [service]`
- Check existing issues on GitHub
- Contact: team@rto-compliance-hub.com
