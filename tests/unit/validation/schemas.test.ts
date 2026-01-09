import { describe, it, expect } from 'vitest';
import {
  uuidSchema,
  emailSchema,
  paginationSchema,
  sortSchema,
  fieldsSchema,
  createUserSchema,
  updateUserSchema,
  createPolicySchema,
  updatePolicySchema,
} from '@server/utils/validation';

describe('Validation Schemas', () => {
  describe('uuidSchema', () => {
    it('should validate valid UUID', () => {
      const result = uuidSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = uuidSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = uuidSchema.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('emailSchema', () => {
    it('should validate valid email', () => {
      const result = emailSchema.safeParse('test@example.com');
      expect(result.success).toBe(true);
    });

    it('should validate email with subdomain', () => {
      const result = emailSchema.safeParse('test@sub.example.com');
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = emailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const result = emailSchema.safeParse('test@');
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('should validate pagination with defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.perPage).toBe(30);
      }
    });

    it('should validate custom pagination', () => {
      const result = paginationSchema.safeParse({ page: 2, perPage: 50 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(2);
        expect(result.data.perPage).toBe(50);
      }
    });

    it('should coerce string numbers to integers', () => {
      const result = paginationSchema.safeParse({ page: '3', perPage: '25' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.perPage).toBe(25);
      }
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject perPage greater than 100', () => {
      const result = paginationSchema.safeParse({ perPage: 101 });
      expect(result.success).toBe(false);
    });
  });

  describe('sortSchema', () => {
    it('should validate single sort field', () => {
      const result = sortSchema.safeParse('name:asc');
      expect(result.success).toBe(true);
    });

    it('should validate multiple sort fields', () => {
      const result = sortSchema.safeParse('name:asc,createdAt:desc');
      expect(result.success).toBe(true);
    });

    it('should validate field without direction', () => {
      const result = sortSchema.safeParse('name');
      expect(result.success).toBe(true);
    });

    it('should reject invalid format', () => {
      const result = sortSchema.safeParse('name:invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('fieldsSchema', () => {
    it('should validate single field', () => {
      const result = fieldsSchema.safeParse('name');
      expect(result.success).toBe(true);
    });

    it('should validate multiple fields', () => {
      const result = fieldsSchema.safeParse('id,name,email');
      expect(result.success).toBe(true);
    });

    it('should reject fields with spaces', () => {
      const result = fieldsSchema.safeParse('id, name');
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate valid user creation', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        department: 'Training',
        password: 'securePassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should validate user without password', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        department: 'Admin',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid department', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        department: 'InvalidDept',
      });
      expect(result.success).toBe(false);
    });

    it('should reject password less than 8 characters', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: 'Test User',
        department: 'Training',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = createUserSchema.safeParse({
        email: 'test@example.com',
        name: '',
        department: 'Training',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('should validate partial user update', () => {
      const result = updateUserSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('should validate status update', () => {
      const result = updateUserSchema.safeParse({
        status: 'Inactive',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updateUserSchema.safeParse({
        status: 'InvalidStatus',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createPolicySchema', () => {
    it('should validate valid policy creation', () => {
      const result = createPolicySchema.safeParse({
        title: 'Test Policy',
        version: '1.0',
        fileUrl: 'https://example.com/policy.pdf',
        reviewDate: '2025-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should validate policy with minimum fields', () => {
      const result = createPolicySchema.safeParse({
        title: 'Test Policy',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty title', () => {
      const result = createPolicySchema.safeParse({
        title: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePolicySchema', () => {
    it('should validate partial policy update', () => {
      const result = updatePolicySchema.safeParse({
        title: 'Updated Title',
      });
      expect(result.success).toBe(true);
    });

    it('should validate status update', () => {
      const result = updatePolicySchema.safeParse({
        status: 'Published',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid status', () => {
      const result = updatePolicySchema.safeParse({
        status: 'InvalidStatus',
      });
      expect(result.success).toBe(false);
    });

    it('should validate review date update', () => {
      const result = updatePolicySchema.safeParse({
        reviewDate: '2025-12-31T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });
  });
});
