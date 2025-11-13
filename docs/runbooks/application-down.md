# Application Down Alert

## Description
The application is not responding to health checks. This is a critical alert indicating a complete service outage.

## Impact
- **User Impact**: Critical - No users can access the system
- **Business Impact**: Critical - All operations halted
- **Data Risk**: Low - Unless data corruption caused the crash

## Investigation Steps

### 1. Verify the Alert
```bash
# Check if application is responding
curl http://localhost:3000/health

# Check application status
docker-compose ps app

# Check if port is accessible
nc -zv localhost 3000
```

### 2. Check Application Logs
```bash
# View recent logs
docker-compose logs --tail=200 app

# Check for crash/exit
docker-compose logs app | grep -i "exit\|crash\|fatal"

# Check last error before crash
docker-compose logs app | grep -i error | tail -20
```

### 3. Check Resource Usage
```bash
# Check if container is running
docker ps | grep rto-app

# Check resource limits
docker stats --no-stream rto-app

# Check host system resources
free -h
df -h
```

### 4. Check Dependencies
```bash
# Verify database is up
docker-compose ps postgres
curl http://localhost:5432 || docker-compose logs postgres --tail=50

# Verify Redis is up
docker-compose ps redis
docker-compose exec redis redis-cli ping
```

## Resolution Steps

### Scenario 1: Container Crashed
```bash
# Start the application
docker-compose up -d app

# Monitor startup
docker-compose logs -f app

# Verify health
curl http://localhost:3000/health
```

### Scenario 2: Port Conflict
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill conflicting process
kill -9 <PID>

# Restart application
docker-compose restart app
```

### Scenario 3: Database Migration Failed
```bash
# Check migration status
docker-compose exec app npx prisma migrate status

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Restart application
docker-compose restart app
```

### Scenario 4: Out of Memory
```bash
# Check memory usage
docker stats --no-stream

# Increase memory limit in docker-compose.yml
# Add under app service:
#   deploy:
#     resources:
#       limits:
#         memory: 2G

# Restart with new limits
docker-compose up -d app
```

### Scenario 5: Complete System Failure
```bash
# Full restart of all services
docker-compose down
docker-compose up -d

# Verify all services
docker-compose ps
```

## Verification

1. Check application responds:
   ```bash
   curl http://localhost:3000/health
   ```

2. Verify all endpoints work:
   ```bash
   curl http://localhost:3000/api/v1/monitoring/status
   curl http://localhost:3000/metrics
   ```

3. Check metrics collection:
   ```bash
   curl http://localhost:3000/api/v1/monitoring/metrics | jq
   ```

4. Monitor for 5-10 minutes:
   ```bash
   watch -n 5 'curl -s http://localhost:3000/health | jq'
   ```

## Emergency Rollback

If the application continues to fail:

```bash
# Stop current version
docker-compose down app

# Pull previous stable image
docker pull rto-compliance-hub:stable

# Update docker-compose.yml to use stable tag
# Change: image: rto-compliance-hub:latest
# To:     image: rto-compliance-hub:stable

# Restart
docker-compose up -d app
```

## Prevention

### Immediate Actions
- Review recent deployments
- Check if new code introduced issues
- Verify all environment variables are set

### Short-term
- Add more health check endpoints
- Implement graceful shutdown handling
- Add startup probes with longer timeout
- Increase logging for startup sequence

### Long-term
- Implement blue-green deployment
- Add automatic failover
- Set up multiple availability zones
- Implement circuit breakers
- Add comprehensive pre-deployment testing
- Set up canary deployments

## Communication Template

For major incidents, notify stakeholders:

```
Subject: [CRITICAL] RTO Compliance Hub - Service Outage

Status: Investigating/Identified/Monitoring/Resolved
Started: [timestamp]
Duration: [time]

Issue: The RTO Compliance Hub is currently unavailable.

Impact: Users cannot access the system.

Actions Taken:
- [list actions]

Next Steps:
- [list next steps]

ETA: [estimated resolution time]

Updates will be posted every 15 minutes.
```

## Post-Incident

1. **Root Cause Analysis**
   - What caused the outage?
   - Why didn't alerts catch it earlier?
   - What made it worse?

2. **Timeline Documentation**
   - When did it start?
   - When was it detected?
   - When was it resolved?
   - Key actions and decisions

3. **Action Items**
   - Prevention measures
   - Detection improvements
   - Response improvements
   - Documentation updates

4. **Follow-up**
   - Schedule post-mortem meeting within 48 hours
   - Update this runbook
   - Implement prevention measures
   - Update monitoring and alerts

## Related Alerts
- [High Error Rate](./high-error-rate.md)
- [Database Down](./database-down.md)
- [Redis Down](./redis-down.md)
- [High Memory Usage](./high-memory.md)

## Additional Resources
- [Architecture Documentation](../architecture.md)
- [Deployment Guide](../deployment.md)
- [Health Check Implementation](../health-checks.md)
- Grafana Dashboard: http://localhost:3001
- Prometheus: http://localhost:9090
