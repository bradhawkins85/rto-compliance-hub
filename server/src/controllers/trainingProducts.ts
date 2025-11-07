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
  createTrainingProductSchema,
  updateTrainingProductSchema,
  linkSOPsSchema,
  listTrainingProductsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * List training products with filters and pagination
 * GET /api/v1/training-products
 */
export async function listTrainingProducts(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listTrainingProductsQuerySchema.safeParse(req.query);
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
    const { status, isAccredited, ownerId, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft deleted training products
    };

    if (status) {
      where.status = status;
    }

    if (isAccredited !== undefined) {
      where.isAccredited = isAccredited;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (q) {
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
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
    const total = await prisma.trainingProduct.count({ where });

    // Get training products
    const trainingProducts = await prisma.trainingProduct.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        code: true,
        name: true,
        status: true,
        assessmentStrategyUrl: true,
        validationReportUrl: true,
        isAccredited: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sopMappings: {
          select: {
            sop: {
              select: {
                id: true,
                title: true,
                version: true,
              },
            },
          },
        },
      },
    });

    // Transform response to flatten SOP mappings and check completeness
    const transformedProducts = trainingProducts.map((product: any) => {
      const sops = product.sopMappings?.map((sm: any) => sm.sop) || [];
      const isComplete = !!(
        product.assessmentStrategyUrl &&
        sops.length > 0
      );

      if (product.sopMappings) {
        const { sopMappings, ...rest } = product;
        return {
          ...rest,
          sops,
          isComplete,
        };
      }
      return {
        ...product,
        sops,
        isComplete,
      };
    });

    const response = createPaginatedResponse(transformedProducts, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List training products error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing training products',
      instance: req.path,
    });
  }
}

/**
 * Get training product by ID with linked SOPs
 * GET /api/v1/training-products/:id
 */
export async function getTrainingProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const product = await prisma.trainingProduct.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        assessmentStrategyUrl: true,
        validationReportUrl: true,
        isAccredited: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sopMappings: {
          select: {
            sop: {
              select: {
                id: true,
                title: true,
                version: true,
                fileUrl: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Training product not found',
        instance: req.path,
      });
      return;
    }

    // Transform response
    const { sopMappings, ...rest } = product;
    const sops = sopMappings.map(sm => sm.sop);
    const isComplete = !!(rest.assessmentStrategyUrl && sops.length > 0);

    const response = {
      ...rest,
      sops,
      isComplete,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get training product error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving training product',
      instance: req.path,
    });
  }
}

/**
 * Create new training product
 * POST /api/v1/training-products
 */
export async function createTrainingProduct(req: Request, res: Response): Promise<void> {
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
    const validation = createTrainingProductSchema.safeParse(req.body);
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

    const { code, name, status, assessmentStrategyUrl, validationReportUrl, isAccredited } = validation.data;

    // Check if code already exists
    const existingProduct = await prisma.trainingProduct.findUnique({
      where: { code },
    });

    if (existingProduct && !existingProduct.deletedAt) {
      res.status(409).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
        title: 'Conflict',
        status: 409,
        detail: 'Training product with this code already exists',
        instance: req.path,
      });
      return;
    }

    // Create training product
    const product = await prisma.trainingProduct.create({
      data: {
        code,
        name,
        status: status || 'Active',
        assessmentStrategyUrl: assessmentStrategyUrl || null,
        validationReportUrl: validationReportUrl || null,
        isAccredited: isAccredited ?? true,
        ownerId: req.user.userId,
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        assessmentStrategyUrl: true,
        validationReportUrl: true,
        isAccredited: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'create',
      'TrainingProduct',
      product.id,
      { code, name, status, assessmentStrategyUrl, validationReportUrl, isAccredited },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json(product);
  } catch (error) {
    console.error('Create training product error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating training product',
      instance: req.path,
    });
  }
}

/**
 * Update training product
 * PATCH /api/v1/training-products/:id
 */
export async function updateTrainingProduct(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateTrainingProductSchema.safeParse(req.body);
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

    const { code, name, status, assessmentStrategyUrl, validationReportUrl, isAccredited } = validation.data;

    // Check if training product exists
    const existingProduct = await prisma.trainingProduct.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingProduct) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Training product not found',
        instance: req.path,
      });
      return;
    }

    // If code is being updated, check for conflicts
    if (code && code !== existingProduct.code) {
      const codeConflict = await prisma.trainingProduct.findUnique({
        where: { code },
      });

      if (codeConflict && !codeConflict.deletedAt) {
        res.status(409).json({
          type: 'https://tools.ietf.org/html/rfc7231#section-6.5.8',
          title: 'Conflict',
          status: 409,
          detail: 'Training product with this code already exists',
          instance: req.path,
        });
        return;
      }
    }

    // Update training product
    const product = await prisma.trainingProduct.update({
      where: { id },
      data: {
        ...(code && { code }),
        ...(name && { name }),
        ...(status && { status }),
        ...(assessmentStrategyUrl !== undefined && { assessmentStrategyUrl }),
        ...(validationReportUrl !== undefined && { validationReportUrl }),
        ...(isAccredited !== undefined && { isAccredited }),
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        assessmentStrategyUrl: true,
        validationReportUrl: true,
        isAccredited: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'TrainingProduct',
        id,
        { code, name, status, assessmentStrategyUrl, validationReportUrl, isAccredited },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(product);
  } catch (error) {
    console.error('Update training product error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating training product',
      instance: req.path,
    });
  }
}

/**
 * Link SOPs to training product
 * POST /api/v1/training-products/:id/sops
 */
export async function linkSOPs(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = linkSOPsSchema.safeParse(req.body);
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

    const { sopIds } = validation.data;

    // Check if training product exists
    const existingProduct = await prisma.trainingProduct.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingProduct) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Training product not found',
        instance: req.path,
      });
      return;
    }

    // Verify all SOPs exist
    const sops = await prisma.sOP.findMany({
      where: { 
        id: { in: sopIds },
        deletedAt: null,
      },
    });

    if (sops.length !== sopIds.length) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'One or more SOP IDs are invalid',
        instance: req.path,
      });
      return;
    }

    // Create mappings with transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing mappings
      await tx.trainingProductSOP.deleteMany({
        where: { trainingProductId: id },
      });

      // Create new mappings
      await tx.trainingProductSOP.createMany({
        data: sopIds.map(sopId => ({
          trainingProductId: id,
          sopId,
        })),
        skipDuplicates: true,
      });
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'link_sops',
        'TrainingProduct',
        id,
        { sopIds },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Get updated mappings
    const mappings = await prisma.trainingProductSOP.findMany({
      where: { trainingProductId: id },
      select: {
        sop: {
          select: {
            id: true,
            title: true,
            version: true,
            fileUrl: true,
          },
        },
      },
    });

    res.status(200).json({
      trainingProductId: id,
      sops: mappings.map(m => m.sop),
    });
  } catch (error) {
    console.error('Link SOPs error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while linking SOPs',
      instance: req.path,
    });
  }
}
