import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  getSecurityHeadersConfig,
  permissionsPolicy,
  additionalSecurityHeaders,
  enforceHttps,
  validateTlsVersion,
} from '../../../server/src/middleware/securityHeaders';

describe('Security Headers Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      secure: false,
      protocol: 'http',
      path: '/test',
      headers: {},
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
    };
    mockNext = vi.fn();
  });

  describe('Helmet Security Headers Configuration', () => {
    it('should include Content-Security-Policy directives', () => {
      const config = getSecurityHeadersConfig();
      
      expect(config.contentSecurityPolicy).toBeDefined();
      expect(config.contentSecurityPolicy?.directives).toBeDefined();
      expect(config.contentSecurityPolicy?.directives?.defaultSrc).toEqual(["'self'"]);
      expect(config.contentSecurityPolicy?.directives?.objectSrc).toEqual(["'none'"]);
      expect(config.contentSecurityPolicy?.directives?.frameSrc).toEqual(["'none'"]);
    });

    it('should include HSTS configuration', () => {
      const config = getSecurityHeadersConfig();
      
      expect(config.hsts).toBeDefined();
      expect(config.hsts?.maxAge).toBe(31536000); // 1 year
      expect(config.hsts?.includeSubDomains).toBe(true);
      expect(config.hsts?.preload).toBe(true);
    });

    it('should deny framing', () => {
      const config = getSecurityHeadersConfig();
      
      expect(config.frameguard).toBeDefined();
      expect(config.frameguard?.action).toBe('deny');
    });

    it('should enable noSniff', () => {
      const config = getSecurityHeadersConfig();
      expect(config.noSniff).toBe(true);
    });

    it('should set referrer policy', () => {
      const config = getSecurityHeadersConfig();
      
      expect(config.referrerPolicy).toBeDefined();
      expect(config.referrerPolicy?.policy).toBe('strict-origin-when-cross-origin');
    });

    it('should hide X-Powered-By header', () => {
      const config = getSecurityHeadersConfig();
      expect(config.hidePoweredBy).toBe(true);
    });

    it('should enable XSS filter', () => {
      const config = getSecurityHeadersConfig();
      expect(config.xssFilter).toBe(true);
    });
  });

  describe('Permissions Policy Middleware', () => {
    it('should set Permissions-Policy header', () => {
      permissionsPolicy(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('camera=()')
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('microphone=()')
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should disable dangerous permissions', () => {
      permissionsPolicy(mockReq as Request, mockRes as Response, mockNext);
      
      const setHeaderCall = (mockRes.setHeader as any).mock.calls[0];
      const headerValue = setHeaderCall[1];
      
      expect(headerValue).toContain('payment=()');
      expect(headerValue).toContain('usb=()');
      expect(headerValue).toContain('magnetometer=()');
    });
  });

  describe('Additional Security Headers Middleware', () => {
    it('should set X-Content-Type-Options', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    it('should set X-Frame-Options to DENY', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    it('should set Referrer-Policy', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );
    });

    it('should set Cross-Origin-Opener-Policy', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Opener-Policy',
        'same-origin'
      );
    });

    it('should set Cross-Origin-Resource-Policy', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Resource-Policy',
        'same-origin'
      );
    });

    it('should set Cross-Origin-Embedder-Policy', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cross-Origin-Embedder-Policy',
        'require-corp'
      );
    });

    it('should disable DNS prefetch', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
    });

    it('should call next middleware', () => {
      additionalSecurityHeaders(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Enforce HTTPS Middleware', () => {
    it('should allow HTTPS requests in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.secure = true;
      enforceHttps(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow requests with x-forwarded-proto header in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.headers['x-forwarded-proto'] = 'https';
      enforceHttps(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should block HTTP requests in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.secure = false;
      enforceHttps(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Forbidden',
          status: 403,
          detail: 'HTTPS is required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow HTTP requests in development', () => {
      process.env.NODE_ENV = 'development';
      
      mockReq.secure = false;
      enforceHttps(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('TLS Version Validation Middleware', () => {
    it('should allow TLS 1.3 in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.headers['x-tls-version'] = 'TLSv1.3';
      validateTlsVersion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should allow TLS 1.2 in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.headers['x-tls-version'] = 'TLSv1.2';
      validateTlsVersion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should block TLS 1.1 in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.headers['x-tls-version'] = 'TLSv1.1';
      validateTlsVersion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Forbidden',
          status: 403,
          detail: 'TLS 1.2 or higher is required',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should block TLS 1.0 in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      mockReq.headers['x-tls-version'] = 'TLSv1.0';
      validateTlsVersion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not validate TLS in development', () => {
      process.env.NODE_ENV = 'development';
      
      mockReq.headers['x-tls-version'] = 'TLSv1.0';
      validateTlsVersion(mockReq as Request, mockRes as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
