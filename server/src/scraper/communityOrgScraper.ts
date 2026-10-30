import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';
import { parseEventDate } from '../utils/dateParser';
import { normalizeTitle } from '../utils/eventClassifier';
import { ParsedItem, PlatformType, ScrapeResult } from '../types';

export interface CompiledOrgEvent {
  title: string;
  url: string;
  itemType: string;
  platform: string;
  description: string | null;
  imageUrl: string | null;
  eventDate: string | null;
  eventDateStr: string | null;
  eventEndDate?: string | null;
  location: string | null;
  hostName: string | null;
  rsvpCount?: number | null;
  isPinned?: boolean;
  sourceName: string;
  sourceUrl: string;
}

let cachedCompiledEvents: CompiledOrgEvent[] | null = null;

export function loadCompiledOrgEvents(): CompiledOrgEvent[] {
  if (cachedCompiledEvents) return cachedCompiledEvents;
  try {
    const candidates = [
      path.resolve(__dirname, '../data/compiled-org-events.json'),
      path.resolve(process.cwd(), 'src/data/compiled-org-events.json'),
      path.resolve(process.cwd(), 'server/src/data/compiled-org-events.json'),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedCompiledEvents = parsed;
          return parsed;
        }
      }
    }
  } catch (err: any) {
    console.warn('[CommunityOrgScraper] Could not load compiled-org-events.json:', err.message);
  }
  return [];
}

export function getCompiledEventsForSource(sourceUrl: string): CompiledOrgEvent[] {
  const all = loadCompiledOrgEvents();
  const norm = sourceUrl.trim().replace(/\/+$/, '').toLowerCase();
  return all.filter((e) => {
    const s = (e.sourceUrl || '').trim().replace(/\/+$/, '').toLowerCase();
    return s === norm;
  });
}

/**
 * Scrapes a primary community organization website (Chabad, Synagogue, JUF, Civic/Cultural Org)
 * using JSON-LD Event schema, Chabad CMS patterns, and HTML event cards,
 * and merges with verified compiled events for that primary source.
 */
export async function scrapeCommunityOrg(
  rawUrl: string,
  sourceName?: string,
  platform: PlatformType = 'COMMUNITY'
): Promise<ScrapeResult> {
  const startTime = Date.now();
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  const liveItems: ParsedItem[] = [];
  let pageTitle = sourceName || 'Chicago Jewish Community Organization';
  let pageDesc = `Upcoming events from ${pageTitle}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      pageTitle =
        sourceName ||
        $('meta[property="og:site_name"]').attr('content') ||
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        pageTitle;
      pageDesc =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        pageDesc;

      // 1. Extract JSON-LD Event schemas
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const parsed = JSON.parse($(el).html() || '{}');
          const list = Array.isArray(parsed) ? parsed : parsed['@graph'] ? parsed['@graph'] : [parsed];
          for (const node of list) {
            if (node['@type'] === 'Event' || node.type === 'Event') {
              const title = (node.name || '').trim();
              if (!title) continue;
              const evtUrl = node.url ? new URL(node.url, url).toString() : url;
              const dateInfo = parseEventDate(node.startDate, title);
              const desc = node.description
                ? String(node.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
                : null;
              const loc =
                node.location?.name ||
                node.location?.address?.streetAddress ||
                (typeof node.location === 'string' ? node.location : null);

              liveItems.push({
                title,
                url: evtUrl,
                itemType: 'EVENT',
                platform,
                description: desc,
                imageUrl: typeof node.image === 'string' ? node.image : node.image?.url || null,
                eventDate: dateInfo.date ? dateInfo.date.toISOString() : null,
                eventDateStr: dateInfo.dateStr || node.startDate || null,
                eventEndDate: node.endDate || null,
                location: loc,
                hostName: sourceName || pageTitle,
                isPinned: false,
              });
            }
          }
        } catch {}
      });

      // 2. Extract Chabad CMS / Synagogue / Event links if present
      $('a[href*="/events/"], a[href*="/event/"], a[href*="articlecco_cdo"], .tribe-events-calendar-list__event-title-link').each(
        (_, el) => {
          const $a = $(el);
          const title = $a.text().replace(/\s+/g, ' ').trim();
          const href = $a.attr('href');
          if (!title || title.length < 5 || !href) return;
          if (/^(events|calendar|upcoming events|learn more|read more|register)$/i.test(title)) return;

          let fullUrl = url;
          try {
            fullUrl = new URL(href, url).toString();
          } catch {}

          const dateInfo = parseEventDate(null, title);
          if (!liveItems.some((i) => i.url === fullUrl || normalizeTitle(i.title) === normalizeTitle(title))) {
            liveItems.push({
              title,
              url: fullUrl,
              itemType: 'EVENT',
              platform,
              description: null,
              imageUrl: null,
              eventDate: dateInfo.date ? dateInfo.date.toISOString() : null,
              eventDateStr: dateInfo.dateStr || null,
              location: null,
              hostName: sourceName || pageTitle,
              isPinned: false,
            });
          }
        }
      );
    }
  } catch {
    // Network offline or timeout; fallback to compiled org events below
  }

  // Merge with verified compiled events for this source
  const compiledForSource = getCompiledEventsForSource(rawUrl);
  const mergedItems: ParsedItem[] = [...liveItems];

  for (const comp of compiledForSource) {
    const normComp = normalizeTitle(comp.title);
    const exists = mergedItems.some(
      (i) => i.url === comp.url || normalizeTitle(i.title) === normComp
    );
    if (!exists) {
      mergedItems.push({
        title: comp.title,
        url: comp.url,
        itemType: 'EVENT',
        platform: comp.platform || platform,
        description: comp.description,
        imageUrl: comp.imageUrl,
        eventDate: comp.eventDate,
        eventDateStr: comp.eventDateStr,
        eventEndDate: comp.eventEndDate || null,
        location: comp.location,
        hostName: comp.hostName || sourceName || pageTitle,
        rsvpCount: comp.rsvpCount ?? null,
        isPinned: Boolean(comp.isPinned),
      });
    }
  }

  return {
    url: rawUrl,
    platform,
    method: 'CHEERIO_STATIC',
    durationMs: Date.now() - startTime,
    title: pageTitle,
    description: pageDesc,
    author: sourceName || pageTitle,
    items: mergedItems,
  };
}
