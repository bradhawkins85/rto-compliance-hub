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
  createCredentialSchema,
  updateCredentialSchema,
  listCredentialsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * Calculate credential status based on expiry date
 */
function calculateCredentialStatus(credential: { expiresAt: Date | null; status: string }): string {
  // If manually set to Revoked, keep that status
  if (credential.status === 'Revoked') {
    return 'Revoked';
  }

  // If no expiry date, keep as Active
  if (!credential.expiresAt) {
    return 'Active';
  }

  const now = new Date();
  const expiryDate = new Date(credential.expiresAt);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Expired if past expiry date
  if (daysUntilExpiry < 0) {
    return 'Expired';
  }

  // Active (even if expiring soon)
  return 'Active';
}

/**
 * Check if credential is expiring soon (within 30 days)
 */
function isExpiringSoon(credential: { expiresAt: Date | null }): boolean {
  if (!credential.expiresAt) {
    return false;
  }

  const now = new Date();
  const expiryDate = new Date(credential.expiresAt);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
}

/**
 * List credentials with filters and pagination
 * GET /api/v1/credentials
 */
export async function listCredentials(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listCredentialsQuerySchema.safeParse(req.query);
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
    const { userId, status, expiresBefore, type, q } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (expiresBefore) {
      where.expiresAt = {
        lte: new Date(expiresBefore),
      };
    }

    if (type) {
      where.type = type;
    }

    if (q) {
      where.name = { contains: q, mode: 'insensitive' };
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
    const total = await prisma.credential.count({ where });

    // Get credentials
    const credentials = await prisma.credential.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        userId: true,
        name: true,
        type: true,
        issuedAt: true,
        expiresAt: true,
        evidenceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Calculate current status and expiring flag for each credential
    const credentialsWithCalculatedStatus = credentials.map((credential: any) => ({
      ...credential,
      status: calculateCredentialStatus(credential),
      isExpiringSoon: isExpiringSoon(credential),
    }));

    const response = createPaginatedResponse(credentialsWithCalculatedStatus, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List credentials error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing credentials',
      instance: req.path,
    });
  }
}

/**
 * Get credential by ID
 * GET /api/v1/credentials/:id
 */
export async function getCredential(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const credential = await prisma.credential.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        issuedAt: true,
        expiresAt: true,
        evidenceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    if (!credential) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Credential not found',
        instance: req.path,
      });
      return;
    }

    // Calculate current status
    const response = {
      ...credential,
      status: calculateCredentialStatus(credential),
      isExpiringSoon: isExpiringSoon(credential),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get credential error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving credential',
      instance: req.path,
    });
  }
}

/**
 * Create new credential
 * POST /api/v1/credentials
 */
export async function createCredential(req: Request, res: Response): Promise<void> {
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
    const validation = createCredentialSchema.safeParse(req.body);
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

    const { userId, name, type, issuedAt, expiresAt, evidenceUrl } = validation.data;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid user ID',
        instance: req.path,
      });
      return;
    }

    // Calculate initial status
    const initialExpiresAt = expiresAt ? new Date(expiresAt) : null;
    const initialStatus = calculateCredentialStatus({
      expiresAt: initialExpiresAt,
      status: 'Active',
    });

    // Create credential
    const credential = await prisma.credential.create({
      data: {
        userId,
        name,
        type,
        issuedAt: new Date(issuedAt),
        expiresAt: initialExpiresAt,
        evidenceUrl: evidenceUrl || null,
        status: initialStatus,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        issuedAt: true,
        expiresAt: true,
        evidenceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
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
      'Credential',
      credential.id,
      { userId, name, type, issuedAt, expiresAt, evidenceUrl },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json({
      ...credential,
      isExpiringSoon: isExpiringSoon(credential),
    });
  } catch (error) {
    console.error('Create credential error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating credential',
      instance: req.path,
    });
  }
}

/**
 * Update credential
 * PATCH /api/v1/credentials/:id
 */
export async function updateCredential(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateCredentialSchema.safeParse(req.body);
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

    const { name, type, issuedAt, expiresAt, evidenceUrl, status } = validation.data;

    // Check if credential exists
    const existingCredential = await prisma.credential.findUnique({
      where: { id },
    });

    if (!existingCredential) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Credential not found',
        instance: req.path,
      });
      return;
    }

    // Update credential
    const credential = await prisma.credential.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(issuedAt && { issuedAt: new Date(issuedAt) }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        ...(evidenceUrl !== undefined && { evidenceUrl }),
        ...(status && { status }),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        issuedAt: true,
        expiresAt: true,
        evidenceUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Recalculate status if not manually set
    const finalStatus = status || calculateCredentialStatus(credential);
    if (finalStatus !== credential.status) {
      await prisma.credential.update({
        where: { id },
        data: { status: finalStatus },
      });
    }

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'Credential',
        id,
        { name, type, issuedAt, expiresAt, evidenceUrl, status },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json({
      ...credential,
      status: finalStatus,
      isExpiringSoon: isExpiringSoon(credential),
    });
  } catch (error) {
    console.error('Update credential error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating credential',
      instance: req.path,
    });
  }
}
