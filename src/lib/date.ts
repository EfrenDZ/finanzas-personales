export const APP_TIMEZONE = "America/Mazatlan";

/**
 * Format a Date, string, or timestamp to YYYY-MM-DD in America/Mazatlan timezone.
 * Suitable for HTML input[type="date"] values.
 */
export function formatDateToInput(date: Date | string | number = new Date()): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "";

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

/**
 * Parses a YYYY-MM-DD input string into a Date positioned at noon (12:00 PM)
 * in America/Mazatlan timezone (-07:00).
 * Setting the time to 12:00 PM prevents day shifting across timezones and daylight boundaries.
 */
export function parseDateInput(dateStr?: string | null): Date {
  if (!dateStr || !dateStr.trim()) {
    return new Date();
  }
  const trimmed = dateStr.trim();
  if (trimmed.includes("T")) {
    return new Date(trimmed);
  }
  return new Date(`${trimmed}T12:00:00-07:00`);
}

/**
 * Formats a Date for presentation to the user using the es-MX locale
 * and America/Mazatlan timezone.
 */
export function formatDateDisplay(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIMEZONE,
    ...options,
  }).format(d);
}

/**
 * Extracts year, month, day, and dayOfWeek in America/Mazatlan timezone.
 * dayOfWeek: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export function getDatePartsInTimezone(date: Date | string | number = new Date()): {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
} {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) {
    map[p.type] = p.value;
  }
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    dayOfWeek: dayNames.indexOf(map.weekday),
  };
}
