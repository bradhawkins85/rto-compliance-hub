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
  createPDItemSchema,
  updatePDItemSchema,
  completePDItemSchema,
  verifyPDItemSchema,
  listPDItemsQuerySchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * Calculate PD item status based on due date and completion
 */
function calculatePDStatus(pdItem: { dueAt: Date | null; completedAt: Date | null; status: string }): string {
  // If manually set to Verified or Completed, keep that status
  if (pdItem.status === 'Verified' || (pdItem.status === 'Completed' && pdItem.completedAt)) {
    return pdItem.status;
  }

  // If completed but not verified yet
  if (pdItem.completedAt) {
    return 'Completed';
  }

  // If no due date, keep as Planned
  if (!pdItem.dueAt) {
    return 'Planned';
  }

  const now = new Date();
  const dueDate = new Date(pdItem.dueAt);
  const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Overdue if past due date
  if (daysUntilDue < 0) {
    return 'Overdue';
  }

  // Due if within 30 days
  if (daysUntilDue <= 30) {
    return 'Due';
  }

  // Otherwise Planned
  return 'Planned';
}

/**
 * List PD items with filters and pagination
 * GET /api/v1/pd
 */
export async function listPDItems(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listPDItemsQuerySchema.safeParse(req.query);
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
    const { userId, status, dueBefore, category, q } = validation.data;
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

    if (dueBefore) {
      where.dueAt = {
        lte: new Date(dueBefore),
      };
    }

    if (category) {
      where.category = category;
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
    const total = await prisma.pDItem.count({ where });

    // Get PD items
    const pdItems = await prisma.pDItem.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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

    // Calculate current status for each item
    const itemsWithCalculatedStatus = pdItems.map((item: any) => ({
      ...item,
      status: calculatePDStatus(item),
    }));

    const response = createPaginatedResponse(itemsWithCalculatedStatus, page, perPage, total);
    res.status(200).json(response);
  } catch (error) {
    console.error('List PD items error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while listing PD items',
      instance: req.path,
    });
  }
}

/**
 * Get PD item by ID
 * GET /api/v1/pd/:id
 */
export async function getPDItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const pdItem = await prisma.pDItem.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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

    if (!pdItem) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'PD item not found',
        instance: req.path,
      });
      return;
    }

    // Calculate current status
    const response = {
      ...pdItem,
      status: calculatePDStatus(pdItem),
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get PD item error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving PD item',
      instance: req.path,
    });
  }
}

/**
 * Create new PD item
 * POST /api/v1/pd
 */
export async function createPDItem(req: Request, res: Response): Promise<void> {
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
    const validation = createPDItemSchema.safeParse(req.body);
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

    const { userId, title, description, hours, dueAt, category } = validation.data;

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
    const initialDueAt = dueAt ? new Date(dueAt) : null;
    const initialStatus = calculatePDStatus({
      dueAt: initialDueAt,
      completedAt: null,
      status: 'Planned',
    });

    // Create PD item
    const pdItem = await prisma.pDItem.create({
      data: {
        userId,
        title,
        description: description || null,
        hours: hours || null,
        dueAt: initialDueAt,
        category: category || null,
        status: initialStatus,
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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
      'PDItem',
      pdItem.id,
      { userId, title, description, hours, dueAt, category },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(201).json(pdItem);
  } catch (error) {
    console.error('Create PD item error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while creating PD item',
      instance: req.path,
    });
  }
}

/**
 * Update PD item
 * PATCH /api/v1/pd/:id
 */
export async function updatePDItem(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updatePDItemSchema.safeParse(req.body);
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

    const { title, description, hours, dueAt, category, status } = validation.data;

    // Check if PD item exists
    const existingItem = await prisma.pDItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'PD item not found',
        instance: req.path,
      });
      return;
    }

    // Update PD item
    const pdItem = await prisma.pDItem.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(hours !== undefined && { hours }),
        ...(dueAt !== undefined && { dueAt: dueAt ? new Date(dueAt) : null }),
        ...(category !== undefined && { category }),
        ...(status && { status }),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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
    const finalStatus = status || calculatePDStatus(pdItem);
    if (finalStatus !== pdItem.status) {
      await prisma.pDItem.update({
        where: { id },
        data: { status: finalStatus },
      });
    }

    // Log audit trail
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'PDItem',
        id,
        { title, description, hours, dueAt, category, status },
        req.ip || req.socket.remoteAddress,
        req.headers['user-agent']
      );
    }

    res.status(200).json({
      ...pdItem,
      status: finalStatus,
    });
  } catch (error) {
    console.error('Update PD item error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while updating PD item',
      instance: req.path,
    });
  }
}

/**
 * Complete PD item
 * POST /api/v1/pd/:id/complete
 */
export async function completePDItem(req: Request, res: Response): Promise<void> {
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
    const validation = completePDItemSchema.safeParse(req.body);
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

    const { evidenceUrl, completedAt } = validation.data;

    // Check if PD item exists
    const existingItem = await prisma.pDItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'PD item not found',
        instance: req.path,
      });
      return;
    }

    // Update PD item
    const pdItem = await prisma.pDItem.update({
      where: { id },
      data: {
        evidenceUrl,
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        status: 'Completed',
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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
      'complete',
      'PDItem',
      id,
      { evidenceUrl, completedAt },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(200).json(pdItem);
  } catch (error) {
    console.error('Complete PD item error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while completing PD item',
      instance: req.path,
    });
  }
}

/**
 * Verify PD item (manager approval)
 * POST /api/v1/pd/:id/verify
 */
export async function verifyPDItem(req: Request, res: Response): Promise<void> {
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
    const validation = verifyPDItemSchema.safeParse(req.body);
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

    // Check if PD item exists
    const existingItem = await prisma.pDItem.findUnique({
      where: { id },
    });

    if (!existingItem) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'PD item not found',
        instance: req.path,
      });
      return;
    }

    // Check if item is completed
    if (existingItem.status !== 'Completed') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'PD item must be completed before verification',
        instance: req.path,
      });
      return;
    }

    // Update PD item to verified
    const pdItem = await prisma.pDItem.update({
      where: { id },
      data: {
        status: 'Verified',
      },
      select: {
        id: true,
        userId: true,
        title: true,
        description: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        evidenceUrl: true,
        status: true,
        category: true,
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
      'verify',
      'PDItem',
      id,
      { verifiedBy: req.user.userId },
      req.ip || req.socket.remoteAddress,
      req.headers['user-agent']
    );

    res.status(200).json(pdItem);
  } catch (error) {
    console.error('Verify PD item error:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while verifying PD item',
      instance: req.path,
    });
  }
}
