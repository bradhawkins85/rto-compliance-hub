import { Request, Response } from 'express';
import multer from 'multer';
import { googleDriveService, SUPPORTED_FILE_TYPES } from '../services/googleDrive';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.GOOGLE_DRIVE_MAX_FILE_SIZE || '104857600', 10),
  },
});

/**
 * Middleware for single file upload
 */
export const uploadSingleFile = upload.single('file');

/**
 * Get OAuth2 authorization URL
 * GET /api/v1/drive/oauth/authorize
 */
export async function getAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const authUrl = googleDriveService.getAuthUrl();
    res.status(200).json({
      authUrl,
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to generate authorization URL',
      instance: req.path,
    });
  }
}

/**
 * OAuth2 callback handler
 * GET /api/v1/drive/oauth/callback
 */
export async function oauthCallback(req: Request, res: Response): Promise<void> {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Authorization code is required',
        instance: req.path,
      });
      return;
    }

    await googleDriveService.authorize(code);

    res.status(200).json({
      message: 'Successfully authorized Google Drive access',
    });
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to authorize Google Drive',
      instance: req.path,
    });
  }
}

/**
 * Upload file to Google Drive
 * POST /api/v1/drive/upload
 */
export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'No file uploaded',
        instance: req.path,
      });
      return;
    }

    const { entityType, entityId, description } = req.body;

    if (!entityType || !entityId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'entityType and entityId are required',
        instance: req.path,
      });
      return;
    }

    // Validate entity type
    const validEntityTypes = ['policies', 'sops', 'evidence', 'credentials', 'assets', 'complaints'];
    if (!validEntityTypes.includes(entityType)) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: `Invalid entityType. Must be one of: ${validEntityTypes.join(', ')}`,
        instance: req.path,
      });
      return;
    }

    // Validate file
    try {
      googleDriveService.validateFile(
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      );
    } catch (validationError) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: validationError instanceof Error ? validationError.message : 'File validation failed',
        instance: req.path,
      });
      return;
    }

    // Get user ID from authenticated user
    const uploadedBy = (req as any).user?.id;

    // Upload file
    const fileInfo = await googleDriveService.uploadFile({
      file: req.file.buffer,
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      entityType,
      entityId,
      uploadedBy,
      description,
    });

    res.status(201).json(fileInfo);
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to upload file',
      instance: req.path,
    });
  }
}

/**
 * Get file metadata
 * GET /api/v1/drive/files/:driveFileId
 */
export async function getFileMetadata(req: Request, res: Response): Promise<void> {
  try {
    const { driveFileId } = req.params;

    const metadata = await googleDriveService.getFileMetadata(driveFileId);

    res.status(200).json(metadata);
  } catch (error) {
    console.error('Error getting file metadata:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get file metadata',
      instance: req.path,
    });
  }
}

/**
 * Get shareable link for a file
 * GET /api/v1/drive/files/:driveFileId/link
 */
export async function getShareableLink(req: Request, res: Response): Promise<void> {
  try {
    const { driveFileId } = req.params;

    const link = await googleDriveService.getShareableLink(driveFileId);

    res.status(200).json({ link });
  } catch (error) {
    console.error('Error getting shareable link:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get shareable link',
      instance: req.path,
    });
  }
}

/**
 * List files for an entity
 * GET /api/v1/drive/files
 */
export async function listFiles(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId } = req.query;

    if (!entityType || !entityId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'entityType and entityId query parameters are required',
        instance: req.path,
      });
      return;
    }

    const files = await googleDriveService.listFilesForEntity(
      entityType as string,
      entityId as string
    );

    res.status(200).json({ files });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to list files',
      instance: req.path,
    });
  }
}

/**
 * Delete file
 * DELETE /api/v1/drive/files/:driveFileId
 */
export async function deleteFile(req: Request, res: Response): Promise<void> {
  try {
    const { driveFileId } = req.params;

    await googleDriveService.deleteFile(driveFileId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to delete file',
      instance: req.path,
    });
  }
}

/**
 * Upload new version of a file
 * POST /api/v1/drive/files/:driveFileId/version
 */
export async function uploadFileVersion(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'No file uploaded',
        instance: req.path,
      });
      return;
    }

    const { driveFileId } = req.params;

    // Validate file
    try {
      googleDriveService.validateFile(
        req.file.originalname,
        req.file.size,
        req.file.mimetype
      );
    } catch (validationError) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: validationError instanceof Error ? validationError.message : 'File validation failed',
        instance: req.path,
      });
      return;
    }

    // Upload new version
    const fileInfo = await googleDriveService.uploadFileVersion(
      driveFileId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json(fileInfo);
  } catch (error) {
    console.error('Error uploading file version:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to upload file version',
      instance: req.path,
    });
  }
}

/**
 * Get supported file types
 * GET /api/v1/drive/supported-types
 */
export async function getSupportedTypes(req: Request, res: Response): Promise<void> {
  try {
    res.status(200).json({
      supportedTypes: Object.keys(SUPPORTED_FILE_TYPES),
      mimeTypes: SUPPORTED_FILE_TYPES,
      maxFileSize: parseInt(process.env.GOOGLE_DRIVE_MAX_FILE_SIZE || '104857600', 10),
      maxFileSizeMB: parseInt(process.env.GOOGLE_DRIVE_MAX_FILE_SIZE || '104857600', 10) / 1024 / 1024,
    });
  } catch (error) {
    console.error('Error getting supported types:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to get supported file types',
      instance: req.path,
    });
  }
}
