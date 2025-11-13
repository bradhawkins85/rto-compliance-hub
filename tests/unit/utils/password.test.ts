import { describe, it, expect } from 'vitest';
import { hashPassword, comparePassword, validatePasswordStrength } from '@server/utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'SecurePass123!';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
      // bcryptjs uses $2b$ or $2a$ prefix
      expect(hashed.startsWith('$2')).toBe(true);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should reject password shorter than 8 characters', async () => {
      const shortPassword = 'short';
      
      await expect(hashPassword(shortPassword)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should hash password exactly 8 characters long', async () => {
      const password = '12345678';
      const hashed = await hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'SecurePass123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(password, hashed);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching passwords', async () => {
      const password = 'SecurePass123!';
      const wrongPassword = 'WrongPass456!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hashed);
      
      expect(isMatch).toBe(false);
    });

    it('should return false for empty password', async () => {
      const password = 'SecurePass123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword('', hashed);
      
      expect(isMatch).toBe(false);
    });

    it('should handle case sensitivity correctly', async () => {
      const password = 'SecurePass123!';
      const hashed = await hashPassword(password);
      const isMatch = await comparePassword('securepass123!', hashed);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate a strong password', () => {
      const result = validatePasswordStrength('SecurePass123!');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password without lowercase letter', () => {
      const result = validatePasswordStrength('SECUREPASS123!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without uppercase letter', () => {
      const result = validatePasswordStrength('securepass123!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without number', () => {
      const result = validatePasswordStrength('SecurePassword!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject password without special character', () => {
      const result = validatePasswordStrength('SecurePass123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject password shorter than 8 characters', () => {
      const result = validatePasswordStrength('Sec1!');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password longer than 128 characters', () => {
      const longPassword = 'A'.repeat(129) + 'a1!';
      const result = validatePasswordStrength(longPassword);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });

    it('should return multiple errors for very weak password', () => {
      const result = validatePasswordStrength('weak');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters long');
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
      expect(result.errors).toContain('Password must contain at least one number');
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should validate password at exactly 8 characters with all requirements', () => {
      const result = validatePasswordStrength('Abc123!@');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate password at exactly 128 characters with all requirements', () => {
      const password = 'A' + 'a'.repeat(120) + '123456!';
      const result = validatePasswordStrength(password);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
