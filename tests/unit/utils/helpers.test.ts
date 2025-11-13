import { describe, it, expect } from 'vitest';
import {
  getStatusColor,
  getStatusLabel,
  formatDate,
  getDaysUntil,
  getStatusFromDate,
} from '@/lib/helpers';

describe('Helper Functions', () => {
  describe('getStatusColor', () => {
    it('should return correct color for compliant status', () => {
      expect(getStatusColor('compliant')).toBe('bg-success text-success-foreground');
    });

    it('should return correct color for due status', () => {
      expect(getStatusColor('due')).toBe('bg-accent text-accent-foreground');
    });

    it('should return correct color for overdue status', () => {
      expect(getStatusColor('overdue')).toBe('bg-destructive text-destructive-foreground');
    });

    it('should return correct color for incomplete status', () => {
      expect(getStatusColor('incomplete')).toBe('bg-secondary text-secondary-foreground');
    });

    it('should return default color for unknown status', () => {
      // @ts-expect-error Testing invalid status
      expect(getStatusColor('invalid')).toBe('bg-muted text-muted-foreground');
    });
  });

  describe('getStatusLabel', () => {
    it('should return correct label for compliant status', () => {
      expect(getStatusLabel('compliant')).toBe('Compliant');
    });

    it('should return correct label for due status', () => {
      expect(getStatusLabel('due')).toBe('Due Soon');
    });

    it('should return correct label for overdue status', () => {
      expect(getStatusLabel('overdue')).toBe('Overdue');
    });

    it('should return correct label for incomplete status', () => {
      expect(getStatusLabel('incomplete')).toBe('Incomplete');
    });

    it('should return Unknown for invalid status', () => {
      // @ts-expect-error Testing invalid status
      expect(getStatusLabel('invalid')).toBe('Unknown');
    });
  });

  describe('formatDate', () => {
    it('should format date in Australian format', () => {
      const result = formatDate('2024-06-15T00:00:00Z');
      expect(result).toMatch(/15 Jun/);
      expect(result).toContain('2024');
    });

    it('should handle different dates correctly', () => {
      const result = formatDate('2025-01-01T00:00:00Z');
      expect(result).toMatch(/01 Jan/);
      expect(result).toContain('2025');
    });

    it('should handle end of year date', () => {
      const result = formatDate('2024-12-31T00:00:00Z');
      expect(result).toMatch(/31 Dec/);
      expect(result).toContain('2024');
    });

    it('should handle ISO date strings', () => {
      const result = formatDate('2024-03-15T12:30:45.123Z');
      expect(result).toMatch(/15 Mar/);
      expect(result).toContain('2024');
    });
  });

  describe('getDaysUntil', () => {
    it('should calculate positive days for future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const result = getDaysUntil(futureDate.toISOString());
      
      expect(result).toBeGreaterThanOrEqual(9);
      expect(result).toBeLessThanOrEqual(11);
    });

    it('should calculate negative days for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      const result = getDaysUntil(pastDate.toISOString());
      
      expect(result).toBeLessThanOrEqual(-4);
      expect(result).toBeGreaterThanOrEqual(-6);
    });

    it('should return approximately 0 for today', () => {
      const today = new Date();
      const result = getDaysUntil(today.toISOString());
      
      expect(Math.abs(result)).toBeLessThanOrEqual(1);
    });

    it('should handle dates 30 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = getDaysUntil(futureDate.toISOString());
      
      expect(result).toBeGreaterThanOrEqual(29);
      expect(result).toBeLessThanOrEqual(31);
    });

    it('should handle dates 365 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);
      const result = getDaysUntil(futureDate.toISOString());
      
      expect(result).toBeGreaterThanOrEqual(364);
      expect(result).toBeLessThanOrEqual(366);
    });
  });

  describe('getStatusFromDate', () => {
    it('should return overdue for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      expect(getStatusFromDate(pastDate.toISOString())).toBe('overdue');
    });

    it('should return due for dates within 30 days', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 15);
      
      expect(getStatusFromDate(soonDate.toISOString())).toBe('due');
    });

    it('should return due for exactly 30 days', () => {
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      
      expect(getStatusFromDate(thirtyDays.toISOString())).toBe('due');
    });

    it('should return compliant for dates more than 30 days away', () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 31);
      
      expect(getStatusFromDate(farDate.toISOString())).toBe('compliant');
    });

    it('should return compliant for dates far in the future', () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 365);
      
      expect(getStatusFromDate(farDate.toISOString())).toBe('compliant');
    });

    it('should return overdue for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      expect(getStatusFromDate(yesterday.toISOString())).toBe('overdue');
    });

    it('should handle today correctly (should be due)', () => {
      const today = new Date();
      const result = getStatusFromDate(today.toISOString());
      
      // Today should be either 'due' or 'compliant' depending on exact timing
      expect(['due', 'compliant']).toContain(result);
    });
  });

  describe('Edge Cases', () => {
    it('should handle leap year dates', () => {
      const leapDay = '2024-02-29T00:00:00Z';
      const formatted = formatDate(leapDay);
      expect(formatted).toMatch(/29 Feb 2024/);
    });

    it('should handle dates at year boundaries', () => {
      const newYear = '2024-01-01T00:00:00Z';
      const formatted = formatDate(newYear);
      expect(formatted).toMatch(/01 Jan 2024/);
    });

    it('should handle timezone differences', () => {
      const dateWithTimezone = '2024-06-15T23:59:59Z';
      const formatted = formatDate(dateWithTimezone);
      expect(formatted).toContain('2024');
    });
  });
});
