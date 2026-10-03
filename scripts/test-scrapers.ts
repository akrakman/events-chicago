import * as cheerio from 'cheerio';
import { chromium, Browser } from 'playwright';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

// ============================================================================
// PARSER 1: Linktree __NEXT_DATA__ extractor using Cheerio
// ============================================================================
export async function extractLinktreeNextData(rawUrl: string) {
  const startTime = Date.now();
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Linktree URL (${response.status} ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract <script id="__NEXT_DATA__" type="application/json">
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (!nextDataScript) {
    // If not Next.js, fallback to Cheerio DOM link buttons
    const domLinks: Array<{ title: string; url: string }> = [];
    $('a[data-testid="LinkButton"], a[href]').each((_, el) => {
      const href = $(el).attr('href');
      const title = $(el).text().trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        domLinks.push({ title: title || href, url: href });
      }
    });

    return {
      parser: 'Linktree (DOM Fallback - No __NEXT_DATA__)',
      targetUrl: url,
      profile: {
        pageTitle: $('title').text().trim() || null,
        description: $('meta[name="description"]').attr('content') || null,
      },
      links: domLinks,
      durationMs: Date.now() - startTime,
    };
  }

  const nextData = JSON.parse(nextDataScript);
  const pageProps = nextData?.props?.pageProps || {};
  const account = pageProps.account || pageProps.user || {};

  // Extract links array
  const rawLinks = pageProps.links || account.links || [];
  const links = Array.isArray(rawLinks)
    ? rawLinks
        .filter((l: any) => l && l.url)
        .map((l: any) => ({
          id: l.id || null,
          title: l.title || l.name || l.url,
          url: l.url,
          type: l.type || 'CLASSIC',
          isPinned: !!l.pinned,
          position: l.position ?? null,
        }))
    : [];

  // Extract social links
  const rawSocials = pageProps.socialLinks || account.socialLinks || [];
  const socialLinks = Array.isArray(rawSocials)
    ? rawSocials
        .filter((s: any) => s && s.url)
        .map((s: any) => ({
          type: s.type || null,
          url: s.url,
        }))
    : [];

  return {
    parser: 'Linktree __NEXT_DATA__ (Cheerio)',
    targetUrl: url,
    profile: {
      username: account.username ? `@${account.username}` : null,
      pageTitle: account.pageTitle || pageProps.pageTitle || $('title').text().trim(),
      description: account.description || account.bio || null,
      avatarUrl: account.profilePictureUrl || account.avatar || null,
    },
    linksCount: links.length,
    links,
    socialLinksCount: socialLinks.length,
    socialLinks,
    hydrationKeys: Object.keys(pageProps),
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// PARSER 2: Public Partiful event extractor using Playwright
// ============================================================================
export async function extractPartifulPlaywright(rawUrl: string) {
  const startTime = Date.now();
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
    });

    const page = await context.newPage();

    // Block heavy static media
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type) && !route.request().url().includes('cover') && !route.request().url().includes('avatar')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Brief wait for hydration
    await page.waitForTimeout(1500);

    // Retrieve Next.js payload or JSON-LD directly from browser globals
    let nextData: any = null;
    try {
      nextData = await page.evaluate(`
        (() => {
          try {
            if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
            const el = document.getElementById('__NEXT_DATA__');
            if (el && el.textContent) return JSON.parse(el.textContent);
          } catch(e) {}
          return null;
        })()
      `);
    } catch {}

    const renderedHtml = await page.content();
    const $ = cheerio.load(renderedHtml);

    // Check JSON-LD
    let jsonLdEvent: any = null;
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const parsed = JSON.parse($(el).html() || '{}');
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const evt = list.find((item) => item['@type'] === 'Event' || item.type === 'Event');
        if (evt) jsonLdEvent = evt;
      } catch {}
    });

    const evt = nextData?.props?.pageProps?.event || {};

    // 1. Title
    const title =
      evt.title ||
      jsonLdEvent?.name ||
      $('meta[property="og:title"]').attr('content') ||
      $('h1').first().text().trim() ||
      null;

    // 2. Host
    let host: string | null =
      evt.hostName ||
      evt.host?.name ||
      jsonLdEvent?.organizer?.name ||
      (typeof jsonLdEvent?.organizer === 'string' ? jsonLdEvent.organizer : null) ||
      null;
    if (!host) {
      const hostEl = $('[data-testid*="host"], [class*="host"], [class*="Host"]').first().text().trim();
      if (hostEl) host = hostEl;
    }
    if (host) {
      host = host.replace(/^Hosted\s+by\s*([A-Z]{2})?\s*/i, '').trim();
    }

    // 3. Date / Time
    const date =
      evt.startDate ||
      evt.startDateTime ||
      jsonLdEvent?.startDate ||
      $('time').first().attr('datetime') ||
      $('time').first().text().trim() ||
      null;

    const endDate =
      evt.endDate ||
      evt.endDateTime ||
      jsonLdEvent?.endDate ||
      null;

    // 4. Description
    const description =
      evt.description ||
      jsonLdEvent?.description ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      null;

    // 5. Location
    let location: string | null =
      evt.locationName ||
      evt.location ||
      (typeof jsonLdEvent?.location === 'string' ? jsonLdEvent.location : jsonLdEvent?.location?.name || jsonLdEvent?.location?.address) ||
      null;

    // 6. Cover image / RSVP count
    const coverImage =
      evt.coverPhotoUrl ||
      jsonLdEvent?.image ||
      $('meta[property="og:image"]').attr('content') ||
      null;

    let rsvpCount: number | null = null;
    if (typeof evt.rsvpCount === 'number') rsvpCount = evt.rsvpCount;
    else if (Array.isArray(evt.rsvps)) rsvpCount = evt.rsvps.length;
    else if (Array.isArray(evt.guests)) rsvpCount = evt.guests.length;

    // 7. Embedded event links
    const links: Array<{ title: string; url: string }> = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:') && !href.includes('partiful.com/legal')) {
        try {
          const absolute = new URL(href, url).toString();
          if (!links.some((l) => l.url === absolute)) {
            links.push({
              title: $(el).text().trim() || absolute,
              url: absolute,
            });
          }
        } catch {}
      }
    });

    return {
      parser: 'Partiful Event (Playwright)',
      targetUrl: url,
      event: {
        title,
        host,
        date,
        endDate,
        description,
        location,
        rsvpCount,
        coverImage,
      },
      extractedLinksCount: links.length,
      links: links.slice(0, 15),
      durationMs: Date.now() - startTime,
    };
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

// ============================================================================
// PARSER 3: Fallback Open Graph & Social Tag Extractor using Cheerio
// ============================================================================
export async function extractOpenGraphFallback(rawUrl: string) {
  const startTime = Date.now();
  const url = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL (${response.status} ${response.statusText})`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Helper for meta tags
  const getMeta = (...selectors: string[]): string | null => {
    for (const sel of selectors) {
      const val = $(sel).attr('content') || $(sel).attr('value');
      if (val && val.trim() !== '') return val.trim();
    }
    return null;
  };

  const title =
    getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') ||
    $('title').text().trim() ||
    null;

  const description =
    getMeta('meta[property="og:description"]', 'meta[name="twitter:description"]', 'meta[name="description"]') ||
    null;

  const image =
    getMeta('meta[property="og:image"]', 'meta[property="og:image:url"]', 'meta[name="twitter:image"]', 'meta[name="twitter:image:src"]') ||
    null;

  const author =
    getMeta('meta[name="author"]', 'meta[property="article:author"]', 'meta[name="twitter:creator"]') ||
    null;

  const siteName =
    getMeta('meta[property="og:site_name"]', 'meta[name="application-name"]') ||
    null;

  const type =
    getMeta('meta[property="og:type"]') ||
    'website';

  const canonical =
    $('link[rel="canonical"]').attr('href') ||
    getMeta('meta[property="og:url"]') ||
    url;

  const icon =
    $('link[rel="icon"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="apple-touch-icon"]').attr('href') ||
    null;

  // JSON-LD schemas
  const jsonLd: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const parsed = JSON.parse($(el).html() || '{}');
      if (Array.isArray(parsed)) jsonLd.push(...parsed);
      else jsonLd.push(parsed);
    } catch {}
  });

  // Outgoing links sample
  const links: Array<{ title: string; url: string }> = [];
  const seen = new Set<string>();
  seen.add(url);

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) return;
    try {
      const absolute = new URL(rawHref, url).toString();
      if (!seen.has(absolute)) {
        seen.add(absolute);
        links.push({
          title: $(el).text().trim() || absolute,
          url: absolute,
        });
      }
    } catch {}
  });

  return {
    parser: 'Open Graph & Social Fallback (Cheerio)',
    targetUrl: url,
    openGraph: {
      title,
      description,
      image,
      author,
      siteName,
      type,
      canonical,
      icon,
    },
    jsonLdTypes: jsonLd.map((item) => item['@type'] || item.type || 'Unknown'),
    outboundLinksCount: links.length,
    sampleLinks: links.slice(0, 10),
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// PARSER 4: ChiTribe EventON calendar & single event extractor
// ============================================================================
export async function extractChiTribe(rawUrl: string) {
  const { scrapeChiTribeEvents } = await import('../server/src/scraper/chitribeScraper');
  const res = await scrapeChiTribeEvents(rawUrl);
  return {
    parser: 'ChiTribe EventON / Schema.org Extractor',
    targetUrl: rawUrl,
    calendar: {
      title: res.title,
      description: res.description,
      organizer: res.author,
    },
    totalEventsFound: res.items.length,
    events: res.items,
    durationMs: res.durationMs,
  };
}

// ============================================================================
// CLI Dispatcher & Test Runner
// ============================================================================
async function main() {
  const args = process.argv.slice(2);
  const targetUrl = args.find((a) => !a.startsWith('--'));
  const forceLinktree = args.includes('--linktree');
  const forcePartiful = args.includes('--partiful');
  const forceChiTribe = args.includes('--chitribe');
  const forceOg = args.includes('--og');
  const runAll = args.includes('--all') || (!targetUrl && !forceLinktree && !forcePartiful && !forceChiTribe && !forceOg);

  // If no URL is provided or --all is requested: run all test parsers on standard live URLs
  if (runAll) {
    console.log('\n============================================================');
    console.log('🧪 RUNNING SCRAPER TESTS');
    console.log('============================================================\n');

    console.log('--- TEST 1: Linktree __NEXT_DATA__ (Cheerio) ---');
    try {
      const linktreeRes = await extractLinktreeNextData('https://linktr.ee/github');
      console.log(JSON.stringify(linktreeRes, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }

    console.log('\n--- TEST 2: Partiful Event (Playwright) ---');
    try {
      const partifulRes = await extractPartifulPlaywright('https://partiful.com');
      console.log(JSON.stringify(partifulRes, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }

    console.log('\n--- TEST 3: Fallback Open Graph (Cheerio) ---');
    try {
      const ogRes = await extractOpenGraphFallback('https://github.com/torvalds');
      console.log(JSON.stringify(ogRes, null, 2));
    } catch (err: any) {
      console.error(JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }

    console.log('\n============================================================');
    console.log('✅ ALL TEST SUITES FINISHED');
    console.log('============================================================\n');
    return;
  }

  if (!targetUrl) {
    console.error('Error: Please provide a URL to test, e.g.:');
    console.error('  npx tsx scripts/test-scrapers.ts https://linktr.ee/billieeilish');
    console.error('  npx tsx scripts/test-scrapers.ts https://partiful.com/e/example');
    console.error('  npx tsx scripts/test-scrapers.ts https://chitribe.org/events/');
    console.error('  npx tsx scripts/test-scrapers.ts https://github.com/torvalds');
    console.error('Or run with --all to test all parsers.');
    process.exit(1);
  }

  const lower = targetUrl.toLowerCase();

  try {
    let result: any;

    if (forceLinktree || lower.includes('linktr.ee') || lower.includes('linktree.')) {
      result = await extractLinktreeNextData(targetUrl);
    } else if (forcePartiful || lower.includes('partiful.com')) {
      result = await extractPartifulPlaywright(targetUrl);
    } else if (forceChiTribe || lower.includes('chitribe.org')) {
      result = await extractChiTribe(targetUrl);
    } else if (forceOg) {
      result = await extractOpenGraphFallback(targetUrl);
    } else {
      // Default for other social / generic URLs: Run Open Graph extractor
      result = await extractOpenGraphFallback(targetUrl);
    }

    // Output clean JSON directly to stdout
    console.log(JSON.stringify(result, null, 2));
  } catch (err: any) {
    console.error(
      JSON.stringify(
        {
          error: true,
          message: err.message || String(err),
          targetUrl,
        },
        null,
        2
      )
    );
    process.exit(1);
  }
}

// Run CLI if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('test-scrapers.ts')) {
  main();
}
