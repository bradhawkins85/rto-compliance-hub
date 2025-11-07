import { Request } from 'express';

export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Extract and validate pagination parameters from request
 */
export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string) || 30));
  const skip = (page - 1) * perPage;
  const take = perPage;

  return { page, perPage, skip, take };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  perPage: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / perPage);

  return {
    page,
    perPage,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  perPage: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    meta: createPaginationMeta(page, perPage, total),
  };
}

/**
 * Parse sorting parameters from request
 * Format: ?sort=field:asc,field2:desc
 */
export function parseSortParams(req: Request): Record<string, 'asc' | 'desc'> {
  const sortParam = req.query.sort as string;
  if (!sortParam) return {};

  const sortFields: Record<string, 'asc' | 'desc'> = {};
  const sortParts = sortParam.split(',');

  for (const part of sortParts) {
    const [field, order] = part.trim().split(':');
    if (field && (order === 'asc' || order === 'desc')) {
      sortFields[field] = order;
    }
  }

  return sortFields;
}

/**
 * Parse field selection parameters from request
 * Format: ?fields=id,name,email
 */
export function parseFieldsParams(req: Request): string[] | undefined {
  const fieldsParam = req.query.fields as string;
  if (!fieldsParam) return undefined;

  return fieldsParam
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);
}

/**
 * Create Prisma select object from field names
 */
export function createSelectObject(fields: string[] | undefined): Record<string, boolean> | undefined {
  if (!fields || fields.length === 0) return undefined;

  const select: Record<string, boolean> = {};
  for (const field of fields) {
    select[field] = true;
  }
  return select;
}
