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
  listComplaintsQuerySchema,
  createComplaintSchema,
  updateComplaintSchema,
  closeComplaintSchema,
  addComplaintNoteSchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * Calculate SLA breach status
 * SLA: 2 business days from submission or last status change
 */
function calculateSLABreach(date: Date): boolean {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  
  // Simple implementation: 2 business days = ~2.8 calendar days (accounting for weekends)
  // For production, use a proper business days library
  return diffDays > 2.8;
}

/**
 * List complaints with filters and pagination
 * GET /api/v1/complaints
 */
export async function listComplaints(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listComplaintsQuerySchema.safeParse(req.query);
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
    const {
      status,
      source,
      trainerId,
      trainingProductId,
      studentId,
      dateFrom,
      dateTo,
      slaBreach,
      q,
    } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (source) {
      where.source = source;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    if (trainingProductId) {
      where.trainingProductId = trainingProductId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.submittedAt = {};
      if (dateFrom) {
        where.submittedAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.submittedAt.lte = new Date(dateTo);
      }
    }

    // Search query
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { rootCause: { contains: q, mode: 'insensitive' } },
        { correctiveAction: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any[] = [];
    for (const [field, order] of Object.entries(sortParams)) {
      orderBy.push({ [field]: order });
    }
    if (orderBy.length === 0) {
      orderBy.push({ submittedAt: 'desc' });
    }

    // Get total count
    const total = await prisma.complaint.count({ where });

    // Get complaints
    const complaints = await prisma.complaint.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        source: true,
        description: true,
        status: true,
        studentId: true,
        trainerId: true,
        trainingProductId: true,
        courseId: true,
        rootCause: true,
        correctiveAction: true,
        submittedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Add SLA breach indicator
    const complaintsWithSLA = complaints.map((complaint: any) => {
      // For SLA, check the most recent timeline entry or submission date
      const referenceDate = complaint.updatedAt || complaint.submittedAt;
      const isSLABreached = complaint.status !== 'Closed' && calculateSLABreach(referenceDate);
      
      return {
        ...complaint,
        slaBreach: isSLABreached,
      };
    });

    // Filter by SLA breach if requested
    let filteredComplaints = complaintsWithSLA;
    if (slaBreach === 'true') {
      filteredComplaints = complaintsWithSLA.filter((c: any) => c.slaBreach);
    } else if (slaBreach === 'false') {
      filteredComplaints = complaintsWithSLA.filter((c: any) => !c.slaBreach);
    }

    const response = createPaginatedResponse(
      filteredComplaints,
      total,
      page,
      perPage
    );

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error listing complaints:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve complaints',
      instance: req.path,
    });
  }
}

/**
 * Create new complaint
 * POST /api/v1/complaints
 */
export async function createComplaint(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = createComplaintSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid complaint data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const data = validation.data;
    const userId = (req as any).user?.id;

    // Create complaint with initial timeline entry
    const complaint = await prisma.complaint.create({
      data: {
        source: data.source,
        description: data.description,
        status: 'New',
        studentId: data.studentId,
        trainerId: data.trainerId,
        trainingProductId: data.trainingProductId,
        courseId: data.courseId,
        timeline: {
          create: {
            status: 'New',
            notes: 'Complaint submitted',
            createdBy: userId,
          },
        },
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        timeline: true,
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'create',
      'Complaint',
      complaint.id,
      { after: complaint }
    );

    res.status(201).json(complaint);
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to create complaint',
      instance: req.path,
    });
  }
}

/**
 * Get complaint by ID
 * GET /api/v1/complaints/:id
 */
export async function getComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
            status: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!complaint) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    // Add SLA breach indicator
    const referenceDate = complaint.updatedAt || complaint.submittedAt;
    const slaBreach = complaint.status !== 'Closed' && calculateSLABreach(referenceDate);

    res.status(200).json({
      ...complaint,
      slaBreach,
    });
  } catch (error: any) {
    console.error('Error getting complaint:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve complaint',
      instance: req.path,
    });
  }
}

/**
 * Update complaint
 * PATCH /api/v1/complaints/:id
 */
export async function updateComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validate request body
    const validation = updateComplaintSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid update data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const data = validation.data;

    // Get existing complaint
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    // Enforce workflow: can't skip from New to Closed
    if (data.status && existing.status === 'New' && data.status === 'Closed') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Cannot close complaint directly from New status. Must progress through workflow.',
        instance: req.path,
      });
      return;
    }

    // Update complaint
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.status && { status: data.status }),
        ...(data.trainerId !== undefined && { trainerId: data.trainerId }),
        ...(data.trainingProductId !== undefined && { trainingProductId: data.trainingProductId }),
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.rootCause !== undefined && { rootCause: data.rootCause }),
        ...(data.correctiveAction !== undefined && { correctiveAction: data.correctiveAction }),
        // Add timeline entry if status changed
        ...(data.status && data.status !== existing.status && {
          timeline: {
            create: {
              status: data.status,
              notes: data.notes || `Status changed to ${data.status}`,
              createdBy: userId,
            },
          },
        }),
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'update',
      'Complaint',
      id,
      { before: existing, after: complaint }
    );

    res.status(200).json(complaint);
  } catch (error: any) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to update complaint',
      instance: req.path,
    });
  }
}

/**
 * Close complaint
 * POST /api/v1/complaints/:id/close
 */
export async function closeComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validate request body
    const validation = closeComplaintSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid close data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { rootCause, correctiveAction, notes } = validation.data;

    // Get existing complaint
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    // Check if already closed
    if (existing.status === 'Closed') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Complaint is already closed',
        instance: req.path,
      });
      return;
    }

    // Close complaint
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'Closed',
        rootCause,
        correctiveAction,
        closedAt: new Date(),
        timeline: {
          create: {
            status: 'Closed',
            notes: notes || 'Complaint closed with resolution',
            createdBy: userId,
          },
        },
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'update',
      'Complaint',
      id,
      { before: existing, after: complaint }
    );

    res.status(200).json(complaint);
  } catch (error: any) {
    console.error('Error closing complaint:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to close complaint',
      instance: req.path,
    });
  }
}

/**
 * Escalate complaint (notify managers)
 * POST /api/v1/complaints/:id/escalate
 */
export async function escalateComplaint(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const { notes } = req.body;

    // Get existing complaint
    const existing = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!existing) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    if (existing.status === 'Closed') {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Cannot escalate a closed complaint',
        instance: req.path,
      });
      return;
    }

    // Add escalation timeline entry
    const complaint = await prisma.complaint.update({
      where: { id },
      data: {
        timeline: {
          create: {
            status: 'Escalated',
            notes: notes || 'Complaint escalated to management',
            createdBy: userId,
          },
        },
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        timeline: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    // TODO: Send notification to managers
    // This would integrate with the notification system

    // Create audit log
    await createAuditLog(
      userId,
      'update',
      'Complaint',
      id,
      { action: 'escalate', notes }
    );

    res.status(200).json(complaint);
  } catch (error: any) {
    console.error('Error escalating complaint:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to escalate complaint',
      instance: req.path,
    });
  }
}

/**
 * Get complaint timeline
 * GET /api/v1/complaints/:id/timeline
 */
export async function getComplaintTimeline(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!complaint) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    // Get timeline
    const timeline = await prisma.complaintTimeline.findMany({
      where: { complaintId: id },
      orderBy: { createdAt: 'asc' },
    });

    res.status(200).json(timeline);
  } catch (error: any) {
    console.error('Error getting complaint timeline:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve complaint timeline',
      instance: req.path,
    });
  }
}

/**
 * Add note to complaint
 * POST /api/v1/complaints/:id/notes
 */
export async function addComplaintNote(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    // Validate request body
    const validation = addComplaintNoteSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid note data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const { notes } = validation.data;

    // Check if complaint exists
    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Complaint not found',
        instance: req.path,
      });
      return;
    }

    // Add note to timeline
    const timelineEntry = await prisma.complaintTimeline.create({
      data: {
        complaintId: id,
        status: complaint.status, // Keep current status
        notes,
        createdBy: userId,
      },
    });

    // Create audit log
    await createAuditLog(
      userId,
      'update',
      'Complaint',
      id,
      { action: 'add_note', notes }
    );

    res.status(201).json(timelineEntry);
  } catch (error: any) {
    console.error('Error adding complaint note:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to add note to complaint',
      instance: req.path,
    });
  }
}
