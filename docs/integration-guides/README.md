# API Integration Guides

Welcome to the RTO Compliance Hub API integration guides. These comprehensive guides will help you integrate third-party services and understand how to use the API effectively.

## Quick Links

- **[OpenAPI Specification](../../openapi.yaml)** - Full API specification
- **[Swagger UI Documentation](http://localhost:3000/api/docs)** - Interactive API explorer
- **[Postman Collection](../postman/RTO-Compliance-Hub.postman_collection.json)** - Import into Postman

## Integration Guides

### Core Integrations

1. **[JotForm Webhook Integration](./jotform-webhook.md)**
   - Set up feedback collection via JotForm
   - Configure webhook endpoints
   - Map form fields to API
   - **Time to implement**: 30-60 minutes

2. **[Xero Integration](./xero-integration.md)**
   - Connect Xero for staff/payroll sync
   - OAuth 2.0 authentication
   - Automated employee synchronization
   - **Time to implement**: 1-2 hours

3. **[Accelerate LMS Integration](./accelerate-integration.md)**
   - Sync students and trainers
   - Course and enrolment data
   - Real-time updates
   - **Time to implement**: 1-2 hours

4. **[Google Drive Integration](./google-drive-integration.md)**
   - Document storage and management
   - Service account setup
   - File upload and organization
   - **Time to implement**: 1-2 hours

## Getting Started

### Prerequisites

Before integrating with the RTO Compliance Hub API, ensure you have:

1. **API Access**
   - Admin or SystemAdmin account
   - Valid API credentials
   - Access to integration service accounts

2. **Development Environment**
   - API client (Postman, cURL, or programming language)
   - Test environment for integration testing
   - SSL/TLS certificates for production

3. **Third-party Accounts**
   - Active accounts for each service you're integrating
   - API access enabled
   - Required permissions granted

### Authentication

All API requests (except public endpoints) require authentication using JWT Bearer tokens.

#### Obtaining an Access Token

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@rto.com.au",
  "password": "your_password"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900
}
```

#### Using the Token

Include the token in the Authorization header:

```bash
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Refresh

Access tokens expire after 15 minutes. Refresh using the refresh token cookie:

```bash
POST /api/v1/auth/refresh
```

## API Basics

### Base URLs

- **Development**: `http://localhost:3000`
- **Staging**: `https://staging-api.rtocompliancehub.com`
- **Production**: `https://api.rtocompliancehub.com`

### Common Headers

```
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN
Accept: application/json
```

### Response Format

All responses follow RFC 7807 Problem Details for errors:

**Success Response**:
```json
{
  "data": { ... },
  "pagination": { ... }
}
```

**Error Response**:
```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Validation failed for request body",
  "instance": "/api/v1/users",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

### Pagination

List endpoints support pagination:

```bash
GET /api/v1/users?page=1&perPage=30
```

Response includes pagination metadata:
```json
{
  "users": [...],
  "pagination": {
    "page": 1,
    "perPage": 30,
    "total": 156,
    "totalPages": 6
  }
}
```

### Rate Limiting

The API implements rate limiting to ensure fair usage:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |
| Webhooks | 30 requests | 1 minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1699887600
```

## Common Integration Patterns

### 1. Webhook Pattern
Used by: JotForm, Accelerate (if supported)

```
┌─────────┐           ┌──────────────┐
│ Service │──POST────▶│ RTO Hub API  │
│ (Source)│  webhook  │   /webhooks  │
└─────────┘           └──────────────┘
```

**Key Points**:
- Service POSTs data to your webhook endpoint
- Webhook validates and processes data
- Returns 202 Accepted immediately
- Processing happens asynchronously

### 2. OAuth 2.0 Pattern
Used by: Xero

```
┌──────┐      ┌─────────┐      ┌──────────────┐
│ User │─────▶│  Xero   │─────▶│  RTO Hub API │
│      │◀─────│ (OAuth) │◀─────│  (callback)  │
└──────┘      └─────────┘      └──────────────┘
```

**Key Points**:
- User authorizes via OAuth consent screen
- Tokens stored securely
- Automatic token refresh
- Scoped permissions

### 3. API Key Pattern
Used by: Accelerate, Google Drive (service account)

```
┌──────────────┐           ┌─────────┐
│  RTO Hub API │───────────▶│ Service │
│  (with key)  │  API calls │         │
└──────────────┘           └─────────┘
```

**Key Points**:
- API key stored in environment
- Direct API-to-API communication
- Server-side only (never expose client-side)
- Regular key rotation

## Testing Your Integration

### 1. Test in Development
- Use development base URL
- Test with sample data
- Verify error handling
- Check rate limits

### 2. Use Postman Collection
- Import the provided collection
- Set environment variables
- Run test scenarios
- Export results

### 3. Validate Responses
- Check HTTP status codes
- Verify response structure
- Test pagination
- Handle errors gracefully

### 4. Monitor Production
- Set up logging
- Track API usage
- Monitor error rates
- Review audit logs

## Best Practices

### Security
1. **Never expose API keys** in client-side code
2. **Use HTTPS** in production (always)
3. **Rotate credentials** regularly
4. **Implement retry logic** with exponential backoff
5. **Validate webhooks** using signatures when available

### Performance
1. **Use pagination** for large datasets
2. **Cache responses** when appropriate (respecting cache headers)
3. **Batch requests** when possible
4. **Implement connection pooling**
5. **Monitor response times**

### Reliability
1. **Handle rate limits** gracefully
2. **Implement circuit breakers** for external services
3. **Use idempotency keys** for critical operations
4. **Log all errors** for debugging
5. **Set up alerts** for integration failures

## Error Codes

Common HTTP status codes:

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Continue |
| 201 | Created | Resource created successfully |
| 202 | Accepted | Request queued for processing |
| 400 | Bad Request | Check request body/parameters |
| 401 | Unauthorized | Check authentication token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource exists |
| 429 | Too Many Requests | Implement rate limit handling |
| 500 | Server Error | Retry with exponential backoff |
| 503 | Service Unavailable | Check service status |

## Support and Resources

### Documentation
- **[OpenAPI Spec](../../openapi.yaml)** - Complete API specification
- **[Swagger UI](http://localhost:3000/api/docs)** - Interactive documentation
- **Integration Guides** - This directory

### Tools
- **[Postman Collection](../postman/)** - Pre-configured API requests
- **[Code Examples](../examples/)** - Sample implementations
- **[SDK Libraries](../sdk/)** - Client libraries (coming soon)

### Getting Help
- **Email Support**: support@rtocompliancehub.com
- **API Status**: [status.rtocompliancehub.com](https://status.rtocompliancehub.com)
- **Issue Tracker**: [GitHub Issues](https://github.com/rto-compliance-hub/issues)

## Next Steps

1. **Choose your integration** from the guides above
2. **Set up your development environment**
3. **Test the integration** using Postman or cURL
4. **Deploy to staging** for validation
5. **Monitor and maintain** in production

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Core integrations: JotForm, Xero, Accelerate, Google Drive
- Comprehensive OpenAPI documentation
- Postman collection available

---

**Last Updated**: 2025-11-13  
**API Version**: 1.0.0  
**OpenAPI Version**: 3.0.3
