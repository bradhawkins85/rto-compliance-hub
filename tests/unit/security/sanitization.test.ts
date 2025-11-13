import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  sanitizeString,
  sanitizeSqlInput,
  sanitizeFilePath,
  sanitizeCommandInput,
  validateNoInjection,
  xssProtection,
  pathTraversalProtection,
  strictInputValidation,
} from '../../../server/src/middleware/sanitization';

describe('Sanitization Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      path: '/test',
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
  });

  describe('XSS Protection', () => {
    it('should sanitize script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      const result = sanitizeString(input);
      // After encoding, < becomes &lt; and > becomes &gt;
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should sanitize event handlers', () => {
      const input = '<img src="x" onerror="alert(1)">';
      const result = sanitizeString(input);
      // All HTML is encoded
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).not.toContain('<img');
    });

    it('should sanitize javascript protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeString(input);
      expect(result).not.toContain('javascript:');
    });

    it('should HTML encode special characters', () => {
      const input = '<div>"Test"</div>';
      const result = sanitizeString(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
    });

    it('should sanitize iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe>';
      const result = sanitizeString(input);
      // All HTML is encoded
      expect(result).toContain('&lt;');
      expect(result).not.toContain('<iframe>');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should remove SQL comments', () => {
      const input = "SELECT * FROM users -- comment";
      const result = sanitizeSqlInput(input);
      expect(result).not.toContain('--');
    });

    it('should remove UNION keyword', () => {
      const input = "' UNION SELECT * FROM passwords";
      const result = sanitizeSqlInput(input);
      expect(result).not.toContain('UNION');
    });

    it('should remove DROP keyword', () => {
      const input = "'; DROP TABLE users; --";
      const result = sanitizeSqlInput(input);
      expect(result).not.toContain('DROP');
      expect(result).not.toContain(';');
    });

    it('should remove DELETE keyword', () => {
      const input = "DELETE FROM users WHERE 1=1";
      const result = sanitizeSqlInput(input);
      expect(result).not.toContain('DELETE');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should remove parent directory sequences', () => {
      const input = 'uploads/../../etc/passwd';
      const result = sanitizeFilePath(input);
      expect(result).not.toContain('..');
      // After normalization and removal, should result in a safe path
      expect(result).toBe('uploads/etc/passwd');
    });

    it('should throw on absolute paths', () => {
      expect(() => sanitizeFilePath('/etc/passwd')).toThrow('Absolute paths are not allowed');
    });

    it('should throw on Windows drive letters', () => {
      expect(() => sanitizeFilePath('C:\\Windows\\System32')).toThrow('Absolute paths are not allowed');
    });

    it('should normalize multiple slashes', () => {
      const input = 'folder//subfolder///file.txt';
      const result = sanitizeFilePath(input);
      expect(result).toBe('folder/subfolder/file.txt');
    });

    it('should allow valid relative paths', () => {
      const input = 'uploads/documents/file.pdf';
      const result = sanitizeFilePath(input);
      expect(result).toBe('uploads/documents/file.pdf');
    });
  });

  describe('Command Injection Prevention', () => {
    it('should remove shell metacharacters', () => {
      const input = 'file.txt; rm -rf /';
      const result = sanitizeCommandInput(input);
      expect(result).not.toContain(';');
      expect(result).not.toContain('|');
    });

    it('should remove pipe characters', () => {
      const input = 'cat file.txt | grep password';
      const result = sanitizeCommandInput(input);
      expect(result).not.toContain('|');
    });

    it('should remove backticks', () => {
      const input = 'echo `whoami`';
      const result = sanitizeCommandInput(input);
      expect(result).not.toContain('`');
    });

    it('should remove dollar signs', () => {
      const input = 'echo $HOME';
      const result = sanitizeCommandInput(input);
      expect(result).not.toContain('$');
    });
  });

  describe('Injection Validation', () => {
    it('should detect SQL injection patterns', () => {
      expect(validateNoInjection("SELECT * FROM users")).toBe(false);
      expect(validateNoInjection("admin' OR '1'='1'")).toBe(false);
      expect(validateNoInjection("UNION SELECT password")).toBe(false);
    });

    it('should detect XSS patterns', () => {
      expect(validateNoInjection("<script>alert(1)</script>")).toBe(false);
      expect(validateNoInjection("javascript:alert(1)")).toBe(false);
      expect(validateNoInjection('onclick=alert(1)')).toBe(false);
    });

    it('should detect command injection patterns', () => {
      expect(validateNoInjection("file; rm -rf /")).toBe(false);
      expect(validateNoInjection("test | whoami")).toBe(false);
      expect(validateNoInjection("test && ls")).toBe(false);
    });

    it('should allow safe input', () => {
      expect(validateNoInjection("john.doe@example.com")).toBe(true);
      expect(validateNoInjection("John Doe")).toBe(true);
      expect(validateNoInjection("123 Main St")).toBe(true);
    });
  });

  describe('XSS Protection Middleware', () => {
    it('should sanitize request body', () => {
      mockReq.body = { name: '<script>alert(1)</script>John' };
      xssProtection(mockReq as Request, mockRes as Response, mockNext);
      // HTML should be encoded
      expect(mockReq.body.name).toContain('&lt;');
      expect(mockReq.body.name).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      mockReq.query = { search: '<img src=x onerror=alert(1)>' };
      xssProtection(mockReq as Request, mockRes as Response, mockNext);
      // HTML should be encoded
      expect(mockReq.query.search).toContain('&lt;');
      expect(mockReq.query.search).not.toContain('<img');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize URL parameters', () => {
      mockReq.params = { id: '<script>test</script>' };
      xssProtection(mockReq as Request, mockRes as Response, mockNext);
      expect(mockReq.params.id).toContain('&lt;');
      expect(mockReq.params.id).not.toContain('<script>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: '<script>alert(1)</script>',
          address: {
            street: '<img onerror="evil()">'
          }
        }
      };
      xssProtection(mockReq as Request, mockRes as Response, mockNext);
      // All HTML should be encoded
      expect(mockReq.body.user.name).toContain('&lt;');
      expect(mockReq.body.user.name).not.toContain('<script>');
      expect(mockReq.body.user.address.street).toContain('&lt;');
      expect(mockReq.body.user.address.street).not.toContain('<img');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Path Traversal Protection Middleware', () => {
    it('should sanitize file paths in body', () => {
      mockReq.body = { filePath: 'uploads/../../../etc/passwd' };
      pathTraversalProtection(mockReq as Request, mockRes as Response, mockNext);
      // After sanitization, the path should have .. removed
      expect(mockReq.body.filePath).toBe('uploads/etc/passwd');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize paths in query parameters', () => {
      mockReq.query = { path: 'uploads/../../../secret.txt' };
      pathTraversalProtection(mockReq as Request, mockRes as Response, mockNext);
      // After sanitization, the path should have .. removed
      expect(mockReq.query.path).toBe('uploads/secret.txt');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject absolute paths', () => {
      mockReq.body = { filePath: '/etc/passwd' };
      pathTraversalProtection(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Strict Input Validation Middleware', () => {
    it('should block SQL injection attempts', () => {
      mockReq.body = { email: "admin' OR '1'='1'" };
      strictInputValidation(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block XSS attempts', () => {
      mockReq.body = { comment: '<script>steal()</script>' };
      strictInputValidation(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should block command injection attempts', () => {
      mockReq.body = { filename: 'file.txt; rm -rf /' };
      strictInputValidation(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow safe input', () => {
      mockReq.body = { 
        name: 'John Doe', 
        email: 'john@example.com',
        message: 'Hello, this is a test message.'
      };
      strictInputValidation(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
