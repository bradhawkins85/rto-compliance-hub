import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getAuthorizationUrl,
  exchangeCodeForTokens,
  storeTokens,
  testConnection,
  disconnectXero,
  getActiveConnection,
} from '../services/xeroAuth';
import {
  syncEmployees,
  getSyncHistory,
  getLastSyncStatus,
} from '../services/xeroSync';

const prisma = new PrismaClient();

/**
 * Get Xero OAuth authorization URL
 * GET /api/v1/sync/xero/authorize
 */
export async function getAuthUrl(req: Request, res: Response): Promise<void> {
  try {
    const authUrl = await getAuthorizationUrl();
    
    res.status(200).json({
      authUrl,
      message: 'Redirect user to this URL to authorize Xero access',
    });
  } catch (error) {
    console.error('Error getting auth URL:', error);
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
 * OAuth callback handler
 * GET /api/v1/sync/xero/callback
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
        instance: req.path,
      });
      return;
    }

    // Exchange code for tokens
    const tokenSet = await exchangeCodeForTokens(code);

    // Get tenant information
    const xero = await import('xero-node').then(m => m.XeroClient);
    const client = new xero({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [process.env.XERO_REDIRECT_URI || 'http://localhost:3000/api/v1/sync/xero/callback'],
      scopes: 'openid profile email accounting.transactions accounting.settings payroll.employees payroll.payruns offline_access'.split(' '),
    });
    
    await client.setTokenSet(tokenSet);
    const tenants = await client.updateTenants();
    
    const tenantId = tenants[0]?.tenantId;
    const tenantName = tenants[0]?.tenantName;

    if (!tenantId) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'No Xero tenant found',
        instance: req.path,
      });
      return;
    }

    // Store tokens
    await storeTokens(tokenSet, tenantId, tenantName);

    res.status(200).json({
      message: 'Successfully connected to Xero',
      tenant: {
        id: tenantId,
        name: tenantName,
      },
    });
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to complete OAuth flow',
      instance: req.path,
    });
  }
}

/**
 * Test Xero connection
 * GET /api/v1/sync/xero/test
 */
export async function testXeroConnection(req: Request, res: Response): Promise<void> {
  try {
    const result = await testConnection();
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Connection Failed',
        status: 400,
        detail: result.message,
        instance: req.path,
      });
    }
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to test connection',
      instance: req.path,
    });
  }
}

/**
 * Get Xero connection status
 * GET /api/v1/sync/xero/status
 */
export async function getConnectionStatus(req: Request, res: Response): Promise<void> {
  try {
    const connection = await getActiveConnection();
    
    if (!connection) {
      res.status(200).json({
        connected: false,
        message: 'No active Xero connection',
      });
      return;
    }

    const lastSync = await getLastSyncStatus();

    res.status(200).json({
      connected: true,
      connection: {
        tenantId: connection.tenantId,
        tenantName: connection.tenantName,
        connectedAt: connection.createdAt,
        lastSyncAt: connection.lastSyncAt,
        expiresAt: connection.expiresAt,
      },
      lastSync: lastSync ? {
        status: lastSync.status,
        startedAt: lastSync.startedAt,
        completedAt: lastSync.completedAt,
        employeesCreated: lastSync.employeesCreated,
        employeesUpdated: lastSync.employeesUpdated,
        employeesFailed: lastSync.employeesFailed,
        errorMessage: lastSync.errorMessage,
      } : null,
    });
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get connection status',
      instance: req.path,
    });
  }
}

/**
 * Trigger manual sync
 * POST /api/v1/sync/xero
 */
export async function triggerSync(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'User authentication required',
        instance: req.path,
      });
      return;
    }

    // Start sync (async operation)
    const result = await syncEmployees(userId, 'manual');

    if (result.success) {
      res.status(200).json({
        message: 'Sync completed successfully',
        result: {
          employeesCreated: result.employeesCreated,
          employeesUpdated: result.employeesUpdated,
          employeesFailed: result.employeesFailed,
          errors: result.errors,
        },
      });
    } else {
      res.status(500).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
        title: 'Sync Failed',
        status: 500,
        detail: 'Employee sync failed',
        errors: result.errors,
        instance: req.path,
      });
    }
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to trigger sync',
      instance: req.path,
    });
  }
}

/**
 * Get sync history
 * GET /api/v1/sync/xero/history
 */
export async function getSyncHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const history = await getSyncHistory(limit);

    res.status(200).json({
      history: history.map(log => ({
        id: log.id,
        syncType: log.syncType,
        status: log.status,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
        employeesCreated: log.employeesCreated,
        employeesUpdated: log.employeesUpdated,
        employeesFailed: log.employeesFailed,
        errorMessage: log.errorMessage,
        tenantName: log.xeroConnection?.tenantName,
      })),
    });
  } catch (error) {
    console.error('Error getting sync history:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to get sync history',
      instance: req.path,
    });
  }
}

/**
 * Disconnect Xero integration
 * DELETE /api/v1/sync/xero
 */
export async function disconnectXeroHandler(req: Request, res: Response): Promise<void> {
  try {
    const connection = await getActiveConnection();

    if (!connection) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'No active Xero connection found',
        instance: req.path,
      });
      return;
    }

    await disconnectXero(connection.id);

    res.status(200).json({
      message: 'Successfully disconnected from Xero',
    });
  } catch (error) {
    console.error('Error disconnecting Xero:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: error instanceof Error ? error.message : 'Failed to disconnect Xero',
      instance: req.path,
    });
  }
}
