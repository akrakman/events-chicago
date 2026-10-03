import { scrapeWithCheerio } from './cheerioNextData';
import { scrapeWithPlaywright } from './playwrightScraper';
import { scrapeChiTribeEvents } from './chitribeScraper';
import { detectPlatform } from './detector';
import { ScrapeModePreference, ScrapeResult } from '../types';

export async function orchestrateScrape(
  url: string,
  mode: ScrapeModePreference = 'auto'
): Promise<ScrapeResult> {
  const overallStart = Date.now();
  const detected = detectPlatform(url);

  // ChiTribe dedicated scraper
  if (detected.platform === 'CHITRIBE' || url.toLowerCase().includes('chitribe.org')) {
    return await scrapeChiTribeEvents(url);
  }

  if (mode === 'playwright') {
    return await scrapeWithPlaywright(url);
  }

  if (mode === 'cheerio') {
    const result = await scrapeWithCheerio(url);
    if (!result) {
      throw new Error('Cheerio extraction returned empty result');
    }
    return result;
  }

  // AUTO mode:
  // 1. Try fast static Cheerio / Next.js extraction first
  const cheerioResult = await scrapeWithCheerio(url);

  // If Cheerio extracted items successfully or identified an event, return it immediately
  if (cheerioResult && cheerioResult.items.length > 0 && !cheerioResult.errorMessage) {
    return cheerioResult;
  }

  // If Cheerio produced no items or had an error (e.g. JavaScript-only rendering), fallback to Playwright
  try {
    const playwrightResult = await scrapeWithPlaywright(url);
    if (playwrightResult.items.length > 0 || !cheerioResult) {
      return playwrightResult;
    }
  } catch (pwErr: any) {
    // If Playwright fails as well, return whatever Cheerio gave or the error
    if (cheerioResult) {
      return cheerioResult;
    }
  }

  return (
    cheerioResult || {
      url,
      platform: 'GENERIC',
      method: 'CHEERIO_STATIC',
      durationMs: Date.now() - overallStart,
      items: [],
      errorMessage: 'Could not extract items with Cheerio or Playwright',
    }
  );
}
