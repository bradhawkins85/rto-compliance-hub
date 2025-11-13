# Google Drive Integration Guide

## Overview
This guide explains how to integrate Google Drive with the RTO Compliance Hub for document storage, sharing, and management of compliance evidence and training materials.

## Prerequisites
- Google Workspace or Google Cloud Platform account
- Admin or SystemAdmin role in RTO Compliance Hub
- Google Cloud project with Drive API enabled

## Step 1: Create Google Cloud Project

1. **Visit Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. **Create a new project**:
   - Project name: "RTO Compliance Hub"
   - Organization: Your organization
3. **Note the project ID** for later use

## Step 2: Enable Google Drive API

1. **Navigate to APIs & Services** → **Library**
2. **Search for "Google Drive API"**
3. **Click Enable**
4. **Wait for activation** (usually instant)

## Step 3: Create Service Account

### Create Service Account
1. **Go to IAM & Admin** → **Service Accounts**
2. **Click "Create Service Account"**:
   - Name: "RTO Compliance Hub Drive Access"
   - Description: "Service account for RTO Hub Google Drive integration"
3. **Grant permissions**:
   - Role: "Drive API - Editor" (or custom role with required permissions)

### Generate Key
1. **Click on the service account** you just created
2. **Go to Keys tab** → **Add Key** → **Create new key**
3. **Choose JSON** format
4. **Download the key file** (keep this secure!)

## Step 4: Configure Drive Access

### Share Drive Folders
1. **Create a root folder** in Google Drive for RTO Hub (e.g., "RTO Compliance Hub")
2. **Share the folder** with the service account email:
   - Right-click folder → Share
   - Add service account email (e.g., `rto-hub@project-id.iam.gserviceaccount.com`)
   - Give "Editor" access
3. **Create subfolders** for organization:
   - `/Policies`
   - `/Evidence`
   - `/Training Materials`
   - `/Staff Credentials`
   - `/Feedback`

### Note Folder IDs
1. **Open each folder** in Google Drive
2. **Copy the folder ID** from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
3. **Save these IDs** for configuration

## Step 5: Configure Environment Variables

### Method 1: Service Account Key File
```bash
# Google Drive Configuration
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_KEY_FILE=/path/to/service-account-key.json
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_root_folder_id

# Folder IDs
GOOGLE_DRIVE_POLICIES_FOLDER_ID=policies_folder_id
GOOGLE_DRIVE_EVIDENCE_FOLDER_ID=evidence_folder_id
GOOGLE_DRIVE_TRAINING_FOLDER_ID=training_folder_id
GOOGLE_DRIVE_CREDENTIALS_FOLDER_ID=credentials_folder_id
```

### Method 2: Environment Variables (Recommended for Production)
```bash
# Google Drive Configuration
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_CLIENT_EMAIL=service-account@project-id.iam.gserviceaccount.com
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_root_folder_id
```

## Step 6: Test the Connection

### Verify Connection
```bash
GET /api/v1/files/google-drive/status
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Expected response:
```json
{
  "connected": true,
  "serviceAccount": "rto-hub@project-id.iam.gserviceaccount.com",
  "rootFolder": {
    "id": "abc123def456",
    "name": "RTO Compliance Hub",
    "writable": true
  },
  "folders": {
    "policies": "folder_id_1",
    "evidence": "folder_id_2",
    "training": "folder_id_3",
    "credentials": "folder_id_4"
  }
}
```

## Step 7: Upload Files

### Upload via API
```bash
POST /api/v1/files/google-drive/upload
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

file: [binary file data]
folderId: policies_folder_id  # Optional, uses root if not specified
name: "Student-Welfare-Policy-v2.pdf"  # Optional, uses original filename
```

Response:
```json
{
  "fileId": "1ABC...xyz",
  "name": "Student-Welfare-Policy-v2.pdf",
  "webViewLink": "https://drive.google.com/file/d/1ABC...xyz/view",
  "webContentLink": "https://drive.google.com/uc?id=1ABC...xyz&export=download",
  "mimeType": "application/pdf",
  "size": 1048576,
  "createdTime": "2025-11-13T10:30:00Z"
}
```

### Upload with Metadata
```bash
POST /api/v1/files/google-drive/upload
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

file: [binary file data]
folderId: policies_folder_id
metadata: {
  "description": "Student welfare policy version 2",
  "category": "policy",
  "reviewDate": "2026-11-13",
  "owner": "compliance@rto.com.au"
}
```

## Step 8: Link Files to Entities

### Link to Policy
```bash
POST /api/v1/policies/{policyId}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "fileUrl": "https://drive.google.com/file/d/1ABC...xyz/view",
  "googleDriveFileId": "1ABC...xyz"
}
```

### Link to Evidence
```bash
POST /api/v1/evidence
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "entityType": "standard",
  "entityId": "STD-1",
  "url": "https://drive.google.com/file/d/1ABC...xyz/view",
  "googleDriveFileId": "1ABC...xyz",
  "description": "Evidence of compliance with Standard 1"
}
```

## Step 9: File Operations

### List Files in Folder
```bash
GET /api/v1/files/google-drive/list?folderId=policies_folder_id&page=1&perPage=50
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Get File Metadata
```bash
GET /api/v1/files/google-drive/{fileId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Update File
```bash
PATCH /api/v1/files/google-drive/{fileId}
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Updated-Policy-Name.pdf",
  "description": "Updated description"
}
```

### Delete File
```bash
DELETE /api/v1/files/google-drive/{fileId}
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Share File
```bash
POST /api/v1/files/google-drive/{fileId}/share
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "email": "user@rto.com.au",
  "role": "reader",  # Options: reader, commenter, writer
  "notify": true
}
```

## Advanced Features

### Batch Upload
Upload multiple files at once:

```bash
POST /api/v1/files/google-drive/batch-upload
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: multipart/form-data

files: [file1, file2, file3]
folderId: policies_folder_id
```

### Search Files
```bash
GET /api/v1/files/google-drive/search?q=policy&mimeType=application/pdf
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Create Folder
```bash
POST /api/v1/files/google-drive/folders
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "name": "Q4 2025 Audits",
  "parentFolderId": "root_folder_id"
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors
**Symptoms**: 401 or 403 errors
**Solutions**:
- Verify service account key is valid
- Check service account has access to Drive
- Ensure API is enabled in Google Cloud
- Verify folder sharing permissions
- Check private key formatting (newlines)

#### 2. File Upload Fails
**Symptoms**: Upload times out or fails
**Solutions**:
- Check file size (max 5GB per file)
- Verify MIME type is allowed
- Ensure sufficient Drive storage
- Check network connectivity
- Try smaller batch sizes

#### 3. Permission Denied
**Symptoms**: Cannot access files or folders
**Solutions**:
- Verify service account has Editor access
- Check folder is shared with service account
- Ensure folder ID is correct
- Verify API permissions in Google Cloud

#### 4. Slow Performance
**Symptoms**: Uploads/downloads are slow
**Solutions**:
- Use batch operations for multiple files
- Implement file chunking for large files
- Check internet connection speed
- Consider using resumable uploads

## Security Best Practices

1. **Service Account Key Protection**
   - Never commit key files to version control
   - Use environment variables for secrets
   - Rotate keys annually
   - Limit key access to administrators

2. **Folder Permissions**
   - Use principle of least privilege
   - Regularly audit folder access
   - Remove access when no longer needed
   - Use domain-wide delegation carefully

3. **File Access Control**
   - Set appropriate file permissions
   - Use internal sharing when possible
   - Enable link expiration for sensitive files
   - Monitor sharing activity

4. **Compliance**
   - Maintain audit logs of file access
   - Implement data retention policies
   - Ensure GDPR/Privacy Act compliance
   - Regular security reviews

## Rate Limits

Google Drive API quotas (per project):
- **Queries per day**: 1,000,000,000
- **Queries per user per 100 seconds**: 1,000
- **Queries per 100 seconds**: 20,000

RTO Hub rate limiting:
- Implements exponential backoff
- Queues requests during rate limiting
- Provides retry logic for transient failures

## File Organization Best Practices

### Folder Structure
```
RTO Compliance Hub/
├── Policies/
│   ├── Current/
│   ├── Archived/
│   └── Draft/
├── Evidence/
│   ├── By Standard/
│   │   ├── Standard-1/
│   │   ├── Standard-2/
│   │   └── ...
│   └── By Year/
├── Training Materials/
│   ├── By Course/
│   │   ├── TLI41221/
│   │   └── ...
│   ├── SOPs/
│   └── Assessment Tools/
├── Staff Credentials/
│   ├── Active/
│   └── Expired/
└── Feedback/
    ├── Learner/
    ├── Employer/
    └── Industry/
```

### Naming Conventions
- Use clear, descriptive names
- Include version numbers: `Policy-Name-v2.pdf`
- Add dates for time-sensitive docs: `Audit-Report-2025-11.pdf`
- Avoid special characters: Use hyphens instead of spaces

## Monitoring and Maintenance

### Usage Monitoring
```bash
GET /api/v1/files/google-drive/usage
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Response:
```json
{
  "storageUsed": "45.2 GB",
  "storageLimit": "100 GB",
  "fileCount": 1523,
  "folderCount": 48,
  "apiCallsToday": 12450,
  "quotaRemaining": 987550
}
```

### Cleanup Old Files
```bash
POST /api/v1/files/google-drive/cleanup
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "olderThan": "2023-01-01",
  "folderId": "archived_folder_id",
  "dryRun": true  # Set to false to actually delete
}
```

## Support Resources

- **Google Drive API Docs**: [https://developers.google.com/drive/api/v3/about-sdk](https://developers.google.com/drive/api/v3/about-sdk)
- **Google Cloud Support**: [https://cloud.google.com/support](https://cloud.google.com/support)
- **RTO Hub API Docs**: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **RTO Hub Support**: support@rtocompliancehub.com

## Testing Checklist

- [ ] Google Cloud project created
- [ ] Drive API enabled
- [ ] Service account created
- [ ] Service account key downloaded
- [ ] Root folder created and shared
- [ ] Environment variables configured
- [ ] Connection verified
- [ ] File upload tested
- [ ] File download tested
- [ ] Folder operations tested
- [ ] Permissions configured correctly
- [ ] Rate limiting understood
- [ ] Security practices implemented
- [ ] Backup strategy planned

## Next Steps

- Set up [Document Version Control](../features/version-control.md)
- Configure [Automated Backups](../features/backups.md)
- Explore [Search and Discovery](../features/search.md)
- Enable [Audit Trail](../features/audit-trail.md)
