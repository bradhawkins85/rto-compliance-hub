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
  createSOPSchema,
  updateSOPSchema,
  listSOPsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * List SOPs with filters and pagination
 * GET /api/v1/sops
 */
export async function listSOPs(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listSOPsQuerySchema.safeParse(req.query);
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
    const { policyId, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft deleted SOPs
    };

    if (policyId) {
      where.policyId = policyId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
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
    const total = await prisma.sOP.count({ where });

    // Get SOPs
    const sops = await prisma.sOP.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        title: true,
        version: true,
        fileUrl: true,
        policyId: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = createPaginatedResponse(sops, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List SOPs error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing SOPs',
      instance: req.path,
    });
  }
}

/**
 * Get SOP by ID
 * GET /api/v1/sops/:id
 */
export async function getSOP(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const sop = await prisma.sOP.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        version: true,
        fileUrl: true,
        policyId: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        trainingProducts: {
          select: {
            trainingProduct: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        standardMappings: {
          select: {
            standard: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!sop) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'SOP not found',
        instance: req.path,
      });
      return;
    }

    // Transform response
    const { trainingProducts, standardMappings, ...rest } = sop;
    const response = {
      ...rest,
      trainingProducts: trainingProducts.map(tp => tp.trainingProduct),
      standards: standardMappings.map(sm => sm.standard),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get SOP error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving SOP',
      instance: req.path,
    });
  }
}

/**
 * Create new SOP
 * POST /api/v1/sops
 */
export async function createSOP(req: Request, res: Response): Promise<void> {
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
    const validation = createSOPSchema.safeParse(req.body);
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

    const { title, version, fileUrl, policyId, description } = validation.data;

    // If policyId is provided, verify it exists
    if (policyId) {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId, deletedAt: null },
      });

      if (!policy) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid policy ID',
          instance: req.path,
        });
        return;
      }
    }

    // Create SOP
    const sop = await prisma.sOP.create({
      data: {
        title,
        version,
        fileUrl: fileUrl || null,
        policyId: policyId || null,
        description: description || null,
      },
      select: {
        id: true,
        title: true,
        version: true,
        fileUrl: true,
        policyId: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'create',
      'SOP',
      sop.id,
      { title, version, fileUrl, policyId, description },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json(sop);
  } catch (error) {
    console.error('Create SOP error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating SOP',
      instance: req.path,
    });
  }
}

/**
 * Update SOP
 * PATCH /api/v1/sops/:id
 */
export async function updateSOP(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateSOPSchema.safeParse(req.body);
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

    const { title, version, fileUrl, policyId, description } = validation.data;

    // Check if SOP exists
    const existingSOP = await prisma.sOP.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingSOP) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'SOP not found',
        instance: req.path,
      });
      return;
    }

    // If policyId is provided, verify it exists
    if (policyId) {
      const policy = await prisma.policy.findUnique({
        where: { id: policyId, deletedAt: null },
      });

      if (!policy) {
        res.status(400).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
          title: 'Bad Request',
          status: 400,
          detail: 'Invalid policy ID',
          instance: req.path,
        });
        return;
      }
    }

    // Update SOP
    const sop = await prisma.sOP.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(version && { version }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(policyId !== undefined && { policyId }),
        ...(description !== undefined && { description }),
      },
      select: {
        id: true,
        title: true,
        version: true,
        fileUrl: true,
        policyId: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'SOP',
        id,
        { title, version, fileUrl, policyId, description },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(sop);
  } catch (error) {
    console.error('Update SOP error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating SOP',
      instance: req.path,
    });
  }
}
