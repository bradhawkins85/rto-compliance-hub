import { describe, it, expect } from 'vitest';
import {
  getPaginationParams,
  createPaginationMeta,
  createPaginatedResponse,
  parseSortParams,
  parseFieldsParams,
  createSelectObject,
} from '@server/utils/pagination';
import { Request } from 'express';

// Mock Request helper
function mockRequest(query: Record<string, any>): Partial<Request> {
  return {
    query,
  } as Partial<Request>;
}

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should return default pagination params', () => {
      const req = mockRequest({});
      const result = getPaginationParams(req as Request);
      
      expect(result).toEqual({
        page: 1,
        perPage: 30,
        skip: 0,
        take: 30,
      });
    });

    it('should parse valid page and perPage', () => {
      const req = mockRequest({ page: '2', perPage: '50' });
      const result = getPaginationParams(req as Request);
      
      expect(result).toEqual({
        page: 2,
        perPage: 50,
        skip: 50,
        take: 50,
      });
    });

    it('should enforce minimum page of 1', () => {
      const req = mockRequest({ page: '0' });
      const result = getPaginationParams(req as Request);
      
      expect(result.page).toBe(1);
    });

    it('should enforce maximum perPage of 100', () => {
      const req = mockRequest({ perPage: '150' });
      const result = getPaginationParams(req as Request);
      
      expect(result.perPage).toBe(100);
    });

    it('should enforce minimum perPage of 1', () => {
      const req = mockRequest({ perPage: '0' });
      const result = getPaginationParams(req as Request);
      
      // When perPage is 0 or invalid, it defaults to 30
      expect(result.perPage).toBeGreaterThan(0);
    });

    it('should handle invalid page values', () => {
      const req = mockRequest({ page: 'invalid' });
      const result = getPaginationParams(req as Request);
      
      expect(result.page).toBe(1);
    });

    it('should calculate correct skip value', () => {
      const req = mockRequest({ page: '3', perPage: '20' });
      const result = getPaginationParams(req as Request);
      
      expect(result.skip).toBe(40); // (3-1) * 20
      expect(result.take).toBe(20);
    });
  });

  describe('createPaginationMeta', () => {
    it('should create correct meta for first page', () => {
      const meta = createPaginationMeta(1, 30, 100);
      
      expect(meta).toEqual({
        page: 1,
        perPage: 30,
        total: 100,
        totalPages: 4,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should create correct meta for last page', () => {
      const meta = createPaginationMeta(4, 30, 100);
      
      expect(meta).toEqual({
        page: 4,
        perPage: 30,
        total: 100,
        totalPages: 4,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should create correct meta for middle page', () => {
      const meta = createPaginationMeta(2, 30, 100);
      
      expect(meta).toEqual({
        page: 2,
        perPage: 30,
        total: 100,
        totalPages: 4,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should handle partial last page', () => {
      const meta = createPaginationMeta(3, 30, 75);
      
      expect(meta.totalPages).toBe(3);
      expect(meta.hasNextPage).toBe(false);
    });

    it('should handle single page', () => {
      const meta = createPaginationMeta(1, 30, 20);
      
      expect(meta.totalPages).toBe(1);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });

    it('should handle empty result set', () => {
      const meta = createPaginationMeta(1, 30, 0);
      
      expect(meta.totalPages).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });
  });

  describe('createPaginatedResponse', () => {
    it('should create paginated response with data and meta', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = createPaginatedResponse(data, 1, 30, 100);
      
      expect(response.data).toEqual(data);
      expect(response.meta).toEqual({
        page: 1,
        perPage: 30,
        total: 100,
        totalPages: 4,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('should handle empty data array', () => {
      const response = createPaginatedResponse([], 1, 30, 0);
      
      expect(response.data).toEqual([]);
      expect(response.meta.total).toBe(0);
    });
  });

  describe('parseSortParams', () => {
    it('should parse single sort field', () => {
      const req = mockRequest({ sort: 'name:asc' });
      const result = parseSortParams(req as Request);
      
      expect(result).toEqual({ name: 'asc' });
    });

    it('should parse multiple sort fields', () => {
      const req = mockRequest({ sort: 'name:asc,createdAt:desc' });
      const result = parseSortParams(req as Request);
      
      expect(result).toEqual({
        name: 'asc',
        createdAt: 'desc',
      });
    });

    it('should return empty object for no sort param', () => {
      const req = mockRequest({});
      const result = parseSortParams(req as Request);
      
      expect(result).toEqual({});
    });

    it('should ignore invalid sort directions', () => {
      const req = mockRequest({ sort: 'name:invalid,age:asc' });
      const result = parseSortParams(req as Request);
      
      expect(result).toEqual({ age: 'asc' });
    });

    it('should handle fields without direction', () => {
      const req = mockRequest({ sort: 'name,age:desc' });
      const result = parseSortParams(req as Request);
      
      // Only fields with valid direction should be included
      expect(result).toEqual({ age: 'desc' });
    });
  });

  describe('parseFieldsParams', () => {
    it('should parse single field', () => {
      const req = mockRequest({ fields: 'id' });
      const result = parseFieldsParams(req as Request);
      
      expect(result).toEqual(['id']);
    });

    it('should parse multiple fields', () => {
      const req = mockRequest({ fields: 'id,name,email' });
      const result = parseFieldsParams(req as Request);
      
      expect(result).toEqual(['id', 'name', 'email']);
    });

    it('should return undefined for no fields param', () => {
      const req = mockRequest({});
      const result = parseFieldsParams(req as Request);
      
      expect(result).toBeUndefined();
    });

    it('should trim whitespace from fields', () => {
      const req = mockRequest({ fields: 'id , name , email' });
      const result = parseFieldsParams(req as Request);
      
      expect(result).toEqual(['id', 'name', 'email']);
    });

    it('should filter out empty fields', () => {
      const req = mockRequest({ fields: 'id,,name,,email' });
      const result = parseFieldsParams(req as Request);
      
      expect(result).toEqual(['id', 'name', 'email']);
    });
  });

  describe('createSelectObject', () => {
    it('should create select object from fields', () => {
      const fields = ['id', 'name', 'email'];
      const result = createSelectObject(fields);
      
      expect(result).toEqual({
        id: true,
        name: true,
        email: true,
      });
    });

    it('should return undefined for empty fields', () => {
      const result = createSelectObject([]);
      
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined fields', () => {
      const result = createSelectObject(undefined);
      
      expect(result).toBeUndefined();
    });

    it('should handle single field', () => {
      const result = createSelectObject(['id']);
      
      expect(result).toEqual({ id: true });
    });
  });
});
