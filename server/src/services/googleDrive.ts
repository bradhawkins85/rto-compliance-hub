import { google } from 'googleapis';
import { PrismaClient } from '@prisma/client';
import { getAuthenticatedDriveClient } from './googleDriveAuth';
import stream from 'stream';

const prisma = new PrismaClient();

// Root folder ID from environment or null for root
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || null;

// Maximum file size: 100MB
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'image/png',
  'image/jpeg',
  'image/jpg',
];

// Folder structure template
export const FOLDER_STRUCTURE = {
  policies: 'Policies',
  sops: 'SOPs',
  evidence: 'Evidence',
  credentials: 'Credentials',
  training: 'Training Materials',
  assets: 'Asset Documentation',
  complaints: 'Complaints',
};

/**
 * Validate file type
 */
export function validateFileType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mimeType);
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): boolean {
  return size <= MAX_FILE_SIZE;
}

/**
 * Get or create root folder structure
 */
export async function ensureFolderStructure(connectionId: string): Promise<Map<string, string>> {
  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  const folderIds = new Map<string, string>();

  // Check if folders already exist in database
  const existingFolders = await prisma.googleDriveFolder.findMany({
    where: { driveConnectionId: connectionId },
  });

  // If folders exist, return them
  if (existingFolders.length > 0) {
    existingFolders.forEach(folder => {
      if (folder.folderType) {
        folderIds.set(folder.folderType, folder.driveFolderId);
      }
    });
    
    // If all folder types exist, return
    if (folderIds.size === Object.keys(FOLDER_STRUCTURE).length) {
      return folderIds;
    }
  }

  // Create missing folders
  for (const [key, name] of Object.entries(FOLDER_STRUCTURE)) {
    if (folderIds.has(key)) {
      continue; // Already exists
    }

    try {
      const folderMetadata = {
        name: name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ROOT_FOLDER_ID ? [ROOT_FOLDER_ID] : undefined,
      };

      const folder = await client.drive.files.create({
        requestBody: folderMetadata,
        fields: 'id, name, parents',
      });

      const folderId = folder.data.id;
      if (!folderId) {
        throw new Error(`Failed to create folder: ${name}`);
      }

      // Store in database
      await prisma.googleDriveFolder.create({
        data: {
          driveConnectionId: connectionId,
          driveFolderId: folderId,
          name: name,
          parentFolderId: ROOT_FOLDER_ID || undefined,
          folderType: key,
          path: `/${name}`,
        },
      });

      folderIds.set(key, folderId);
      console.log(`Created folder: ${name} (${folderId})`);
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error);
      throw new Error(`Failed to create folder structure: ${name}`);
    }
  }

  return folderIds;
}

/**
 * Get folder ID for entity type
 */
export async function getFolderIdForEntityType(
  connectionId: string,
  entityType: string
): Promise<string> {
  // Normalize entity type to folder type
  const folderTypeMap: { [key: string]: string } = {
    Policy: 'policies',
    SOP: 'sops',
    Evidence: 'evidence',
    Credential: 'credentials',
    TrainingProduct: 'training',
    Asset: 'assets',
    Complaint: 'complaints',
  };

  const folderType = folderTypeMap[entityType] || 'evidence';

  // Ensure folder structure exists
  const folderIds = await ensureFolderStructure(connectionId);
  
  const folderId = folderIds.get(folderType);
  if (!folderId) {
    throw new Error(`Folder not found for entity type: ${entityType}`);
  }

  return folderId;
}

/**
 * Upload file to Google Drive (simple upload for files < 5MB)
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  entityType: string,
  entityId: string,
  uploadedBy?: string
): Promise<any> {
  // Validate file
  if (!validateFileType(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  if (!validateFileSize(fileBuffer.length)) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    // Get folder ID for entity type
    const folderId = await getFolderIdForEntityType(client.connectionId, entityType);

    // Create readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    // Upload file
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    const file = await client.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
    });

    if (!file.data.id) {
      throw new Error('Failed to upload file - no file ID returned');
    }

    // Make file accessible via link
    await client.drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Store file metadata in database
    const googleDriveFile = await prisma.googleDriveFile.create({
      data: {
        driveConnectionId: client.connectionId,
        driveFileId: file.data.id,
        driveFolderId: folderId,
        entityType: entityType,
        entityId: entityId,
        fileName: fileName,
        mimeType: mimeType,
        fileSize: parseInt(file.data.size || '0'),
        webViewLink: file.data.webViewLink || undefined,
        webContentLink: file.data.webContentLink || undefined,
        thumbnailLink: file.data.thumbnailLink || undefined,
        uploadedBy: uploadedBy || undefined,
        uploadedAt: new Date(),
      },
    });

    return {
      id: googleDriveFile.id,
      driveFileId: file.data.id,
      fileName: fileName,
      fileSize: googleDriveFile.fileSize,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
      thumbnailLink: file.data.thumbnailLink,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive:', error);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Upload file using resumable upload (for files > 5MB)
 */
export async function uploadFileResumable(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  entityType: string,
  entityId: string,
  uploadedBy?: string,
  onProgress?: (progress: number) => void
): Promise<any> {
  // Validate file
  if (!validateFileType(mimeType)) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }

  if (!validateFileSize(fileBuffer.length)) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    // Get folder ID for entity type
    const folderId = await getFolderIdForEntityType(client.connectionId, entityType);

    // Create readable stream from buffer
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    // Upload file with resumable upload
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: bufferStream,
    };

    // Use resumable upload for larger files
    const file = await client.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
      supportsAllDrives: true,
    });

    if (!file.data.id) {
      throw new Error('Failed to upload file - no file ID returned');
    }

    // Make file accessible via link
    await client.drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Store file metadata in database
    const googleDriveFile = await prisma.googleDriveFile.create({
      data: {
        driveConnectionId: client.connectionId,
        driveFileId: file.data.id,
        driveFolderId: folderId,
        entityType: entityType,
        entityId: entityId,
        fileName: fileName,
        mimeType: mimeType,
        fileSize: parseInt(file.data.size || '0'),
        webViewLink: file.data.webViewLink || undefined,
        webContentLink: file.data.webContentLink || undefined,
        thumbnailLink: file.data.thumbnailLink || undefined,
        uploadedBy: uploadedBy || undefined,
        uploadedAt: new Date(),
      },
    });

    return {
      id: googleDriveFile.id,
      driveFileId: file.data.id,
      fileName: fileName,
      fileSize: googleDriveFile.fileSize,
      webViewLink: file.data.webViewLink,
      webContentLink: file.data.webContentLink,
      thumbnailLink: file.data.thumbnailLink,
    };
  } catch (error) {
    console.error('Error uploading file to Google Drive (resumable):', error);
    throw new Error('Failed to upload file to Google Drive');
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(driveFileId: string): Promise<any> {
  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    const file = await client.drive.files.get({
      fileId: driveFileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, modifiedTime, version',
    });

    return file.data;
  } catch (error) {
    console.error('Error getting file metadata:', error);
    throw new Error('Failed to get file metadata');
  }
}

/**
 * List files for entity
 */
export async function listFilesForEntity(
  entityType: string,
  entityId: string
): Promise<any[]> {
  const files = await prisma.googleDriveFile.findMany({
    where: {
      entityType,
      entityId,
      deletedAt: null,
    },
    orderBy: {
      uploadedAt: 'desc',
    },
  });

  return files;
}

/**
 * Delete file from Google Drive
 */
export async function deleteFile(fileId: string): Promise<void> {
  const file = await prisma.googleDriveFile.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new Error('File not found');
  }

  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    // Delete from Google Drive
    await client.drive.files.delete({
      fileId: file.driveFileId,
    });

    // Soft delete in database
    await prisma.googleDriveFile.update({
      where: { id: fileId },
      data: {
        deletedAt: new Date(),
      },
    });

    console.log(`Deleted file: ${file.fileName} (${file.driveFileId})`);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}

/**
 * Create a new version of a file
 */
export async function createFileVersion(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  entityType: string,
  entityId: string,
  uploadedBy?: string
): Promise<any> {
  // Mark existing files as not latest version
  await prisma.googleDriveFile.updateMany({
    where: {
      entityType,
      entityId,
      isLatestVersion: true,
      deletedAt: null,
    },
    data: {
      isLatestVersion: false,
    },
  });

  // Upload new version
  const result = await uploadFile(fileBuffer, fileName, mimeType, entityType, entityId, uploadedBy);

  // Get current version number
  const existingVersions = await prisma.googleDriveFile.count({
    where: {
      entityType,
      entityId,
      deletedAt: null,
    },
  });

  // Update version number
  await prisma.googleDriveFile.update({
    where: { id: result.id },
    data: {
      version: existingVersions,
      isLatestVersion: true,
    },
  });

  return result;
}

/**
 * Get file preview URL
 */
export async function getFilePreviewUrl(driveFileId: string): Promise<string | null> {
  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    const file = await client.drive.files.get({
      fileId: driveFileId,
      fields: 'webViewLink, thumbnailLink',
    });

    return file.data.webViewLink || file.data.thumbnailLink || null;
  } catch (error) {
    console.error('Error getting file preview URL:', error);
    return null;
  }
}

/**
 * Update file permissions
 */
export async function updateFilePermissions(
  driveFileId: string,
  role: 'reader' | 'writer' | 'commenter',
  type: 'user' | 'group' | 'domain' | 'anyone',
  emailAddress?: string
): Promise<void> {
  const client = await getAuthenticatedDriveClient();
  
  if (!client) {
    throw new Error('No active Google Drive connection');
  }

  try {
    await client.drive.permissions.create({
      fileId: driveFileId,
      requestBody: {
        role,
        type,
        emailAddress,
      },
    });

    console.log(`Updated permissions for file: ${driveFileId}`);
  } catch (error) {
    console.error('Error updating file permissions:', error);
    throw new Error('Failed to update file permissions');
  }
}
