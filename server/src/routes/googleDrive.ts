import { Router } from 'express';
import * as googleDriveController from '../controllers/googleDrive';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';

const router = Router();

// OAuth2 flow
router.get('/auth/initiate', authenticate, requirePermission('files', 'create'), googleDriveController.initiateAuth);
router.get('/auth/callback', googleDriveController.handleCallback);
router.post('/auth/disconnect', authenticate, requirePermission('files', 'delete'), googleDriveController.disconnect);
router.get('/auth/test', authenticate, googleDriveController.testConnection);
router.get('/auth/status', authenticate, googleDriveController.getConnectionStatus);

// File operations
router.post('/upload', authenticate, requirePermission('files', 'create'), googleDriveController.uploadFile);
router.get('/list', authenticate, requirePermission('files', 'read'), googleDriveController.listFiles);
router.get('/:fileId', authenticate, requirePermission('files', 'read'), googleDriveController.getFileMetadata);
router.delete('/:fileId', authenticate, requirePermission('files', 'delete'), googleDriveController.deleteFile);
router.get('/:fileId/preview', authenticate, requirePermission('files', 'read'), googleDriveController.getPreviewUrl);

export default router;
