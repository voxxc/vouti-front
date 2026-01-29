/**
 * Parses a date string (YYYY-MM-DD) as a local date, avoiding UTC timezone shifts.
 * 
 * Problem: new Date("2026-01-10") interprets as UTC midnight, which when converted
 * to Brazil timezone (UTC-3) becomes "2026-01-09 21:00", showing the wrong day.
 * 
 * Solution: Parse the date components manually and create a local Date object.
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day); // month - 1 because Date uses 0-indexed months
}
