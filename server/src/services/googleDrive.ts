import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// Supported file types and their MIME types
export const SUPPORTED_FILE_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
} as const;

// Maximum file size (100MB by default)
const MAX_FILE_SIZE = parseInt(process.env.GOOGLE_DRIVE_MAX_FILE_SIZE || '104857600', 10);

// Folder structure template
export const FOLDER_STRUCTURE = {
  policies: 'Policies',
  sops: 'SOPs',
  evidence: 'Evidence',
  credentials: 'Credentials',
  assets: 'Assets',
  complaints: 'Complaints',
} as const;

export interface UploadOptions {
  file: Buffer | Readable;
  fileName: string;
  mimeType: string;
  entityType: keyof typeof FOLDER_STRUCTURE;
  entityId: string;
  uploadedBy?: string;
  description?: string;
}

export interface DriveFileInfo {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  size?: bigint;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  version: number;
}

/**
 * Google Drive Service
 * Handles OAuth2 authentication, file uploads, folder management, and link generation
 */
export class GoogleDriveService {
  private oauth2Client: OAuth2Client;
  private drive?: drive_v3.Drive;
  private rootFolderId: string;

  constructor() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Google Drive credentials not configured');
    }

    this.rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
      ],
      prompt: 'consent',
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async authorize(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Store tokens in database
    if (tokens.access_token) {
      await prisma.driveToken.create({
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          tokenType: tokens.token_type || 'Bearer',
          expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000),
          scope: tokens.scope,
        },
      });
    }

    this.initializeDrive();
  }

  /**
   * Load tokens from database and initialize Drive client
   */
  async loadTokens(): Promise<void> {
    const tokenRecord = await prisma.driveToken.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!tokenRecord) {
      throw new Error('No Drive tokens found. Please authorize first.');
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      await this.refreshAccessToken(tokenRecord);
    } else {
      this.oauth2Client.setCredentials({
        access_token: tokenRecord.accessToken,
        refresh_token: tokenRecord.refreshToken || undefined,
        token_type: tokenRecord.tokenType,
        expiry_date: tokenRecord.expiresAt.getTime(),
      });
    }

    this.initializeDrive();
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(tokenRecord: any): Promise<void> {
    if (!tokenRecord.refreshToken) {
      throw new Error('No refresh token available. Please re-authorize.');
    }

    this.oauth2Client.setCredentials({
      refresh_token: tokenRecord.refreshToken,
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);

    // Update token in database
    if (credentials.access_token) {
      await prisma.driveToken.update({
        where: { id: tokenRecord.id },
        data: {
          accessToken: credentials.access_token,
          expiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
        },
      });
    }
  }

  /**
   * Initialize Drive client
   */
  private initializeDrive(): void {
    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Ensure folder structure exists in Google Drive
   */
  private async ensureFolderStructure(entityType: keyof typeof FOLDER_STRUCTURE): Promise<string> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const folderName = FOLDER_STRUCTURE[entityType];

    // Check if folder already exists
    const response = await this.drive.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    if (response.data.files && response.data.files.length > 0) {
      return response.data.files[0].id!;
    }

    // Create folder if it doesn't exist
    const folderMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (this.rootFolderId) {
      folderMetadata.parents = [this.rootFolderId];
    }

    const folder = await this.drive.files.create({
      requestBody: folderMetadata,
      fields: 'id',
    });

    return folder.data.id!;
  }

  /**
   * Validate file before upload
   */
  validateFile(fileName: string, fileSize: number, mimeType: string): void {
    // Check file size
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Check file type
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (!extension || !(extension in SUPPORTED_FILE_TYPES)) {
      throw new Error(`File type .${extension} is not supported`);
    }

    const expectedMimeType = SUPPORTED_FILE_TYPES[extension as keyof typeof SUPPORTED_FILE_TYPES];
    if (mimeType !== expectedMimeType) {
      throw new Error(`MIME type mismatch for .${extension} file`);
    }
  }

  /**
   * Upload file to Google Drive
   * Uses resumable upload for large files (>5MB)
   */
  async uploadFile(options: UploadOptions): Promise<DriveFileInfo> {
    if (!this.drive) {
      await this.loadTokens();
    }

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const { file, fileName, mimeType, entityType, entityId, uploadedBy, description } = options;

    // Get or create folder for this entity type
    const folderId = await this.ensureFolderStructure(entityType);

    // Prepare file metadata
    const fileMetadata: drive_v3.Schema$File = {
      name: fileName,
      parents: [folderId],
      description: description || `${entityType} document for ${entityId}`,
    };

    // Convert Buffer to stream if needed
    const media = {
      mimeType,
      body: Buffer.isBuffer(file) ? Readable.from(file) : file,
    };

    // Determine if we should use resumable upload (for files > 5MB)
    const fileSize = Buffer.isBuffer(file) ? file.length : 0;
    const useResumable = fileSize > 5 * 1024 * 1024;

    // Upload file
    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink',
      supportsAllDrives: true,
      ...(useResumable && { uploadType: 'resumable' }),
    });

    // Make file accessible via link
    await this.setFilePermissions(response.data.id!);

    // Store file metadata in database
    const driveFile = await prisma.driveFile.create({
      data: {
        driveFileId: response.data.id!,
        name: response.data.name!,
        mimeType: response.data.mimeType || mimeType,
        size: response.data.size ? BigInt(response.data.size) : null,
        entityType,
        entityId,
        folderPath: FOLDER_STRUCTURE[entityType],
        webViewLink: response.data.webViewLink || null,
        webContentLink: response.data.webContentLink || null,
        thumbnailLink: response.data.thumbnailLink || null,
        uploadedBy: uploadedBy || null,
      },
    });

    return {
      id: driveFile.id,
      driveFileId: driveFile.driveFileId,
      name: driveFile.name,
      mimeType: driveFile.mimeType,
      size: driveFile.size || undefined,
      webViewLink: driveFile.webViewLink || undefined,
      webContentLink: driveFile.webContentLink || undefined,
      thumbnailLink: driveFile.thumbnailLink || undefined,
      version: driveFile.version,
    };
  }

  /**
   * Set file permissions to make it accessible via link
   */
  private async setFilePermissions(fileId: string): Promise<void> {
    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    await this.drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  }

  /**
   * Get file metadata from Google Drive
   */
  async getFileMetadata(driveFileId: string): Promise<drive_v3.Schema$File> {
    if (!this.drive) {
      await this.loadTokens();
    }

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    const response = await this.drive.files.get({
      fileId: driveFileId,
      fields: 'id, name, mimeType, size, webViewLink, webContentLink, thumbnailLink, createdTime, modifiedTime',
      supportsAllDrives: true,
    });

    return response.data;
  }

  /**
   * Get shareable link for a file
   */
  async getShareableLink(driveFileId: string): Promise<string> {
    const metadata = await this.getFileMetadata(driveFileId);
    return metadata.webViewLink || '';
  }

  /**
   * Delete file from Google Drive
   */
  async deleteFile(driveFileId: string): Promise<void> {
    if (!this.drive) {
      await this.loadTokens();
    }

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    await this.drive.files.delete({
      fileId: driveFileId,
      supportsAllDrives: true,
    });

    // Soft delete from database
    await prisma.driveFile.updateMany({
      where: { driveFileId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Create a new version of an existing file
   */
  async uploadFileVersion(
    existingDriveFileId: string,
    file: Buffer | Readable,
    fileName: string,
    mimeType: string
  ): Promise<DriveFileInfo> {
    if (!this.drive) {
      await this.loadTokens();
    }

    if (!this.drive) {
      throw new Error('Drive client not initialized');
    }

    // Get existing file record from database
    const existingFile = await prisma.driveFile.findFirst({
      where: { driveFileId: existingDriveFileId, deletedAt: null },
    });

    if (!existingFile) {
      throw new Error('File not found');
    }

    // Upload new version using the same entity info
    const newVersion = await this.uploadFile({
      file,
      fileName,
      mimeType,
      entityType: existingFile.entityType as keyof typeof FOLDER_STRUCTURE,
      entityId: existingFile.entityId,
      uploadedBy: existingFile.uploadedBy || undefined,
      description: `Version ${existingFile.version + 1}`,
    });

    // Update version number
    await prisma.driveFile.update({
      where: { id: newVersion.id },
      data: { version: existingFile.version + 1 },
    });

    return {
      ...newVersion,
      version: existingFile.version + 1,
    };
  }

  /**
   * List files for a specific entity
   */
  async listFilesForEntity(entityType: string, entityId: string): Promise<DriveFileInfo[]> {
    const files = await prisma.driveFile.findMany({
      where: {
        entityType,
        entityId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      id: file.id,
      driveFileId: file.driveFileId,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size || undefined,
      webViewLink: file.webViewLink || undefined,
      webContentLink: file.webContentLink || undefined,
      thumbnailLink: file.thumbnailLink || undefined,
      version: file.version,
    }));
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
