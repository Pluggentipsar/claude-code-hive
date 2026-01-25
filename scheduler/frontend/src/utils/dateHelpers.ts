/**
 * Date and time helper functions
 */

/**
 * Swedish weekday names
 */
export const WEEKDAY_NAMES = [
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
];

/**
 * Swedish weekday short names
 */
export const WEEKDAY_NAMES_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre'];

/**
 * Get weekday name from index (0-4)
 */
export function getWeekdayName(weekday: number, short = false): string {
  return short ? WEEKDAY_NAMES_SHORT[weekday] : WEEKDAY_NAMES[weekday];
}

/**
 * Format time string (HH:MM)
 */
export function formatTime(time: string): string {
  return time;
}

/**
 * Format time range
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}-${endTime}`;
}

/**
 * Get current week number
 */
export function getCurrentWeekNumber(): { week: number; year: number } {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { week, year: now.getFullYear() };
}

/**
 * Calculate duration in hours
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  return (endH * 60 + endM - startH * 60 - startM) / 60;
}

/**
 * Parse time to minutes
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}
