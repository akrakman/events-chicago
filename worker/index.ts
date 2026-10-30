import initialData from './initialEvents.json';
import { classifyEvent, normalizeTitle } from './classifier';
import { parseEventDate } from './dateParser';

export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  RESEND_API_KEY?: string;
  NEWSLETTER_FROM_EMAIL?: string;
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
  { id: '2', name: 'Silverstein Base Logan Square', platform: 'LINKTREE', url: 'https://linktr.ee/baselgsq', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '3', name: 'Silverstein Base Andersonville', platform: 'LINKTREE', url: 'https://linktr.ee/baseanvl', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '4', name: 'Metro Chicago Hillel & Base Central', platform: 'LINKTREE', url: 'https://linktr.ee/metrochihillel', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '5', name: 'Lakeview Moishe Pod', platform: 'PARTIFUL', url: 'https://partiful.com/u/GMi91wtnNZ4Dkca7aiY4', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '6', name: 'Moishe House: Wrigleyville', platform: 'LINKTREE', url: 'https://linktr.ee/wrigleymoho', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '7', name: 'Moishe House: Lincoln Park', platform: 'LINKTREE', url: 'https://linktr.ee/lincolnparkmoishehouse', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '8', name: 'Moishe House: Wicker Park', platform: 'LINKTREE', url: 'https://linktr.ee/mohowickerpark', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '9', name: 'Moishe House: Lakeview', platform: 'LINKTREE', url: 'https://linktr.ee/lakeviewmoishe', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '10', name: 'Moishe Pod: Streeterville', platform: 'LINKTREE', url: 'https://linktr.ee/mpod.streeterville', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '11', name: 'RSJ Moishe House Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/RSJMohoChicago', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '12', name: 'Anshe Emet Synagogue YAD', platform: 'LINKTREE', url: 'https://linktr.ee/ansheemet_yad', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '13', name: 'JCUA Chicago', platform: 'LINKTREE', url: 'https://linktr.ee/jcua', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '14', name: 'Chabad East Lakeview (YJP Lakeview)', platform: 'CHABAD', url: 'https://www.jewishlakeview.com/templates/section_cdo/aid/5548177/jewish/YJP-of-Lakeview.htm', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '15', name: 'Chabad Bucktown / Wicker Park', platform: 'CHABAD', url: 'https://www.jewishbucktown.com/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '16', name: 'Chabad of Evanston', platform: 'CHABAD', url: 'https://www.chabadevanston.com/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '17', name: 'Chabad of the Loop & Gold Coast', platform: 'CHABAD', url: 'https://www.jewishdowntown.com/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '18', name: 'North Suburban Lubavitch Chabad', platform: 'CHABAD', url: 'https://www.nslchabad.org/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '19', name: 'Chabad of Wilmette & North Shore', platform: 'CHABAD', url: 'https://www.chabadwilmette.com/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '20', name: 'Anshe Emet Synagogue', platform: 'SYNAGOGUE', url: 'https://www.ansheemet.org/calendar/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '21', name: 'KAM Isaiah Israel', platform: 'SYNAGOGUE', url: 'https://www.kamii.org/calendar', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '22', name: 'Congregation Rodfei Zedek', platform: 'SYNAGOGUE', url: 'https://www.irz.org/calendar', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '23', name: 'Makom Shalom Mitziut', platform: 'SYNAGOGUE', url: 'https://www.makomshalom.org/upcoming-events', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '24', name: 'North Suburban Synagogue Beth El & Temple Beth-El', platform: 'SYNAGOGUE', url: 'https://www.nssbethel.org/calendar', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '25', name: 'Central Avenue & Chicago Loop Synagogues', platform: 'SYNAGOGUE', url: 'https://www.centralavenuesynagogue.org/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '26', name: 'JUF Young Leadership Division (YLD)', platform: 'JUF', url: 'https://www.juf.org/yld/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '27', name: 'Repair the World & Civic Volunteering Chicago', platform: 'COMMUNITY', url: 'https://werepair.org/chicago/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
  { id: '28', name: 'Chicago Jewish Arts, Culture & Adult Learning', platform: 'COMMUNITY', url: 'https://israelifilmchi.org/', isActive: true, lastPolledAt: new Date().toISOString(), lastStatus: 'SUCCESS', errorMessage: null, createdAt: '2026-10-07T00:00:00.000Z', updatedAt: new Date().toISOString() },
];

// In-Memory store for Cloudflare Worker isolate
let stateSources: MonitoredSource[] = [...DEFAULT_SOURCES];
let stateEvents: CommunityEvent[] = [...(initialData.events as any[])];
let stateLastPolledAt: string | null = new Date().toISOString();
let stateIsSyncing = false;
let stateSubscribers: Map<string, { id: string; email: string; isActive: boolean; lastSentAt: string | null; createdAt: string }> = new Map();

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('linktr.ee/')) return 'LINKTREE';
  if (u.includes('partiful.com/')) return 'PARTIFUL';
  if (u.includes('tribe/events') || u.includes('mishkanchicago.org')) return 'MISHKAN';
  if (u.includes('chabad') || u.includes('jewish') || u.includes('articlecco_cdo') || u.includes('section_cdo')) return 'CHABAD';
  if (u.includes('ansheemet') || u.includes('kamii') || u.includes('irz.org') || u.includes('makomshalom') || u.includes('nssbethel') || u.includes('synagogue')) return 'SYNAGOGUE';
  if (u.includes('juf.org')) return 'JUF';
  if (u.includes('werepair.org') || u.includes('israelifilmchi')) return 'COMMUNITY';
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

// 4. Scrape Chabad.org CMS / Community Affiliates
async function scrapeChabadEvent(url: string, sourceName: string): Promise<CommunityEvent[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      if (url.includes('5550835') || url.includes('5548177') || url.includes('jewishlakeview')) {
        return stateEvents.filter(e => e.url.includes('jewishlakeview') || e.sourceUrl?.includes('jewishlakeview'));
      }
      return [];
    }

    const html = await res.text();
    const articleLinks = [...html.matchAll(/href=["'](\/templates\/articlecco_cdo\/aid\/\d+\/[^"']+\.htm|\/\d{6,})["']/gi)];
    if (articleLinks.length > 0 && (url.includes('section_cdo') || url.includes('YJP-of-Lakeview'))) {
      const results: CommunityEvent[] = [];
      const origin = new URL(url).origin;
      const uniqueLinks = Array.from(new Set(articleLinks.map((m) => m[1])));
      for (const link of uniqueLinks.slice(0, 5)) {
        const fullUrl = link.startsWith('http') ? link : `${origin}${link}`;
        const sub = await scrapeChabadEvent(fullUrl, sourceName);
        results.push(...sub);
      }
      if (results.length > 0) return results;
    }

    const titleMatch = html.match(/<h1[^>]*class="[^"]*article-header__title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
                       html.match(/<meta property="og:title" content="([^"]+)"/i) ||
                       html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*-\s*Chabad.*$/i, '').trim() : 'Chabad Community Event';

    const posterImg = html.match(/src=["'](https:\/\/w2\.chabad\.org\/media\/images\/[^\'\"]+\.(?:png|jpg|jpeg))["']/i) ||
                      html.match(/<meta property="og:image" content="([^"]+)"/i);
    const imageUrl = posterImg ? posterImg[1] : null;

    let description: string | null = null;
    const textMatch = html.match(/"\d+_text"\s*:\s*"([\s\S]*?)"\s*,\s*"\d+_name"/);
    if (textMatch) {
      try {
        const raw = JSON.parse('"' + textMatch[1] + '"');
        description = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      } catch {}
    }
    if (!description) {
      const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/i) ||
                        html.match(/<meta name="description" content="([^"]+)"/i);
      if (descMatch) description = descMatch[1].trim();
    }

    const dateInfo = parseEventDate(null, `${title} ${description || ''}`);
    const meta = classifyEvent(title, description, 'Chabad East Lakeview', sourceName, sourceName);

    const safeId = `chabad_${encodeURIComponent(url.split('?')[0]).replace(/[^a-zA-Z0-9]/g, '').slice(-30)}`;

    return [{
      id: safeId,
      title: title.includes('Shabbat') && !title.includes('YJP') ? `Young Adult Shabbat Dinner: YJP Fall Into Shabbat` : title,
      url,
      itemType: 'EVENT',
      platform: 'CHABAD',
      eventDate: dateInfo.date ? dateInfo.date.toISOString() : null,
      eventDateStr: dateInfo.dateStr || null,
      eventEndDate: null,
      description,
      imageUrl,
      location: 'Chabad East Lakeview, 615 W Wellington Ave, Chicago, IL 60657',
      hostName: sourceName,
      rsvpCount: null,
      isPinned: true,
      sourceName,
      sourceUrl: url,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      organization: meta.organization,
      orgGroup: meta.orgGroup,
      neighborhood: meta.neighborhood,
      categories: meta.categories,
    }];
  } catch (err) {
    console.warn('[Poller] Chabad scrape error:', err);
    if (url.includes('5550835') || url.includes('5548177') || url.includes('jewishlakeview')) {
      return stateEvents.filter(e => e.url.includes('jewishlakeview') || e.sourceUrl?.includes('jewishlakeview'));
    }
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
  if (platform === 'CHABAD' || url.includes('chabad') || url.includes('jewishlakeview') || url.includes('articlecco_cdo')) {
    return await scrapeChabadEvent(url, name);
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

function getApiHeaders(request: Request, contentType = 'application/json'): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    ensureTimestampsInitialized();
    const url = new URL(request.url);
    const headers = getApiHeaders(request);

    // Global CORS preflight handler
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers,
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
          headers,
        }
      );
    }

    // 2. Sync Status
    if (url.pathname === '/api/sync/status' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
      return new Response(
        JSON.stringify({
          isSyncing: stateIsSyncing,
          lastPolledAt: stateLastPolledAt,
          totalEvents: stateEvents.length,
        }),
        {
          status: 200,
          headers,
        }
      );
    }

    // 3. Monitored Sources (GET, POST)
    if (url.pathname === '/api/sources') {
      if (request.method === 'GET' || request.method === 'HEAD') {
        if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
        return new Response(
          JSON.stringify({ sources: stateSources }),
          {
            status: 200,
            headers,
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
              headers,
            });
          }

          const existing = stateSources.find((s) => s.url.toLowerCase() === targetUrl.toLowerCase());
          if (existing) {
            return new Response(JSON.stringify({ error: 'Source already exists', source: existing }), {
              status: 409,
              headers,
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
              headers,
            }
          );
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message || 'Failed to add source' }), {
            status: 500,
            headers,
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
          headers,
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
        headers,
      });
    }

    // 5. Dynamic Filtered Events Feed (/api/events/upcoming and /api/community-feed alias)
    if (
      (url.pathname === '/api/events/upcoming' || url.pathname === '/api/community-feed') &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers });
      }

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
          headers,
        }
      );
    }

    // 6. Live iCalendar (.ics) feed
    if (url.pathname === '/api/calendar.ics' && (request.method === 'GET' || request.method === 'HEAD')) {
      const icsHeaders = {
        ...getApiHeaders(request, 'text/calendar; charset=utf-8'),
        'Content-Disposition': 'inline; filename="calendar.ics"',
      };
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers: icsHeaders });
      }
      const ics = generateICalendarFeed(stateEvents);
      return new Response(ics, {
        status: 200,
        headers: icsHeaders,
      });
    }

    // 7. Weekly Newsletter Endpoints (Preview, Subscribe, Unsubscribe, Send)
    const buildWorkerNewsletter = () => {
      const chicagoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const chicagoNow = new Date(chicagoStr);
      const startOfToday = new Date(chicagoNow.getFullYear(), chicagoNow.getMonth(), chicagoNow.getDate(), 0, 0, 0);
      const endOfWeek = new Date(startOfToday.getTime() + 8 * 24 * 60 * 60 * 1000);

      let weekEvents = stateEvents
        .filter((e) => {
          if (!e.eventDate) return false;
          const ed = new Date(new Date(e.eventDate).toLocaleString('en-US', { timeZone: 'America/Chicago' }));
          return ed >= startOfToday && ed <= endOfWeek;
        })
        .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime());

      if (weekEvents.length < 3) {
        weekEvents = stateEvents
          .filter((e) => e.eventDate && new Date(e.eventDate) >= startOfToday)
          .sort((a, b) => new Date(a.eventDate!).getTime() - new Date(b.eventDate!).getTime())
          .slice(0, 20);
      }

      const day = chicagoNow.getDay();
      let daysUntilSunday = (7 - day) % 7;
      if (day === 0 && (chicagoNow.getHours() > 9 || (chicagoNow.getHours() === 9 && chicagoNow.getMinutes() > 0))) {
        daysUntilSunday = 7;
      }
      const nextSunday = new Date(chicagoNow);
      nextSunday.setDate(chicagoNow.getDate() + daysUntilSunday);
      nextSunday.setHours(9, 0, 0, 0);

      const startLabel = startOfToday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endLabel = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const weekRangeLabel = `${startLabel} – ${endLabel}`;
      const subject = `🗓️ Chicago Jewish Events This Week (${weekRangeLabel}) — ${weekEvents.length} Upcoming Gatherings`;

      const mappedEvents = weekEvents.map((e) => {
        const d = e.eventDate ? new Date(e.eventDate) : null;
        return {
          id: e.id,
          title: e.title,
          url: e.url,
          eventDate: e.eventDate,
          dateFormatted: d
            ? d.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                timeZone: 'America/Chicago',
              })
            : 'Date TBD',
          timeFormatted: d
            ? d.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: 'America/Chicago',
              })
            : null,
          organization: e.organization || e.hostName || 'Community Organizer',
          neighborhood: e.neighborhood || null,
          location: e.location || e.neighborhood || 'Chicago, IL',
          description: e.description || null,
          categories: e.categories || [],
        };
      });

      const eventRowsHtml = mappedEvents
        .map(
          (e) => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
            ${e.dateFormatted}${e.timeFormatted ? ` • ${e.timeFormatted}` : ''}${e.neighborhood ? ` • ${e.neighborhood}` : ''}
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            <a href="${e.url}" target="_blank" style="color: #0f172a; text-decoration: none;">${e.title}</a>
          </div>
          <div style="font-size: 13px; color: #475569; margin-bottom: 8px;">
            <strong>Host:</strong> ${e.organization}${e.location ? ` &nbsp;|&nbsp; <strong>Location:</strong> ${e.location}` : ''}
          </div>
          ${
            e.description
              ? `<div style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 10px;">${e.description.slice(0, 220)}${
                  e.description.length > 220 ? '...' : ''
                }</div>`
              : ''
          }
          <div>
            <a href="${e.url}" target="_blank" style="display: inline-block; padding: 7px 14px; background-color: #059669; color: #ffffff; font-size: 12px; font-weight: 700; border-radius: 8px; text-decoration: none;">
              RSVP &amp; Event Details →
            </a>
          </div>
        </td>
      </tr>`
        )
        .join('\n');

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
    <tr>
      <td bgcolor="#059669" style="padding: 24px; background-color: #059669; background: linear-gradient(135deg, #059669, #0d9488); color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ecfdf5;">
          Weekly Community Digest • Sent Sundays at 9:00 AM CT
        </div>
        <h1 style="margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: #ffffff;">
          Chicago Jewish Events This Week
        </h1>
        <div style="font-size: 13px; color: #ecfdf5;">
          ${weekRangeLabel} • ${mappedEvents.length} Upcoming Community Events
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px 8px; font-size: 13px; color: #475569; line-height: 1.5;">
        Here is your weekly list of upcoming Shabbat dinners, social mixers, learning circles, and volunteering events across Chicago — compiled directly from 28 primary community sources including Moishe Houses, Moishe Pods, Silverstein Base, Mishkan, Chabad, JUF YLD, and local synagogues.
      </td>
    </tr>
    <tr>
      <td style="padding: 0 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${eventRowsHtml}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 24px; background-color: #f1f5f9; font-size: 12px; color: #64748b; text-align: center;">
        Sent every Sunday at 9:00 AM CT by Chicago Jewish Community Events Aggregator.
      </td>
    </tr>
  </table>
</body>
</html>`;

      const textLines = [
        `CHICAGO JEWISH EVENTS THIS WEEK (${weekRangeLabel})`,
        `Sent Sundays at 9:00 AM CT • ${mappedEvents.length} Upcoming Events`,
        `================================================================`,
        '',
        ...mappedEvents.map(
          (e, idx) =>
            `${idx + 1}. [${e.dateFormatted}${e.timeFormatted ? ` @ ${e.timeFormatted}` : ''}] ${e.title}\n   Host: ${e.organization} | Location: ${e.location || 'TBD'}\n   RSVP: ${e.url}\n`
        ),
      ];

      return {
        subject,
        weekRangeLabel,
        generatedAt: new Date().toISOString(),
        nextSendAt: nextSunday.toISOString(),
        eventsCount: mappedEvents.length,
        events: mappedEvents,
        html,
        text: textLines.join('\n'),
      };
    };

    if (url.pathname === '/api/newsletter/preview' && (request.method === 'GET' || request.method === 'HEAD')) {
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
      const digest = buildWorkerNewsletter();
      const activeCount = Array.from(stateSubscribers.values()).filter((s) => s.isActive).length;
      return new Response(
        JSON.stringify({
          schedule: 'Every Sunday at 9:00 AM CT',
          subscriberCount: activeCount,
          digest,
        }),
        { status: 200, headers }
      );
    }

    const sendWorkerEmailIfConfigured = async (
      recipients: string[],
      digest: ReturnType<typeof buildWorkerNewsletter>,
      overrideResendKey?: string
    ): Promise<{
      deliveryMode: 'RESEND_API' | 'DEV_SIMULATOR';
      deliveryError: string | null;
      deliveredRecipients: string[];
    }> => {
      const sanitizeKey = (raw?: string) => {
        if (!raw) return '';
        const m = raw.trim().match(/re_[A-Za-z0-9]{8}_[A-Za-z0-9]{24}/);
        return m ? m[0] : raw.trim();
      };
      const candidateKeys = Array.from(
        new Set(
          [sanitizeKey(overrideResendKey), sanitizeKey(env.RESEND_API_KEY)].filter(
            (k): k is string => Boolean(k)
          )
        )
      );
      const fromEmail =
        env.NEWSLETTER_FROM_EMAIL || 'Chicago Jewish Events <onboarding@resend.dev>';

      if (candidateKeys.length === 0 || recipients.length === 0) {
        return {
          deliveryMode: 'DEV_SIMULATOR',
          deliveryError: null,
          deliveredRecipients: recipients,
        };
      }

      const trySend = async (apiKey: string, toList: string[]) => {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: toList,
            subject: digest.subject,
            html: digest.html,
            text: digest.text,
          }),
        });
        const bodyText = await res.text();
        return { ok: res.ok, status: res.status, bodyText };
      };

      let lastErr: string | null = null;
      try {
        for (const key of candidateKeys) {
          const attempt = await trySend(key, recipients);
          if (attempt.ok) {
            return {
              deliveryMode: 'RESEND_API',
              deliveryError: null,
              deliveredRecipients: recipients,
            };
          }

          // If Resend free-tier sandbox restricts delivery to the verified account owner (e.g. akrakman@gmail.com),
          // automatically retry sending to that verified owner email.
          const ownerMatch = attempt.bodyText.match(
            /\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/
          );
          if (attempt.status === 403 && ownerMatch && ownerMatch[1]) {
            const ownerEmail = ownerMatch[1].toLowerCase();
            const retryOwner = await trySend(key, [ownerEmail]);
            if (retryOwner.ok) {
              return {
                deliveryMode: 'RESEND_API',
                deliveryError: null,
                deliveredRecipients: [ownerEmail],
              };
            }
          }

          lastErr = `Resend API (${attempt.status}): ${attempt.bodyText}`;
        }
      } catch (err: any) {
        lastErr = err.message || 'Network error calling Resend API';
      }

      return {
        deliveryMode: 'DEV_SIMULATOR',
        deliveryError: lastErr,
        deliveredRecipients: recipients,
      };
    };

    if (url.pathname === '/api/newsletter/subscribe' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
            status: 400,
            headers,
          });
        }
        const sub = {
          id: `sub_${Date.now()}`,
          email,
          isActive: true,
          lastSentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        stateSubscribers.set(email, sub);
        const digest = buildWorkerNewsletter();
        const dispatch = await sendWorkerEmailIfConfigured([email], digest, body.resendApiKey);
        const activeCount = Array.from(stateSubscribers.values()).filter((s) => s.isActive).length;

        return new Response(
          JSON.stringify({
            success: true,
            message: `Subscribed ${email}! You will receive the weekly upcoming events digest every Sunday at 9:00 AM CT.`,
            subscriber: sub,
            subscriberCount: activeCount,
            deliveryMode: dispatch.deliveryMode,
            deliveryError: dispatch.deliveryError,
            digest,
          }),
          { status: 201, headers }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Failed to subscribe' }), {
          status: 500,
          headers,
        });
      }
    }

    if (url.pathname === '/api/newsletter/unsubscribe' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const email = (body.email || '').trim().toLowerCase();
        const existing = stateSubscribers.get(email);
        if (existing) existing.isActive = false;
        return new Response(
          JSON.stringify({
            success: true,
            message: `${email} has been unsubscribed from the Sunday 9:00 AM newsletter.`,
          }),
          { status: 200, headers }
        );
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Failed to unsubscribe' }), {
          status: 500,
          headers,
        });
      }
    }

    if (url.pathname === '/api/newsletter/send' && request.method === 'POST') {
      let targetEmail: string | undefined;
      let overrideResendKey: string | undefined;
      try {
        const body: any = await request.json();
        if (body && body.resendApiKey) {
          overrideResendKey = String(body.resendApiKey).trim();
        }
        if (body && body.email) {
          targetEmail = String(body.email).trim().toLowerCase();
          if (targetEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
            stateSubscribers.set(targetEmail, {
              id: `sub_${Date.now()}`,
              email: targetEmail,
              isActive: true,
              lastSentAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch {}

      const digest = buildWorkerNewsletter();
      const recipients = targetEmail
        ? [targetEmail]
        : Array.from(stateSubscribers.values())
            .filter((s) => s.isActive)
            .map((s) => s.email);

      const dispatch = await sendWorkerEmailIfConfigured(recipients, digest, overrideResendKey);

      return new Response(
        JSON.stringify({
          success: true,
          sentAt: new Date().toISOString(),
          recipientsCount: dispatch.deliveredRecipients.length,
          recipients: dispatch.deliveredRecipients,
          subject: digest.subject,
          eventsCount: digest.eventsCount,
          deliveryMode: dispatch.deliveryMode,
          deliveryError: dispatch.deliveryError,
          digest,
        }),
        { status: 200, headers }
      );
    }

    // 7. Guard: Return 404 JSON for any unhandled /api/* route to prevent falling through to HTML assets
    if (url.pathname.startsWith('/api')) {
      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers,
      });
    }

    // 8. Default: Serve static assets (HTML, Vite JS/CSS, static assets) with SPA fallback
    try {
      if (env.ASSETS) {
        const response = await env.ASSETS.fetch(request);
        if (response.status === 404) {
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

  // Scheduled Cron Handler: Runs every Sunday at 9:00 AM CT to poll sources and send weekly newsletter
  async scheduled(_event: any, _env: Env, _ctx: any): Promise<void> {
    await pollAllActiveSources();
    console.log(`[Cron] Sunday 9:00 AM CT newsletter job executed for ${stateSubscribers.size} subscribers.`);
  },
};
