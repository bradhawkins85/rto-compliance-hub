# High Error Rate Alert

## Description
The application is experiencing an elevated error rate above 5% over a 5-minute period. This indicates that a significant portion of user requests are failing.

## Impact
- **User Impact**: High - Users are experiencing errors when using the system
- **Business Impact**: Critical - Core functionality may be unavailable
- **Data Risk**: Medium - Depends on the nature of errors

## Investigation Steps

### 1. Check Current Error Rate
```bash
# View current metrics
curl http://localhost:3000/api/v1/monitoring/metrics | jq '.application'

# Check alert details
curl http://localhost:3000/api/v1/monitoring/alerts | jq '.alerts[] | select(.name == "high_error_rate")'
```

### 2. Review Recent Logs
```bash
# Check application logs for errors
docker-compose logs --tail=100 app | grep -i error

# Filter by timestamp if needed
docker-compose logs --since 5m app | grep -i error
```

### 3. Identify Error Patterns
```bash
# Group errors by type
docker-compose logs --tail=500 app | grep -i error | awk '{print $NF}' | sort | uniq -c | sort -rn

# Check specific endpoint errors
curl http://localhost:3000/metrics | grep http_errors_total
```

### 4. Check Database Connectivity
```bash
# Test database connection
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres --tail=50
```

### 5. Check External Dependencies
```bash
# Test Redis
docker-compose exec redis redis-cli ping

# Check if external APIs are accessible
curl -I https://external-api.example.com/health
```

## Resolution Steps

### Scenario 1: Database Connection Issues
```bash
# Restart database
docker-compose restart postgres

# Verify connection
docker-compose exec app npm run db:migrate:deploy
```

### Scenario 2: Application Error
```bash
# Check application health
curl http://localhost:3000/health

# Restart application
docker-compose restart app

# Monitor logs
docker-compose logs -f app
```

### Scenario 3: Rate Limiting Issues
```bash
# Check rate limit settings
grep RATE_LIMIT .env

# Temporarily increase rate limits if needed
# Edit .env and restart
docker-compose restart app
```

### Scenario 4: Memory/Resource Exhaustion
```bash
# Check resource usage
docker stats --no-stream

# If memory is high, restart with more resources
# Edit docker-compose.yml to increase limits
docker-compose up -d app
```

## Verification

After implementing fixes:

1. Wait 5-10 minutes for metrics to update
2. Check error rate:
   ```bash
   curl http://localhost:3000/api/v1/monitoring/metrics | jq '.application.errorRate'
   ```
3. Verify alert has cleared:
   ```bash
   curl http://localhost:3000/api/v1/monitoring/alerts
   ```
4. Check Grafana dashboard at http://localhost:3001

## Prevention

### Short-term
- Enable more detailed error logging
- Add input validation to prevent bad requests
- Implement circuit breakers for external dependencies

### Long-term
- Add more comprehensive error handling
- Implement retry logic with exponential backoff
- Add request validation middleware
- Set up automatic scaling based on error rates
- Implement health checks for all dependencies

## Post-Incident

1. Document the root cause
2. Update this runbook with lessons learned
3. Create tickets for prevention measures
4. Schedule post-mortem meeting if impact was significant

## Related Alerts
- [Slow Response Time](./slow-response-time.md)
- [Application Down](./application-down.md)
- [Database Down](./database-down.md)

## Additional Resources
- [Error Handling Documentation](../error-handling.md)
- [Application Architecture](../architecture.md)
- Grafana Dashboard: http://localhost:3001
