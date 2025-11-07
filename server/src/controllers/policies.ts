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
  createPolicySchema,
  updatePolicySchema,
  publishPolicySchema,
  mapPolicyToStandardsSchema,
  listPoliciesQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * List policies with filters and pagination
 * GET /api/v1/policies
 */
export async function listPolicies(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listPoliciesQuerySchema.safeParse(req.query);
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
    const { standardId, status, ownerId, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {
      deletedAt: null, // Exclude soft deleted policies
    };

    if (status) {
      where.status = status;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Filter by standard if provided
    if (standardId) {
      where.standardMappings = {
        some: {
          standardId,
        },
      };
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
    const total = await prisma.policy.count({ where });

    // Get policies
    const policies = await prisma.policy.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        title: true,
        status: true,
        reviewDate: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Transform response to flatten standard mappings
    const transformedPolicies = policies.map((policy: any) => {
      if (policy.standardMappings) {
        const { standardMappings, ...rest } = policy;
        return {
          ...rest,
          standards: standardMappings.map((sm: any) => sm.standard),
        };
      }
      return policy;
    });

    const response = createPaginatedResponse(transformedPolicies, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List policies error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing policies',
      instance: req.path,
    });
  }
}

/**
 * Get policy by ID with version history
 * GET /api/v1/policies/:id
 */
export async function getPolicy(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const policy = await prisma.policy.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true,
        title: true,
        status: true,
        reviewDate: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          select: {
            id: true,
            version: true,
            isCurrent: true,
            publishedAt: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        standardMappings: {
          select: {
            standard: {
              select: {
                id: true,
                code: true,
                title: true,
                clause: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Policy not found',
        instance: req.path,
      });
      return;
    }

    // Transform response
    const { standardMappings, ...rest } = policy;
    const response = {
      ...rest,
      standards: standardMappings.map(sm => sm.standard),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving policy',
      instance: req.path,
    });
  }
}

/**
 * Create new policy
 * POST /api/v1/policies
 */
export async function createPolicy(req: Request, res: Response): Promise<void> {
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
    const validation = createPolicySchema.safeParse(req.body);
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

    const { title, reviewDate, fileUrl, version, content } = validation.data;

    // Create policy with transaction
    const policy = await prisma.$transaction(async (tx) => {
      // Create policy
      const newPolicy = await tx.policy.create({
        data: {
          title,
          ownerId: req.user!.userId,
          status: 'Draft',
          reviewDate: reviewDate ? new Date(reviewDate) : null,
          fileUrl: fileUrl || null,
        },
      });

      // Create initial version if provided
      if (version) {
        await tx.policyVersion.create({
          data: {
            policyId: newPolicy.id,
            version,
            content: content || null,
            fileUrl: fileUrl || null,
            isCurrent: true,
          },
        });
      }

      return newPolicy;
    });

    // Log audit trail
    await createAuditLog(
      req.user.userId,
      'create',
      'Policy',
      policy.id,
      { title, reviewDate, fileUrl, version },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    // Get created policy with relations
    const createdPolicy = await prisma.policy.findUnique({
      where: { id: policy.id },
      select: {
        id: true,
        title: true,
        status: true,
        reviewDate: true,
        fileUrl: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        versions: {
          select: {
            id: true,
            version: true,
            isCurrent: true,
            publishedAt: true,
            createdAt: true,
          },
        },
      },
    });

    res.status(201).json(createdPolicy);
  } catch (error) {
    console.error('Create policy error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating policy',
      instance: req.path,
    });
  }
}

/**
 * Update policy metadata
 * PATCH /api/v1/policies/:id
 */
export async function updatePolicy(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updatePolicySchema.safeParse(req.body);
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

    const { title, reviewDate, status, fileUrl } = validation.data;

    // Check if policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPolicy) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Policy not found',
        instance: req.path,
      });
      return;
    }

    // Update policy
    const policy = await prisma.policy.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(reviewDate && { reviewDate: new Date(reviewDate) }),
        ...(status && { status }),
        ...(fileUrl && { fileUrl }),
      },
      select: {
        id: true,
        title: true,
        status: true,
        reviewDate: true,
        fileUrl: true,
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
        'Policy',
        id,
        { title, reviewDate, status, fileUrl },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json(policy);
  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating policy',
      instance: req.path,
    });
  }
}

/**
 * Publish new policy version
 * POST /api/v1/policies/:id/publish
 */
export async function publishPolicy(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = publishPolicySchema.safeParse(req.body);
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

    const { version, content, fileUrl } = validation.data;

    // Check if policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPolicy) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Policy not found',
        instance: req.path,
      });
      return;
    }

    // Create new version with transaction
    const policyVersion = await prisma.$transaction(async (tx) => {
      // Mark all existing versions as not current
      await tx.policyVersion.updateMany({
        where: { policyId: id, isCurrent: true },
        data: { isCurrent: false },
      });

      // Create new version
      const newVersion = await tx.policyVersion.create({
        data: {
          policyId: id,
          version,
          content: content || null,
          fileUrl: fileUrl || null,
          isCurrent: true,
          publishedAt: new Date(),
        },
      });

      // Update policy status to Published
      await tx.policy.update({
        where: { id },
        data: { status: 'Published' },
      });

      return newVersion;
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'publish',
        'Policy',
        id,
        { version, publishedAt: policyVersion.publishedAt },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(201).json(policyVersion);
  } catch (error) {
    console.error('Publish policy error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while publishing policy',
      instance: req.path,
    });
  }
}

/**
 * Map policy to standards
 * POST /api/v1/policies/:id/map
 */
export async function mapPolicyToStandards(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = mapPolicyToStandardsSchema.safeParse(req.body);
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

    const { standardIds } = validation.data;

    // Check if policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPolicy) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Policy not found',
        instance: req.path,
      });
      return;
    }

    // Verify all standards exist
    const standards = await prisma.standard.findMany({
      where: { id: { in: standardIds } },
    });

    if (standards.length !== standardIds.length) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'One or more standard IDs are invalid',
        instance: req.path,
      });
      return;
    }

    // Create mappings with transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing mappings
      await tx.policyStandardMapping.deleteMany({
        where: { policyId: id },
      });

      // Create new mappings
      await tx.policyStandardMapping.createMany({
        data: standardIds.map(standardId => ({
          policyId: id,
          standardId,
        })),
        skipDuplicates: true,
      });
    });

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'map_standards',
        'Policy',
        id,
        { standardIds },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    // Get updated mappings
    const mappings = await prisma.policyStandardMapping.findMany({
      where: { policyId: id },
      select: {
        standard: {
          select: {
            id: true,
            code: true,
            title: true,
            clause: true,
          },
        },
      },
    });

    res.status(200).json({
      policyId: id,
      standards: mappings.map(m => m.standard),
    });
  } catch (error) {
    console.error('Map policy to standards error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while mapping policy to standards',
      instance: req.path,
    });
  }
}

/**
 * Get policy version history
 * GET /api/v1/policies/:id/versions
 */
export async function getPolicyVersions(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if policy exists
    const existingPolicy = await prisma.policy.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingPolicy) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Policy not found',
        instance: req.path,
      });
      return;
    }

    // Get versions
    const versions = await prisma.policyVersion.findMany({
      where: { policyId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        version: true,
        isCurrent: true,
        publishedAt: true,
        fileUrl: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      policyId: id,
      versions,
    });
  } catch (error) {
    console.error('Get policy versions error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving policy versions',
      instance: req.path,
    });
  }
}
