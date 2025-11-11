/**
 * Reports Controller
 * Handles PDF report generation for compliance, audits, and analytics
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createPDFDocument,
  addPDFHeader,
  addPDFSection,
  addPDFTable,
  addPDFSummaryBox,
  addPDFKeyValue,
  setPDFDownloadHeaders,
  pipePDFToResponse,
  generatePDFFilename,
} from '../services/pdfService';

const prisma = new PrismaClient();

/**
 * Generate Compliance Gap Analysis Report
 * GET /api/v1/reports/compliance-gaps
 */
export async function generateComplianceGapReport(req: Request, res: Response): Promise<void> {
  try {
    // Get all standards with their mappings
    const standards = await prisma.standard.findMany({
      orderBy: {
        code: 'asc',
      },
      select: {
        id: true,
        code: true,
        title: true,
        clause: true,
        category: true,
        policyMappings: {
          select: {
            policy: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
        sopMappings: {
          select: {
            sop: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    // Identify gaps
    const gaps = standards.filter(
      (s) => s.policyMappings.length === 0 && s.sopMappings.length === 0
    );

    const partiallyMapped = standards.filter(
      (s) => s.policyMappings.length > 0 && s.sopMappings.length === 0 ||
             s.policyMappings.length === 0 && s.sopMappings.length > 0
    );

    const fullyMapped = standards.filter(
      (s) => s.policyMappings.length > 0 && s.sopMappings.length > 0
    );

    // Create PDF
    const doc = createPDFDocument({
      title: 'Compliance Gap Analysis Report',
      subtitle: 'RTO Standards Compliance Coverage',
    });

    // Set response headers
    setPDFDownloadHeaders(res, generatePDFFilename('compliance-gaps'));

    // Add header
    addPDFHeader(
      doc,
      'Compliance Gap Analysis Report',
      'RTO Standards Compliance Coverage'
    );

    // Add summary
    addPDFSummaryBox(doc, 'Coverage Summary', [
      { label: 'Total Standards', value: standards.length },
      { label: 'Fully Mapped', value: fullyMapped.length },
      { label: 'Partially Mapped', value: partiallyMapped.length },
      { label: 'Not Mapped (Gaps)', value: gaps.length },
      { 
        label: 'Coverage Rate', 
        value: `${Math.round((fullyMapped.length / standards.length) * 100)}%` 
      },
    ]);

    // Add gaps section
    if (gaps.length > 0) {
      addPDFSection(doc, 'Standards with No Mappings (Critical Gaps)');
      
      const gapRows = gaps.map((s) => [
        s.code,
        s.title,
        s.clause || '-',
        s.category || '-',
      ]);

      addPDFTable(doc, ['Code', 'Title', 'Clause', 'Category'], gapRows, {
        columnWidths: [80, 240, 80, 95],
      });
    }

    // Add partially mapped section
    if (partiallyMapped.length > 0) {
      addPDFSection(doc, 'Standards with Partial Mappings');
      
      const partialRows = partiallyMapped.map((s) => [
        s.code,
        s.title,
        s.policyMappings.length.toString(),
        s.sopMappings.length.toString(),
      ]);

      addPDFTable(doc, ['Code', 'Title', 'Policies', 'SOPs'], partialRows, {
        columnWidths: [80, 270, 70, 75],
      });
    }

    // Add recommendations
    addPDFSection(doc, 'Recommendations');
    
    if (gaps.length > 0) {
      doc.text('• Immediate Action Required: Map policies and SOPs to ' + gaps.length + ' unmapped standards');
    }
    
    if (partiallyMapped.length > 0) {
      doc.text('• Review and complete mappings for ' + partiallyMapped.length + ' partially mapped standards');
    }
    
    if (gaps.length === 0 && partiallyMapped.length === 0) {
      doc.text('• Excellent! All standards are fully mapped. Continue to review and update mappings regularly.');
    }

    // Pipe PDF to response
    pipePDFToResponse(doc, res);
  } catch (error) {
    console.error('Error generating compliance gap report:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate compliance gap report',
      instance: req.path,
    });
  }
}

/**
 * Generate PD Completion Report
 * GET /api/v1/reports/pd-completion
 */
export async function generatePDCompletionReport(req: Request, res: Response): Promise<void> {
  try {
    // Get all PD items with user information
    const pdItems = await prisma.pDItem.findMany({
      orderBy: {
        dueAt: 'asc',
      },
      select: {
        id: true,
        title: true,
        status: true,
        hours: true,
        dueAt: true,
        completedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    // Calculate statistics
    const totalItems = pdItems.length;
    const completed = pdItems.filter((pd) => pd.status === 'Completed' || pd.status === 'Verified').length;
    const overdue = pdItems.filter((pd) => {
      if (pd.status === 'Completed' || pd.status === 'Verified') return false;
      return pd.dueAt && new Date(pd.dueAt) < new Date();
    }).length;
    const upcoming = pdItems.filter((pd) => {
      if (pd.status === 'Completed' || pd.status === 'Verified') return false;
      if (!pd.dueAt) return false;
      const daysUntilDue = Math.ceil((new Date(pd.dueAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 30;
    }).length;

    // Create PDF
    const doc = createPDFDocument({
      title: 'Professional Development Completion Report',
      subtitle: 'Staff PD Status Overview',
    });

    // Set response headers
    setPDFDownloadHeaders(res, generatePDFFilename('pd-completion'));

    // Add header
    addPDFHeader(
      doc,
      'Professional Development Completion Report',
      'Staff PD Status Overview'
    );

    // Add summary
    addPDFSummaryBox(doc, 'PD Summary', [
      { label: 'Total PD Items', value: totalItems },
      { label: 'Completed', value: completed },
      { label: 'Overdue', value: overdue },
      { label: 'Due Within 30 Days', value: upcoming },
      { 
        label: 'Completion Rate', 
        value: totalItems > 0 ? `${Math.round((completed / totalItems) * 100)}%` : '0%'
      },
    ]);

    // Add overdue items section
    const overdueItems = pdItems.filter((pd) => {
      if (pd.status === 'Completed' || pd.status === 'Verified') return false;
      return pd.dueAt && new Date(pd.dueAt) < new Date();
    });

    if (overdueItems.length > 0) {
      addPDFSection(doc, 'Overdue PD Items');
      
      const overdueRows = overdueItems.map((pd) => [
        pd.user.name,
        pd.user.department,
        pd.title,
        pd.dueAt ? new Date(pd.dueAt).toLocaleDateString('en-AU') : '-',
        pd.status,
      ]);

      addPDFTable(doc, ['Staff', 'Department', 'PD Item', 'Due Date', 'Status'], overdueRows, {
        columnWidths: [90, 80, 150, 80, 95],
      });
    }

    // Add upcoming items section
    const upcomingItems = pdItems.filter((pd) => {
      if (pd.status === 'Completed' || pd.status === 'Verified') return false;
      if (!pd.dueAt) return false;
      const daysUntilDue = Math.ceil((new Date(pd.dueAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilDue > 0 && daysUntilDue <= 30;
    });

    if (upcomingItems.length > 0) {
      addPDFSection(doc, 'PD Items Due Within 30 Days');
      
      const upcomingRows = upcomingItems.map((pd) => [
        pd.user.name,
        pd.user.department,
        pd.title,
        pd.dueAt ? new Date(pd.dueAt).toLocaleDateString('en-AU') : '-',
        pd.status,
      ]);

      addPDFTable(doc, ['Staff', 'Department', 'PD Item', 'Due Date', 'Status'], upcomingRows, {
        columnWidths: [90, 80, 150, 80, 95],
      });
    }

    // Add recommendations
    addPDFSection(doc, 'Recommendations');
    
    if (overdue > 0) {
      doc.text('• Critical: Follow up on ' + overdue + ' overdue PD items immediately');
    }
    
    if (upcoming > 0) {
      doc.text('• Reminder: ' + upcoming + ' PD items are due within the next 30 days');
    }
    
    if (overdue === 0 && upcoming === 0) {
      doc.text('• All PD items are on track. Continue to monitor progress regularly.');
    }

    // Pipe PDF to response
    pipePDFToResponse(doc, res);
  } catch (error) {
    console.error('Error generating PD completion report:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate PD completion report',
      instance: req.path,
    });
  }
}

/**
 * Generate Feedback Summary Report
 * GET /api/v1/reports/feedback-summary
 */
export async function generateFeedbackSummaryReport(req: Request, res: Response): Promise<void> {
  try {
    const { dateFrom, dateTo } = req.query;

    // Default to last 90 days if not specified
    const endDate = dateTo ? new Date(dateTo as string) : new Date();
    const startDate = dateFrom 
      ? new Date(dateFrom as string) 
      : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get feedback for the period
    const feedback = await prisma.feedback.findMany({
      where: {
        submittedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        type: true,
        rating: true,
        sentiment: true,
        themes: true,
        submittedAt: true,
        trainingProduct: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    // Calculate statistics
    const totalCount = feedback.length;
    const feedbackWithRatings = feedback.filter((f) => f.rating !== null);
    const averageRating = feedbackWithRatings.length > 0
      ? feedbackWithRatings.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackWithRatings.length
      : null;

    const feedbackWithSentiment = feedback.filter((f) => f.sentiment !== null);
    const averageSentiment = feedbackWithSentiment.length > 0
      ? feedbackWithSentiment.reduce((sum, f) => sum + (f.sentiment || 0), 0) / feedbackWithSentiment.length
      : null;

    // Count by type
    const byType: Record<string, number> = {
      learner: feedback.filter((f) => f.type === 'learner').length,
      employer: feedback.filter((f) => f.type === 'employer').length,
      industry: feedback.filter((f) => f.type === 'industry').length,
    };

    // Extract themes
    const themeCount: Record<string, number> = {};
    feedback.forEach((f) => {
      if (f.themes && Array.isArray(f.themes)) {
        f.themes.forEach((theme: string) => {
          themeCount[theme] = (themeCount[theme] || 0) + 1;
        });
      }
    });

    const topThemes = Object.entries(themeCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Create PDF
    const doc = createPDFDocument({
      title: 'Feedback Summary Report',
      subtitle: `Period: ${startDate.toLocaleDateString('en-AU')} - ${endDate.toLocaleDateString('en-AU')}`,
    });

    // Set response headers
    setPDFDownloadHeaders(res, generatePDFFilename('feedback-summary'));

    // Add header
    addPDFHeader(
      doc,
      'Feedback Summary Report',
      `Period: ${startDate.toLocaleDateString('en-AU')} - ${endDate.toLocaleDateString('en-AU')}`
    );

    // Add summary
    const summaryItems: Array<{ label: string; value: string | number }> = [
      { label: 'Total Feedback', value: totalCount },
      { label: 'Learner Feedback', value: byType.learner },
      { label: 'Employer Feedback', value: byType.employer },
      { label: 'Industry Feedback', value: byType.industry },
    ];

    if (averageRating !== null) {
      summaryItems.push({ 
        label: 'Average Rating', 
        value: averageRating.toFixed(1) + ' / 5.0' 
      });
    }

    if (averageSentiment !== null) {
      summaryItems.push({ 
        label: 'Average Sentiment', 
        value: averageSentiment.toFixed(2) 
      });
    }

    addPDFSummaryBox(doc, 'Feedback Summary', summaryItems);

    // Add top themes section
    if (topThemes.length > 0) {
      addPDFSection(doc, 'Top Themes');
      
      const themeRows = topThemes.map(([theme, count]) => [
        theme,
        count.toString(),
        `${Math.round((count / totalCount) * 100)}%`,
      ]);

      addPDFTable(doc, ['Theme', 'Count', 'Percentage'], themeRows, {
        columnWidths: [280, 80, 135],
      });
    }

    // Add recommendations
    addPDFSection(doc, 'Key Insights');
    
    if (averageRating !== null) {
      if (averageRating < 3) {
        doc.text('• Critical: Average rating is below 3.0. Immediate intervention required.');
      } else if (averageRating < 4) {
        doc.text('• Average rating indicates room for improvement. Review feedback comments.');
      } else if (averageRating >= 4.5) {
        doc.text('• Excellent feedback! Document and share successful practices.');
      }
    }

    if (topThemes.length > 0) {
      doc.text('• Most mentioned topic: "' + topThemes[0][0] + '". Focus improvement efforts here.');
    }

    if (totalCount < 10) {
      doc.text('• Low feedback volume. Consider encouraging more feedback submissions.');
    }

    // Pipe PDF to response
    pipePDFToResponse(doc, res);
  } catch (error) {
    console.error('Error generating feedback summary report:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate feedback summary report',
      instance: req.path,
    });
  }
}

/**
 * Generate Audit Readiness Report
 * GET /api/v1/reports/audit-readiness
 */
export async function generateAuditReadinessReport(req: Request, res: Response): Promise<void> {
  try {
    // Gather data for audit readiness
    const [
      policies,
      standards,
      credentials,
      pdItems,
    ] = await Promise.all([
      prisma.policy.count({ where: { status: 'Published', deletedAt: null } }),
      prisma.standard.count(),
      prisma.credential.findMany({
        where: {
          status: { in: ['Active', 'Expired'] },
        },
        select: {
          status: true,
          expiresAt: true,
        },
      }),
      prisma.pDItem.findMany({
        select: {
          status: true,
          dueAt: true,
        },
      }),
    ]);

    // Calculate readiness scores
    const expiredCredentials = credentials.filter((c) => c.status === 'Expired').length;
    const credentialCompliance = credentials.length > 0 
      ? Math.round(((credentials.length - expiredCredentials) / credentials.length) * 100)
      : 0;

    const completedPD = pdItems.filter((pd) => pd.status === 'Completed' || pd.status === 'Verified').length;
    const pdCompliance = pdItems.length > 0 
      ? Math.round((completedPD / pdItems.length) * 100)
      : 0;

    // Create PDF
    const doc = createPDFDocument({
      title: 'Audit Readiness Report',
      subtitle: 'Compliance Status Overview',
    });

    // Set response headers
    setPDFDownloadHeaders(res, generatePDFFilename('audit-readiness'));

    // Add header
    addPDFHeader(
      doc,
      'Audit Readiness Report',
      'Compliance Status Overview'
    );

    // Add summary
    addPDFSummaryBox(doc, 'Readiness Summary', [
      { label: 'Published Policies', value: policies },
      { label: 'Total Standards', value: standards },
      { label: 'Active Credentials', value: credentials.length - expiredCredentials },
      { label: 'Credential Compliance', value: credentialCompliance + '%' },
      { label: 'PD Completion Rate', value: pdCompliance + '%' },
    ]);

    // Add compliance areas
    addPDFSection(doc, 'Compliance Areas');

    addPDFKeyValue(doc, 'Policies & Procedures', `${policies} published policies`);
    addPDFKeyValue(doc, 'Standards Compliance', `${standards} standards in system`);
    addPDFKeyValue(doc, 'Staff Credentials', `${credentialCompliance}% compliant`);
    addPDFKeyValue(doc, 'Professional Development', `${pdCompliance}% completion rate`);

    // Add areas of concern
    addPDFSection(doc, 'Areas Requiring Attention');
    
    const concerns: string[] = [];
    
    if (expiredCredentials > 0) {
      concerns.push(`• ${expiredCredentials} expired credentials need renewal`);
    }
    
    if (pdCompliance < 80) {
      concerns.push(`• PD completion rate is below 80% (current: ${pdCompliance}%)`);
    }
    
    if (policies < standards * 0.5) {
      concerns.push(`• Policy coverage appears low relative to standards count`);
    }

    if (concerns.length > 0) {
      concerns.forEach((concern) => doc.text(concern));
    } else {
      doc.text('• No major concerns identified. Organization appears audit-ready.');
    }

    // Add recommendations
    addPDFSection(doc, 'Recommendations for Audit Preparation');
    
    doc.text('• Review and update all policies to ensure current versions are published');
    doc.text('• Verify all staff credentials are current and documented');
    doc.text('• Complete outstanding PD requirements before audit date');
    doc.text('• Ensure all standards have appropriate policy and SOP mappings');
    doc.text('• Conduct internal audit to identify any additional gaps');

    // Pipe PDF to response
    pipePDFToResponse(doc, res);
  } catch (error) {
    console.error('Error generating audit readiness report:', error);
    res.status(500).json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.6.1',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to generate audit readiness report',
      instance: req.path,
    });
  }
}
