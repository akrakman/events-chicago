import { chromium, Browser } from 'playwright';
import * as cheerio from 'cheerio';
import { detectPlatform, inferItemPlatform } from './detector';
import { ParsedItem, ScrapeResult } from '../types';

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }
  return browserInstance;
}

export async function scrapeWithPlaywright(url: string): Promise<ScrapeResult> {
  const startTime = Date.now();
  const { platform, subPlatform, normalizedUrl } = detectPlatform(url);

  let browser: Browser | null = null;
  let page = null;
  let context = null;

  try {
    browser = await getBrowser();
    context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      javaScriptEnabled: true,
    });

    page = await context.newPage();

    // Block heavy static images and media to keep Playwright fast
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type) && !route.request().url().includes('avatar') && !route.request().url().includes('profile')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(normalizedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for client-side JavaScript hydration
    await page.waitForTimeout(1500);

    // Extract nextData directly as string evaluation to prevent esbuild helper issues
    let nextData: any = null;
    try {
      nextData = await page.evaluate(`
        (() => {
          try {
            if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
            const el = document.getElementById('__NEXT_DATA__');
            if (el && el.textContent) return JSON.parse(el.textContent);
          } catch (e) {}
          return null;
        })()
      `);
    } catch {}

    // Get the fully rendered DOM HTML
    const renderedHtml = await page.content();
    const $ = cheerio.load(renderedHtml);

    const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text().trim() || null;
    const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
    const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
    const authorMeta = $('meta[name="author"]').attr('content') || null;

    let title = ogTitle || $('h1').first().text().trim() || null;
    let description = ogDesc || $('p').first().text().trim() || null;
    let author = authorMeta;
    let avatarUrl = ogImage;
    const items: ParsedItem[] = [];

    // 1. Linktree
    if (platform === 'LINKTREE') {
      if (nextData?.props?.pageProps) {
        const pageProps = nextData.props.pageProps;
        const account = pageProps.account || pageProps.user || {};
        if (account.username) author = `@${account.username}`;
        if (account.profilePictureUrl) avatarUrl = account.profilePictureUrl;
        if (account.description) description = account.description;
        if (account.pageTitle) title = account.pageTitle;

        const links = pageProps.links || pageProps.account?.links || [];
        if (Array.isArray(links)) {
          for (const link of links) {
            if (!link || !link.url) continue;
            const linkUrl = link.url.trim();
            const subPlat = inferItemPlatform(linkUrl);
            items.push({
              title: link.title || linkUrl,
              url: linkUrl,
              itemType: subPlat === 'PARTIFUL' ? 'EVENT' : 'LINK',
              platform: subPlat,
              description: link.description || null,
              imageUrl: link.thumbnailUrl || null,
              isPinned: !!link.pinned,
            });
          }
        }
      }

      // Check DOM buttons if items empty
      if (items.length === 0) {
        $('a[data-testid="LinkButton"], a[href*="http"]').each((_, el) => {
          const href = $(el).attr('href');
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
          const text = $(el).text().trim() || href;
          const subPlat = inferItemPlatform(href);
          items.push({
            title: text,
            url: href,
            itemType: subPlat === 'PARTIFUL' ? 'EVENT' : 'LINK',
            platform: subPlat,
          });
        });
      }
    }
    // 2. Partiful
    else if (platform === 'PARTIFUL') {
      const evt = nextData?.props?.pageProps?.event || {};
      if (evt.title) title = evt.title;
      if (evt.description) description = evt.description;
      if (evt.coverPhotoUrl) avatarUrl = evt.coverPhotoUrl;
      if (evt.hostName) author = evt.hostName;

      items.push({
        title: title || 'Partiful Event',
        url: normalizedUrl,
        itemType: 'EVENT',
        platform: 'PARTIFUL',
        description,
        imageUrl: avatarUrl,
        eventDate: evt.startDate || null,
        eventEndDate: evt.endDate || null,
        location: evt.locationName || null,
        hostName: author,
        rsvpCount: typeof evt.rsvpCount === 'number' ? evt.rsvpCount : null,
        isPinned: true,
      });
    }

    // 3. Collect rendered links for general or fallback
    if (items.length === 0) {
      const seen = new Set<string>();
      seen.add(normalizedUrl);

      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:')) return;

        try {
          const absolute = new URL(href, normalizedUrl).toString();
          if (seen.has(absolute)) return;
          seen.add(absolute);

          const linkText = $(el).text().trim() || absolute;
          const subPlat = inferItemPlatform(absolute);
          const isSocial = ['TWITTER', 'INSTAGRAM', 'GITHUB', 'LINKEDIN', 'TIKTOK', 'YOUTUBE'].includes(subPlat);
          const isEvent = subPlat === 'PARTIFUL' || absolute.includes('/event');

          items.push({
            title: linkText.length > 120 ? linkText.slice(0, 117) + '...' : linkText,
            url: absolute,
            itemType: isEvent ? 'EVENT' : isSocial ? 'SOCIAL' : 'LINK',
            platform: subPlat,
          });
        } catch {}
      });
    }

    return {
      url: normalizedUrl,
      platform,
      method: 'PLAYWRIGHT',
      durationMs: Date.now() - startTime,
      title: title || 'Scraped Web Page',
      description,
      author,
      avatarUrl,
      rawPayload: nextData ? JSON.stringify(nextData) : null,
      items: items.slice(0, 50),
    };
  } catch (err: any) {
    return {
      url: normalizedUrl,
      platform,
      method: 'PLAYWRIGHT',
      durationMs: Date.now() - startTime,
      items: [],
      errorMessage: `Playwright scrape failed: ${err.message || String(err)}`,
    };
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}
