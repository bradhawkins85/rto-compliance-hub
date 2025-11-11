import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as googleDriveAuth from '../services/googleDriveAuth';
import * as googleDrive from '../services/googleDrive';

const prisma = new PrismaClient();

/**
 * Initiate OAuth2 flow
 */
export async function initiateAuth(req: Request, res: Response): Promise<void> {
  try {
    const authUrl = await googleDriveAuth.getAuthorizationUrl();
    
    res.status(200).json({
      authUrl,
      message: 'Please visit the URL to authorize Google Drive access',
    });
  } catch (error) {
    console.error('Error initiating Google Drive auth:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to initiate authorization',
    });
  }
}

/**
 * OAuth2 callback handler
 */
export async function handleCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Authorization code is required',
      });
      return;
    }

    // Exchange code for tokens
    const tokens = await googleDriveAuth.exchangeCodeForTokens(code);
    
    // Get user email
    const email = await googleDriveAuth.getUserEmail(tokens);

    // Store tokens
    const connectionId = await googleDriveAuth.storeTokens(tokens, email || undefined);

    // Ensure folder structure is created
    const client = await googleDriveAuth.getAuthenticatedDriveClient();
    if (client) {
      await googleDrive.ensureFolderStructure(client.connectionId);
    }

    res.status(200).json({
      message: 'Google Drive connected successfully',
      connectionId,
      email,
    });
  } catch (error) {
    console.error('Error handling Google Drive callback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to complete authorization',
    });
  }
}

/**
 * Test connection
 */
export async function testConnection(req: Request, res: Response): Promise<void> {
  try {
    const result = await googleDriveAuth.testConnection();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Connection Failed',
        status: 400,
        detail: result.message,
      });
    }
  } catch (error) {
    console.error('Error testing Google Drive connection:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Connection test failed',
    });
  }
}

/**
 * Disconnect Google Drive
 */
export async function disconnect(req: Request, res: Response): Promise<void> {
  try {
    const connection = await googleDriveAuth.getActiveConnection();

    if (!connection) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'No active Google Drive connection found',
      });
      return;
    }

    await googleDriveAuth.disconnectGoogleDrive(connection.id);

    res.status(200).json({
      message: 'Google Drive disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting Google Drive:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to disconnect',
    });
  }
}

/**
 * Upload file (base64 body)
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    const { fileName, mimeType, entityType, entityId, fileData } = req.body;

    // Validate required fields
    if (!fileName || !mimeType || !entityType || !entityId || !fileData) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'fileName, mimeType, entityType, entityId, and fileData are required',
      });
      return;
    }

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Get user ID from request (set by auth middleware)
    const userId = (req as any).user?.id;

    // Upload file
    const result = fileBuffer.length > 5 * 1024 * 1024
      ? await googleDrive.uploadFileResumable(fileBuffer, fileName, mimeType, entityType, entityId, userId)
      : await googleDrive.uploadFile(fileBuffer, fileName, mimeType, entityType, entityId, userId);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: result,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
}

/**
 * Upload file (multipart form-data)
 */
export async function uploadFileMultipart(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    const { entityType, entityId } = req.body;

    if (!file) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'No file provided',
      });
      return;
    }

    if (!entityType || !entityId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'entityType and entityId are required',
      });
      return;
    }

    // Get user ID from request (set by auth middleware)
    const userId = (req as any).user?.id;

    // Upload file
    const result = file.size > 5 * 1024 * 1024
      ? await googleDrive.uploadFileResumable(file.buffer, file.originalname, file.mimetype, entityType, entityId, userId)
      : await googleDrive.uploadFile(file.buffer, file.originalname, file.mimetype, entityType, entityId, userId);

    res.status(201).json({
      message: 'File uploaded successfully',
      file: result,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to upload file',
    });
  }
}

/**
 * Upload multiple files (multipart form-data)
 */
export async function uploadMultipleFiles(req: Request, res: Response): Promise<void> {
  try {
    const files = req.files as Express.Multer.File[];
    const { entityType, entityId } = req.body;

    if (!files || files.length === 0) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'No files provided',
      });
      return;
    }

    if (!entityType || !entityId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'entityType and entityId are required',
      });
      return;
    }

    // Get user ID from request (set by auth middleware)
    const userId = (req as any).user?.id;

    // Upload all files
    const uploadPromises = files.map(file =>
      file.size > 5 * 1024 * 1024
        ? googleDrive.uploadFileResumable(file.buffer, file.originalname, file.mimetype, entityType, entityId, userId)
        : googleDrive.uploadFile(file.buffer, file.originalname, file.mimetype, entityType, entityId, userId)
    );

    const results = await Promise.allSettled(uploadPromises);

    const successful = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
    const failed = results.filter(r => r.status === 'rejected').map((r, index) => ({
      fileName: files[index].originalname,
      error: (r as PromiseRejectedResult).reason.message,
    }));

    res.status(207).json({ // 207 Multi-Status
      message: `Uploaded ${successful.length} of ${files.length} files`,
      successful: successful.length,
      failed: failed.length,
      total: files.length,
      files: successful,
      errors: failed,
    });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to upload files',
    });
  }
}

/**
 * List files for entity
 */
export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId || typeof entityType !== 'string' || typeof entityId !== 'string') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'entityType and entityId are required',
      });
      return;
    }

    const files = await googleDrive.listFilesForEntity(entityType, entityId);

    res.status(200).json({
      files,
      total: files.length,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to list files',
    });
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { fileId } = req.params;

    const file = await prisma.googleDriveFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'File not found',
      });
      return;
    }

    // Get latest metadata from Google Drive
    const driveMetadata = await googleDrive.getFileMetadata(file.driveFileId);

    res.status(200).json({
      ...file,
      driveMetadata,
    });
  } catch (error) {
    console.error('Error getting file metadata:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get file metadata',
    });
  }
}

/**
 * Delete file
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { fileId } = req.params;

    await googleDrive.deleteFile(fileId);

    res.status(200).json({
      message: 'File deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to delete file',
    });
  }
}

/**
 * Get file preview URL
 */
export async function getPreviewUrl(req: Request, res: Response): Promise<void> {
  try {
    const { fileId } = req.params;

    const file = await prisma.googleDriveFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'File not found',
      });
      return;
    }

    const previewUrl = await googleDrive.getFilePreviewUrl(file.driveFileId);

    if (!previewUrl) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Preview URL not available for this file',
      });
      return;
    }

    res.status(200).json({
      previewUrl,
    });
  } catch (error) {
    console.error('Error getting preview URL:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get preview URL',
    });
  }
}

/**
 * Get connection status
 */
export async function getConnectionStatus(req: Request, res: Response): Promise<void> {
  try {
    const connection = await googleDriveAuth.getActiveConnection();

    if (!connection) {
      res.status(200).json({
        connected: false,
        message: 'No active Google Drive connection',
      });
      return;
    }

    res.status(200).json({
      connected: true,
      email: connection.email,
      lastSyncAt: connection.lastSyncAt,
      expiresAt: connection.expiresAt,
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get connection status',
    });
  }
}
