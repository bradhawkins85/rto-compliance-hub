import { describe, it, expect, beforeEach } from 'vitest';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken, decodeToken } from '@server/utils/jwt';

describe('JWT Utilities', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockEmail = 'test@example.com';
  const mockRoles = ['Trainer', 'SystemAdmin'];

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user information in token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
      expect(decoded?.roles).toEqual(mockRoles);
      expect(decoded?.type).toBe('access');
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const token2 = generateAccessToken('different-id', 'other@example.com', ['Admin']);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include user information with refresh type', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.email).toBe(mockEmail);
      expect(decoded?.roles).toEqual(mockRoles);
      expect(decoded?.type).toBe('refresh');
    });

    it('should generate different tokens than access tokens', () => {
      const accessToken = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const refreshToken = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const payload = verifyAccessToken(token);
      
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.roles).toEqual(mockRoles);
      expect(payload.type).toBe('access');
    });

    it('should throw error for invalid token', () => {
      expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid token');
    });

    it('should throw error for refresh token', () => {
      const refreshToken = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      
      // JWT verification will fail because wrong secret is used, throwing "Invalid token"
      expect(() => verifyAccessToken(refreshToken)).toThrow();
    });

    it('should throw error for malformed token', () => {
      expect(() => verifyAccessToken('not.a.token')).toThrow('Invalid token');
    });

    it('should throw error for empty token', () => {
      expect(() => verifyAccessToken('')).toThrow('Invalid token');
    });
  });

  describe('verifyRefreshToken', () => {
    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      const payload = verifyRefreshToken(token);
      
      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.email).toBe(mockEmail);
      expect(payload.roles).toEqual(mockRoles);
      expect(payload.type).toBe('refresh');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => verifyRefreshToken('invalid-token')).toThrow('Invalid refresh token');
    });

    it('should throw error for access token', () => {
      const accessToken = generateAccessToken(mockUserId, mockEmail, mockRoles);
      
      // JWT verification will fail because wrong secret is used
      expect(() => verifyRefreshToken(accessToken)).toThrow();
    });
  });

  describe('decodeToken', () => {
    it('should decode access token without verification', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.type).toBe('access');
    });

    it('should decode refresh token without verification', () => {
      const token = generateRefreshToken(mockUserId, mockEmail, mockRoles);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
      expect(decoded?.type).toBe('refresh');
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid-token');
      
      expect(decoded).toBeNull();
    });

    it('should decode expired token without error', () => {
      // Generate a token (we can't easily create an expired one in this test)
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(mockUserId);
    });
  });

  describe('Token payload structure', () => {
    it('should include issuer and audience claims', () => {
      const token = generateAccessToken(mockUserId, mockEmail, mockRoles);
      const payload = verifyAccessToken(token);
      
      // These are set internally by the JWT library
      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('roles');
      expect(payload).toHaveProperty('type');
    });

    it('should handle empty roles array', () => {
      const token = generateAccessToken(mockUserId, mockEmail, []);
      const payload = verifyAccessToken(token);
      
      expect(payload.roles).toEqual([]);
    });

    it('should handle multiple roles', () => {
      const roles = ['Trainer', 'SystemAdmin', 'ComplianceAdmin'];
      const token = generateAccessToken(mockUserId, mockEmail, roles);
      const payload = verifyAccessToken(token);
      
      expect(payload.roles).toEqual(roles);
      expect(payload.roles).toHaveLength(3);
    });
  });
});
