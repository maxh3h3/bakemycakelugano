import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(price);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Formats a Date object to YYYY-MM-DD format in local timezone.
 * This prevents the timezone shift bug where selecting a date results in
 * the previous day being stored in the database.
 * 
 * @param date - The Date object to format
 * @returns Date string in YYYY-MM-DD format using local timezone
 * 
 * @example
 * const date = new Date('2026-01-15T00:00:00'); // User selects Jan 15
 * formatDateForDB(date); // Returns "2026-01-15" (not "2026-01-14")
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD date string into a Date object in local timezone.
 * This prevents timezone shift bugs when reading dates from the database.
 * 
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object set to midnight in local timezone
 * 
 * @example
 * // Database has "2026-01-15"
 * parseDateFromDB("2026-01-15"); // Returns Date for Jan 15 at 00:00:00 local time
 * 
 * // WRONG way (timezone shift bug):
 * new Date("2026-01-15"); // Parses as UTC, might show as Jan 14 in local timezone
 */
export function parseDateFromDB(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
}

/**
 * Extracts numeric time value from delivery time strings for sorting purposes.
 * Handles various formats: "12", "15", "17", "12:30", "12.30", "17:00", etc.
 * Ignores non-numeric text like "afternoon".
 * 
 * @param timeString - Delivery time string from the database
 * @returns Numeric time value (e.g., 12.5 for "12:30", 17 for "17:00") or null if no number found
 * 
 * @example
 * extractTimeForSorting("12");      // Returns 12
 * extractTimeForSorting("15");      // Returns 15
 * extractTimeForSorting("12:30");   // Returns 12.5
 * extractTimeForSorting("12.30");   // Returns 12.5
 * extractTimeForSorting("17:00");   // Returns 17
 * extractTimeForSorting("afternoon"); // Returns null
 */
export function extractTimeForSorting(timeString: string | null): number | null {
  if (!timeString) return null;
  
  // Try to find a time pattern like "12:30" or "12.30"
  const timePattern = /(\d{1,2})[:.](\d{2})/;
  const match = timeString.match(timePattern);
  
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours + minutes / 60; // Convert to decimal (e.g., 12:30 becomes 12.5)
  }
  
  // Try to find just a number (like "12" or "15")
  const numberPattern = /\b(\d{1,2})\b/;
  const numberMatch = timeString.match(numberPattern);
  
  if (numberMatch) {
    return parseInt(numberMatch[1], 10);
  }
  
  // No numeric time found
  return null;
}

