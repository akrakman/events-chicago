import { prisma } from '../db';
import { scrapeWithCheerio } from '../scraper/cheerioNextData';
import { scrapeWithPlaywright } from '../scraper/playwrightScraper';
import { scrapeTribeEvents } from '../scraper/tribeEventsScraper';
import { scrapeChiTribeEvents } from '../scraper/chitribeScraper';
import { parseEventDate } from '../utils/dateParser';

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
    url: 'https://chitribe.org/events/',
    name: 'ChiTribe Community Events',
    platform: 'CHITRIBE',
  },
];

let isPollingInProgress = false;

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
      console.log(`[Poller] Scraping Partiful user profile via Playwright: ${source.url}`);
      const pwResult = await scrapeWithPlaywright(source.url);

      jobTitle = pwResult.title || source.name || 'Partiful Organizer';
      jobDescription = pwResult.description || '';
      jobAuthor = pwResult.author || source.name;
      jobAvatar = pwResult.avatarUrl || null;
      rawPayload = pwResult.rawPayload || null;

      if (pwResult.rawPayload) {
        try {
          const data = JSON.parse(pwResult.rawPayload);
          const published = data?.props?.pageProps?.initialPublishedEvents || [];
          console.log(`[Poller] Found ${published.length} published events on Partiful profile`);

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
        } catch (parseErr) {
          console.warn('[Poller] Error parsing Partiful profile raw payload:', parseErr);
        }
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
      console.log(`[Poller] Found ${tResult.items.length} events from Mishkan Chicago`);
    }
    // ------------------------------------------------------------------------
    // CASE C: ChiTribe Events & Community Feed
    // ------------------------------------------------------------------------
    else if (source.platform === 'CHITRIBE' || source.url.includes('chitribe.org')) {
      scrapeMethod = 'PLAYWRIGHT';
      console.log(`[Poller] Scraping ChiTribe events calendar: ${source.url}`);
      const chiResult = await scrapeChiTribeEvents(source.url);

      jobTitle = chiResult.title || 'ChiTribe Events Calendar';
      jobDescription = chiResult.description || 'Chicago Jewish Community Events Calendar';
      jobAuthor = 'ChiTribe';

      for (const item of chiResult.items) {
        enrichedEvents.push({
          title: item.title,
          url: item.url,
          platform: 'CHITRIBE',
          itemType: 'EVENT',
          eventDate: item.eventDate ? new Date(item.eventDate) : null,
          eventDateStr: item.eventDateStr || null,
          eventEndDate: item.eventEndDate ? new Date(item.eventEndDate) : null,
          description: item.description || null,
          imageUrl: item.imageUrl || null,
          location: item.location || null,
          hostName: item.hostName || 'ChiTribe',
          rsvpCount: null,
          isPinned: false,
        });
      }
      console.log(`[Poller] Found ${chiResult.items.length} events from ChiTribe`);
    }
    // ------------------------------------------------------------------------
    // CASE D: Linktree Profile (e.g. linktr.ee/...)
    // ------------------------------------------------------------------------
    else {
      const parentScrape = await scrapeWithCheerio(source.url);
      if (!parentScrape) {
        throw new Error(`Failed to scrape Linktree source ${source.url}`);
      }

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
          urlLower.includes('instagram.com/') && !urlLower.includes('/p/') ||
          urlLower.includes('facebook.com/') && !urlLower.includes('/events/') ||
          urlLower.startsWith('mailto:') ||
          isSurveyOrContact
        ) {
          continue;
        }

        const isPartiful = urlLower.includes('partiful.com/e/');
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

        if ((isPartiful || isOneTable || isGenericEvent) && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          candidateEvents.push({
            title: item.title,
            url: item.url,
            platform: isPartiful ? 'PARTIFUL' : isOneTable ? 'ONETABLE' : isGoogleForm ? 'GOOGLE_FORMS' : item.platform || 'GENERIC',
            itemType: 'EVENT',
            description: item.description,
          });
        }
      }

      console.log(`[Poller] Found ${candidateEvents.length} event links on ${source.url}. Deep-scraping top events...`);

      // Limit to top 20 candidate events to keep sync snappy
      const eventsToEnrich = candidateEvents.slice(0, 20);

      for (const candidate of eventsToEnrich) {
        try {
          if (candidate.platform === 'PARTIFUL') {
            // First try fast Cheerio static Next.js payload (~200ms)
            let chResult = await scrapeWithCheerio(candidate.url);
            let primaryItem = chResult?.items.find((i) => i.itemType === 'EVENT') || chResult?.items[0];

            // If Cheerio missed the date or failed, fallback to Playwright
            if (!primaryItem || !primaryItem.eventDate) {
              const pwResult = await scrapeWithPlaywright(candidate.url);
              primaryItem = pwResult.items.find((i) => i.itemType === 'EVENT') || pwResult.items[0];
            }

            const cleanHost =
              primaryItem?.hostName && primaryItem.hostName.length > 2 && !primaryItem.hostName.includes('◕')
                ? primaryItem.hostName
                : sourceName;

            const dateInfo = parseEventDate(primaryItem?.eventDate, primaryItem?.title || candidate.title);

            enrichedEvents.push({
              title: primaryItem?.title || candidate.title,
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
            });
          } else {
            // OneTable or other community event pages: use fast Cheerio
            const chResult = await scrapeWithCheerio(candidate.url);
            const isGenericPageTitle = !chResult?.title || chResult.title.startsWith('OneTable |') || chResult.title.includes('Sign In');
            const finalTitle = (isGenericPageTitle ? candidate.title : chResult?.title) || candidate.title;
            const dateInfo = parseEventDate(null, finalTitle);

            enrichedEvents.push({
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
            });
          }
        } catch (evtErr: any) {
          console.warn(`[Poller] Error enriching ${candidate.url}:`, evtErr.message);
          const dateInfo = parseEventDate(null, candidate.title);
          enrichedEvents.push({
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
          });
        }
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
