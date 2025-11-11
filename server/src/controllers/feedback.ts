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
  listFeedbackQuerySchema,
  createFeedbackSchema,
  updateFeedbackSchema,
  formatValidationErrors,
} from '../utils/validation';

const prisma = new PrismaClient();

/**
 * List feedback with filters and pagination
 * GET /api/v1/feedback
 */
export async function listFeedback(req: Request, res: Response): Promise<void> {
  try {
    // Validate query parameters
    const validation = listFeedbackQuerySchema.safeParse(req.query);
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
      type, 
      trainingProductId, 
      trainerId, 
      courseId,
      anonymous,
      dateFrom,
      dateTo,
      minRating,
      maxRating,
      q 
    } = validation.data;
    const sortParams = parseSortParams(req);
    const fields = parseFieldsParams(req);

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (trainingProductId) {
      where.trainingProductId = trainingProductId;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    if (courseId) {
      where.courseId = courseId;
    }

    if (anonymous !== undefined) {
      where.anonymous = anonymous === 'true';
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

    // Rating range filter
    if (minRating !== undefined || maxRating !== undefined) {
      where.rating = {};
      if (minRating !== undefined) {
        where.rating.gte = parseFloat(minRating);
      }
      if (maxRating !== undefined) {
        where.rating.lte = parseFloat(maxRating);
      }
    }

    // Search in comments
    if (q) {
      where.comments = {
        contains: q,
        mode: 'insensitive',
      };
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
    const total = await prisma.feedback.count({ where });

    // Get feedback items
    const feedback = await prisma.feedback.findMany({
      where,
      skip,
      take,
      orderBy,
      select: fields ? createSelectObject(fields) : {
        id: true,
        type: true,
        trainingProductId: true,
        trainerId: true,
        courseId: true,
        rating: true,
        comments: true,
        anonymous: true,
        sentiment: true,
        themes: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    const response = createPaginatedResponse(feedback, total, page, perPage);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error listing feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve feedback',
      instance: req.path,
    });
  }
}

/**
 * Create manual feedback entry
 * POST /api/v1/feedback
 */
export async function createFeedback(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validation = createFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid feedback data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    const data = validation.data;

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        type: data.type,
        trainingProductId: data.trainingProductId || null,
        trainerId: data.trainerId || null,
        courseId: data.courseId || null,
        rating: data.rating || null,
        comments: data.comments || null,
        anonymous: data.anonymous || false,
        submittedAt: new Date(),
      },
      include: {
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'create',
        'Feedback',
        feedback.id,
        { created: feedback },
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(201).json(feedback);
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to create feedback',
      instance: req.path,
    });
  }
}

/**
 * Get feedback by ID
 * GET /api/v1/feedback/:id
 */
export async function getFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: {
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    if (!feedback) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Feedback not found',
        instance: req.path,
      });
      return;
    }

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error getting feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve feedback',
      instance: req.path,
    });
  }
}

/**
 * Update feedback
 * PATCH /api/v1/feedback/:id
 */
export async function updateFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Validate request body
    const validation = updateFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
        title: 'Bad Request',
        status: 400,
        detail: 'Invalid feedback data',
        errors: formatValidationErrors(validation.error),
        instance: req.path,
      });
      return;
    }

    // Check if feedback exists
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!existingFeedback) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Feedback not found',
        instance: req.path,
      });
      return;
    }

    const data = validation.data;

    // Update feedback
    const feedback = await prisma.feedback.update({
      where: { id },
      data: {
        rating: data.rating !== undefined ? data.rating : undefined,
        comments: data.comments !== undefined ? data.comments : undefined,
        sentiment: data.sentiment !== undefined ? data.sentiment : undefined,
        themes: data.themes !== undefined ? data.themes : undefined,
      },
      include: {
        trainingProduct: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // Create audit log
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'update',
        'Feedback',
        feedback.id,
        { before: existingFeedback, after: feedback },
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(200).json(feedback);
  } catch (error) {
    console.error('Error updating feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to update feedback',
      instance: req.path,
    });
  }
}

/**
 * Delete feedback
 * DELETE /api/v1/feedback/:id
 */
export async function deleteFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if feedback exists
    const existingFeedback = await prisma.feedback.findUnique({
      where: { id },
    });

    if (!existingFeedback) {
      res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
        title: 'Not Found',
        status: 404,
        detail: 'Feedback not found',
        instance: req.path,
      });
      return;
    }

    // Delete feedback
    await prisma.feedback.delete({
      where: { id },
    });

    // Create audit log
    if (req.user) {
      await createAuditLog(
        req.user.userId,
        'delete',
        'Feedback',
        id,
        { deleted: existingFeedback },
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to delete feedback',
      instance: req.path,
    });
  }
}

/**
 * Get AI-generated insights from feedback
 * GET /api/v1/feedback/insights
 */
export async function getFeedbackInsights(req: Request, res: Response): Promise<void> {
  try {
    const { type, dateFrom, dateTo, trainingProductId, trainerId } = req.query;

    // Build where clause
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (trainingProductId) {
      where.trainingProductId = trainingProductId;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    // Date range filter (default to last 90 days if not specified)
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom 
      ? new Date(dateFrom as string) 
      : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    where.submittedAt = {
      gte: startDate,
      lte: endDate,
    };

    // Get all feedback for the period
    const feedback = await prisma.feedback.findMany({
      where,
      select: {
        id: true,
        type: true,
        rating: true,
        comments: true,
        sentiment: true,
        themes: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Calculate aggregate statistics
    const totalCount = feedback.length;
    const feedbackWithRatings = feedback.filter((f: any) => f.rating !== null);
    const averageRating = feedbackWithRatings.length > 0
      ? feedbackWithRatings.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / feedbackWithRatings.length
      : null;

    const feedbackWithSentiment = feedback.filter((f: any) => f.sentiment !== null);
    const averageSentiment = feedbackWithSentiment.length > 0
      ? feedbackWithSentiment.reduce((sum: number, f: any) => sum + (f.sentiment || 0), 0) / feedbackWithSentiment.length
      : null;

    // Extract and count themes
    const themeCount: Record<string, number> = {};
    feedback.forEach((f: any) => {
      if (f.themes && Array.isArray(f.themes)) {
        f.themes.forEach((theme: string) => {
          themeCount[theme] = (themeCount[theme] || 0) + 1;
        });
      }
    });

    // Get top 5 themes
    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    // Calculate trend (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(endDate.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentFeedback = feedback.filter((f: any) => f.submittedAt >= thirtyDaysAgo);
    const previousFeedback = feedback.filter(
      (f: any) => f.submittedAt >= sixtyDaysAgo && f.submittedAt < thirtyDaysAgo
    );

    const recentWithRatings = recentFeedback.filter((f: any) => f.rating !== null);
    const previousWithRatings = previousFeedback.filter((f: any) => f.rating !== null);

    const recentAvgRating = recentWithRatings.length > 0
      ? recentWithRatings.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / recentWithRatings.length
      : null;
    
    const previousAvgRating = previousWithRatings.length > 0
      ? previousWithRatings.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / previousWithRatings.length
      : null;

    let trend: 'improving' | 'declining' | 'stable' | null = null;
    let trendPercentage: number | null = null;

    if (recentAvgRating !== null && previousAvgRating !== null && previousAvgRating > 0) {
      const change = ((recentAvgRating - previousAvgRating) / previousAvgRating) * 100;
      trendPercentage = Math.round(change * 10) / 10;
      
      if (change > 5) {
        trend = 'improving';
      } else if (change < -5) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    }

    // Group by type
    const byType: Record<string, {
      count: number;
      averageRating: number | null;
      averageSentiment: number | null;
    }> = {};

    ['learner', 'employer', 'industry'].forEach(feedbackType => {
      const typeFeedback = feedback.filter((f: any) => f.type === feedbackType);
      const typeWithRatings = typeFeedback.filter((f: any) => f.rating !== null);
      const typeWithSentiment = typeFeedback.filter((f: any) => f.sentiment !== null);

      byType[feedbackType] = {
        count: typeFeedback.length,
        averageRating: typeWithRatings.length > 0
          ? typeWithRatings.reduce((sum: number, f: any) => sum + (f.rating || 0), 0) / typeWithRatings.length
          : null,
        averageSentiment: typeWithSentiment.length > 0
          ? typeWithSentiment.reduce((sum: number, f: any) => sum + (f.sentiment || 0), 0) / typeWithSentiment.length
          : null,
      };
    });

    const insights = {
      summary: {
        totalCount,
        averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
        averageSentiment: averageSentiment ? Math.round(averageSentiment * 100) / 100 : null,
        dateRange: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
      },
      trend: {
        direction: trend,
        percentage: trendPercentage,
        recent: {
          count: recentFeedback.length,
          averageRating: recentAvgRating ? Math.round(recentAvgRating * 10) / 10 : null,
        },
        previous: {
          count: previousFeedback.length,
          averageRating: previousAvgRating ? Math.round(previousAvgRating * 10) / 10 : null,
        },
      },
      topThemes,
      byType,
      recommendations: generateRecommendations(averageRating, averageSentiment, trend, topThemes),
    };

    res.status(200).json(insights);
  } catch (error) {
    console.error('Error getting feedback insights:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate feedback insights',
      instance: req.path,
    });
  }
}

/**
 * Generate recommendations based on feedback analysis
 */
function generateRecommendations(
  averageRating: number | null,
  averageSentiment: number | null,
  trend: 'improving' | 'declining' | 'stable' | null,
  topThemes: Array<{ theme: string; count: number }>
): string[] {
  const recommendations: string[] = [];

  // Rating-based recommendations
  if (averageRating !== null) {
    if (averageRating < 3) {
      recommendations.push('Average rating is low. Consider immediate intervention and review of training delivery.');
    } else if (averageRating < 4) {
      recommendations.push('Average rating indicates room for improvement. Review feedback comments for specific issues.');
    } else if (averageRating >= 4.5) {
      recommendations.push('Excellent feedback! Document and share successful practices with the team.');
    }
  }

  // Trend-based recommendations
  if (trend === 'declining') {
    recommendations.push('Feedback trend is declining. Urgent review needed to identify and address issues.');
  } else if (trend === 'improving') {
    recommendations.push('Positive trend detected. Continue current improvement initiatives.');
  }

  // Sentiment-based recommendations
  if (averageSentiment !== null) {
    if (averageSentiment < -0.3) {
      recommendations.push('Negative sentiment detected. Review comments for recurring concerns.');
    } else if (averageSentiment > 0.5) {
      recommendations.push('Positive sentiment indicates strong learner/stakeholder satisfaction.');
    }
  }

  // Theme-based recommendations
  if (topThemes.length > 0) {
    const topTheme = topThemes[0].theme;
    recommendations.push(`Most mentioned topic: "${topTheme}". Focus improvement efforts here.`);
  }

  // Default recommendation if none generated
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring feedback and maintain quality standards.');
  }

  return recommendations;
}

/**
 * Export feedback data as CSV
 * GET /api/v1/feedback/export
 */
export async function exportFeedback(req: Request, res: Response): Promise<void> {
  try {
    const { type, dateFrom, dateTo, trainingProductId, trainerId } = req.query;

    // Build where clause (same as list)
    const where: any = {};

    if (type) {
      where.type = type;
    }

    if (trainingProductId) {
      where.trainingProductId = trainingProductId;
    }

    if (trainerId) {
      where.trainerId = trainerId;
    }

    if (dateFrom || dateTo) {
      where.submittedAt = {};
      if (dateFrom) {
        where.submittedAt.gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        where.submittedAt.lte = new Date(dateTo as string);
      }
    }

    // Get all feedback (no pagination for export)
    const feedback = await prisma.feedback.findMany({
      where,
      orderBy: {
        submittedAt: 'desc',
      },
      include: {
        trainingProduct: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    // Generate CSV
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push([
      'ID',
      'Type',
      'Training Product',
      'Course ID',
      'Trainer ID',
      'Rating',
      'Sentiment',
      'Comments',
      'Themes',
      'Anonymous',
      'Submitted At',
    ].map(escapeCSV).join(','));

    // Data rows
    feedback.forEach((item: any) => {
      csvRows.push([
        item.id,
        item.type,
        item.trainingProduct ? `${item.trainingProduct.code} - ${item.trainingProduct.name}` : '',
        item.courseId || '',
        item.trainerId || '',
        item.rating?.toString() || '',
        item.sentiment?.toString() || '',
        item.comments || '',
        item.themes ? item.themes.join('; ') : '',
        item.anonymous ? 'Yes' : 'No',
        item.submittedAt.toISOString(),
      ].map(escapeCSV).join(','));
    });

    const csv = csvRows.join('\n');

    // Set headers for file download
    const filename = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting feedback:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to export feedback',
      instance: req.path,
    });
  }
}

/**
 * Escape CSV field values
 */
function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the string contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}
