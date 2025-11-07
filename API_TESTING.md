# API Testing Guide

This document provides instructions and examples for testing the newly implemented API endpoints.

## Prerequisites

1. **Start PostgreSQL Database**
   ```bash
   # Make sure PostgreSQL is running
   # Default connection: postgresql://postgres:postgres@localhost:5432/rto_compliance_hub
   ```

2. **Setup Database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

3. **Start API Server**
   ```bash
   npm run dev:server
   # Server runs on http://localhost:3000
   ```

## Authentication

All endpoints (except `/health` and `/api/v1/auth/*`) require authentication via JWT.

### 1. First-Time Setup: Create Admin User Password

Since the seed creates an admin user without a password, you need to set it via password reset:

```bash
# Request password reset (replace with your admin email if customized)
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rto-compliance-hub.local"
  }'

# In production, this would send an email with a token
# For now, check the console logs for the token (TODO: implement token generation)
```

### 2. Login to Get JWT Token

```bash
# After password is set, login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rto-compliance-hub.local",
    "password": "your-password-here"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 900,
  "token_type": "Bearer",
  "user": {
    "id": "uuid",
    "email": "admin@rto-compliance-hub.local",
    "name": "System Administrator",
    "department": "Admin",
    "roles": ["SystemAdmin"]
  }
}
```

Save the `access_token` for subsequent requests.

## User Management API

### List Users

```bash
# Basic list
curl -X GET http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With filters
curl -X GET "http://localhost:3000/api/v1/users?department=Training&status=Active&page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With search
curl -X GET "http://localhost:3000/api/v1/users?q=john" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With sorting
curl -X GET "http://localhost:3000/api/v1/users?sort=name:asc,createdAt:desc" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With field selection
curl -X GET "http://localhost:3000/api/v1/users?fields=id,name,email,department" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create User

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "trainer@example.com",
    "name": "John Smith",
    "password": "SecurePass123!",
    "department": "Training",
    "roles": ["Trainer"]
  }'
```

### Get User Details

```bash
curl -X GET http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update User

```bash
curl -X PATCH http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith Updated",
    "department": "Admin",
    "roles": ["Trainer", "Manager"]
  }'
```

### Delete User (Soft Delete)

```bash
curl -X DELETE http://localhost:3000/api/v1/users/{user_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Add Credential to User

```bash
curl -X POST http://localhost:3000/api/v1/users/{user_id}/credentials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Certificate IV in Training and Assessment",
    "type": "Certificate",
    "issuedAt": "2024-01-01T00:00:00Z",
    "expiresAt": "2027-01-01T00:00:00Z",
    "evidenceUrl": "https://example.com/cert.pdf"
  }'
```

### Get User PD Items

```bash
curl -X GET http://localhost:3000/api/v1/users/{user_id}/pd \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Policy Management API

### List Policies

```bash
# Basic list
curl -X GET http://localhost:3000/api/v1/policies \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With filters
curl -X GET "http://localhost:3000/api/v1/policies?status=Published&page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filter by standard
curl -X GET "http://localhost:3000/api/v1/policies?standardId={standard_id}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create Policy

```bash
curl -X POST http://localhost:3000/api/v1/policies \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Student Assessment Policy",
    "reviewDate": "2025-12-31T00:00:00Z",
    "fileUrl": "https://example.com/policy.pdf",
    "version": "1.0",
    "content": "Policy content here..."
  }'
```

### Get Policy Details

```bash
curl -X GET http://localhost:3000/api/v1/policies/{policy_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Policy

```bash
curl -X PATCH http://localhost:3000/api/v1/policies/{policy_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Policy Title",
    "status": "Published"
  }'
```

### Publish New Policy Version

```bash
curl -X POST http://localhost:3000/api/v1/policies/{policy_id}/publish \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "2.0",
    "content": "Updated policy content...",
    "fileUrl": "https://example.com/policy-v2.pdf"
  }'
```

### Map Policy to Standards

```bash
curl -X POST http://localhost:3000/api/v1/policies/{policy_id}/map \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "standardIds": ["{standard_id_1}", "{standard_id_2}"]
  }'
```

### Get Policy Version History

```bash
curl -X GET http://localhost:3000/api/v1/policies/{policy_id}/versions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Standards API

### List Standards

```bash
# Basic list
curl -X GET http://localhost:3000/api/v1/standards \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# With filters
curl -X GET "http://localhost:3000/api/v1/standards?category=Core+Standards&page=1" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Search by code or text
curl -X GET "http://localhost:3000/api/v1/standards?q=training" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Standard Details

```bash
curl -X GET http://localhost:3000/api/v1/standards/{standard_id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Standard Mappings

```bash
# Get all policies, SOPs, and evidence linked to a standard
curl -X GET http://localhost:3000/api/v1/standards/{standard_id}/mappings \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Response Format

### Success Response

All successful responses follow this format:

**Single Resource:**
```json
{
  "id": "uuid",
  "field1": "value",
  "field2": "value"
}
```

**Paginated List:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "perPage": 30,
    "total": 100,
    "totalPages": 4,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Response (RFC 7807)

All errors follow the RFC 7807 Problem Details format:

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Invalid request body",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "instance": "/api/v1/users"
}
```

## Status Codes

- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request
- `204 No Content` - Successful DELETE request
- `400 Bad Request` - Invalid input/validation error
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., duplicate email)
- `500 Internal Server Error` - Server error

## RBAC Permissions

The API enforces role-based access control. The seeded roles have these permissions:

**SystemAdmin** - Full access to all resources
**ComplianceAdmin** - Full access to policies, standards, and read access to users
**Trainer** - Read access to most resources, update own profile
**Manager** - Read access to users and policies in their department
**Staff** - Read access to policies and standards

## Testing Notes

1. **Authentication**: All endpoints require valid JWT token except health check
2. **Audit Logging**: All operations are logged to the audit_logs table
3. **Soft Deletes**: Users are soft deleted (status='Inactive'), not removed from database
4. **Pagination**: Default is 30 items per page, maximum is 100
5. **Field Selection**: Use `?fields=id,name,email` to reduce response payload
6. **Sorting**: Use `?sort=field1:asc,field2:desc` for multi-field sorting

## Health Check

```bash
curl -X GET http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-07T09:00:00.000Z",
  "uptime": 123.45
}
```
