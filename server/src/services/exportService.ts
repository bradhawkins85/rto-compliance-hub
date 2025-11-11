/**
 * Export Service
 * Utilities for exporting data to CSV and other formats
 */

/**
 * Escape CSV field values to handle special characters
 */
export function escapeCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If the string contains comma, quote, or newline, wrap it in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert an array of objects to CSV format
 * @param headers - Array of header names
 * @param rows - Array of data objects
 * @param columnMapping - Optional mapping of object keys to header names
 * @returns CSV string
 */
export function generateCSV<T extends Record<string, any>>(
  headers: string[],
  rows: T[],
  columnMapping?: Record<string, (item: T) => any>
): string {
  const csvRows: string[] = [];
  
  // Header row
  csvRows.push(headers.map(escapeCSV).join(','));
  
  // Data rows
  rows.forEach((row) => {
    const values = headers.map((header) => {
      // Use custom mapping if provided
      if (columnMapping && columnMapping[header]) {
        return columnMapping[header](row);
      }
      
      // Default: try to find matching property (case-insensitive)
      const key = Object.keys(row).find(
        k => k.toLowerCase() === header.toLowerCase().replace(/\s+/g, '')
      );
      return key ? row[key] : '';
    });
    
    csvRows.push(values.map(escapeCSV).join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Format a date for CSV export
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  if (!date) return '';
  
  try {
    const d = new Date(date);
    return d.toISOString();
  } catch {
    return '';
  }
}

/**
 * Format a boolean for CSV export
 */
export function formatBooleanForCSV(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  return value ? 'Yes' : 'No';
}

/**
 * Format an array for CSV export
 */
export function formatArrayForCSV(arr: any[] | null | undefined, separator: string = '; '): string {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
  return arr.join(separator);
}

/**
 * Generate a filename for export
 */
export function generateExportFilename(prefix: string, extension: string = 'csv'): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}-export-${date}.${extension}`;
}

/**
 * Set response headers for file download
 */
export function setDownloadHeaders(
  res: any,
  filename: string,
  contentType: string = 'text/csv'
): void {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
}
