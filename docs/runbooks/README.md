# Alert Runbooks

This directory contains runbooks for responding to monitoring alerts.

## Runbook Template

Each runbook should follow this structure:

```markdown
# [Alert Name]

## Description
Brief description of what this alert means.

## Impact
What is the impact on users and the system?

## Investigation Steps
1. Step by step guide to investigate
2. Commands to run
3. Logs to check

## Resolution Steps
1. How to fix the issue
2. Commands to run
3. Configuration changes

## Prevention
How to prevent this alert in the future.

## Related Alerts
Links to related alerts or runbooks.
```

## Available Runbooks

- [High Error Rate](./high-error-rate.md)
- [Slow Response Time](./slow-response-time.md)
- [Application Down](./application-down.md)
- [High Database Connections](./high-db-connections.md)
- [Database Down](./database-down.md)
- [Redis Down](./redis-down.md)
- [High Memory Usage](./high-memory.md)
- [High CPU Usage](./high-cpu.md)
- [Low Disk Space](./low-disk-space.md)
- [High Job Failure Rate](./high-job-failures.md)

## Quick Reference

### Common Commands

```bash
# Check application logs
docker-compose logs -f app

# Check Prometheus metrics
curl http://localhost:3000/metrics

# Check system status
curl http://localhost:3000/api/v1/monitoring/status | jq

# Check active alerts
curl http://localhost:3000/api/v1/monitoring/alerts | jq

# View Grafana dashboards
open http://localhost:3001

# Restart a service
docker-compose restart app

# View service resource usage
docker stats
```

### Escalation Path

1. **Warning Alerts**: Notify team via email
2. **Critical Alerts**: Notify on-call engineer immediately
3. **Major Outage**: Escalate to senior engineers and management

### Contact Information

- Team Email: team@rto-compliance-hub.com
- On-Call: oncall@rto-compliance-hub.com
- Slack Channel: #rto-alerts
