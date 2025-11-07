/**
 * Date utility functions for database operations
 */

/**
 * Milliseconds in one day
 */
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Add days to the current date/time
 * Uses millisecond-based calculation to avoid month boundary issues
 * 
 * @param days Number of days to add (can be negative for past dates)
 * @returns Date object representing the calculated date
 */
export function addDaysToNow(days: number): Date {
  return new Date(Date.now() + days * MILLISECONDS_PER_DAY);
}

/**
 * Add days to a specific date
 * Uses millisecond-based calculation to avoid month boundary issues
 * 
 * @param date Base date
 * @param days Number of days to add (can be negative for past dates)
 * @returns Date object representing the calculated date
 */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MILLISECONDS_PER_DAY);
}

/**
 * Get a date range for "due soon" queries (e.g., items due within X days)
 * 
 * @param days Number of days in the future
 * @returns Object with from (now) and to (now + days) dates
 */
export function getDueSoonRange(days: number) {
  return {
    from: new Date(),
    to: addDaysToNow(days),
  };
}
