# Google Drive File Storage Integration

This document describes the Google Drive integration for file storage and management in the RTO Compliance Hub.

## Overview

The Google Drive integration provides secure file storage for:
- Policy documents
- SOPs (Standard Operating Procedures)
- Evidence files
- Credentials
- Training materials
- Asset documentation
- Complaint records

## Features

### ✅ Implemented Features

1. **OAuth2 Authentication**
   - Secure OAuth2 flow for Google Drive access
   - Automatic token refresh
   - Token encryption in database

2. **File Upload**
   - Simple uploads for files < 5MB
   - Resumable uploads for larger files (up to 100MB)
   - Support for multiple file types: PDF, DOCX, XLSX, PNG, JPG

3. **Folder Management**
   - Automatic folder structure creation
   - Organized by entity type (policies, sops, evidence, etc.)
   - Configurable root folder

4. **File Operations**
   - Upload files
   - List files by entity
   - Get file metadata
   - Delete files (soft delete)
   - Version tracking
   - Preview URLs

5. **Security**
   - Encrypted token storage
   - Role-based access control
   - File type validation
   - File size limits (100MB max)

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - Development: `http://localhost:3000/api/v1/files/google-drive/auth/callback`
     - Production: `https://your-domain.com/api/v1/files/google-drive/auth/callback`
   - Save the Client ID and Client Secret

### 2. Environment Configuration

Add the following to your `.env` file:

```env
# Google Drive Integration
GOOGLE_DRIVE_CLIENT_ID="your-client-id"
GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
GOOGLE_DRIVE_REDIRECT_URI="http://localhost:3000/api/v1/files/google-drive/auth/callback"
GOOGLE_DRIVE_ROOT_FOLDER_ID="" # Optional: specify a root folder for all uploads
```

### 3. Database Migration

Run the database migration to create the necessary tables:

```bash
npm run db:migrate
```

This will create the following tables:
- `google_drive_connections` - OAuth connection details
- `google_drive_folders` - Folder structure
- `google_drive_files` - File metadata
- `google_drive_sync_logs` - Sync operation logs

## API Endpoints

### Authentication

#### `GET /api/v1/files/google-drive/auth/initiate`
Get the authorization URL to start OAuth2 flow.

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "message": "Please visit the URL to authorize Google Drive access"
}
```

#### `GET /api/v1/files/google-drive/auth/callback`
OAuth2 callback endpoint (handled by Google).

**Query Parameters:**
- `code` - Authorization code from Google

**Response:**
```json
{
  "message": "Google Drive connected successfully",
  "connectionId": "uuid",
  "email": "user@gmail.com"
}
```

#### `GET /api/v1/files/google-drive/auth/status`
Check connection status.

**Response:**
```json
{
  "connected": true,
  "email": "user@gmail.com",
  "lastSyncAt": "2024-01-01T00:00:00.000Z",
  "expiresAt": "2024-01-01T01:00:00.000Z"
}
```

#### `GET /api/v1/files/google-drive/auth/test`
Test the connection to Google Drive.

**Response:**
```json
{
  "success": true,
  "message": "Successfully connected to Google Drive",
  "email": "user@gmail.com"
}
```

#### `POST /api/v1/files/google-drive/auth/disconnect`
Disconnect Google Drive integration.

**Response:**
```json
{
  "message": "Google Drive disconnected successfully"
}
```

### File Operations

#### `POST /api/v1/files/google-drive/upload`
Upload a file to Google Drive.

**Request Body:**
```json
{
  "fileName": "policy-document.pdf",
  "mimeType": "application/pdf",
  "entityType": "Policy",
  "entityId": "policy-uuid",
  "fileData": "base64-encoded-file-content"
}
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "file": {
    "id": "uuid",
    "driveFileId": "google-drive-file-id",
    "fileName": "policy-document.pdf",
    "fileSize": 1024,
    "webViewLink": "https://drive.google.com/file/d/...",
    "webContentLink": "https://drive.google.com/uc?id=...",
    "thumbnailLink": "https://..."
  }
}
```

#### `GET /api/v1/files/google-drive/list?entityType=Policy&entityId=uuid`
List files for an entity.

**Query Parameters:**
- `entityType` - Type of entity (Policy, SOP, Evidence, etc.)
- `entityId` - ID of the entity

**Response:**
```json
{
  "files": [
    {
      "id": "uuid",
      "driveFileId": "google-drive-file-id",
      "fileName": "policy-document.pdf",
      "mimeType": "application/pdf",
      "fileSize": 1024,
      "version": 1,
      "isLatestVersion": true,
      "uploadedAt": "2024-01-01T00:00:00.000Z",
      "webViewLink": "https://..."
    }
  ],
  "total": 1
}
```

#### `GET /api/v1/files/google-drive/:fileId`
Get file metadata.

**Response:**
```json
{
  "id": "uuid",
  "driveFileId": "google-drive-file-id",
  "fileName": "policy-document.pdf",
  "driveMetadata": {
    "id": "google-drive-file-id",
    "name": "policy-document.pdf",
    "mimeType": "application/pdf",
    "size": "1024",
    "modifiedTime": "2024-01-01T00:00:00.000Z"
  }
}
```

#### `GET /api/v1/files/google-drive/:fileId/preview`
Get file preview URL.

**Response:**
```json
{
  "previewUrl": "https://drive.google.com/file/d/..."
}
```

#### `DELETE /api/v1/files/google-drive/:fileId`
Delete a file (soft delete).

**Response:**
```json
{
  "message": "File deleted successfully"
}
```

## Usage Examples

### Connecting Google Drive

1. Get the authorization URL:
```bash
curl -X GET http://localhost:3000/api/v1/files/google-drive/auth/initiate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. Visit the URL in your browser and authorize access

3. After authorization, you'll be redirected to the callback URL

4. Test the connection:
```bash
curl -X GET http://localhost:3000/api/v1/files/google-drive/auth/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Uploading a File

```bash
# Upload a policy document
curl -X POST http://localhost:3000/api/v1/files/google-drive/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "privacy-policy.pdf",
    "mimeType": "application/pdf",
    "entityType": "Policy",
    "entityId": "policy-uuid",
    "fileData": "base64-encoded-content"
  }'
```

### Listing Files

```bash
# List all policy documents
curl -X GET "http://localhost:3000/api/v1/files/google-drive/list?entityType=Policy&entityId=policy-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## File Type Support

The integration supports the following file types:

- **PDF**: `application/pdf`
- **DOCX**: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- **XLSX**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **PNG**: `image/png`
- **JPG/JPEG**: `image/jpeg`, `image/jpg`

Maximum file size: **100MB**

## Folder Structure

Files are automatically organized into the following folder structure:

```
Root Folder (optional)
├── Policies
├── SOPs
├── Evidence
├── Credentials
├── Training Materials
├── Asset Documentation
└── Complaints
```

## Security Considerations

1. **Token Encryption**: OAuth tokens are encrypted before storage using AES-256
2. **Access Control**: All endpoints require authentication and appropriate permissions
3. **File Validation**: File types and sizes are validated before upload
4. **Soft Delete**: Files are soft-deleted to maintain audit trail
5. **Automatic Token Refresh**: Expired tokens are automatically refreshed

## Testing

Use the provided test script to verify the integration:

```bash
# Check connection status
node server/test/test-google-drive.js status

# Get authorization URL
node server/test/test-google-drive.js auth

# Test connection
node server/test/test-google-drive.js test

# Test file upload
node server/test/test-google-drive.js upload
```

## Troubleshooting

### Common Issues

1. **"No active Google Drive connection found"**
   - Run the OAuth flow to connect Google Drive
   - Check if tokens have expired

2. **"File type not allowed"**
   - Verify the file MIME type is in the allowed list
   - Check file extension matches MIME type

3. **"File size exceeds maximum"**
   - Maximum file size is 100MB
   - Use resumable upload for large files

4. **"Failed to refresh tokens"**
   - Re-authorize the application
   - Check if refresh token is still valid

### Debug Mode

Enable debug logging in your `.env`:

```env
NODE_ENV=development
```

## Future Enhancements

Potential improvements for future versions:

- [ ] Batch file uploads
- [ ] File search functionality
- [ ] Advanced permission management
- [ ] File sharing with external users
- [ ] Integration with Google Workspace
- [ ] Automatic backup scheduling
- [ ] File compression before upload
- [ ] Support for additional file types
- [ ] Audit trail for file access
- [ ] Custom folder naming templates

## API Rate Limits

Google Drive API has the following rate limits:
- 1,000 requests per 100 seconds per user
- 10,000 requests per 100 seconds per project

The integration handles rate limiting gracefully and will retry failed requests.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review server logs for detailed error messages
3. Verify Google Cloud Console configuration
4. Contact system administrator
