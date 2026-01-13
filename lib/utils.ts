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

