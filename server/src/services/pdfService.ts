/**
 * PDF Report Service
 * Utilities for generating PDF reports
 */

import PDFDocument from 'pdfkit';
import { Response } from 'express';

// Type definition for PDFKit document
type PDFDoc = typeof PDFDocument extends new (...args: any[]) => infer R ? R : any;

/**
 * PDF report options
 */
interface PDFReportOptions {
  title: string;
  subtitle?: string;
  author?: string;
  margin?: number;
}

/**
 * Initialize a new PDF document with standard settings
 */
export function createPDFDocument(options: PDFReportOptions): PDFDoc {
  const doc = new PDFDocument({
    size: 'A4',
    margin: options.margin || 50,
    info: {
      Title: options.title,
      Author: options.author || 'RTO Compliance Hub',
      Subject: options.subtitle,
      Creator: 'RTO Compliance Hub',
    },
  });

  return doc as PDFDoc;
}

/**
 * Add header to PDF document
 */
export function addPDFHeader(doc: PDFDoc, title: string, subtitle?: string): void {
  // Title
  doc
    .fontSize(20)
    .font('Helvetica-Bold')
    .text(title, { align: 'center' });

  // Subtitle
  if (subtitle) {
    doc
      .moveDown(0.5)
      .fontSize(14)
      .font('Helvetica')
      .text(subtitle, { align: 'center' });
  }

  // Generated date
  doc
    .moveDown(0.5)
    .fontSize(10)
    .font('Helvetica')
    .text(`Generated: ${new Date().toLocaleString('en-AU', { 
      dateStyle: 'medium', 
      timeStyle: 'short',
      timeZone: 'Australia/Sydney'
    })}`, { align: 'center' });

  // Add horizontal line
  doc
    .moveDown()
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke()
    .moveDown();
}

/**
 * Add footer to PDF document
 */
export function addPDFFooter(doc: PDFDoc): void {
  const pageHeight = doc.page.height;
  const bottomMargin = 50;
  
  doc
    .fontSize(8)
    .font('Helvetica')
    .text(
      'RTO Compliance Hub - Confidential',
      50,
      pageHeight - bottomMargin,
      {
        align: 'center',
        width: doc.page.width - 100,
      }
    );
}

/**
 * Add section title to PDF
 */
export function addPDFSection(doc: PDFDoc, title: string): void {
  doc
    .moveDown()
    .fontSize(14)
    .font('Helvetica-Bold')
    .text(title)
    .moveDown(0.5)
    .fontSize(10)
    .font('Helvetica');
}

/**
 * Add table to PDF
 */
export function addPDFTable(
  doc: PDFDoc,
  headers: string[],
  rows: string[][],
  options?: {
    columnWidths?: number[];
    startX?: number;
    startY?: number;
  }
): void {
  const startX = options?.startX || 50;
  let startY = options?.startY || doc.y;
  const tableWidth = doc.page.width - 100;
  const columnWidths = options?.columnWidths || headers.map(() => tableWidth / headers.length);
  const rowHeight = 20;
  const headerHeight = 25;

  // Draw header
  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .fillColor('#000000');

  let currentX = startX;
  headers.forEach((header, i) => {
    doc.text(header, currentX, startY, {
      width: columnWidths[i],
      height: headerHeight,
      align: 'left',
    });
    currentX += columnWidths[i];
  });

  // Draw header line
  startY += headerHeight;
  doc
    .moveTo(startX, startY)
    .lineTo(startX + tableWidth, startY)
    .stroke();

  // Draw rows
  doc.fontSize(8).font('Helvetica');

  rows.forEach((row) => {
    startY += 5; // padding
    currentX = startX;
    
    // Check if we need a new page
    if (startY > doc.page.height - 100) {
      doc.addPage();
      startY = 50;
    }

    row.forEach((cell, i) => {
      const cellText = cell || '-';
      doc.text(cellText, currentX, startY, {
        width: columnWidths[i],
        height: rowHeight,
        align: 'left',
        ellipsis: true,
      });
      currentX += columnWidths[i];
    });

    startY += rowHeight;
  });

  doc.y = startY + 10;
}

/**
 * Add key-value pairs to PDF
 */
export function addPDFKeyValue(doc: PDFDoc, key: string, value: string): void {
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text(key + ': ', { continued: true })
    .font('Helvetica')
    .text(value)
    .moveDown(0.3);
}

/**
 * Add summary box to PDF
 */
export function addPDFSummaryBox(
  doc: PDFDoc,
  title: string,
  items: Array<{ label: string; value: string | number }>
): void {
  const boxX = 50;
  const boxY = doc.y;
  const boxWidth = doc.page.width - 100;
  const boxHeight = 30 + (items.length * 20);

  // Draw box
  doc
    .rect(boxX, boxY, boxWidth, boxHeight)
    .fillAndStroke('#f0f0f0', '#cccccc');

  // Add title
  doc
    .fillColor('#000000')
    .fontSize(12)
    .font('Helvetica-Bold')
    .text(title, boxX + 10, boxY + 10);

  // Add items
  let itemY = boxY + 35;
  doc.fontSize(10).font('Helvetica');

  items.forEach((item) => {
    doc
      .font('Helvetica-Bold')
      .text(item.label + ': ', boxX + 10, itemY, { continued: true })
      .font('Helvetica')
      .text(String(item.value));
    itemY += 20;
  });

  doc.y = boxY + boxHeight + 20;
}

/**
 * Set PDF response headers for download
 */
export function setPDFDownloadHeaders(res: Response, filename: string): void {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
}

/**
 * Pipe PDF document to response
 */
export function pipePDFToResponse(doc: PDFDoc, res: Response): void {
  doc.pipe(res);
  doc.end();
}

/**
 * Generate PDF filename with timestamp
 */
export function generatePDFFilename(prefix: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-report-${date}.pdf`;
}
