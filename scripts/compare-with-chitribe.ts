import * as fs from 'fs';
import { prisma } from '../server/src/db';

async function main() {
  const logPath = '/Users/adenkrakman/.gemini/antigravity-cli/brain/464ed3fd-c2fc-496a-b2cd-5fce11153341/.system_generated/tasks/task-480.log';
  const rawLog = fs.readFileSync(logPath, 'utf8');

  // Extract JSON object from log
  const jsonStart = rawLog.indexOf('{');
  const jsonEnd = rawLog.lastIndexOf('}') + 1;
  const data = JSON.parse(rawLog.slice(jsonStart, jsonEnd));
  const chiEvents: Array<{
    title: string;
    url: string;
    description: string | null;
    eventDate: string | null;
    eventDateStr: string | null;
    location: string | null;
    hostName: string | null;
  }> = data.events;

  console.log(`\n======================================================`);
  console.log(`TOTAL CHITRIBE EVENTS FOUND: ${chiEvents.length}`);
  console.log(`======================================================\n`);

  const ourEvents = await prisma.extractedItem.findMany({
    select: {
      id: true,
      title: true,
      url: true,
      eventDate: true,
      hostName: true,
      sourceName: true,
    },
  });

  console.log(`Our App has ${ourEvents.length} direct primary events.\n`);

  // Analyze ChiTribe hosts
  const hostCount: Record<string, number> = {};
  for (const e of chiEvents) {
    const h = e.hostName || 'Unspecified Host';
    hostCount[h] = (hostCount[h] || 0) + 1;
  }

  console.log('=== CHITRIBE EVENTS BREAKDOWN BY HOST/ORGANIZER ===');
  Object.entries(hostCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([h, count]) => {
      console.log(` - ${h.slice(0, 48).padEnd(50)}: ${count} events`);
    });

  // Cross reference
  const ourTitles = ourEvents.map((e) => e.title.toLowerCase());
  const matchedList: any[] = [];
  const missingByHost: Record<string, any[]> = {};

  for (const ce of chiEvents) {
    const ct = ce.title.toLowerCase();
    const isMatched = ourTitles.some((ot) => {
      if (ot === ct) return true;
      const cleanCt = ct.replace(/[^a-z0-9 ]/g, ' ').trim();
      const cleanOt = ot.replace(/[^a-z0-9 ]/g, ' ').trim();
      if (cleanOt.includes(cleanCt) || cleanCt.includes(cleanOt)) return true;
      const words = cleanCt.split(/\s+/).filter((w) => w.length > 3);
      if (words.length === 0) return false;
      const matches = words.filter((w) => cleanOt.includes(w));
      return matches.length >= Math.min(2, words.length);
    });

    if (isMatched) {
      matchedList.push(ce);
    } else {
      const h = ce.hostName || 'Other Community';
      if (!missingByHost[h]) missingByHost[h] = [];
      missingByHost[h].push(ce);
    }
  }

  console.log(`\n======================================================`);
  console.log(`COMPARISON RESULTS:`);
  console.log(` - Matched in both: ${matchedList.length}`);
  console.log(` - Present on ChiTribe only: ${chiEvents.length - matchedList.length}`);
  console.log(`======================================================\n`);

  console.log('=== DETAILED BREAKDOWN OF EVENTS PRESENT ON CHITRIBE ONLY ===');
  Object.entries(missingByHost)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([host, events]) => {
      console.log(`\n▶ [${host}] (${events.length} events)`);
      events.slice(0, 6).forEach((evt) => {
        const d = evt.eventDateStr ? evt.eventDateStr.slice(0, 10) : 'TBD';
        console.log(`   • [${d}] ${evt.title}`);
        console.log(`     URL: ${evt.url}`);
        if (evt.location) console.log(`     Loc: ${evt.location}`);
      });
      if (events.length > 6) {
        console.log(`     ... and ${events.length - 6} more`);
      }
    });

  await prisma.$disconnect();
}

main().catch(console.error);
