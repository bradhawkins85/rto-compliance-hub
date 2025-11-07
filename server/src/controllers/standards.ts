import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getPaginationParams,
  createPaginatedResponse,
  parseSortParams,
  createSelectObject,
  parseFieldsParams,
} from '../utils/pagination';
import {
  listStandardsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * List standards with filters and pagination
 * GET /api/v1/standards
 */
export async function listStandards(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listStandardsQuerySchema.safeParse(req.query);
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
    const { category, code, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {};

    if (category) {
      where.category = category;
    }

    if (code) {
      where.code = { contains: code, mode: 'insensitive' };
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { code: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ code: 'asc' });
    }

    // Get total count
    const total = await prisma.standard.count({ where });

    // Get standards
    const standards = await prisma.standard.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        code: true,
        title: true,
        clause: true,
        description: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = createPaginatedResponse(standards, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List standards error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing standards',
      instance: req.path,
    });
  }
}

/**
 * Get standard by ID
 * GET /api/v1/standards/:id
 */
export async function getStandard(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const standard = await prisma.standard.findUnique({
      where: { id },
      select: {
        id: true,
        code: true,
        title: true,
        clause: true,
        description: true,
        category: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!standard) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Standard not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(standard);
  } catch (error) {
    console.error('Get standard error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving standard',
      instance: req.path,
    });
  }
}

/**
 * Get standard mappings (linked policies, SOPs, and evidence)
 * GET /api/v1/standards/:id/mappings
 */
export async function getStandardMappings(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if standard exists
    const standard = await prisma.standard.findUnique({
      where: { id },
    });

    if (!standard) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Standard not found',
        instance: req.path,
      });
      return;
    }

    // Get policy mappings
    const policyMappings = await prisma.policyStandardMapping.findMany({
      where: { standardId: id },
      select: {
        policy: {
          select: {
            id: true,
            title: true,
            status: true,
            fileUrl: true,
            owner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // Get SOP mappings
    const sopMappings = await prisma.sOPStandardMapping.findMany({
      where: { standardId: id },
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

    // Get evidence (assuming Evidence table links to Standard via entityType/entityId)
    const evidence = await prisma.evidence.findMany({
      where: {
        entityType: 'Standard',
        entityId: id,
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
        description: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      standard: {
        id: standard.id,
        code: standard.code,
        title: standard.title,
      },
      policies: policyMappings.map(pm => pm.policy),
      sops: sopMappings.map(sm => sm.sop),
      evidence,
    });
  } catch (error) {
    console.error('Get standard mappings error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving standard mappings',
      instance: req.path,
    });
  }
}
