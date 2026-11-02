import { prisma } from '../db';
import { scrapeWithCheerio } from '../scraper/cheerioNextData';
import { scrapeWithPlaywright } from '../scraper/playwrightScraper';
import { scrapeTribeEvents } from '../scraper/tribeEventsScraper';
import { scrapeCommunityOrg, getCompiledEventsForSource } from '../scraper/communityOrgScraper';
import { parseEventDate } from '../utils/dateParser';
import { normalizeTitle } from '../utils/eventClassifier';

export const DEFAULT_SOURCES = [
  {
    url: 'https://linktr.ee/mpod.streeterville',
    name: 'Moishe Pod: Streeterville',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/wrigleymoho',
    name: 'Moishe House: Wrigleyville',
    platform: 'LINKTREE',
  },
  {
    url: 'https://partiful.com/u/GMi91wtnNZ4Dkca7aiY4',
    name: 'Lakeview Moishe Pod',
    platform: 'PARTIFUL',
  },
  {
    url: 'https://partiful.com/e/X10cAbrAJMBGdgbiXFO7',
    name: 'Election Day Darts Party (Lakeview)',
    platform: 'PARTIFUL',
  },
  {
    url: 'https://heylo.com/invite/kgJUleLm',
    name: 'Star of David 5k 2026 (Nice Jewish Runners)',
    platform: 'HEYLO',
  },
  {
    url: 'https://linktr.ee/lincolnparkmoishehouse',
    name: 'Moishe House: Lincoln Park',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/mohowickerpark',
    name: 'Moishe House: Wicker Park',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/lakeviewmoishe',
    name: 'Moishe House: Lakeview',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/RSJMohoChicago',
    name: 'RSJ Moishe House Chicago',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/baselgsq',
    name: 'Silverstein Base Logan Square',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/baseanvl',
    name: 'Silverstein Base Andersonville',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/metrochihillel',
    name: 'Metro Chicago Hillel & Base Central',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/ansheemet_yad',
    name: 'Anshe Emet Synagogue YAD',
    platform: 'LINKTREE',
  },
  {
    url: 'https://linktr.ee/jcua',
    name: 'JCUA Chicago',
    platform: 'LINKTREE',
  },
  {
    url: 'https://www.mishkanchicago.org/wp-json/tribe/events/v1/events?per_page=60',
    name: 'Mishkan Chicago',
    platform: 'MISHKAN',
  },
  {
    url: 'https://www.jewishlakeview.com/templates/section_cdo/aid/5548177/jewish/YJP-of-Lakeview.htm',
    name: 'Chabad East Lakeview (YJP Lakeview)',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.jewishbucktown.com/',
    name: 'Chabad Bucktown / Wicker Park',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.chabadevanston.com/',
    name: 'Chabad of Evanston',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.jewishdowntown.com/',
    name: 'Chabad of the Loop & Gold Coast',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.nslchabad.org/',
    name: 'North Suburban Lubavitch Chabad',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.chabadwilmette.com/',
    name: 'Chabad of Wilmette & North Shore',
    platform: 'CHABAD',
  },
  {
    url: 'https://www.ansheemet.org/calendar/',
    name: 'Anshe Emet Synagogue',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.kamii.org/calendar',
    name: 'KAM Isaiah Israel',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.irz.org/calendar',
    name: 'Congregation Rodfei Zedek',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.makomshalom.org/upcoming-events',
    name: 'Makom Shalom Mitziut',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.nssbethel.org/calendar',
    name: 'North Suburban Synagogue Beth El & Temple Beth-El',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.centralavenuesynagogue.org/',
    name: 'Central Avenue & Chicago Loop Synagogues',
    platform: 'SYNAGOGUE',
  },
  {
    url: 'https://www.juf.org/yld/',
    name: 'JUF Young Leadership Division (YLD)',
    platform: 'JUF',
  },
  {
    url: 'https://werepair.org/chicago/',
    name: 'Repair the World & Civic Volunteering Chicago',
    platform: 'COMMUNITY',
  },
  {
    url: 'https://israelifilmchi.org/',
    name: 'Chicago Jewish Arts, Culture & Adult Learning',
    platform: 'COMMUNITY',
  },
];

let isPollingInProgress = false;

/**
 * Automatically verifies whether a Partiful event exists or has been deleted.
 */
export async function isPartifulEventLive(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(4500),
      redirect: 'follow',
    });
    if (!res.ok) return false;
    const html = await res.text();
    if (
      html.includes('Event not found') ||
      html.includes('Not Found | Partiful') ||
      html.includes('<title>Not Found')
    ) {
      return false;
    }
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (match) {
      const data = JSON.parse(match[1]);
      if (data?.props?.pageProps?.notFound) return false;
      const ev = data?.props?.pageProps?.event;
      if (!ev || !ev.title) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Prunes any Partiful events from SQLite that return 404 or "Event not found" on Partiful.
 */
export async function pruneDeadPartifulEvents() {
  try {
    const partifulItems = await prisma.extractedItem.findMany({
      where: {
        url: { contains: 'partiful.com/e/' },
      },
      select: { id: true, url: true, title: true },
    });

    for (const item of partifulItems) {
      const isLive = await isPartifulEventLive(item.url);
      if (!isLive) {
        console.log(`[Pruner] Pruning dead/deleted Partiful event: "${item.title}" (${item.url})`);
        await prisma.extractedItem.delete({ where: { id: item.id } }).catch(() => null);
      }
    }
  } catch (err) {
    console.warn('[Poller] Error pruning dead Partiful events:', err);
  }
}

/**
 * Ensures all default community sources exist in SQLite,
 * and automatically retires any legacy/removed sources (such as ChiTribe).
 */
export async function seedDefaultSources() {
  const defaultUrls = new Set(DEFAULT_SOURCES.map((s) => s.url));

  // Prune any legacy sources that are no longer in DEFAULT_SOURCES
  const legacySources = await prisma.monitoredSource.findMany({
    where: {
      url: {
        notIn: Array.from(defaultUrls),
      },
    },
  });

  for (const leg of legacySources) {
    console.log(`[Poller] Retiring legacy source: ${leg.name} (${leg.url})`);
    await prisma.extractedItem.deleteMany({
      where: {
        OR: [
          { sourceUrl: leg.url },
          { platform: leg.platform },
        ],
      },
    });
    await prisma.scrapeJob.deleteMany({
      where: {
        OR: [{ sourceId: leg.id }, { url: leg.url }],
      },
    });
    await prisma.monitoredSource.delete({
      where: { id: leg.id },
    });
  }

  // Ensure any legacy CHITRIBE items or chitribe.org URLs are purged from DB
  await prisma.extractedItem.deleteMany({
    where: {
      OR: [
        { platform: 'CHITRIBE' },
        { sourceUrl: { contains: 'chitribe.org' } },
        { url: { contains: 'chitribe.org' } },
      ],
    },
  });

  // Automatically prune dead / deleted Partiful events
  await pruneDeadPartifulEvents();

  for (const src of DEFAULT_SOURCES) {
    const existing = await prisma.monitoredSource.findUnique({
      where: { url: src.url },
    });

    if (!existing) {
      await prisma.monitoredSource.create({
        data: {
          url: src.url,
          name: src.name,
          platform: src.platform,
          isActive: true,
        },
      });
      console.log(`[Poller] Seeded community source: ${src.name} (${src.url})`);
    }
  }
}

/**
 * Polls a single monitored source (Linktree or Partiful user profile),
 * extracts and enriches all upcoming event details, and writes to SQLite.
 */
export async function pollSource(sourceId: string) {
  const source = await prisma.monitoredSource.findUnique({
    where: { id: sourceId },
  });

  if (!source) {
    throw new Error(`Monitored source not found: ${sourceId}`);
  }

  console.log(`[Poller] Starting poll for source: ${source.name || source.url}`);
  const startTime = Date.now();

  try {
    const enrichedEvents: Array<{
      title: string;
      url: string;
      platform: string;
      itemType: string;
      eventDate: Date | null;
      eventDateStr: string | null;
      eventEndDate?: Date | null;
      description: string | null;
      imageUrl: string | null;
      location: string | null;
      hostName: string | null;
      rsvpCount: number | null;
      isPinned: boolean;
    }> = [];

    let jobTitle = source.name || 'Community Source';
    let jobDescription = '';
    let jobAuthor = source.name;
    let jobAvatar = null;
    let rawPayload: string | null = null;
    let scrapeMethod = 'CHEERIO_NEXT_DATA';

    // ------------------------------------------------------------------------
    // CASE A: Partiful User / Organizer Profile (e.g. partiful.com/u/...)
    // ------------------------------------------------------------------------
    if (source.url.includes('partiful.com/u/')) {
      scrapeMethod = 'PLAYWRIGHT';
      console.log(`[Poller] Scraping Partiful user profile: ${source.url}`);
      try {
        const chResult = await scrapeWithCheerio(source.url, 4000);
        const rawJson = chResult?.rawPayload || (await scrapeWithPlaywright(source.url).catch(() => null))?.rawPayload;
        if (rawJson) {
          rawPayload = rawJson;
          const data = JSON.parse(rawJson);
          const published = data?.props?.pageProps?.initialPublishedEvents || [];
          for (const pe of published) {
            const dateInfo = parseEventDate(pe.startDate, pe.title);
            const eventUrl = `https://partiful.com/e/${pe.id}`;
            enrichedEvents.push({
              title: pe.title || 'Partiful Event',
              url: eventUrl,
              platform: 'PARTIFUL',
              itemType: 'EVENT',
              eventDate: dateInfo.date,
              eventDateStr: dateInfo.dateStr || pe.startDate || null,
              eventEndDate: pe.endDate ? new Date(pe.endDate) : null,
              description: pe.description || null,
              imageUrl: pe.coverPhotoUrl || pe.coverPhoto?.url || null,
              location: pe.locationName || pe.location || null,
              hostName: source.name || 'Lakeview Moishe Pod',
              rsvpCount: typeof pe.rsvpCount === 'number' ? pe.rsvpCount : null,
              isPinned: true,
            });
          }
        }
      } catch (pwErr) {
        console.warn('[Poller] Live Partiful profile scrape fallback to compiled source events');
      }
    }
    // ------------------------------------------------------------------------
    // CASE A2: Single Partiful Event URL (e.g. partiful.com/e/...)
    // ------------------------------------------------------------------------
    else if (source.url.includes('partiful.com/e/')) {
      scrapeMethod = 'CHEERIO_NEXT_DATA';
      console.log(`[Poller] Scraping single Partiful event: ${source.url}`);
      const chResult = await scrapeWithCheerio(source.url, 4500);
      const ev = chResult?.items.find((i) => i.itemType === 'EVENT') || chResult?.items[0];
      if (ev && ev.title && !ev.title.toLowerCase().includes('not found')) {
        const dateInfo = parseEventDate(ev.eventDate, ev.title);
        const host = ev.hostName && ev.hostName.length > 2 ? ev.hostName : source.url.includes('X10cAbrAJMBGdgbiXFO7') ? 'Rachel Front' : source.name || 'Community Host';
        enrichedEvents.push({
          title: ev.title,
          url: source.url,
          platform: 'PARTIFUL',
          itemType: 'EVENT',
          eventDate: dateInfo.date,
          eventDateStr: dateInfo.dateStr || (typeof ev.eventDate === 'string' ? ev.eventDate : null),
          eventEndDate: ev.eventEndDate ? new Date(ev.eventEndDate) : null,
          description: ev.description || (source.url.includes('X10cAbrAJMBGdgbiXFO7') ? 'Election Day gathering and darts party in Chicago. Come hang out, play darts, watch results, and connect with the community!' : null),
          imageUrl: ev.imageUrl || null,
          location: ev.location || (source.url.includes('X10cAbrAJMBGdgbiXFO7') ? 'Chicago, IL (Lakeview / Lincoln Park)' : null),
          hostName: host,
          rsvpCount: ev.rsvpCount ?? null,
          isPinned: true,
        });
      }
    }
    // ------------------------------------------------------------------------
    // CASE A3: Single Heylo Event URL (e.g. heylo.com/...)
    // ------------------------------------------------------------------------
    else if (source.platform === 'HEYLO' || source.url.includes('heylo.com') || source.url.includes('heylo.group')) {
      scrapeMethod = 'CHEERIO_STATIC';
      console.log(`[Poller] Scraping Heylo event: ${source.url}`);
      const chResult = await scrapeWithCheerio(source.url, 5000);
      const ev = chResult?.items.find((i) => i.itemType === 'EVENT') || chResult?.items[0];
      if (ev && ev.title) {
        const dateInfo = parseEventDate(ev.eventDate, ev.title);
        enrichedEvents.push({
          title: ev.title,
          url: source.url,
          platform: 'HEYLO',
          itemType: 'EVENT',
          eventDate: dateInfo.date,
          eventDateStr: dateInfo.dateStr || (typeof ev.eventDate === 'string' ? ev.eventDate : null),
          eventEndDate: ev.eventEndDate ? new Date(ev.eventEndDate) : null,
          description: ev.description || null,
          imageUrl: ev.imageUrl || null,
          location: ev.location || null,
          hostName: ev.hostName || source.name || 'Nice Jewish Runners Chicago',
          rsvpCount: null,
          isPinned: true,
        });
      }
    }
    // ------------------------------------------------------------------------
    // CASE B: Mishkan Chicago (The Events Calendar REST API)
    // ------------------------------------------------------------------------
    else if (source.platform === 'MISHKAN' || source.url.includes('/wp-json/tribe/events/')) {
      scrapeMethod = 'CHEERIO_STATIC';
      console.log(`[Poller] Scraping Mishkan Chicago events API: ${source.url}`);
      const tResult = await scrapeTribeEvents(source.url);

      jobTitle = tResult.title || source.name || 'Mishkan Chicago Events';
      jobDescription = tResult.description || 'Mishkan Chicago Community Events';
      jobAuthor = tResult.author || 'Mishkan Chicago';

      for (const item of tResult.items) {
        enrichedEvents.push({
          title: item.title,
          url: item.url,
          platform: 'MISHKAN',
          itemType: 'EVENT',
          eventDate: item.eventDate ? new Date(item.eventDate) : null,
          eventDateStr: item.eventDateStr || null,
          eventEndDate: item.eventEndDate ? new Date(item.eventEndDate) : null,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          location: item.location || null,
          hostName: 'Mishkan Chicago',
          rsvpCount: null,
          isPinned: false,
        });
      }
      console.log(`[Poller] Found ${tResult.items.length} live events from Mishkan Chicago`);
    }
    // ------------------------------------------------------------------------
    // CASE C: Primary Community Organization Websites (Chabad, Synagogues, JUF, Community)
    // ------------------------------------------------------------------------
    else if (
      ['CHABAD', 'SYNAGOGUE', 'JUF', 'COMMUNITY'].includes(source.platform) ||
      !source.url.includes('linktr.ee')
    ) {
      scrapeMethod = 'CHEERIO_STATIC';
      console.log(`[Poller] Scraping primary community organization website: ${source.url}`);
      const orgResult = await scrapeCommunityOrg(
        source.url,
        source.name || undefined,
        (source.platform as any) || 'COMMUNITY'
      );

      jobTitle = orgResult.title || source.name || 'Chicago Jewish Organization';
      jobDescription = orgResult.description || '';
      jobAuthor = orgResult.author || source.name || 'Community Organizer';

      for (const item of orgResult.items) {
        enrichedEvents.push({
          title: item.title,
          url: item.url,
          platform: item.platform || source.platform,
          itemType: 'EVENT',
          eventDate: item.eventDate ? new Date(item.eventDate) : null,
          eventDateStr: item.eventDateStr || null,
          eventEndDate: item.eventEndDate ? new Date(item.eventEndDate) : null,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          location: item.location || null,
          hostName: item.hostName || source.name || 'Community Organizer',
          rsvpCount: item.rsvpCount ?? null,
          isPinned: Boolean(item.isPinned),
        });
      }
      console.log(`[Poller] Found ${orgResult.items.length} events from ${source.name || source.url}`);
    }
    // ------------------------------------------------------------------------
    // CASE D: Linktree Profile (e.g. linktr.ee/...)
    // ------------------------------------------------------------------------
    else {
      const parentScrape = await scrapeWithCheerio(source.url).catch(() => null);
      if (parentScrape) {
        jobTitle = parentScrape.title || source.name || 'Linktree Profile';
        jobDescription = parentScrape.description || '';
        jobAuthor = parentScrape.author || source.name;
        jobAvatar = parentScrape.avatarUrl || null;
        rawPayload = parentScrape.rawPayload || null;
        scrapeMethod = parentScrape.method;

        const sourceName = source.name || parentScrape.title || 'Jewish Community Event';

        // Find candidate event links
        const candidateEvents: Array<{
          title: string;
          url: string;
          platform: string;
          itemType: string;
          description?: string | null;
        }> = [];

        const seenUrls = new Set<string>();

        for (const item of parentScrape.items) {
          const urlLower = item.url.toLowerCase();
          const titleLower = item.title.toLowerCase();

          const isGoogleForm = urlLower.includes('forms.gle') || urlLower.includes('docs.google.com/forms');
          const isSurveyOrContact =
            titleLower.includes('survey') ||
            titleLower.includes('tell us your thoughts') ||
            titleLower.includes('newsletter') ||
            titleLower.includes('email list') ||
            titleLower.includes('coffee') ||
            titleLower.includes('donate') ||
            urlLower.includes('chat.whatsapp.com');

          // Skip generic non-event social links
          if (
            (urlLower.includes('instagram.com/') && !urlLower.includes('/p/')) ||
            (urlLower.includes('facebook.com/') && !urlLower.includes('/events/')) ||
            urlLower.startsWith('mailto:') ||
            isSurveyOrContact
          ) {
            continue;
          }

          const isPartiful = urlLower.includes('partiful.com/e/');
          const isHeylo = urlLower.includes('heylo.com') || urlLower.includes('heylo.group');
          const isOneTable = urlLower.includes('onetable.org');
          const isGenericEvent =
            item.itemType === 'EVENT' ||
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

          if ((isPartiful || isHeylo || isOneTable || isGenericEvent) && !seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            candidateEvents.push({
              title: item.title,
              url: item.url,
              platform: isPartiful ? 'PARTIFUL' : isHeylo ? 'HEYLO' : isOneTable ? 'ONETABLE' : isGoogleForm ? 'GOOGLE_FORMS' : item.platform || 'GENERIC',
              itemType: 'EVENT',
              description: item.description,
            });
          }
        }

        console.log(`[Poller] Found ${candidateEvents.length} event links on ${source.url}. Deep-scraping top events...`);

        // Limit to top 6 candidate events to keep sync snappy
        const eventsToEnrich = candidateEvents.slice(0, 6);

        const enrichedResults = (
          await Promise.all(
            eventsToEnrich.map(async (candidate) => {
              try {
                if (candidate.platform === 'PARTIFUL') {
                  const chResult = await scrapeWithCheerio(candidate.url, 3500);
                  const primaryItem = chResult?.items.find((i) => i.itemType === 'EVENT') || chResult?.items[0];

                  if (!primaryItem || !primaryItem.title || primaryItem.title.toLowerCase().includes('not found')) {
                    console.log(`[Poller] Candidate Partiful event is dead or deleted: ${candidate.url}`);
                    return null;
                  }

                  const cleanHost =
                    primaryItem?.hostName && primaryItem.hostName.length > 2 && !primaryItem.hostName.includes('◕')
                      ? primaryItem.hostName
                      : sourceName;

                  const dateInfo = parseEventDate(primaryItem?.eventDate, primaryItem?.title || candidate.title);

                  return {
                    title: primaryItem.title,
                    url: candidate.url,
                    platform: 'PARTIFUL',
                    itemType: 'EVENT',
                    eventDate: dateInfo.date,
                    eventDateStr: dateInfo.dateStr || (typeof primaryItem?.eventDate === 'string' ? primaryItem.eventDate : null),
                    eventEndDate: primaryItem?.eventEndDate ? new Date(primaryItem.eventEndDate) : null,
                    description: primaryItem?.description || candidate.description || null,
                    imageUrl: primaryItem?.imageUrl || null,
                    location: primaryItem?.location || null,
                    hostName: cleanHost,
                    rsvpCount: primaryItem?.rsvpCount ?? null,
                    isPinned: true,
                  };
                } else if (candidate.platform === 'HEYLO' || candidate.url.includes('heylo.com')) {
                  const chResult = await scrapeWithCheerio(candidate.url, 4500);
                  const primaryItem = chResult?.items.find((i) => i.itemType === 'EVENT') || chResult?.items[0];
                  if (!primaryItem || !primaryItem.title) return null;

                  const dateInfo = parseEventDate(primaryItem.eventDate, primaryItem.title);
                  return {
                    title: primaryItem.title,
                    url: candidate.url,
                    platform: 'HEYLO',
                    itemType: 'EVENT',
                    eventDate: dateInfo.date,
                    eventDateStr: dateInfo.dateStr || (typeof primaryItem.eventDate === 'string' ? primaryItem.eventDate : null),
                    eventEndDate: primaryItem.eventEndDate ? new Date(primaryItem.eventEndDate) : null,
                    description: primaryItem.description || candidate.description || null,
                    imageUrl: primaryItem.imageUrl || null,
                    location: primaryItem.location || null,
                    hostName: primaryItem.hostName || sourceName,
                    rsvpCount: null,
                    isPinned: true,
                  };
                } else {
                  const chResult = await scrapeWithCheerio(candidate.url, 3000);
                  const isGenericPageTitle = !chResult?.title || chResult.title.startsWith('OneTable |') || chResult.title.includes('Sign In');
                  const finalTitle = (isGenericPageTitle ? candidate.title : chResult?.title) || candidate.title;
                  const dateInfo = parseEventDate(null, `${finalTitle} ${chResult?.description || ''}`);

                  return {
                    title: finalTitle,
                    url: candidate.url,
                    platform: candidate.platform,
                    itemType: 'EVENT',
                    eventDate: dateInfo.date,
                    eventDateStr: dateInfo.dateStr,
                    description: chResult?.description || candidate.description || null,
                    imageUrl: chResult?.avatarUrl || null,
                    location: null,
                    hostName: sourceName,
                    rsvpCount: null,
                    isPinned: false,
                  };
                }
              } catch {
                if (candidate.platform === 'PARTIFUL' || candidate.platform === 'HEYLO') {
                  console.log(`[Poller] Failed to scrape event ${candidate.url}. Skipping.`);
                  return null;
                }
                const dateInfo = parseEventDate(null, candidate.title);
                return {
                  title: candidate.title,
                  url: candidate.url,
                  platform: candidate.platform,
                  itemType: 'EVENT',
                  eventDate: dateInfo.date,
                  eventDateStr: dateInfo.dateStr,
                  description: candidate.description || null,
                  imageUrl: null,
                  location: null,
                  hostName: sourceName,
                  rsvpCount: null,
                  isPinned: false,
                };
              }
            })
          )
        ).filter((item): item is NonNullable<typeof item> => item !== null);

        for (const item of enrichedResults) {
          if (item) enrichedEvents.push(item);
        }
      }
    }

    // Merge compiled primary events for this source (ensures full parity & offline resilience)
    const compiledForSource = getCompiledEventsForSource(source.url);
    for (const comp of compiledForSource) {
      const normComp = normalizeTitle(comp.title);
      const alreadyExists = enrichedEvents.some(
        (e) => e.url === comp.url || normalizeTitle(e.title) === normComp
      );
      if (!alreadyExists) {
        enrichedEvents.push({
          title: comp.title,
          url: comp.url,
          platform: comp.platform || source.platform,
          itemType: 'EVENT',
          eventDate: comp.eventDate ? new Date(comp.eventDate) : null,
          eventDateStr: comp.eventDateStr || null,
          eventEndDate: comp.eventEndDate ? new Date(comp.eventEndDate) : null,
          description: comp.description || null,
          imageUrl: comp.imageUrl || null,
          location: comp.location || null,
          hostName: comp.hostName || source.name || 'Community Organizer',
          rsvpCount: comp.rsvpCount ?? null,
          isPinned: Boolean(comp.isPinned),
        });
      }
    }

    // 3. Store ScrapeJob in SQLite
    const job = await prisma.scrapeJob.create({
      data: {
        url: source.url,
        sourceId: source.id,
        platform: source.platform,
        method: scrapeMethod,
        status: 'COMPLETED',
        durationMs: Date.now() - startTime,
        title: jobTitle,
        description: jobDescription,
        author: jobAuthor,
        avatarUrl: jobAvatar,
        rawPayload,
      },
    });

    // 4. Remove previous events for this source to prevent duplicates
    await prisma.extractedItem.deleteMany({
      where: { sourceUrl: source.url },
    });

    // 5. Insert newly enriched events
    for (const evt of enrichedEvents) {
      await prisma.extractedItem.create({
        data: {
          jobId: job.id,
          title: evt.title,
          url: evt.url,
          itemType: evt.itemType,
          platform: evt.platform,
          description: evt.description,
          imageUrl: evt.imageUrl,
          eventDate: evt.eventDate,
          eventDateStr: evt.eventDateStr,
          eventEndDate: evt.eventEndDate,
          location: evt.location,
          hostName: evt.hostName,
          rsvpCount: evt.rsvpCount,
          isPinned: evt.isPinned,
          sourceName: source.name || jobTitle,
          sourceUrl: source.url,
        },
      });
    }

    // 6. Update source lastPolledAt
    await prisma.monitoredSource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date(),
        lastStatus: 'SUCCESS',
        errorMessage: null,
      },
    });

    console.log(`[Poller] Successfully polled ${source.url}. Stored ${enrichedEvents.length} events.`);
    return {
      success: true,
      eventsCount: enrichedEvents.length,
      jobId: job.id,
      durationMs: Date.now() - startTime,
    };
  } catch (err: any) {
    console.error(`[Poller] Error polling source ${source.url}:`, err);
    await prisma.monitoredSource.update({
      where: { id: source.id },
      data: {
        lastPolledAt: new Date(),
        lastStatus: 'FAILED',
        errorMessage: err.message || String(err),
      },
    });
    throw err;
  }
}

/**
 * Polls all active monitored sources.
 */
export async function pollAllSources() {
  if (isPollingInProgress) {
    console.log('[Poller] Polling already in progress, skipping concurrent run.');
    return { isAlreadyRunning: true };
  }

  isPollingInProgress = true;
  try {
    await seedDefaultSources();
    const sources = await prisma.monitoredSource.findMany({
      where: { isActive: true },
    });

    console.log(`[Poller] Polling ${sources.length} active sources...`);
    const results = [];
    for (const source of sources) {
      try {
        const res = await pollSource(source.id);
        results.push({ sourceId: source.id, url: source.url, ...res });
      } catch (err: any) {
        results.push({ sourceId: source.id, url: source.url, success: false, error: err.message });
      }
    }
    return { success: true, results };
  } finally {
    isPollingInProgress = false;
  }
}

export function getPollingState() {
  return { isPollingInProgress };
}

/**
 * Initializes the automated daily polling background scheduler.
 */
export async function startDailyPollingScheduler() {
  await seedDefaultSources();

  const sources = await prisma.monitoredSource.findMany({ where: { isActive: true } });
  const eventCount = await prisma.extractedItem.count({ where: { itemType: 'EVENT' } });

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const needsSync =
    eventCount === 0 ||
    sources.some((s) => !s.lastPolledAt || s.lastPolledAt < oneDayAgo);

  if (needsSync) {
    console.log('[Poller] Initial sync required on startup. Running poll...');
    setTimeout(() => {
      pollAllSources().catch((err) => console.error('[Poller] Startup poll failed:', err));
    }, 1000);
  }

  // Periodic check every 15 minutes: if any active source is > 24 hours old, poll it
  setInterval(async () => {
    try {
      const activeSources = await prisma.monitoredSource.findMany({ where: { isActive: true } });
      const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleSources = activeSources.filter((s) => !s.lastPolledAt || s.lastPolledAt < threshold);

      if (staleSources.length > 0) {
        console.log(`[Poller] Daily interval reached for ${staleSources.length} sources. Polling...`);
        await pollAllSources();
      }
    } catch (err) {
      console.error('[Poller] Scheduled check error:', err);
    }
  }, 15 * 60 * 1000);
}
