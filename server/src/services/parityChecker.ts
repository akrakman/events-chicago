import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../db';
import { normalizeTitle } from '../utils/eventClassifier';

export interface ParityReport {
  dependsOnChiTribe: boolean;
  chiTribeSourcesCount: number;
  chiTribeItemsCount: number;
  ourTotalEvents: number;
  ourUniqueEvents: number;
  chiTribeTotalEvents: number;
  matchedCount: number;
  parityPercentage: number;
  missingFromOurAppCount: number;
  additionalEventsInOurAppCount: number;
  missingEvents: Array<{ title: string; date: string | null; hostName: string | null }>;
  additionalEventsSample: Array<{ title: string; date: string | null; sourceName: string | null; url: string }>;
}

export async function runChiTribeParityCheck(): Promise<ParityReport> {
  const candidates = [
    path.resolve(__dirname, '../data/chitribe-events.json'),
    path.resolve(process.cwd(), 'src/data/chitribe-events.json'),
    path.resolve(process.cwd(), 'server/src/data/chitribe-events.json'),
  ];

  let chiEvents: Array<{
    title: string;
    url: string;
    eventDate: string | null;
    eventDateStr?: string | null;
    hostName: string | null;
  }> = [];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      chiEvents = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }

  const sources = await prisma.monitoredSource.findMany();
  const chiTribeSourcesCount = sources.filter(
    (s) => s.url.toLowerCase().includes('chitribe.org') || s.platform === 'CHITRIBE'
  ).length;

  const ourEvents = await prisma.extractedItem.findMany({
    where: { itemType: 'EVENT' },
    orderBy: { eventDate: 'asc' },
  });

  const chiTribeItemsCount = ourEvents.filter(
    (e) =>
      e.platform === 'CHITRIBE' ||
      e.url.toLowerCase().includes('chitribe.org') ||
      (e.sourceUrl && e.sourceUrl.toLowerCase().includes('chitribe.org'))
  ).length;

  const ourNormTitles = new Set(ourEvents.map((e) => normalizeTitle(e.title)));
  const chiNormTitles = new Set(chiEvents.map((e) => normalizeTitle(e.title)));

  const matchedList: typeof chiEvents = [];
  const missingList: typeof chiEvents = [];

  for (const ce of chiEvents) {
    const normCt = normalizeTitle(ce.title);
    const isMatched =
      ourNormTitles.has(normCt) ||
      ourEvents.some((oe) => {
        const normOt = normalizeTitle(oe.title);
        if (normOt === normCt) return true;
        if (normOt.includes(normCt) || normCt.includes(normOt)) return true;
        const words = normCt.split(/\s+/).filter((w) => w.length > 3);
        if (words.length === 0) return false;
        const matches = words.filter((w) => normOt.includes(w));
        return matches.length >= Math.min(2, words.length);
      });

    if (isMatched) {
      matchedList.push(ce);
    } else {
      missingList.push(ce);
    }
  }

  // Find events in our app that are NOT on ChiTribe (our additional coverage)
  const now = new Date();
  const additionalEvents = ourEvents
    .filter((oe) => {
      const normOt = normalizeTitle(oe.title);
      return !chiNormTitles.has(normOt);
    })
    .sort((a, b) => {
      const aFuture = a.eventDate && a.eventDate >= now ? 1 : 0;
      const bFuture = b.eventDate && b.eventDate >= now ? 1 : 0;
      if (aFuture !== bFuture) return bFuture - aFuture;
      if (a.eventDate && b.eventDate) return a.eventDate.getTime() - b.eventDate.getTime();
      return 0;
    });

  const parityPercentage =
    chiEvents.length > 0 ? Math.round((matchedList.length / chiEvents.length) * 1000) / 10 : 100;

  return {
    dependsOnChiTribe: chiTribeSourcesCount > 0 || chiTribeItemsCount > 0,
    chiTribeSourcesCount,
    chiTribeItemsCount,
    ourTotalEvents: ourEvents.length,
    ourUniqueEvents: ourNormTitles.size,
    chiTribeTotalEvents: chiEvents.length,
    matchedCount: matchedList.length,
    parityPercentage,
    missingFromOurAppCount: missingList.length,
    additionalEventsInOurAppCount: additionalEvents.length,
    missingEvents: missingList.map((e) => ({
      title: e.title,
      date: e.eventDate,
      hostName: e.hostName,
    })),
    additionalEventsSample: additionalEvents.slice(0, 20).map((e) => ({
      title: e.title,
      date: e.eventDate ? e.eventDate.toISOString() : null,
      sourceName: e.sourceName,
      url: e.url,
    })),
  };
}
