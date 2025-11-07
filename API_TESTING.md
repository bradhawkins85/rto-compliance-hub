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

## Training Products API

### List Training Products

```bash
curl -X GET "http://localhost:3000/api/v1/training-products?page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Query Parameters:
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 30, max: 100)
- `status`: Filter by status (Active, Inactive)
- `isAccredited`: Filter by accreditation status (true, false)
- `ownerId`: Filter by owner user ID
- `q`: Search query (searches code and name)
- `sort`: Sort by field (e.g., "name:asc,createdAt:desc")

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "code": "TLI001",
      "name": "Operate a Forklift",
      "status": "Active",
      "assessmentStrategyUrl": "https://example.com/assessment.pdf",
      "validationReportUrl": "https://example.com/validation.pdf",
      "isAccredited": true,
      "isComplete": true,
      "createdAt": "2024-11-07T09:00:00.000Z",
      "updatedAt": "2024-11-07T09:00:00.000Z",
      "owner": {
        "id": "uuid",
        "name": "John Smith",
        "email": "john@example.com"
      },
      "sops": [
        {
          "id": "uuid",
          "title": "Forklift Safety SOP",
          "version": "1.0"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Create Training Product

```bash
curl -X POST http://localhost:3000/api/v1/training-products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "TLI001",
    "name": "Operate a Forklift",
    "status": "Active",
    "assessmentStrategyUrl": "https://example.com/assessment.pdf",
    "validationReportUrl": "https://example.com/validation.pdf",
    "isAccredited": true
  }'
```

### Get Training Product Details

```bash
curl -X GET http://localhost:3000/api/v1/training-products/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response includes all linked SOPs with full details.

### Update Training Product

```bash
curl -X PATCH http://localhost:3000/api/v1/training-products/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Training Product Name",
    "status": "Inactive",
    "assessmentStrategyUrl": "https://example.com/new-assessment.pdf"
  }'
```

### Link SOPs to Training Product

```bash
curl -X POST http://localhost:3000/api/v1/training-products/{id}/sops \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sopIds": ["{sop_id_1}", "{sop_id_2}"]
  }'
```

Note: This replaces all existing SOP links with the new ones.

## SOPs API

### List SOPs

```bash
curl -X GET "http://localhost:3000/api/v1/sops?page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Query Parameters:
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 30, max: 100)
- `policyId`: Filter by policy ID
- `q`: Search query (searches title and description)
- `sort`: Sort by field (e.g., "title:asc")

### Create SOP

```bash
curl -X POST http://localhost:3000/api/v1/sops \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Forklift Safety SOP",
    "version": "1.0",
    "fileUrl": "https://example.com/sop.pdf",
    "policyId": "{policy_id}",
    "description": "Standard operating procedure for forklift safety"
  }'
```

### Get SOP Details

```bash
curl -X GET http://localhost:3000/api/v1/sops/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Response includes linked training products and standards.

### Update SOP

```bash
curl -X PATCH http://localhost:3000/api/v1/sops/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.1",
    "fileUrl": "https://example.com/sop-v1.1.pdf",
    "description": "Updated description"
  }'
```

## Professional Development (PD) API

### List PD Items

```bash
curl -X GET "http://localhost:3000/api/v1/pd?page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Query Parameters:
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 30, max: 100)
- `userId`: Filter by user ID
- `status`: Filter by status (Planned, Due, Overdue, Completed, Verified)
- `dueBefore`: Filter by due date (ISO 8601 datetime)
- `category`: Filter by category (Vocational, Industry, Pedagogical)
- `q`: Search query (searches title and description)
- `sort`: Sort by field (e.g., "dueAt:asc")

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "title": "First Aid Training",
      "description": "Annual first aid recertification",
      "hours": 8,
      "dueAt": "2024-12-01T00:00:00.000Z",
      "completedAt": null,
      "evidenceUrl": null,
      "status": "Due",
      "category": "Vocational",
      "createdAt": "2024-11-07T09:00:00.000Z",
      "updatedAt": "2024-11-07T09:00:00.000Z",
      "user": {
        "id": "uuid",
        "name": "John Smith",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

**Status Logic:**
- `Planned`: No due date or due date more than 30 days away
- `Due`: Due date within 30 days
- `Overdue`: Past due date
- `Completed`: Marked complete with evidence
- `Verified`: Manager approved

### Create PD Item

```bash
curl -X POST http://localhost:3000/api/v1/pd \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{user_id}",
    "title": "First Aid Training",
    "description": "Annual first aid recertification",
    "hours": 8,
    "dueAt": "2024-12-01T00:00:00.000Z",
    "category": "Vocational"
  }'
```

### Get PD Item Details

```bash
curl -X GET http://localhost:3000/api/v1/pd/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update PD Item

```bash
curl -X PATCH http://localhost:3000/api/v1/pd/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated PD Title",
    "hours": 10,
    "dueAt": "2024-12-15T00:00:00.000Z"
  }'
```

### Complete PD Item

```bash
curl -X POST http://localhost:3000/api/v1/pd/{id}/complete \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "evidenceUrl": "https://example.com/certificate.pdf",
    "completedAt": "2024-11-07T09:00:00.000Z"
  }'
```

Note: `completedAt` is optional and defaults to current time.

### Verify PD Item (Manager Approval)

```bash
curl -X POST http://localhost:3000/api/v1/pd/{id}/verify \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Approved - meets all requirements"
  }'
```

Prerequisite: PD item must be in `Completed` status.

## Credentials API

### List Credentials

```bash
curl -X GET "http://localhost:3000/api/v1/credentials?page=1&perPage=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Query Parameters:
- `page`: Page number (default: 1)
- `perPage`: Results per page (default: 30, max: 100)
- `userId`: Filter by user ID
- `status`: Filter by status (Active, Expired, Revoked)
- `expiresBefore`: Filter by expiry date (ISO 8601 datetime)
- `type`: Filter by type (Certificate, License, Qualification)
- `q`: Search query (searches name)
- `sort`: Sort by field (e.g., "expiresAt:asc")

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "name": "First Aid Certificate",
      "type": "Certificate",
      "issuedAt": "2023-11-07T00:00:00.000Z",
      "expiresAt": "2024-11-07T00:00:00.000Z",
      "evidenceUrl": "https://example.com/cert.pdf",
      "status": "Active",
      "isExpiringSoon": true,
      "createdAt": "2023-11-07T09:00:00.000Z",
      "updatedAt": "2024-11-07T09:00:00.000Z",
      "user": {
        "id": "uuid",
        "name": "John Smith",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 10,
    "total": 15,
    "totalPages": 2
  }
}
```

**Status Logic:**
- `Active`: Current and not expired (even if expiring soon)
- `Expired`: Past expiry date
- `Revoked`: Manually revoked
- `isExpiringSoon`: True if expires within 30 days

### Create Credential

```bash
curl -X POST http://localhost:3000/api/v1/credentials \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "{user_id}",
    "name": "First Aid Certificate",
    "type": "Certificate",
    "issuedAt": "2024-11-07T00:00:00.000Z",
    "expiresAt": "2025-11-07T00:00:00.000Z",
    "evidenceUrl": "https://example.com/certificate.pdf"
  }'
```

### Get Credential Details

```bash
curl -X GET http://localhost:3000/api/v1/credentials/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Credential

```bash
curl -X PATCH http://localhost:3000/api/v1/credentials/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "expiresAt": "2026-11-07T00:00:00.000Z",
    "evidenceUrl": "https://example.com/renewed-cert.pdf"
  }'
```

To manually revoke a credential:

```bash
curl -X PATCH http://localhost:3000/api/v1/credentials/{id} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "Revoked"
  }'
```

## Testing Workflow

### Example: Complete PD Workflow

1. **Create PD Item**
   ```bash
   PD_ID=$(curl -X POST http://localhost:3000/api/v1/pd \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "'$USER_ID'",
       "title": "First Aid Training",
       "dueAt": "2024-12-01T00:00:00.000Z",
       "category": "Vocational"
     }' | jq -r '.id')
   ```

2. **Check Status (should be "Due" if within 30 days)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/pd/$PD_ID \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Complete PD Item**
   ```bash
   curl -X POST http://localhost:3000/api/v1/pd/$PD_ID/complete \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "evidenceUrl": "https://example.com/certificate.pdf"
     }'
   ```

4. **Verify PD Item (as manager)**
   ```bash
   curl -X POST http://localhost:3000/api/v1/pd/$PD_ID/verify \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

### Example: Training Product with SOPs

1. **Create SOP**
   ```bash
   SOP_ID=$(curl -X POST http://localhost:3000/api/v1/sops \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Forklift Safety SOP",
       "version": "1.0"
     }' | jq -r '.id')
   ```

2. **Create Training Product**
   ```bash
   PRODUCT_ID=$(curl -X POST http://localhost:3000/api/v1/training-products \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "code": "TLI001",
       "name": "Operate a Forklift",
       "assessmentStrategyUrl": "https://example.com/assessment.pdf"
     }' | jq -r '.id')
   ```

3. **Link SOP to Training Product**
   ```bash
   curl -X POST http://localhost:3000/api/v1/training-products/$PRODUCT_ID/sops \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "sopIds": ["'$SOP_ID'"]
     }'
   ```

4. **Check Completeness (should be true)**
   ```bash
   curl -X GET http://localhost:3000/api/v1/training-products/$PRODUCT_ID \
     -H "Authorization: Bearer $TOKEN" | jq '.isComplete'
   ```
