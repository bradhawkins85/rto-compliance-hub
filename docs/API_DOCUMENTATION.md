# API Documentation

## Overview

Comprehensive API documentation for the RTO Compliance Hub, created using OpenAPI 3.0.3 specification and served via Swagger UI.

## Quick Links

- **📚 Interactive API Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **📄 OpenAPI Spec (JSON)**: [http://localhost:3000/api/openapi.json](http://localhost:3000/api/openapi.json)
- **📄 OpenAPI Spec (YAML)**: [http://localhost:3000/api/openapi.yaml](http://localhost:3000/api/openapi.yaml)
- **📮 Postman Collection**: [./postman/RTO-Compliance-Hub.postman_collection.json](./postman/RTO-Compliance-Hub.postman_collection.json)

## What's Documented

### API Endpoints (50+ endpoints)
- ✅ **Authentication**: Login, logout, token refresh, password management
- ✅ **Users**: User CRUD, credentials, professional development
- ✅ **Policies**: Policy management, versioning, standards mapping
- ✅ **Standards**: RTO compliance standards and mappings
- ✅ **Training Products**: Course management, SOP linking
- ✅ **Professional Development**: PD tracking and completion
- ✅ **Credentials**: Staff credentials and certifications
- ✅ **Feedback**: Learner, employer, and industry feedback
- ✅ **Assets**: Asset management and service tracking
- ✅ **Complaints**: Complaint workflow and resolution
- ✅ **Jobs**: Background job management
- ✅ **Audit Logs**: System audit logging
- ✅ **Monitoring**: Health checks and metrics
- ✅ **Webhooks**: JotForm integration
- ✅ **Integrations**: Xero, Accelerate, Google Drive

### Documentation Features
- ✅ Complete request/response schemas
- ✅ Example requests with realistic data
- ✅ Error response documentation (RFC 7807 format)
- ✅ Authentication flow documentation
- ✅ Rate limiting documentation
- ✅ Pagination support
- ✅ 35+ reusable schemas

## Using the Documentation

### 1. Swagger UI (Interactive)

Start the server and navigate to `/api/docs`:

```bash
npm run dev:server
# Open http://localhost:3000/api/docs in your browser
```

**Features**:
- Browse all endpoints organized by category
- View request/response schemas
- See example requests and responses
- Try API calls directly from the browser (after authentication)
- Export to different formats

### 2. Postman Collection

Import the pre-configured collection:

1. Open Postman
2. Click **Import** → **File**
3. Select `docs/postman/RTO-Compliance-Hub.postman_collection.json`
4. Set environment variables:
   - `base_url`: http://localhost:3000
   - `access_token`: (auto-saved after login)

The collection includes:
- 40+ pre-configured requests
- Auto-saving of authentication tokens
- Organized by resource type
- Example request bodies

### 3. OpenAPI Spec Files

Download the specification:

**YAML** (original source):
```bash
curl http://localhost:3000/api/openapi.yaml > openapi.yaml
```

**JSON** (for tools that prefer JSON):
```bash
curl http://localhost:3000/api/openapi.json > openapi.json
```

## Integration Guides

Comprehensive guides for integrating third-party services:

1. **[JotForm Webhook Integration](./integration-guides/jotform-webhook.md)**
   - Setup webhook endpoints
   - Field mapping configuration
   - Testing and troubleshooting
   - Time to implement: 30-60 minutes

2. **[Xero Integration](./integration-guides/xero-integration.md)**
   - OAuth 2.0 setup
   - Employee synchronization
   - Payroll data mapping
   - Time to implement: 1-2 hours

3. **[Accelerate LMS Integration](./integration-guides/accelerate-integration.md)**
   - Student and trainer sync
   - Course and enrollment data
   - Real-time updates
   - Time to implement: 1-2 hours

4. **[Google Drive Integration](./integration-guides/google-drive-integration.md)**
   - Service account setup
   - Document storage
   - File organization
   - Time to implement: 1-2 hours

## Validation and Linting

### Validate OpenAPI Spec
```bash
npm run validate:openapi
```

### Lint with Spectral
```bash
npm run lint:openapi
```

Both commands should pass with no errors for production deployment.

## API Standards

### Authentication
All authenticated endpoints require a JWT Bearer token:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Get a token from `/api/v1/auth/login`:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rto.com.au","password":"YourPassword"}'
```

### Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |
| Webhooks | 30 requests | 1 minute |

### Error Format

All errors follow RFC 7807 Problem Details:

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

```http
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

## Development

### Adding New Endpoints

When adding new endpoints to the API:

1. **Update OpenAPI spec** (`openapi.yaml`)
   - Add path and operations
   - Define request/response schemas
   - Add examples

2. **Validate changes**
   ```bash
   npm run validate:openapi
   npm run lint:openapi
   ```

3. **Update Postman collection** (optional)
   - Add new requests to collection
   - Test endpoints

4. **Document in integration guides** (if needed)
   - Add usage examples
   - Document any special requirements

### Keeping Docs in Sync

The OpenAPI specification should be updated whenever:
- New endpoints are added
- Request/response formats change
- Authentication requirements change
- Error codes are added

## Screenshots

### Swagger UI Overview
![Swagger UI showing all API endpoints](https://github.com/user-attachments/assets/bb8946ae-d627-4260-980a-0b58f8139024)

### Endpoint Detail View
![Detailed view of login endpoint with request/response examples](https://github.com/user-attachments/assets/406b5795-faea-4bb4-91e2-c79f22fdb556)

## Support

For API questions or issues:
- **Documentation**: Review the integration guides
- **Support Email**: support@rtocompliancehub.com
- **API Status**: Check `/health` endpoint

## Version History

### Version 1.0.0 (Current)
- Initial OpenAPI 3.0.3 specification
- 50+ documented endpoints
- Comprehensive schemas and examples
- Integration guides for JotForm, Xero, Accelerate, Google Drive
- Postman collection with 40+ requests
- Spectral linting configuration
