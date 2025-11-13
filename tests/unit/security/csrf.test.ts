import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  csrfTokenGenerator,
  csrfProtection,
  getCsrfToken,
} from '../../../server/src/middleware/csrf';

describe('CSRF Protection Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      path: '/test',
      ip: '127.0.0.1',
      headers: {},
      body: {},
      user: undefined,
      sessionID: undefined,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      locals: {},
    };
    mockNext = vi.fn();
  });

  describe('CSRF Token Generator', () => {
    it('should generate and set CSRF token', () => {
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockRes.locals.csrfToken).toBeDefined();
      expect(typeof mockRes.locals.csrfToken).toBe('string');
      expect(mockRes.locals.csrfToken.length).toBeGreaterThan(0);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should set cookie with secure options in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      
      const cookieCall = (mockRes.cookie as any).mock.calls[0];
      expect(cookieCall[0]).toBe('csrf-token');
      expect(cookieCall[2]).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
      });
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should generate unique tokens for each call', () => {
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      const token1 = mockRes.locals.csrfToken;
      
      mockRes.locals = {};
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      const token2 = mockRes.locals.csrfToken;
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('CSRF Protection', () => {
    it('should skip CSRF check for GET requests', () => {
      mockReq.method = 'GET';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for HEAD requests', () => {
      mockReq.method = 'HEAD';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token', () => {
      mockReq.method = 'POST';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Forbidden',
          status: 403,
          detail: expect.stringContaining('CSRF token missing'),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject PUT request without CSRF token', () => {
      mockReq.method = 'PUT';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject PATCH request without CSRF token', () => {
      mockReq.method = 'PATCH';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject DELETE request without CSRF token', () => {
      mockReq.method = 'DELETE';
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from header', () => {
      // First generate a token
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      const token = mockRes.locals.csrfToken;
      
      // Reset mocks
      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      
      // Try to use the token
      mockReq.headers['x-csrf-token'] = token;
      mockReq.method = 'POST';
      
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should accept valid CSRF token from body', () => {
      // First generate a token
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      const token = mockRes.locals.csrfToken;
      
      // Reset mocks
      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      
      // Try to use the token in body
      mockReq.body = { _csrf: token };
      mockReq.method = 'POST';
      
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid CSRF token', () => {
      // First generate a valid token
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      
      // Reset mocks
      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      mockRes.json = vi.fn().mockReturnThis();
      
      // Try to use an invalid token
      mockReq.headers['x-csrf-token'] = 'invalid-token-123456';
      mockReq.method = 'POST';
      
      csrfProtection(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Forbidden',
          status: 403,
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Get CSRF Token Endpoint', () => {
    it('should return CSRF token', () => {
      mockRes.locals.csrfToken = 'test-token-123';
      
      getCsrfToken(mockReq as Request, mockRes as Response);
      
      expect(mockRes.json).toHaveBeenCalledWith({
        csrfToken: 'test-token-123',
      });
    });

    it('should return error if token not generated', () => {
      mockRes.locals = {};
      
      getCsrfToken(mockReq as Request, mockRes as Response);
      
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Internal Server Error',
          status: 500,
          detail: 'CSRF token not generated',
        })
      );
    });
  });

  describe('Token Storage and Expiry', () => {
    it('should validate token structure', () => {
      // Generate a token
      csrfTokenGenerator(mockReq as Request, mockRes as Response, mockNext);
      const token = mockRes.locals.csrfToken;
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });
});
