import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createAuditLog } from '../middleware/audit';
import {
  getPaginationParams,
  createPaginatedResponse,
  parseSortParams,
  createSelectObject,
  parseFieldsParams,
} from '../utils/pagination';
import {
  createAssetSchema,
  updateAssetSchema,
  transitionAssetStateSchema,
  logAssetServiceSchema,
  listAssetsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';
import {
  generateCSV,
  formatDateForCSV,
  formatArrayForCSV,
  generateExportFilename,
  setDownloadHeaders,
} from '../services/exportService';

const prisma = new PrismaClient();

/**
 * List assets with filters and pagination
 * GET /api/v1/assets
 */
export async function listAssets(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listAssetsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid query parameters',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { page, perPage, skip, take } = getPaginationParams(req);
    const { type, status, location, serviceDueBefore, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft deleted assets
    };

    if (type) {
      where.type = { contains: type, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (serviceDueBefore) {
      where.nextServiceAt = {
        lte: new Date(serviceDueBefore),
      };
    }

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } },
        { serialNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ createdAt: 'desc' });
    }

    // Get total count
    const total = await prisma.asset.count({ where });

    // Get assets
    const assets = await prisma.asset.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        type: true,
        name: true,
        serialNumber: true,
        location: true,
        status: true,
        purchaseDate: true,
        purchaseCost: true,
        lastServiceAt: true,
        nextServiceAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = createPaginatedResponse(assets, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List assets error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing assets',
      instance: req.path,
    });
  }
}

/**
 * Get asset by ID with service history
 * GET /api/v1/assets/:id
 */
export async function getAsset(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        type: true,
        name: true,
        serialNumber: true,
        location: true,
        status: true,
        purchaseDate: true,
        purchaseCost: true,
        lastServiceAt: true,
        nextServiceAt: true,
        createdAt: true,
        updatedAt: true,
        services: {
          select: {
            id: true,
            serviceDate: true,
            servicedBy: true,
            notes: true,
            cost: true,
            documents: true,
            createdAt: true,
          },
          orderBy: {
            serviceDate: 'desc',
          },
        },
      },
    });

    if (!asset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(asset);
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving asset',
      instance: req.path,
    });
  }
}

/**
 * Create new asset
 * POST /api/v1/assets
 */
export async function createAsset(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    // Validate request body
    const validation = createAssetSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { type, name, serialNumber, location, status, purchaseDate, purchaseCost } = validation.data;

    // Create asset
    const asset = await prisma.asset.create({
      data: {
        type,
        name,
        serialNumber: serialNumber || null,
        location: location || null,
        status: status || 'Available',
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        purchaseCost: purchaseCost || null,
      },
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'create',
      'Asset',
      asset.id,
      { type, name, serialNumber, location, status, purchaseDate, purchaseCost },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json(asset);
  } catch (error) {
    console.error('Create asset error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating asset',
      instance: req.path,
    });
  }
}

/**
 * Update asset
 * PATCH /api/v1/assets/:id
 */
export async function updateAsset(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateAssetSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAsset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    const { type, name, serialNumber, location, status, purchaseDate, purchaseCost, nextServiceAt } = validation.data;

    // Update asset
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(name && { name }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(location !== undefined && { location }),
        ...(status && { status }),
        ...(purchaseDate && { purchaseDate: new Date(purchaseDate) }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(nextServiceAt && { nextServiceAt: new Date(nextServiceAt) }),
      },
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'Asset',
        id,
        { type, name, serialNumber, location, status, purchaseDate, purchaseCost, nextServiceAt },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(asset);
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating asset',
      instance: req.path,
    });
  }
}

/**
 * Log service event for asset
 * POST /api/v1/assets/:id/service
 */
export async function logAssetService(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    // Validate request body
    const validation = logAssetServiceSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAsset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    const { serviceDate, servicedBy, notes, cost, documents } = validation.data;

    // Create service record and update asset
    const service = await prisma.$transaction(async (tx: any) => {
      // Create service record
      const newService = await tx.assetService.create({
        data: {
          assetId: id,
          serviceDate: new Date(serviceDate),
          servicedBy: servicedBy || null,
          notes: notes || null,
          cost: cost || null,
          documents: documents || [],
        },
      });

      // Update asset's last service date
      await tx.asset.update({
        where: { id },
        data: {
          lastServiceAt: new Date(serviceDate),
        },
      });

      return newService;
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'log_service',
      'Asset',
      id,
      { serviceDate, servicedBy, notes, cost, documents },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json(service);
  } catch (error) {
    console.error('Log asset service error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while logging asset service',
      instance: req.path,
    });
  }
}

/**
 * Transition asset lifecycle state
 * POST /api/v1/assets/:id/state
 */
export async function transitionAssetState(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    // Validate request body
    const validation = transitionAssetStateSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid request body',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAsset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    const { state, notes } = validation.data;

    // Update asset state
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        status: state,
      },
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'transition_state',
      'Asset',
      id,
      { previousState: existingAsset.status, newState: state, notes },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(200).json(asset);
  } catch (error) {
    console.error('Transition asset state error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while transitioning asset state',
      instance: req.path,
    });
  }
}

/**
 * Get asset service history
 * GET /api/v1/assets/:id/history
 */
export async function getAssetHistory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAsset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    // Get service history
    const services = await prisma.assetService.findMany({
      where: { assetId: id },
      orderBy: { serviceDate: 'desc' },
      select: {
        id: true,
        serviceDate: true,
        servicedBy: true,
        notes: true,
        cost: true,
        documents: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      assetId: id,
      services,
    });
  } catch (error) {
    console.error('Get asset history error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving asset history',
      instance: req.path,
    });
  }
}

/**
 * Delete (retire) asset
 * DELETE /api/v1/assets/:id
 */
export async function deleteAsset(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    if (!req.user) {
      res.status(401).json({
        type: 'https://tools.ietf.org/html/rfc7235#section-3.1',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required',
        instance: req.path,
      });
      return;
    }

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAsset) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Asset not found',
        instance: req.path,
      });
      return;
    }

    // Soft delete the asset
    await prisma.asset.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'delete',
      'Asset',
      id,
      { assetName: existingAsset.name },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(204).send();
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while deleting asset',
      instance: req.path,
    });
  }
}

/**
 * Export assets as CSV
 * GET /api/v1/assets/export
 */
export async function exportAssets(req: Request, res: Response): Promise<void> {
  try {
    const { type, status, location, serviceDueBefore } = req.query;

    // Build where clause (same as list)
    const where: any = {
      deletedAt: null,
    };

    if (type) {
      where.type = { contains: type as string, mode: 'insensitive' };
    }

    if (status) {
      where.status = status;
    }

    if (location) {
      where.location = { contains: location as string, mode: 'insensitive' };
    }

    if (serviceDueBefore) {
      where.nextServiceAt = {
        lte: new Date(serviceDueBefore as string),
      };
    }

    // Get all assets (no pagination for export)
    const assets = await prisma.asset.findMany({
      where,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        type: true,
        name: true,
        serialNumber: true,
        location: true,
        status: true,
        purchaseDate: true,
        purchaseCost: true,
        lastServiceAt: true,
        nextServiceAt: true,
        createdAt: true,
        updatedAt: true,
        services: {
          select: {
            serviceDate: true,
            notes: true,
            cost: true,
            servicedBy: true,
          },
          orderBy: {
            serviceDate: 'desc',
          },
          take: 1,
        },
      },
    });

    // Generate CSV
    const headers = [
      'ID',
      'Type',
      'Name',
      'Serial Number',
      'Location',
      'Status',
      'Purchase Date',
      'Purchase Cost',
      'Last Service Date',
      'Next Service Date',
      'Latest Service Date',
      'Latest Service Notes',
      'Latest Service Cost',
      'Latest Serviced By',
      'Created At',
      'Updated At',
    ];

    const csv = generateCSV(headers, assets, {
      'ID': (a) => a.id,
      'Type': (a) => a.type,
      'Name': (a) => a.name,
      'Serial Number': (a) => a.serialNumber || '',
      'Location': (a) => a.location || '',
      'Status': (a) => a.status,
      'Purchase Date': (a) => formatDateForCSV(a.purchaseDate),
      'Purchase Cost': (a) => a.purchaseCost ? a.purchaseCost.toString() : '',
      'Last Service Date': (a) => formatDateForCSV(a.lastServiceAt),
      'Next Service Date': (a) => formatDateForCSV(a.nextServiceAt),
      'Latest Service Date': (a) => a.services[0] ? formatDateForCSV(a.services[0].serviceDate) : '',
      'Latest Service Notes': (a) => a.services[0]?.notes || '',
      'Latest Service Cost': (a) => a.services[0]?.cost ? a.services[0].cost.toString() : '',
      'Latest Serviced By': (a) => a.services[0]?.servicedBy || '',
      'Created At': (a) => formatDateForCSV(a.createdAt),
      'Updated At': (a) => formatDateForCSV(a.updatedAt),
    });

    // Set headers for file download
    const filename = generateExportFilename('assets');
    setDownloadHeaders(res, filename);
    
    res.status(200).send(csv);
  } catch (error) {
    console.error('Export assets error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while exporting assets',
      instance: req.path,
    });
  }
}
