import { ParsedItem, ScrapeResult } from '../types';
import { parseEventDate } from '../utils/dateParser';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

export async function scrapeTribeEvents(rawUrl: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  let apiUrl = rawUrl;

  // Normalize to /wp-json/tribe/events/v1/events if not already an API endpoint
  if (!apiUrl.includes('/wp-json/tribe/events/v1/events')) {
    try {
      const u = new URL(rawUrl);
      apiUrl = `${u.origin}/wp-json/tribe/events/v1/events?per_page=60`;
    } catch {
      apiUrl = rawUrl;
    }
  }

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawEvents: any[] = data.events || [];

    const items: ParsedItem[] = rawEvents.map((e: any) => {
      const title = e.title
        ?.replace(/&#8217;/g, "'")
        ?.replace(/&#038;/g, '&')
        ?.replace(/&amp;/g, '&')
        ?.trim() || 'Community Event';

      const cleanDesc = e.description
        ?.replace(/<[^>]*>?/gm, ' ')
        ?.replace(/\s+/g, ' ')
        ?.trim() || null;

      let location: string | null = null;
      if (e.venue) {
        const parts = [
          e.venue.venue?.replace(/&#8217;/g, "'"),
          e.venue.address,
          e.venue.city,
        ].filter(Boolean);
        location = parts.join(', ') || null;
      }

      const imageUrl = e.image?.url || null;

      // Extract ISO date
      let dateIso = e.utc_start_date ? `${e.utc_start_date.replace(' ', 'T')}Z` : null;
      if (!dateIso && e.start_date) {
        dateIso = new Date(e.start_date.replace(' ', 'T')).toISOString();
      }

      const dateInfo = parseEventDate(dateIso, title);

      return {
        title,
        url: e.url,
        itemType: 'EVENT',
        platform: 'MISHKAN',
        description: cleanDesc,
        imageUrl,
        eventDate: dateInfo.date ? dateInfo.date.toISOString() : dateIso,
        eventDateStr: dateInfo.dateStr || e.start_date || null,
        eventEndDate: e.utc_end_date ? `${e.utc_end_date.replace(' ', 'T')}Z` : null,
        location,
        hostName: 'Mishkan Chicago',
        isPinned: false,
      };
    });

    return {
      url: rawUrl,
      platform: 'GENERIC',
      method: 'CHEERIO_STATIC',
      durationMs: Date.now() - startTime,
      title: 'Mishkan Chicago Events',
      description: 'Mishkan Chicago Community Events & Services',
      author: 'Mishkan Chicago',
      items,
    };
  } catch (err: any) {
    return {
      url: rawUrl,
      platform: 'GENERIC',
      method: 'CHEERIO_STATIC',
      durationMs: Date.now() - startTime,
      items: [],
      errorMessage: `Tribe events scrape failed: ${err.message || String(err)}`,
    };
  }
}
