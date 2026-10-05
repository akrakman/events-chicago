/**
 * Utility to parse various date formats from event pages and titles into a Date object.
 */
export function parseEventDate(
  dateInput?: any,
  title?: string | null
): { date: Date | null; dateStr: string | null } {
  // 1. If dateInput is already a Date object
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return { date: dateInput, dateStr: dateInput.toISOString() };
  }

  // 2. Try string dateInput if available
  if (typeof dateInput === 'string' && dateInput.trim() !== '') {
    const trimmed = dateInput.trim();
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return { date: d, dateStr: trimmed };
    }
  }

  // 3. Try number timestamp
  if (typeof dateInput === 'number' && !isNaN(dateInput)) {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      return { date: d, dateStr: d.toISOString() };
    }
  }

  // 4. Try regex extraction from title (e.g. "09/18/26 Shabbat Shuvah" or "09/18/2026")
  if (title) {
    // MM/DD/YY or MM/DD/YYYY
    const slashMatch = title.match(/\b(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])\/((?:20)?\d{2})\b/);
    if (slashMatch) {
      const month = parseInt(slashMatch[1], 10) - 1;
      const day = parseInt(slashMatch[2], 10);
      let year = parseInt(slashMatch[3], 10);
      if (year < 100) year += 2000;

      // Default to 19:00 (7 PM) for evening events
      const parsed = new Date(Date.UTC(year, month, day, 19, 0, 0));
      if (!isNaN(parsed.getTime())) {
        return { date: parsed, dateStr: slashMatch[0] };
      }
    }

    // Month Name Day (e.g. "Sept 22" or "September 22, 2026")
    const monthNameMatch = title.match(
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i
    );
    if (monthNameMatch) {
      const currentYear = new Date().getFullYear();
      const year = monthNameMatch[3] ? parseInt(monthNameMatch[3], 10) : currentYear;
      const str = `${monthNameMatch[1]} ${monthNameMatch[2]}, ${year} 19:00:00`;
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return { date: parsed, dateStr: monthNameMatch[0] };
      }
    }
  }

  return {
    date: null,
    dateStr: typeof dateInput === 'string' ? dateInput : null,
  };
}
