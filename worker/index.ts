import initialData from './initialEvents.json';
import { classifyEvent, normalizeTitle } from './classifier';
import { parseEventDate } from './dateParser';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export interface MonitoredSource {
  id: string;
  url: string;
  name: string | null;
  platform: string;
  isActive: boolean;
  lastPolledAt: string | null;
  lastStatus: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityEvent {
  id: string;
  jobId?: string;
  title: string;
  url: string;
  itemType: 'EVENT' | 'LINK' | 'SOCIAL';
  platform: string;
  description: string | null;
  imageUrl: string | null;
  icon?: string | null;
  eventDate: string | null;
  eventDateStr: string | null;
  eventEndDate?: string | null;
  location: string | null;
  hostName: string | null;
  rsvpCount: number | null;
  isPinned: boolean;
  sourceName: string | null;
  sourceUrl: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  organization?: string;
  orgGroup?: string;
  neighborhood?: string | null;
  categories?: string[];
  secondaryUrls?: Array<{ platform: string; url: string; sourceName: string }>;
}

const DEFAULT_SOURCES: MonitoredSource[] = [
  { id: '1', name: 'Mishkan Chicago', platform: 'MISHKAN', url: 'https://www.mishkanchicago.org/wp-json/tribe/events/v1/events?per_page=60', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '2', name: 'ChiTribe Community Events', platform: 'CHITRIBE', url: 'https://chitribe.org/events/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '3', name: 'Silverstein Base Logan Square', platform: 'LINKTREE', url: 'https://linktr.ee/baselgsq', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '4', name: 'Silverstein Base Andersonville', platform: 'LINKTREE', url: 'https://linktr.ee/baseanvl', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '5', name: 'Metro Chicago Hillel & Base Central', platform: 'LINKTREE', url: 'https://linktr.ee/metrochihillel', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '6', name: 'Lakeview Moishe Pod', platform: 'PARTIFUL', url: 'https://partiful.com/u/GMi91wtnNZ4Dkca7aiY4', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '7', name: 'Moishe House: Wrigleyville', platform: 'LINKTREE', url: 'https://linktr.ee/wrigleymoho', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '8', name: 'Moishe House: Lincoln Park', platform: 'LINKTREE', url: 'https://linktr.ee/lincolnparkmoishehouse', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '9', name: 'Moishe House: Wicker Park', platform: 'LINKTREE', url: 'https://linktr.ee/mohowickerpark', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '10', name: 'Moishe House: Lakeview', platform: 'LINKTREE', url: 'https://linktr.ee/lakeviewmoishe', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '11', name: 'Moishe Pod: Streeterville', platform: 'LINKTREE', url: 'https://linktr.ee/mpod.streeterville', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '12', name: 'RSJ Moishe House Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/RSJMohoChicago', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '13', name: 'Anshe Emet Synagogue YAD', platform: 'LINKTREE', url: 'https://linktr.ee/ansheemet_yad', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '14', name: 'JCUA Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/jcua', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
];

// In-Memory store for Cloudflare Worker isolate
let stateSources: MonitoredSource[] = [...DEFAULT_SOURCES];
let stateEvents: CommunityEvent[] = [...(initialData.events as any[])];
let stateLastPolledAt: string | null = new Date().toISOString();
let stateIsSyncing = false;

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('linktr.ee/')) return 'LINKTREE';
  if (u.includes('partiful.com/')) return 'PARTIFUL';
  if (u.includes('tribe/events') || u.includes('mishkanchicago.org')) return 'MISHKAN';
  if (u.includes('chitribe.org')) return 'CHITRIBE';
  return 'GENERIC';
}

function getDefaultName(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('linktr.ee')) {
      const parts = parsed.pathname.split('/').filter(Boolean);
      return parts[0] ? `Linktree: @${parts[0]}` : 'Linktree Source';
    }
    if (parsed.hostname.includes('partiful.com')) {
      return 'Partiful Source';
    }
    return parsed.hostname;
  } catch {
    return 'Community Source';
  }
}

// 1. Scrape Mishkan Chicago Tribe Events API
async function scrapeMishkan(url: string, sourceName: string): Promise<CommunityEvent[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    const rawEvents = data.events || [];

    return rawEvents.map((e: any) => {
      const cleanTitle = (e.title || 'Mishkan Event')
        .replace(/&#8211;/g, '-')
        .replace(/&#8217;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');

      const desc = e.description ? e.description.replace(/<[^>]+>/g, '').trim() : null;
      const loc = e.venue?.venue ? `${e.venue.venue}, ${e.venue.city || 'Chicago'}` : null;
      const meta = classifyEvent(cleanTitle, desc, loc, 'Mishkan Chicago', sourceName);

      return {
        id: `mishkan_${e.id}`,
        title: cleanTitle,
        url: e.url,
        itemType: 'EVENT',
        platform: 'MISHKAN',
        description: desc,
        imageUrl: e.image?.url || null,
        eventDate: e.start_date ? new Date(e.start_date.replace(' ', 'T') + 'Z').toISOString() : null,
        eventDateStr: e.start_date || null,
        eventEndDate: e.end_date ? new Date(e.end_date.replace(' ', 'T') + 'Z').toISOString() : null,
        location: loc,
        hostName: 'Mishkan Chicago',
        rsvpCount: null,
        isPinned: false,
        sourceName,
        sourceUrl: url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        organization: meta.organization,
        orgGroup: meta.orgGroup,
        neighborhood: meta.neighborhood,
        categories: meta.categories,
      };
    });
  } catch (err) {
    console.warn(`[Poller] Mishkan scrape error:`, err);
    return [];
  }
}

// 2. Scrape Partiful User Profile (e.g. partiful.com/u/...)
async function scrapePartifulProfile(url: string, sourceName: string): Promise<CommunityEvent[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];
    const nextData = JSON.parse(match[1]);
    const published = nextData?.props?.pageProps?.initialPublishedEvents || [];

    return published.map((pe: any) => {
      const dateInfo = parseEventDate(pe.startDate, pe.title);
      const meta = classifyEvent(pe.title, pe.description, pe.locationName || pe.location, sourceName, sourceName);

      return {
        id: `partiful_${pe.id}`,
        title: pe.title || 'Partiful Event',
        url: `https://partiful.com/e/${pe.id}`,
        platform: 'PARTIFUL',
        itemType: 'EVENT',
        eventDate: dateInfo.date ? dateInfo.date.toISOString() : null,
        eventDateStr: dateInfo.dateStr || pe.startDate || null,
        eventEndDate: pe.endDate ? new Date(pe.endDate).toISOString() : null,
        description: pe.description || null,
        imageUrl: pe.coverPhotoUrl || pe.coverPhoto?.url || null,
        location: pe.locationName || pe.location || null,
        hostName: sourceName,
        rsvpCount: typeof pe.rsvpCount === 'number' ? pe.rsvpCount : null,
        isPinned: true,
        sourceName,
        sourceUrl: url,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        organization: meta.organization,
        orgGroup: meta.orgGroup,
        neighborhood: meta.neighborhood,
        categories: meta.categories,
      };
    });
  } catch (err) {
    console.warn(`[Poller] Partiful profile scrape error:`, err);
    return [];
  }
}

// Deep enrich individual Partiful event page
async function enrichPartifulEvent(url: string): Promise<Partial<CommunityEvent> | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return null;
    const nextData = JSON.parse(match[1]);
    const pageProps = nextData?.props?.pageProps;
    const event = pageProps?.event || pageProps?.initialEvent;
    if (!event) return null;

    const host = event.host?.name || pageProps?.hosts?.[0]?.name || pageProps?.hosts?.[0]?.user?.name;

    return {
      title: event.title,
      description: event.description,
      imageUrl: event.coverPhotoUrl || event.coverPhoto?.url,
      eventDate: event.startDate ? new Date(event.startDate).toISOString() : null,
      eventDateStr: event.startDate,
      eventEndDate: event.endDate ? new Date(event.endDate).toISOString() : null,
      location: event.locationName || event.location,
      rsvpCount: event.rsvpCount,
      hostName: host,
    };
  } catch {
    return null;
  }
}

// 3. Scrape Linktree Profile (e.g. linktr.ee/...)
async function scrapeLinktree(url: string, sourceName: string): Promise<CommunityEvent[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];
    const nextData = JSON.parse(match[1]);
    const links = nextData?.props?.pageProps?.account?.links || nextData?.props?.pageProps?.links || [];

    const candidates: Array<{ title: string; url: string; platform: string }> = [];
    const seen = new Set<string>();

    for (const item of links) {
      if (!item.url || !item.title) continue;
      const urlLower = item.url.toLowerCase();
      const titleLower = item.title.toLowerCase();

      // Skip non-events
      if (
        (urlLower.includes('instagram.com/') && !urlLower.includes('/p/')) ||
        (urlLower.includes('facebook.com/') && !urlLower.includes('/events/')) ||
        urlLower.startsWith('mailto:') ||
        titleLower.includes('survey') ||
        titleLower.includes('newsletter') ||
        titleLower.includes('email list') ||
        titleLower.includes('donate') ||
        titleLower.includes('coffee') ||
        urlLower.includes('chat.whatsapp.com')
      ) {
        continue;
      }

      const isPartiful = urlLower.includes('partiful.com/e/');
      const isOneTable = urlLower.includes('onetable.org');
      const isGoogleForm = urlLower.includes('forms.gle') || urlLower.includes('docs.google.com/forms');
      const isGenericEvent =
        urlLower.includes('/event') ||
        urlLower.includes('/calendar') ||
        titleLower.includes('rsvp') ||
        titleLower.includes('shabbat') ||
        titleLower.includes('shabbos') ||
        titleLower.includes('dinner') ||
        titleLower.includes('brunch') ||
        titleLower.includes('lunch') ||
        titleLower.includes('class') ||
        titleLower.includes('night') ||
        titleLower.includes('fest') ||
        titleLower.includes('havdalah') ||
        titleLower.includes('learning') ||
        titleLower.includes('simchat') ||
        titleLower.includes('rosh') ||
        titleLower.includes('passover') ||
        titleLower.includes('purim') ||
        titleLower.includes('circle') ||
        titleLower.includes('volunteering') ||
        /\b\d{1,2}\/\d{1,2}\b/.test(item.title) ||
        /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(item.title);

      if ((isPartiful || isOneTable || isGoogleForm || isGenericEvent) && !seen.has(item.url)) {
        seen.add(item.url);
        candidates.push({
          title: item.title,
          url: item.url,
          platform: isPartiful ? 'PARTIFUL' : isOneTable ? 'ONETABLE' : isGoogleForm ? 'GOOGLE_FORMS' : 'LINKTREE',
        });
      }
    }

    // Limit to top 5 candidates to keep polling fast
    const toProcess = candidates.slice(0, 5);

    const enriched = await Promise.all(
      toProcess.map(async (c) => {
        let title = c.title;
        let eventDate: string | null = null;
        let eventDateStr: string | null = null;
        let eventEndDate: string | null = null;
        let description: string | null = null;
        let imageUrl: string | null = null;
        let location: string | null = null;
        let hostName = sourceName;
        let rsvpCount: number | null = null;

        if (c.platform === 'PARTIFUL') {
          const deep = await enrichPartifulEvent(c.url);
          if (deep) {
            if (deep.title) title = deep.title;
            if (deep.eventDate) eventDate = deep.eventDate;
            if (deep.eventDateStr) eventDateStr = deep.eventDateStr;
            if (deep.eventEndDate) eventEndDate = deep.eventEndDate;
            if (deep.description) description = deep.description;
            if (deep.imageUrl) imageUrl = deep.imageUrl;
            if (deep.location) location = deep.location;
            if (deep.hostName) hostName = deep.hostName;
            if (deep.rsvpCount) rsvpCount = deep.rsvpCount;
          }
        }

        if (!eventDate) {
          const dInfo = parseEventDate(null, title);
          if (dInfo.date) {
            eventDate = dInfo.date.toISOString();
            eventDateStr = dInfo.dateStr;
          }
        }

        const meta = classifyEvent(title, description, location, hostName, sourceName);

        const safeId = `lt_${encodeURIComponent(c.url.split('?')[0]).replace(/[^a-zA-Z0-9]/g, '').slice(0, 36)}`;

        return {
          id: safeId,
          title,
          url: c.url,
          itemType: 'EVENT' as const,
          platform: c.platform,
          eventDate,
          eventDateStr,
          eventEndDate,
          description,
          imageUrl,
          location,
          hostName,
          rsvpCount,
          isPinned: c.platform === 'PARTIFUL',
          sourceName,
          sourceUrl: url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organization: meta.organization,
          orgGroup: meta.orgGroup,
          neighborhood: meta.neighborhood,
          categories: meta.categories,
        };
      })
    );

    return enriched;
  } catch (err) {
    console.warn(`[Poller] Linktree scrape error:`, err);
    return [];
  }
}

// Poll any arbitrary source
async function pollSingleSource(source: MonitoredSource): Promise<CommunityEvent[]> {
  const url = source.url;
  const name = source.name || getDefaultName(url);
  const platform = source.platform || detectPlatform(url);

  if (platform === 'MISHKAN' || url.includes('tribe/events') || url.includes('mishkanchicago.org')) {
    return await scrapeMishkan(url, name);
  }
  if (platform === 'PARTIFUL' && url.includes('partiful.com/u/')) {
    return await scrapePartifulProfile(url, name);
  }
  if (platform === 'LINKTREE' || url.includes('linktr.ee/')) {
    return await scrapeLinktree(url, name);
  }

  // Fallback for single Partiful event
  if (url.includes('partiful.com/e/')) {
    const deep = await enrichPartifulEvent(url);
    if (deep && deep.title) {
      const meta = classifyEvent(deep.title, deep.description, deep.location, deep.hostName, name);
      return [
        {
          id: `partiful_${url.split('/e/')[1]?.split('?')[0] || Date.now()}`,
          title: deep.title,
          url,
          platform: 'PARTIFUL',
          itemType: 'EVENT',
          eventDate: deep.eventDate || null,
          eventDateStr: deep.eventDateStr || null,
          eventEndDate: deep.eventEndDate || null,
          description: deep.description || null,
          imageUrl: deep.imageUrl || null,
          location: deep.location || null,
          hostName: deep.hostName || name,
          rsvpCount: deep.rsvpCount || null,
          isPinned: true,
          sourceName: name,
          sourceUrl: url,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          organization: meta.organization,
          orgGroup: meta.orgGroup,
          neighborhood: meta.neighborhood,
          categories: meta.categories,
        },
      ];
    }
  }

  return [];
}

// Poll all active sources concurrently and merge
async function pollAllActiveSources(): Promise<{ source: string; status: string; count: number }[]> {
  stateIsSyncing = true;
  const results: { source: string; status: string; count: number }[] = [];

  const pollPromises = stateSources
    .filter((s) => s.isActive)
    .map(async (source) => {
      try {
        const eventsFound = await pollSingleSource(source);
        source.lastPolledAt = new Date().toISOString();
        source.lastStatus = 'SUCCESS';
        source.errorMessage = null;

        // Merge newly found events into stateEvents
        for (const evt of eventsFound) {
          const normTitle = normalizeTitle(evt.title);
          const existingIdx = stateEvents.findIndex(
            (e) => e.url === evt.url || (normalizeTitle(e.title) === normTitle && e.eventDate === evt.eventDate)
          );

          if (existingIdx !== -1) {
            // Update existing
            stateEvents[existingIdx] = {
              ...stateEvents[existingIdx],
              ...evt,
              id: stateEvents[existingIdx].id,
              createdAt: stateEvents[existingIdx].createdAt,
              updatedAt: new Date().toISOString(),
            };
          } else {
            // Prepend new event
            stateEvents.unshift(evt);
          }
        }

        results.push({
          source: source.name || source.url,
          status: 'SUCCESS',
          count: eventsFound.length,
        });
      } catch (err: any) {
        source.lastStatus = 'FAILED';
        source.errorMessage = err.message || 'Scrape failed';
        results.push({
          source: source.name || source.url,
          status: 'FAILED',
          count: 0,
        });
      }
    });

  await Promise.allSettled(pollPromises);
  stateLastPolledAt = new Date().toISOString();
  stateIsSyncing = false;
  return results;
}

// Generate standard iCalendar RFC-5545 feed
function generateICalendarFeed(events: CommunityEvent[]): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingDated = events
    .filter((e) => e.eventDate && new Date(e.eventDate) >= startOfToday)
    .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());

  const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Jewish Events Chicago//NONSGML v1.0//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Jewish Events Chicago',
    'X-WR-TIMEZONE:America/Chicago',
    'X-WR-CALDESC:Chicago Jewish Community Events & Gatherings',
  ];

  for (const evt of upcomingDated) {
    if (!evt.eventDate) continue;
    const start = new Date(evt.eventDate);
    const end = evt.eventEndDate ? new Date(evt.eventEndDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${evt.id}@jewishevents.chi`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`,
      `DTEND:${fmt(end)}`,
      `SUMMARY:${(evt.title || '').replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(evt.description || '').replace(/\n/g, '\\n')}\\n\\nOrganizer: ${evt.organization || evt.hostName || 'Community'}\\nRSVP: ${evt.url}`,
      `LOCATION:${(evt.location || evt.neighborhood || evt.organization || '').replace(/\n/g, ' ')}`,
      `URL:${evt.url}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function ensureTimestampsInitialized() {
  const nowIso = new Date().toISOString();
  if (!stateLastPolledAt || stateLastPolledAt.startsWith('1970')) {
    stateLastPolledAt = nowIso;
  }
  for (const s of stateSources) {
    if (!s.lastPolledAt || s.lastPolledAt.startsWith('1970')) {
      s.lastPolledAt = nowIso;
    }
  }
}

const API_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    ensureTimestampsInitialized();
    const url = new URL(request.url);

    // Global CORS preflight handler
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: API_HEADERS,
      });
    }

    // 1. Trigger Manual Sync / Poll All Sources
    if (url.pathname === '/api/sources/sync' && request.method === 'POST') {
      const results = await pollAllActiveSources();
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sources synchronization complete. Chicago Jewish events catalog is fully updated.',
          isSyncing: false,
          totalEvents: stateEvents.length,
          results,
        }),
        {
          status: 200,
          headers: API_HEADERS,
        }
      );
    }

    // 2. Sync Status
    if (url.pathname === '/api/sync/status' && request.method === 'GET') {
      return new Response(
        JSON.stringify({
          isSyncing: stateIsSyncing,
          lastPolledAt: stateLastPolledAt,
          totalEvents: stateEvents.length,
        }),
        {
          status: 200,
          headers: API_HEADERS,
        }
      );
    }

    // 3. Monitored Sources (GET, POST)
    if (url.pathname === '/api/sources') {
      if (request.method === 'GET') {
        return new Response(
          JSON.stringify({ sources: stateSources }),
          {
            status: 200,
            headers: API_HEADERS,
          }
        );
      }

      if (request.method === 'POST') {
        try {
          const body: any = await request.json();
          const targetUrl = (body.url || '').trim();
          const targetName = (body.name || '').trim();

          if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'URL is required' }), {
              status: 400,
              headers: API_HEADERS,
            });
          }

          const existing = stateSources.find((s) => s.url.toLowerCase() === targetUrl.toLowerCase());
          if (existing) {
            return new Response(JSON.stringify({ error: 'Source already exists', source: existing }), {
              status: 409,
              headers: API_HEADERS,
            });
          }

          const platform = detectPlatform(targetUrl);
          const newSource: MonitoredSource = {
            id: `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            url: targetUrl,
            name: targetName || getDefaultName(targetUrl),
            platform,
            isActive: true,
            lastPolledAt: null,
            lastStatus: 'POLLING',
            errorMessage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          stateSources.push(newSource);

          // Poll immediately
          const found = await pollSingleSource(newSource);
          newSource.lastPolledAt = new Date().toISOString();
          newSource.lastStatus = 'SUCCESS';

          for (const evt of found) {
            const normTitle = normalizeTitle(evt.title);
            const idx = stateEvents.findIndex(
              (e) => e.url === evt.url || (normalizeTitle(e.title) === normTitle && e.eventDate === evt.eventDate)
            );
            if (idx !== -1) {
              stateEvents[idx] = { ...stateEvents[idx], ...evt, updatedAt: new Date().toISOString() };
            } else {
              stateEvents.unshift(evt);
            }
          }

          return new Response(
            JSON.stringify({
              success: true,
              source: newSource,
              eventsHarvested: found.length,
            }),
            {
              status: 201,
              headers: API_HEADERS,
            }
          );
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Failed to add source' }), {
            status: 500,
            headers: API_HEADERS,
          });
        }
      }
    }

    // 4. Delete Source (/api/sources/:id)
    if (url.pathname.startsWith('/api/sources/') && request.method === 'DELETE') {
      const id = url.pathname.replace('/api/sources/', '').trim();
      const idx = stateSources.findIndex((s) => s.id === id);
      if (idx === -1) {
        return new Response(JSON.stringify({ error: 'Source not found' }), {
          status: 404,
          headers: API_HEADERS,
        });
      }

      const deletedSource = stateSources[idx];
      stateSources.splice(idx, 1);

      // Remove events associated with this source
      stateEvents = stateEvents.filter(
        (e) => e.sourceUrl !== deletedSource.url && e.sourceName !== deletedSource.name
      );

      return new Response(JSON.stringify({ success: true, message: 'Source deleted' }), {
        status: 200,
        headers: API_HEADERS,
      });
    }

    // 5. Dynamic Filtered Events Feed (/api/events/upcoming)
    if (url.pathname === '/api/events/upcoming' && request.method === 'GET') {
      const filter = (url.searchParams.get('filter') || 'upcoming').toLowerCase();
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const platform = (url.searchParams.get('platform') || '').toUpperCase();
      const organization = url.searchParams.get('organization') || '';
      const neighborhood = url.searchParams.get('neighborhood') || '';
      const category = url.searchParams.get('category') || '';

      // Get Chicago date/time for accurate community timezone filtering
      const chicagoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const chicagoNow = new Date(chicagoStr);
      const startOfToday = new Date(chicagoNow.getFullYear(), chicagoNow.getMonth(), chicagoNow.getDate(), 0, 0, 0);

      let filtered = stateEvents.filter((e) => {
        // Date filters
        if (filter === 'upcoming') {
          if (e.eventDate) {
            const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
            if (ed < startOfToday) return false;
          }
        } else if (filter === 'weekend') {
          if (!e.eventDate) return false;
          const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          const day = chicagoNow.getDay();
          const diffToFri = day === 0 ? -2 : day === 6 ? -1 : 5 - day;
          const fri = new Date(chicagoNow.getFullYear(), chicagoNow.getMonth(), chicagoNow.getDate() + diffToFri, 0, 0, 0);
          const sun = new Date(fri.getFullYear(), fri.getMonth(), fri.getDate() + 2, 23, 59, 59);
          if (ed < fri || ed > sun) return false;
        } else if (filter === 'week') {
          if (!e.eventDate) return false;
          const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          const next7 = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (ed < startOfToday || ed > next7) return false;
        } else if (filter === 'month') {
          if (!e.eventDate) return false;
          const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          const next30 = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (ed < startOfToday || ed > next30) return false;
        } else if (filter === 'past') {
          if (!e.eventDate) return false;
          const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          if (ed >= startOfToday) return false;
        }

        // Platform filter
        if (platform && platform !== 'ALL') {
          if (e.platform.toUpperCase() !== platform) return false;
        }

        // Organization filter
        if (organization && organization !== 'ALL') {
          if (e.organization !== organization) return false;
        }

        // Neighborhood filter
        if (neighborhood && neighborhood !== 'ALL') {
          if (e.neighborhood !== neighborhood) return false;
        }

        // Category filter
        if (category && category !== 'ALL') {
          if (!e.categories?.includes(category)) return false;
        }

        // Search query
        if (search) {
          const haystack = `${e.title || ''} ${e.description || ''} ${e.location || ''} ${e.hostName || ''} ${e.sourceName || ''}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }

        return true;
      });

      // Sort: confirmed future dates first ascending, null dates at the end
      filtered.sort((a, b) => {
        if (filter === 'past') {
          return new Date(b.eventDate!).getTime() - new Date(a.eventDate!).getTime();
        }
        if (a.eventDate && b.eventDate) {
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        }
        if (a.eventDate && !b.eventDate) return -1;
        if (!a.eventDate && b.eventDate) return 1;
        return 0;
      });

      // Available filter sets calculated from current active events
      const orgSet = new Set<string>();
      const groupSet = new Set<string>();
      const hoodSet = new Set<string>();
      const catSet = new Set<string>();

      for (const e of stateEvents) {
        if (e.organization) orgSet.add(e.organization);
        if (e.orgGroup) groupSet.add(e.orgGroup);
        if (e.neighborhood) hoodSet.add(e.neighborhood);
        if (e.categories) e.categories.forEach((c) => catSet.add(c));
      }

      return new Response(
        JSON.stringify({
          events: filtered,
          total: filtered.length,
          filter,
          availableFilters: {
            organizations: Array.from(orgSet).sort(),
            orgGroups: Array.from(groupSet).sort(),
            neighborhoods: Array.from(hoodSet).sort(),
            categories: Array.from(catSet).sort(),
          },
        }),
        {
          status: 200,
          headers: API_HEADERS,
        }
      );
    }

    // 6. Live iCalendar (.ics) feed
    if (url.pathname === '/api/calendar.ics' && request.method === 'GET') {
      const ics = generateICalendarFeed(stateEvents);
      return new Response(ics, {
        status: 200,
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': 'inline; filename="calendar.ics"',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      });
    }

    // 7. Default: Serve static assets (HTML, Vite JS/CSS, static assets) with SPA fallback
    try {
      if (env.ASSETS) {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404 && !url.pathname.startsWith('/api')) {
          return await env.ASSETS.fetch(
            new Request(new URL('/', request.url).toString(), {
              headers: request.headers,
              method: 'GET',
            })
          );
        }
        return response;
      }
      return new Response('Not Found', { status: 404 });
    } catch (err: any) {
      return new Response(`Worker Error: ${err.message}`, { status: 500 });
    }
  },
};
